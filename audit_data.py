import os
import django

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.models import Hotel, Booking, Review

def audit_all_data():
    hotels = Hotel.objects.all()
    print(f"{'Hotel Name':<20} | {'Bookings':<10} | {'Reviews':<10} | {'Status'}")
    print("-" * 65)
    
    for h in hotels:
        b_count = h.bookings.count()
        r_count = h.reviews.count()
        status = "No Data"
        if b_count > 0 or r_count > 0:
            status = "FOUND DATA"
            
        print(f"{h.name[:20]:<20} | {b_count:<10} | {r_count:<10} | {status}")
        
    total_bookings = Booking.objects.count()
    total_reviews = Review.objects.count()
    print("-" * 65)
    print(f"Grand Total Portfolio: {total_bookings} Bookings, {total_reviews} Reviews")

if __name__ == "__main__":
    audit_all_data()
