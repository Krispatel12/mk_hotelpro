import os
import sys
import django

# Add project root to sys.path
project_root = r"c:\Users\krish\Desktop\kris(20)\kris(20)\hotelpro"
if project_root not in sys.path:
    sys.path.append(project_root)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.models import Hotel, AITask
from HotelPro_Nexus.utils_ai import HotelAIService

# Get the first hotel
hotel = Hotel.objects.first()
if hotel:
    print(f"Triggering analysis for {hotel.name}...")
    service = HotelAIService(hotel)
    success = service.perform_periodic_analysis()
    print(f"Analysis success: {success}")
    
    # Check for new tasks
    tasks = AITask.objects.filter(hotel=hotel).order_by('-created_at')[:5]
    print(f"Total tasks in DB: {AITask.objects.count()}")
    for t in tasks:
        print(f" - [{t.status}] {t.category} ({t.priority}): {t.title}")
        print(f"   Impact: {t.impact_estimate}")
else:
    print("No hotel found in DB.")
