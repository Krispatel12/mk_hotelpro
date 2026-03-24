from google import genai
import sys

# Direct Key Test
api_key = "AIzaSyDBSSbv3_QiLXj2lfFJFkeKcS446n5Fy_Q"

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="models/gemini-2.0-flash",
        contents="Say 'KEY_ACTIVE'"
    )
    print(f"RESULT: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
