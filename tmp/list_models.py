import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Load env
dotenv_path = Path('c:/Users/krish/Desktop/kris(20)/kris(20)/hotelpro/.env')
load_dotenv(dotenv_path=dotenv_path)

api_key = os.getenv("GEMINI_API_KEY")

try:
    client = genai.Client(api_key=api_key)
    print("Available Models:")
    for m in client.models.list():
        print(f"- {m.name} (Supported: {m.supported_generation_methods})")
except Exception as e:
    print(f"FAILED to list models: {e}")
