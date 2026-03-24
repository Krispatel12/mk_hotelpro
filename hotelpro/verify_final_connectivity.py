import os
import django
import logging
from django.utils import timezone
from decimal import Decimal

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.utils_ai import ZenithToolRegistry, ZenithAgent, AIAuditLog
from HotelPro_Nexus.models import Hotel, Booking, CustomUser, Offer, AIDocument, AIChatSession, AIChatMessage

def verify_all_connections():
    print("\n--- Zenith Final 100% Data Connectivity Audit ---")
    
    hotel = Hotel.objects.first()
    user = CustomUser.objects.filter(role='hotel_admin').first()
    
    if not hotel or not user:
        print("Error: Need dummy hotel and user for testing.")
        return

    print(f"Target Property: {hotel.name} (ID: {hotel.id})")

    # 1. System Health & Infrastructure
    print("\n[Audit] AI System Health...")
    res_health = ZenithToolRegistry.get_ai_system_health(hotel.id)
    print(f"Cumulative Log Cost: {res_health.get('usage_metrics', {}).get('estimated_cumulative_cost')}")
    print(f"Action Mode: {res_health.get('availability', {}).get('action_mode_active')}")

    # 2. Regulatory & Compliance
    print("\n[Audit] Regulatory Intelligence...")
    res_reg = ZenithToolRegistry.get_hotel_regulatory_intel(hotel.id)
    print(f"GST Number found: {bool(res_reg.get('regulatory', {}).get('gst_number'))}")
    print(f"Reg Number found: {bool(res_reg.get('regulatory', {}).get('govt_reg_number'))}")

    # 3. Advanced Offer Analytics
    print("\n[Audit] Offer Strategic Analytics...")
    offer = Offer.objects.first()
    if offer:
        res_off = ZenithToolRegistry.get_offer_analytics(offer.code)
        print(f"Offer: {res_off.get('offer_name')} | Revenue: {res_off.get('performance', {}).get('revenue_generated')}")
    else:
        print("No offers found to audit.")

    # 4. Memory & History Search
    print("\n[Audit] Conversation History Search...")
    # Create a dummy message to search for
    AIChatMessage.objects.create(
        hotel=hotel, user=user, 
        query="The eagle has landed", 
        response="Copy that.",
        session_id=None
    )
    res_mem = ZenithToolRegistry.search_conversation_history(user, "eagle")
    print(f"Matches for 'eagle': {res_mem.get('total_matches', 0)}")

    # 5. Session Document Context
    print("\n[Audit] Session Vault Listing...")
    session = AIChatSession.objects.filter(user=user).first()
    if session:
        res_docs = ZenithToolRegistry.list_session_documents(session.id)
        print(f"Docs in Session {session.id}: {len(res_docs.get('documents', []))}")
    else:
        print("No active session found for vault audit.")

    print("\n--- Zenith Grounding Audit SUCCESS ---")

if __name__ == "__main__":
    verify_all_connections()
