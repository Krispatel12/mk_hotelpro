import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

with open('tmp/available_models.txt', 'w') as f:
    f.write(f"Listing models for API Key: {api_key[:5]}...{api_key[-5:]}\n")
    try:
        for model in client.models.list():
            f.write(f"Model ID: {model.name}\n")
    except Exception as e:
        f.write(f"Failed to list models: {e}\n")

print("List complete. Results in tmp/available_models.txt")
