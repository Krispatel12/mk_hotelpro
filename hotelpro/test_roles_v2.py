import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def test_roles_v2():
    print("Testing roles V2...")
    model = "models/gemini-flash-lite-latest" # Known working model usually
    
    try:
        # Test Case 1: Simple user/model turn
        contents = [
            types.Content(role="user", parts=[types.Part(text="Hello")]),
            types.Content(role="model", parts=[types.Part(text="Hi there!")]),
            types.Content(role="user", parts=[types.Part(text="Repeat the word 'AGENT'")])
        ]
        res = client.models.generate_content(model=model, contents=contents)
        print(f"Success with user/model: {res.text.strip()}")
    except Exception as e:
        print(f"FAILED Case 1: {e}")

    try:
        # Test Case 2: No roles assigned (just list of parts)
        # This is how google-genai sometimes prefers it for simple chats
        res = client.models.generate_content(model=model, contents=["Hello", "Hi there!", "Repeat the word 'AGENT'"])
        print(f"Success with string list: {res.text.strip()}")
    except Exception as e:
        print(f"FAILED Case 2: {e}")

if __name__ == "__main__":
    test_roles_v2()
