import os
from google import genai
from dotenv import load_dotenv

# Load env from the project root
load_dotenv('c:/Users/krish/Desktop/kris(20)/kris(20)/hotelpro/.env')

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    with open('models_list.txt', 'w') as f:
        f.write("Listing Models...\n")
        for model in client.models.list():
            f.write(f"Model ID: {model.name}\n")
    print("Models list written to models_list.txt")
except Exception as e:
    print(f"Error listing models: {e}")
