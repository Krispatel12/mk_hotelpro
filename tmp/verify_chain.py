import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

# Test models from the new fallback chain
models_to_test = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
    "models/gemini-flash-latest",
    "models/gemma-3-27b-it",
]

print(f"Testing NEW fallback chain...")
working = []
for model_name in models_to_test:
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Say 'ONLINE' in one word.",
            config=types.GenerateContentConfig(max_output_tokens=10)
        )
        text = response.candidates[0].content.parts[0].text.strip() if response.candidates else "NO TEXT"
        working.append(model_name)
        print(f"SUCCESS - {model_name}: {text}")
    except Exception as e:
        err = str(e)[:80]
        print(f"FAILED  - {model_name}: {err}")

print(f"\n--- WORKING MODELS ({len(working)}) ---")
for m in working:
    print(f"  OK: {m}")
