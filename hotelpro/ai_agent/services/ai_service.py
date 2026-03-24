"""
AI Service — Gemini Integration for Hotel Avatar Agent
Uses ZenithModelManager for production-level model orchestration.
"""
import os
import logging
import time
from google import genai
from google.genai import types
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger("ai_agent.ai_service")

# ── Gemini Client (lazy-initialized singleton) ────────────────────────────────
_client = None

def _get_client():
    """Return a cached Gemini client, initializing it once."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not set. "
                "Add it to your .env file: GEMINI_API_KEY=your_key_here"
            )
        _client = genai.Client(api_key=api_key)
    return _client


# ── System Prompt ──────────────────────────────────────────────────────────────
def _build_system_prompt(hotel_context: dict | None = None) -> str:
    """Build a professional hotel concierge system prompt."""
    base = (
        "You are a professional AI customer support agent for a hotel booking website.\n\n"
        "Your responsibilities:\n"
        "- Answer user queries related to hotel bookings, rooms, pricing, offers, cancellations, and policies.\n"
        "- Be polite, clear, and professional.\n"
        "- Always greet the user.\n"
        "- Keep answers short and helpful (2–4 sentences maximum as you will be spoken aloud).\n"
        "- If you don't know something, say politely that a human agent will respond soon.\n\n"
        "Rules:\n"
        "- Do not generate fake information. Use only the LIVE HOTEL DATA provided below.\n"
        "- Do not answer unrelated questions.\n"
        "- Do not sound like AI.\n\n"
        "Tone:\n"
        "Friendly, professional, helpful.\n\n"
        "Example:\n"
        "User: Do you have rooms in Delhi?\n"
        "Answer: Yes, we offer multiple room options in Delhi. Could you please share your travel dates so I can assist you better?"
    )

    if hotel_context:
        hotel_section = "\n\nLIVE HOTEL DATA (use this for your response):\n"
        for key, label in [
            ("name", "Hotel"), ("city", "Location"), ("check_in_time", "Check-in"),
            ("check_out_time", "Check-out"), ("cancellation_policy", "Cancellation Policy"),
            ("services", "Services Available"), ("star_rating", "Star Rating"), ("rooms", "Room Types"),
        ]:
            if hotel_context.get(key):
                hotel_section += f"- {label}: {hotel_context[key]}\n"
        base += hotel_section

    return base


# ── ZenithModelManager Integration ────────────────────────────────────────────
def _get_model_manager():
    """Lazy-load the ZenithModelManager to avoid import issues on startup."""
    try:
        from HotelPro_Nexus.model_manager import model_manager
        return model_manager
    except ImportError:
        return None


# ── Main Generator ─────────────────────────────────────────────────────────────
def generate_response(
    user_query: str,
    hotel_context: dict | None = None,
    user=None,
    hotel=None,
) -> str:
    """
    Generate a high-intelligence AI response for the avatar agent.
    Uses ZenithModelManager for smart model selection and quota handling.
    Falls back to basic Gemini call if model manager is unavailable.
    """
    # ── CASE 1: Full Hotel Context (Elite Mode via ZenithAgent) ───────────────
    if hotel and user:
        try:
            logger.info(f"[AIService] Routing to ZenithAgent for '{hotel.name}'")
            import HotelPro_Nexus.utils_ai as utils_ai

            avatar_instruction = (
                "CRITICAL: Keep your response to 2–4 sentences maximum. "
                "You are an AI AVATAR, so speak naturally and warmly. "
                "If you use tools, summarize the findings briefly."
            )

            agent = utils_ai.ZenithAgent(hotel, user)
            response_text = agent.execute(user_query, system_instruction=avatar_instruction)

            if response_text:
                return response_text

        except ImportError as e:
            logger.error(f"[AIService] Could not load HotelPro_Nexus utilities: {e}")
        except Exception as e:
            logger.warning(f"[AIService] ZenithAgent failed, using basic fallback: {e}")

    # ── CASE 2: Basic Fallback (text-only, no database tools) ─────────────────
    client = _get_client()
    system_prompt = _build_system_prompt(hotel_context)
    mm = _get_model_manager()

    # Get ordered model chain from ZenithModelManager (or use a safe default list)
    if mm:
        model_chain = [
            (name, caps)
            for name, caps in mm.get_full_chain()
        ]
    else:
        # Fallback if model_manager import fails
        model_chain = [
            ("models/gemini-2.5-flash", {"supports_tools": True}),
            ("models/gemini-2.0-flash", {"supports_tools": True}),
            ("models/gemini-2.0-flash-lite", {"supports_tools": True}),
            ("models/gemma-3-27b-it", {"supports_tools": False}),
        ]

    last_error = None

    for model_name, caps in model_chain:
        # Skip quota-blocked models
        if mm and mm.is_blocked(model_name):
            logger.debug(f"[AIService] Skipping quota-blocked model: {model_name}")
            continue

        t0 = time.time()
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_query,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=200,
                    temperature=0.7,
                ),
            )
            elapsed_ms = (time.time() - t0) * 1000
            if response and response.candidates:
                text = response.candidates[0].content.parts[0].text.strip()
                if text:
                    if mm:
                        mm.log_model_attempt(model_name, True, elapsed_ms)
                    logger.info(f"[AIService] '{model_name}' responded in {elapsed_ms:.0f}ms")
                    return text

        except Exception as e:
            elapsed_ms = (time.time() - t0) * 1000
            last_error = e
            error_msg = str(e).lower()

            if mm:
                mm.log_model_attempt(model_name, False, elapsed_ms, str(e)[:100])

            if "429" in error_msg or "resource_exhausted" in error_msg:
                if mm:
                    mm.block_model(model_name)
                else:
                    cache.set(f"zenith_model_blocked_{model_name}", True, timeout=300)
                logger.warning(f"[AIService] Quota exhausted for '{model_name}', throttling 5 min.")
                continue
            elif "404" in error_msg or "not_found" in error_msg:
                logger.warning(f"[AIService] '{model_name}' not available (404). Skipping.")
                continue
            continue

    raise RuntimeError(
        f"⚠️ AI service is temporarily busy. All models are at capacity. "
        f"Please try again in a few minutes. Last error: {last_error}"
    )
