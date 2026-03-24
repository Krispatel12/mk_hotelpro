import os
import django
import logging

# Setup Django context
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithAgent
from HotelPro_Nexus.models import Hotel, CustomUser

def verify_empire_brain():
    print("\n--- Sentinel Intelligence Alpha: Empire Brain Verification ---")
    owner = CustomUser.objects.filter(role='hotel_owner').first()
    
    # Try to find a hotel to anchor the agent (even if global mode is used)
    hotel = Hotel.objects.filter(owner=owner).first()
    
    if not hotel or not owner:
        print("Error: Need dummy hotels and an owner for testing.")
        return

    agent = ZenithAgent(hotel, owner)
    
    queries = [
        "Give me a global overview of my hotel empire.",
        "Which of my properties is currently underperforming?",
        "Compare my hotels in different cities.",
        "Suggest a redistribution strategy for my portfolio."
    ]
    
    for q in queries:
        print(f"\nUser: {q}")
        response = agent.execute(q)
        print(f"Sentinel Alpha:\n{response}")
        
        # Heuristic checks for Alpha style
        if "Global Insight:" in response or "Top Performer:" in response:
            print("[PASS] Global Executive Format Detected.")
        else:
            print("[WARN] Global format missing.")

if __name__ == "__main__":
    verify_empire_brain()
