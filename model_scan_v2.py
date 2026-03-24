import os
import django
from google import genai
from google.genai import types
from dotenv import load_dotenv

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

load_dotenv()
# Try different client config
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'), http_options={'api_version': 'v1beta'})

def scan_models_v2():
    print("\n--- Zenith Model Availability Scan V2 (v1beta) ---")
    # Exact names from models_actual.txt
    models = [
        "models/gemini-2.0-flash-lite",
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
        "models/gemini-1.0-pro"
    ]
    
    for m in models:
        try:
            print(f"Testing {m}...", end=" ", flush=True)
            res = client.models.generate_content(model=m, contents="Operational test.")
            if res and res.text:
                print(f"SUCCESS: {res.text.strip()}")
                return m
            else:
                print("EMPTY RESPONSE")
        except Exception as e:
            print(f"FAIL: {str(e)[:80]}...")
            
    return None

if __name__ == "__main__":
    winner = scan_models_v2()
    if winner:
        print(f"\nWINNING MODEL: {winner}")
    else:
        # Try v1 if v1beta failed
        print("\nRetrying with v1...")
        client_v1 = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
        # ... same logic ...
        print("Finalizing scan...")
