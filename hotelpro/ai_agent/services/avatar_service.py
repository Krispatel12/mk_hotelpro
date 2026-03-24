"""
Avatar Service — Wav2Lip Lip-Sync Video Generation
Runs Wav2Lip inference via subprocess to produce a speaking avatar video.

PREREQUISITES:
  1. Clone Wav2Lip into the project root:
       git clone https://github.com/Rudrabha/Wav2Lip.git
  2. Download the pretrained model:
       https://github.com/Rudrabha/Wav2Lip#getting-the-weights
       Place wav2lip_gan.pth inside Wav2Lip/checkpoints/
  3. Place a neutral face video at: media/avatar/face.mp4 (5–30 seconds)
  4. Install Wav2Lip dependencies listed in Wav2Lip/requirements.txt

The service degrades gracefully — if Wav2Lip is missing, the pipeline
still returns text + audio; only the avatar video is skipped.
"""
import os
import sys
import subprocess
import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger('ai_agent.avatar_service')

# ─────────────────────────────────────────────────────────────────────────────
# Path Configuration
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR = settings.BASE_DIR
AVATAR_MEDIA_DIR = Path(settings.MEDIA_ROOT) / 'avatar'

WAV2LIP_DIR = BASE_DIR / 'Wav2Lip'
WAV2LIP_INFERENCE = WAV2LIP_DIR / 'inference.py'
WAV2LIP_CHECKPOINT = WAV2LIP_DIR / 'checkpoints' / 'wav2lip_gan.pth'

FACE_VIDEO_PATH = AVATAR_MEDIA_DIR / 'face.mp4'
OUTPUT_VIDEO_PATH = AVATAR_MEDIA_DIR / 'result_voice.mp4'


class AvatarGenerationError(Exception):
    """Raised when Wav2Lip video generation fails."""
    pass


class AvatarNotConfiguredError(Exception):
    """
    Raised when Wav2Lip or face.mp4 is not set up.
    Not a hard failure — caller should treat this as graceful degradation.
    """
    pass


def is_wav2lip_available() -> bool:
    """Check if Wav2Lip is properly installed and configured."""
    return (
        WAV2LIP_INFERENCE.exists()
        and WAV2LIP_CHECKPOINT.exists()
        and FACE_VIDEO_PATH.exists()
    )


def get_configuration_status() -> dict:
    """
    Returns a diagnostic dict showing what is and isn't configured.
    Useful for admin debugging.
    """
    return {
        'wav2lip_dir': WAV2LIP_DIR.exists(),
        'inference_script': WAV2LIP_INFERENCE.exists(),
        'checkpoint': WAV2LIP_CHECKPOINT.exists(),
        'face_video': FACE_VIDEO_PATH.exists(),
        'output_dir': AVATAR_MEDIA_DIR.exists(),
        'is_ready': is_wav2lip_available(),
    }


def generate_avatar_video(audio_path: str, face_path: str | None = None, output_filename: str = 'result_voice.mp4') -> str:
    """
    Run Wav2Lip inference to generate a lip-synced avatar video.

    Args:
        audio_path:      Absolute path to the voice WAV file.
        face_path:       Optional override for face video path.
                         Defaults to AVATAR_MEDIA_DIR/face.mp4.
        output_filename: Filename for the output video.

    Returns:
        Absolute path to the generated result video.

    Raises:
        AvatarNotConfiguredError: Wav2Lip or face.mp4 not found (soft failure).
        AvatarGenerationError:    Wav2Lip process crashed (hard failure).
    """
    face = Path(face_path) if face_path else FACE_VIDEO_PATH
    output = AVATAR_MEDIA_DIR / output_filename

    # ── Pre-flight checks ────────────────────────────────────────────────────
    if not WAV2LIP_INFERENCE.exists():
        raise AvatarNotConfiguredError(
            f"Wav2Lip inference.py not found at {WAV2LIP_INFERENCE}. "
            "Clone Wav2Lip into the project root: "
            "git clone https://github.com/Rudrabha/Wav2Lip.git"
        )

    if not WAV2LIP_CHECKPOINT.exists():
        raise AvatarNotConfiguredError(
            f"Wav2Lip checkpoint not found at {WAV2LIP_CHECKPOINT}. "
            "Download wav2lip_gan.pth from the Wav2Lip releases."
        )

    if not face.exists():
        raise AvatarNotConfiguredError(
            f"Face video not found at {face}. "
            "Place a 5–30 second neutral face video at media/avatar/face.mp4"
        )

    if not Path(audio_path).exists():
        raise AvatarGenerationError(f"Audio file not found: {audio_path}")

    # Ensure output directory exists
    output.parent.mkdir(parents=True, exist_ok=True)

    # ── Build Wav2Lip command ─────────────────────────────────────────────────
    cmd = [
        sys.executable,               # Use the same Python interpreter
        str(WAV2LIP_INFERENCE),
        '--checkpoint_path', str(WAV2LIP_CHECKPOINT),
        '--face', str(face),
        '--audio', str(audio_path),
        '--outfile', str(output),
        '--nosmooth',                  # Faster inference, fewer artifacts
        '--resize_factor', '1',        # No resize (preserve original quality)
    ]

    logger.info(f"Starting Wav2Lip inference: face={face.name}, audio={Path(audio_path).name}")

    try:
        result = subprocess.run(
            cmd,
            cwd=str(WAV2LIP_DIR),      # Run from Wav2Lip directory
            capture_output=True,
            text=True,
            timeout=300,               # 5-minute hard timeout
        )

        if result.returncode != 0:
            logger.error(f"Wav2Lip stderr: {result.stderr[-1000:]}")  # Last 1000 chars
            raise AvatarGenerationError(
                f"Wav2Lip process exited with code {result.returncode}. "
                f"Stderr: {result.stderr[-400:]}"
            )

        # Verify output file
        if not output.exists() or output.stat().st_size == 0:
            raise AvatarGenerationError(
                f"Wav2Lip completed but output file is missing or empty: {output}"
            )

        logger.info(f"Avatar video generated: {output} ({output.stat().st_size} bytes)")
        return str(output)

    except subprocess.TimeoutExpired:
        raise AvatarGenerationError("Wav2Lip process timed out after 5 minutes.")
    except AvatarGenerationError:
        raise
    except Exception as e:
        raise AvatarGenerationError(f"Unexpected error running Wav2Lip: {e}")
