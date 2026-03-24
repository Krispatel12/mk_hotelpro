import os
import django
import logging
from django.utils import timezone

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithToolRegistry, ZenithAgent
from HotelPro_Nexus.models import Hotel, Booking, CustomUser, Offer, AIDocument, AIChatSession

def verify_extended_tools():
    print("\n--- Zenith Extended Tool Verification ---")
    
    hotel = Hotel.objects.first()
    user = CustomUser.objects.filter(role='hotel_admin').first()
    
    if not hotel or not user:
        print("Error: Need dummy hotel and user for testing.")
        return

    print(f"Using Hotel: {hotel.name} (ID: {hotel.id})")
    print(f"Using User: {user.username}")

    # 1. Test search_bookings
    print("\n[Tool Test] search_bookings...")
    res_search = ZenithToolRegistry.search_bookings(user, hotel_id=hotel.id)
    print(f"Matches Found: {res_search.get('matches_found', 'N/A')}")
    if res_search.get('bookings'):
        print(f"First Booking: {res_search['bookings'][0]['reference']} - {res_search['bookings'][0]['guest']}")
    else:
        print("No bookings found in search.")

    # 2. Test list_ai_tasks
    print("\n[Tool Test] list_ai_tasks...")
    res_tasks = ZenithToolRegistry.list_ai_tasks(hotel.id)
    print(f"Tasks Found: {len(res_tasks.get('tasks', []))}")

    # 3. Test list_ai_insights
    print("\n[Tool Test] list_ai_insights...")
    res_insights = ZenithToolRegistry.list_ai_insights(hotel.id)
    print(f"Insights Found: {len(res_insights.get('insights', []))}")

    # 4. Test search_vault (if documents exist)
    print("\n[Tool Test] search_vault...")
    session = AIChatSession.objects.filter(user=user).first()
    if session:
        res_vault = ZenithToolRegistry.search_vault(user, session.id, "test")
        print(f"Docs Scanned: {res_vault.get('docs_scanned', 0)}")
    else:
        print("No chat session found for vault test.")

    # 5. Test get_booking_drilldown enhancement
    print("\n[Tool Test] get_booking_drilldown (with offer check)...")
    booking = Booking.objects.filter(hotel=hotel).first()
    if booking:
        res_drill = ZenithToolRegistry.get_booking_drilldown(user, booking.reference)
        print(f"Booking: {res_drill['reference']}")
        print(f"Offer Data: {res_drill['economics'].get('applied_offer')}")
    else:
        print("No booking found for drilldown test.")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    verify_extended_tools()
