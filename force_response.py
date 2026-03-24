import os
import django
import time
from dotenv import load_dotenv
from pathlib import Path

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithAgent
from HotelPro_Nexus.models import Hotel, CustomUser

def test_force_response():
    print("\n--- Zenith FORCE RESPONSE TEST ---")
    hotel = Hotel.objects.first()
    user = CustomUser.objects.filter(role='hotel_admin').first()
    
    if not hotel or not user:
        print("Error: Missing hotel/user")
        return

    agent = ZenithAgent(hotel, user)
    
    # Wait 25 seconds to clear any active rate limits
    print("Pre-flight cooldown (25s)...")
    time.sleep(25)
    
    print("Requesting: Say 'READY'")
    res = agent.execute("Say 'READY'")
    print(f"\nZENITH RESPONSE: {res}\n")

if __name__ == "__main__":
    test_force_response()
