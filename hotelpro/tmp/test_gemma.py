import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

model_name = "models/gemma-3-27b-it"
print(f"Testing {model_name}...")
try:
    response = client.models.generate_content(
        model=model_name,
        contents="Hello, identify yourself."
    )
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Failed: {e}")
