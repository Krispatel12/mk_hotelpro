import os
import django
from google import genai
from dotenv import load_dotenv

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

load_dotenv()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

def scan_models():
    print("\n--- Zenith Model Availability Scan ---")
    models = [
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro"
    ]
    
    for m in models:
        try:
            print(f"Testing {m}...", end=" ", flush=True)
            res = client.models.generate_content(model=m, contents="Say 'Operational'")
            if res and res.text:
                print(f"SUCCESS: {res.text.strip()}")
                return m
            else:
                print("EMPTY RESPONSE")
        except Exception as e:
            print(f"FAIL: {str(e)[:100]}...")
            
    return None

if __name__ == "__main__":
    winner = scan_models()
    if winner:
        print(f"\nWINNING MODEL: {winner}")
    else:
        print("\nALL MODELS EXHAUSTED (Quota or Auth issue)")
