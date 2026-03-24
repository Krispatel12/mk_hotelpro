import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

print(f"Listing models for API Key: {api_key[:5]}...{api_key[-5:]}")
try:
    for model in client.models.list():
        print(f"Model: {model.name} (Methods: {model.supported_generation_methods})")
except Exception as e:
    print(f"Failed to list models: {e}")
