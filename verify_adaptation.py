import os
import django

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithAgent
from HotelPro_Nexus.models import Hotel, CustomUser

def verify_adaptation():
    hotel = Hotel.objects.first()
    user = CustomUser.objects.filter(role='hotel_admin').first()
    
    if not hotel or not user:
        print("Error: Need dummy hotel and user for testing.")
        return

    agent = ZenithAgent(hotel, user)
    
    test_cases = [
        {
            "name": "Professional English",
            "query": "Please provide a comprehensive summary of my hotel portfolio performance for the current fiscal period."
        },
        {
            "name": "Casual/Normal English",
            "query": "hey, how many hotels do i have exactly? just the names please."
        },
        {
            "name": "Hinglish",
            "query": "mere hotels ke naam batao and unke status kya chal rahe hai?"
        },
        {
            "name": "Short/Direct",
            "query": "hotel names."
        }
    ]
    
    print("\n--- Adaptive Mirroring Verification ---")
    for case in test_cases:
        print(f"\n[TEST] {case['name']}")
        print(f"User: {case['query']}")
        response = agent.execute(case['query'])
        print(f"Agent: {response}")
        print("-" * 50)

    print("\n--- Adaptation Verification Complete ---")

if __name__ == "__main__":
    verify_adaptation()
