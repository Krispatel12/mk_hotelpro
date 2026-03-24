import os
import django

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithAgent
from HotelPro_Nexus.models import Hotel, CustomUser

def verify_persona():
    hotel = Hotel.objects.first()
    user = CustomUser.objects.filter(role='hotel_admin').first()
    
    if not hotel or not user:
        print("Error: Need dummy hotel and user for testing.")
        return

    agent = ZenithAgent(hotel, user)
    
    queries = [
        "just tell me my hotel name",
        "How many hotels do I manage?"
    ]
    
    print("\n--- Persona Verification Test ---")
    for q in queries:
        print(f"\nUser: {q}")
        response = agent.execute(q)
        print(f"Agent: {response}")
        
        # Validation checks
        if "ID:" in response and "(" in response:
            print("WARNING: Technical IDs still detected!")
        if "Based on the system data" in response:
            print("WARNING: Robotic phrasing detected!")

    print("\n--- Persona Verification Complete ---")

if __name__ == "__main__":
    verify_persona()
