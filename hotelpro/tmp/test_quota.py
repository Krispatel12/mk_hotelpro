import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

models_to_test = [
    "models/gemini-2.0-flash",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-flash-8b",
    "models/gemini-1.5-pro",
    "models/gemini-2.0-flash-lite",
    "models/gemini-1.0-pro"
]

print(f"Testing Gemini Models with API Key: {api_key[:5]}...{api_key[-5:]}")

for model_name in models_to_test:
    try:
        print(f"TESTING: {model_name}... ", end="", flush=True)
        response = client.models.generate_content(
            model=model_name,
            contents="Say 'OK'",
            config=types.GenerateContentConfig(max_output_tokens=10)
        )
        print("SUCCESS!")
    except Exception as e:
        print(f"FAILED: {str(e)[:50]}...")
    time.sleep(1)
