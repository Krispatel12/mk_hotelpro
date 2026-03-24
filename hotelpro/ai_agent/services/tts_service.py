"""
TTS Service — Professional Multi-Provider Interface
Supports:
  1. ElevenLabs (Professional Voice Cloning, requires API Key)
  2. pyttsx3 (Offline, Zero-Cost System Fallback)
"""
import os
import logging
import re
import uuid
import requests
from pathlib import Path
from typing import Optional, Protocol
from django.conf import settings

logger = logging.getLogger('ai_agent.tts_service')

# Configuration
AVATAR_MEDIA_DIR = Path(settings.MEDIA_ROOT) / 'avatar'
ELEVENLABS_API_KEY = getattr(settings, 'ELEVENLABS_API_KEY', os.environ.get('ELEVENLABS_API_KEY'))
ELEVENLABS_VOICE_ID = getattr(settings, 'ELEVENLABS_VOICE_ID', os.environ.get('ELEVENLABS_VOICE_ID'))


class TTSServiceProvider(Protocol):
    def generate(self, text: str, output_path: str) -> bool:
        ...


def _ensure_output_dir():
    AVATAR_MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _clean_text_for_speech(text: str) -> str:
    """Strip markdown and special characters for natural speech."""
    text = re.sub(r'\*{1,2}(.*?)\*{1,2}', r'\1', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'^\s*[-•]\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


class ElevenLabsProvider:
    """High-fidelity professional voice cloning provider."""
    def __init__(self, api_key: str, voice_id: str):
        self.api_key = api_key
        self.voice_id = voice_id
        self.url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    def generate(self, text: str, output_path: str) -> bool:
        if not self.api_key or not self.voice_id:
            return False
            
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        try:
            response = requests.post(self.url, json=data, headers=headers, timeout=30)
            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                return True
            else:
                logger.error(f"ElevenLabs Error {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"ElevenLabs Connection Failed: {e}")
            return False


class SystemTTSProvider:
    """Zero-cost fallback using gTTS, with pyttsx3 as secondary offline fallback."""
    def generate(self, text: str, output_path: str) -> bool:
        # First attempt: pyttsx3 (Offline fallback, allows Male voice 'David')
        try:
            import pyttsx3
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except ImportError:
                pass

            engine = pyttsx3.init()
            engine.setProperty('rate', 155)
            
            voices = engine.getProperty('voices')
            selected_voice = None
            
            # Prioritize Microsoft David (Male)
            for v in voices:
                name_lower = v.name.lower()
                if 'david' in name_lower or 'male' in name_lower:
                    selected_voice = v.id
                    break
            
            # Fallback to any english voice if David not found
            if not selected_voice:
                for v in voices:
                    if 'english' in v.name.lower():
                        selected_voice = v.id
                        break
                        
            if selected_voice:
                engine.setProperty('voice', selected_voice)

            engine.save_to_file(text, output_path)
            engine.runAndWait()
            
            # Avoid engine.stop() as it breaks threading in COM environments
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info("Successfully generated voice using pyttsx3 (Male)")
                return True
        except Exception as e:
            logger.warning(f"pyttsx3 failed: {e}. Falling back to gTTS...")

        # Second attempt: Google Text-to-Speech (gTTS) - Reliable but Female only
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang='en', tld='com', slow=False)
            tts.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info("Successfully generated voice using gTTS")
                return True
        except Exception as e:
            logger.error(f"gTTS also failed: {e}")
            return False
        
        return False


def generate_voice(text: str, output_filename: str = 'voice.wav') -> tuple[str, bool]:
    """
    Primary API for voice generation. 
    Returns: (output_path, is_personalized: bool)
    """
    _ensure_output_dir()
    output_path = str(AVATAR_MEDIA_DIR / output_filename)
    cleaned_text = _clean_text_for_speech(text)

    # 1. Try ElevenLabs
    if ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID:
        logger.info(f"Using ElevenLabs for voice clone (Voice ID: {ELEVENLABS_VOICE_ID[:8]}...)")
        provider = ElevenLabsProvider(ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID)
        if provider.generate(cleaned_text, output_path):
            return output_path, True

    # 2. Fallback to System TTS
    logger.info("Falling back to System TTS (pyttsx3)")
    system_provider = SystemTTSProvider()
    if system_provider.generate(cleaned_text, output_path):
        return output_path, False

    raise RuntimeError("All TTS providers failed.")
