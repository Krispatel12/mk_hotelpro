import os
from dotenv import load_dotenv
from pathlib import Path

# Try multiple paths
paths = [
    Path('c:/Users/krish/Desktop/kris(20)/kris(20)/hotelpro/.env'),
    Path('.env'),
    Path('../.env')
]

for p in paths:
    if p.exists():
        print(f"Checking {p.absolute()}")
        load_dotenv(dotenv_path=p, override=True)
        key = os.getenv('GEMINI_API_KEY')
        if key:
            print(f"KEY FOUND! Starts with: {key[:5]}...")
        else:
            print("KEY NOT FOUND in this file.")
    else:
        print(f"Path {p} does not exist.")
