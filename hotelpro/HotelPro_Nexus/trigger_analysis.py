import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'HotelPro_Nexus.settings')
django.setup()

from HotelPro_Nexus.models import Hotel
from HotelPro_Nexus.utils_ai import HotelAIService

# Get the first hotel
hotel = Hotel.objects.first()
if hotel:
    print(f"Triggering analysis for {hotel.name}...")
    service = HotelAIService(hotel)
    success = service.perform_periodic_analysis()
    print(f"Analysis success: {success}")
    
    # Check for new tasks
    from HotelPro_Nexus.models import AITask
    tasks = AITask.objects.filter(hotel=hotel).order_by('-created_at')[:5]
    print(f"Total tasks in DB: {AITask.objects.count()}")
    for t in tasks:
        print(f" - [{t.status}] {t.category}: {t.title} (Priority: {t.priority})")
else:
    print("No hotel found in DB.")
