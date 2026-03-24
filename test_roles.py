import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def test_roles():
    print("Testing roles...")
    try:
        # Test Case 1: Simple user/model turn
        contents = [
            types.Content(role="user", parts=[types.Part(text="Hello")]),
            types.Content(role="model", parts=[types.Part(text="Hi there! How can I help?")]),
            types.Content(role="user", parts=[types.Part(text="What is 2+2?")])
        ]
        res = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=contents
        )
        print(f"Success with user/model: {res.text[:20]}...")
    except Exception as e:
        print(f"FAILED Case 1: {e}")

    try:
        # Test Case 2: Using 'assistant' role
        contents = [
            types.Content(role="user", parts=[types.Part(text="Hello")]),
            types.Content(role="assistant", parts=[types.Part(text="Hi there!")]),
            types.Content(role="user", parts=[types.Part(text="Are you there?")])
        ]
        res = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=contents
        )
        print(f"Success with assistant: {res.text[:20]}...")
    except Exception as e:
        print(f"FAILED Case 2 (Likely): {str(e)[:100]}...")

if __name__ == "__main__":
    test_roles()
