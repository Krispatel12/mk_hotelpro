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
    "models/gemini-2.0-flash-lite-preview-02-05",
    "models/gemini-1.0-pro"
]

results = []
results.append(f"Testing Gemini Models with API Key: {api_key[:5]}...{api_key[-5:]}\n")

for model_name in models_to_test:
    try:
        print(f"TESTING: {model_name}... ")
        response = client.models.generate_content(
            model=model_name,
            contents="Say 'OK'",
            config=types.GenerateContentConfig(max_output_tokens=10)
        )
        results.append(f"{model_name}: SUCCESS\n")
    except Exception as e:
        results.append(f"{model_name}: FAILED - {str(e)[:100]}\n")
    time.sleep(1)

with open('tmp/quota_results.txt', 'w') as f:
    f.writelines(results)

print("Test complete. Results in tmp/quota_results.txt")
