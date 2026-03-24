import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Load env
dotenv_path = Path('c:/Users/krish/Desktop/kris(20)/kris(20)/hotelpro/.env')
load_dotenv(dotenv_path=dotenv_path)

api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing Key: {api_key[:10]}...{api_key[-5:]}")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="models/gemini-2.0-flash",
        contents="Hello, state your name and version safely."
    )
    print("SUCCESS!")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")
