import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

try:
    from ai_agent.services.pipeline import run_avatar_pipeline
    print("SUCCESS: pipeline imported")
except Exception as e:
    print(f"FAILURE: pipeline import failed: {e}")

try:
    from ai_agent.services.ai_service import generate_response
    print("SUCCESS: ai_service imported")
except Exception as e:
    print(f"FAILURE: ai_service import failed: {e}")
