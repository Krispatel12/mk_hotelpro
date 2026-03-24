import os
import django
import logging
from django.utils import timezone

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithAgent, ZenithDBOrchestrator
from HotelPro_Nexus.models import Hotel, AIChatMessage, CustomUser

def test_agent_memory():
    print("\n--- Testing Zenith Agent Stateful Memory ---")
    hotel = Hotel.objects.first()
    user = CustomUser.objects.filter(role='hotel_admin').first()
    
    if not hotel or not user:
        print("Error: Need dummy hotel and user for testing.")
        return

    agent = ZenithAgent(hotel, user)
    
    # turn 1
    print("User: What is the name of this hotel?")
    res1 = agent.execute("What is the name of this hotel?")
    print(f"Agent: {res1}")
    
    # turn 2
    print("\nUser: Can you tell me more about it?")
    res2 = agent.execute("Can you tell me more about it?")
    print(f"Agent: {res2}")
    
    print("\nVerification: Check if 'it' was resolved via memory.")
    return True

def test_lock_concurrency():
    print("\n--- Testing Zenith DB Lock Concurrency ---")
    # Simulate a lock
    acquired = ZenithDBOrchestrator.acquire_lock()
    print(f"Initial Lock Acquired: {acquired}")
    
    # Try to acquire again (should fail)
    acquired_again = ZenithDBOrchestrator.acquire_lock(timeout_secs=2)
    print(f"Second Lock Attempt (should fail): {acquired_again}")
    
    ZenithDBOrchestrator.release_lock()
    print("Lock Released.")
    return True

if __name__ == "__main__":
    try:
        test_lock_concurrency()
        test_agent_memory()
    except Exception as e:
        print(f"Test Failed: {e}")
