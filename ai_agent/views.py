"""
AI Agent Views — /ask/ endpoint
Orchestrates the full AI Avatar pipeline and returns JSON.
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from .services.pipeline import run_avatar_pipeline

logger = logging.getLogger('ai_agent.views')


def _get_hotel_context(hotel_id, user):
    """
    Safely load hotel context from the database for AI grounding.
    Returns None if hotel_id is invalid or not owned by the user.
    This import is safe — we only read, never write, hotel data.
    """
    if not hotel_id or int(hotel_id) == 0:
        return None
    try:
        # Dynamic import to avoid circular dependency issues
        from HotelPro_Nexus.models import Hotel
        hotel = Hotel.objects.get(id=int(hotel_id), owner=user)
        rooms = hotel.rooms.all()
        room_names = ', '.join(
            f"{r.name} (₹{r.base_price}/night)" for r in rooms
        ) or 'No rooms configured'

        return {
            'name': hotel.name,
            'city': hotel.city,
            'star_rating': str(hotel.star_rating),
            'check_in_time': str(hotel.check_in_time),
            'check_out_time': str(hotel.check_out_time),
            'cancellation_policy': hotel.cancellation_policy or 'Standard policy applies',
            'services': hotel.services or 'Contact hotel for services',
            'rooms': room_names,
        }
    except Exception as e:
        logger.warning(f"Could not load hotel context for hotel_id={hotel_id}: {e}")
        return None


@login_required
@require_POST
def ask_avatar(request):
    """
    POST /ask/
    Body (JSON): { "query": "...", "hotel_id": 1 }

    Response (JSON):
    {
        "status": "success" | "error",
        "text": "AI response text",
        "audio_url": "/media/avatar/voice.wav" | null,
        "video_url": "/media/avatar/result_voice.mp4" | null,
        "has_video": true | false,
        "has_audio": true | false,
        "degradations": ["warning1", ...],
        "error": "error message"    // only on error
    }
    """
    # ── Parse Request ─────────────────────────────────────────────────────────
    try:
        if request.content_type and 'application/json' in request.content_type:
            body = json.loads(request.body)
        else:
            body = request.POST

        user_query = (body.get('query') or '').strip()
        hotel_id = body.get('hotel_id', 0)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"ask_avatar: bad request body: {e}")
        return JsonResponse(
            {'status': 'error', 'error': 'Invalid request body. Expected JSON with "query" field.'},
            status=400
        )

    if not user_query:
        return JsonResponse(
            {'status': 'error', 'error': 'Query cannot be empty.'},
            status=400
        )

    if len(user_query) > 1000:
        return JsonResponse(
            {'status': 'error', 'error': 'Query too long (max 1000 characters).'},
            status=400
        )

    # ── Load Hotel and Context ───────────────────────────────────────────────
    hotel = None
    if hotel_id and int(hotel_id) != 0:
        try:
            from HotelPro_Nexus.models import Hotel
            hotel = Hotel.objects.get(id=int(hotel_id), owner=request.user)
        except Exception:
            hotel = None

    hotel_context = _get_hotel_context(hotel_id, request.user)
    logger.info(
        f"ask_avatar: user={request.user.username} | hotel_id={hotel_id} | "
        f"query='{user_query[:60]}...' | context={'YES' if hotel_context else 'NO'}"
    )

    # ── Run Pipeline ─────────────────────────────────────────────────────────
    result = run_avatar_pipeline(
        user_query=user_query,
        hotel_context=hotel_context,
        user=request.user,
        hotel=hotel,
    )

    # ── Return Response ──────────────────────────────────────────────────────
    if result['status'] == 'error':
        logger.error(f"ask_avatar: pipeline error: {result.get('error')}")
        return JsonResponse(result, status=502)

    return JsonResponse(result, status=200)


@login_required
def avatar_status(request):
    """
    GET /ask/status/
    Returns diagnostic information about the avatar pipeline components.
    Useful for admin troubleshooting.
    """
    from .services.avatar_service import get_configuration_status
    
    try:
        import pyttsx3
        tts_available = True
    except ImportError:
        tts_available = False

    status = get_configuration_status()
    status['tts_available'] = tts_available

    return JsonResponse({
        'status': 'ok',
        'components': status,
        'message': (
            'All components ready.' if status['is_ready'] and tts_available
            else 'Some components not configured — see degradation notes in API responses.'
        )
    })
