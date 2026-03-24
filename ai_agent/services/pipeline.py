"""
Pipeline — AI Avatar Agent Orchestrator
Chains: User Query → Gemini AI → pyttsx3 TTS → Wav2Lip Avatar Video

Handles partial failures gracefully:
  - AI fails         → returns error (hard stop)
  - TTS fails        → returns text only (no audio/video)
  - Wav2Lip missing  → returns text + audio only
  - Wav2Lip crashes  → returns text + audio only (logs warning)
"""
import os
import logging
from pathlib import Path
from django.conf import settings

from .ai_service import generate_response
from .tts_service import generate_voice
from .avatar_service import (
    generate_avatar_video,
    AvatarNotConfiguredError,
    AvatarGenerationError,
)

logger = logging.getLogger('ai_agent.pipeline')

MEDIA_URL = settings.MEDIA_URL
AVATAR_MEDIA_DIR = Path(settings.MEDIA_ROOT) / 'avatar'


def _path_to_url(abs_path: str) -> str:
    """Convert an absolute media file path to a Django MEDIA_URL-relative URL."""
    try:
        rel = Path(abs_path).relative_to(settings.MEDIA_ROOT)
        return MEDIA_URL + str(rel).replace('\\', '/')
    except ValueError:
        return ''


from typing import Dict, List, Any, Optional
import uuid

def run_avatar_pipeline(
    user_query: str,
    hotel_context: Optional[Dict[str, Any]] = None,
    user: Any = None,
    hotel: Any = None,
) -> Dict[str, Any]:
    """
    Execute the full AI Avatar pipeline for a given user query.
    """
    # Generate unique ID for this execution to prevent race conditions
    request_id = str(uuid.uuid4())[:8]
    voice_filename = f"voice_{request_id}.wav"
    video_filename = f"result_{request_id}.mp4"

    # Explicitly typed result dictionary to help linter
    result: Dict[str, Any] = {
        'status': 'error',
        'text': '',
        'audio_url': None,
        'video_url': None,
        'has_video': False,
        'has_audio': False,
        'is_fallback': False,
        'degradations': [],
    }

    # ── STEP 1: Gemini AI Response ────────────────────────────────────────────
    safe_query_log = user_query[:80] if user_query else ""
    logger.info(f"Pipeline[{request_id}]: generating AI response for: {safe_query_log}...")
    try:
        ai_text = generate_response(
            user_query, 
            hotel_context=hotel_context,
            user=user,
            hotel=hotel
        )
        result['text'] = ai_text
        logger.info(f"Pipeline[{request_id}]: AI response OK")
    except Exception as e:
        logger.error(f"Pipeline[{request_id}]: AI step failed: {e}")
        result['error'] = f"AI service unavailable: {str(e)}"
        return result

    # ── STEP 2: Text-to-Speech ────────────────────────────────────────────────
    audio_path = None
    try:
        # returns (path, is_personalized)
        audio_path, is_personalized = generate_voice(ai_text, output_filename=voice_filename)
        if audio_path:
            result['audio_url'] = _path_to_url(audio_path)
            result['has_audio'] = True
            result['is_personalized'] = is_personalized
            logger.info(f"Pipeline[{request_id}]: TTS OK (Pers={is_personalized}) → {voice_filename}")
    except Exception as e:
        msg = f"TTS unavailable ({e}). Using browser speech synthesis instead."
        logger.warning(f"Pipeline[{request_id}]: TTS step failed: {e}")
        degrads = result.get('degradations')
        if isinstance(degrads, list):
            degrads.append(msg)

    # ── STEP 3: Wav2Lip Avatar Video ──────────────────────────────────────────
    if audio_path:
        try:
            video_path = generate_avatar_video(audio_path, output_filename=video_filename)
            result['video_url'] = _path_to_url(video_path)
            result['has_video'] = True
            logger.info(f"Pipeline[{request_id}]: Avatar video OK → {video_filename}")

        except AvatarNotConfiguredError as e:
            from .avatar_service import FACE_VIDEO_PATH
            if FACE_VIDEO_PATH.exists():
                logger.info(f"Pipeline[{request_id}]: Wav2Lip missing, using raw face video fallback")
                result['video_url'] = _path_to_url(str(FACE_VIDEO_PATH))
                result['has_video'] = True
                result['is_fallback'] = True
                degrads = result.get('degradations')
                if isinstance(degrads, list):
                    degrads.append(
                        "Note: Visual lip-sync disabled. Running in high-fidelity static avatar mode. "
                        "Clone Wav2Lip to enable full neural motion."
                    )
            else:
                msg = f"Avatar video skipped: {e}"
                logger.info(f"Pipeline[{request_id}]: {msg}")
                degrads = result.get('degradations')
                if isinstance(degrads, list):
                    degrads.append(
                        "Avatar video not available yet. Place face.mp4 and clone Wav2Lip to enable."
                    )

        except AvatarGenerationError as e:
            msg = f"Avatar generation error: {e}"
            logger.error(f"Pipeline[{request_id}]: {msg}")
            degrads = result.get('degradations')
            if isinstance(degrads, list):
                degrads.append(
                    "Avatar video generation failed this request. Text and audio response provided."
                )
    else:
        degrads = result.get('degradations')
        if isinstance(degrads, list):
            degrads.append(
                "Avatar video skipped because TTS audio was unavailable."
            )

    # ── Done ──────────────────────────────────────────────────────────────────
    result['status'] = 'success'
    return result
