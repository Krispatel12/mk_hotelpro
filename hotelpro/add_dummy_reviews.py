import os
import django
from django.utils import timezone
import random

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.models import Hotel, Review, Booking

def populate_dummy_reviews():
    hotel = Hotel.objects.first()
    if not hotel:
        print("No hotel found. Please ensure a hotel exists first.")
        return

    print(f"Adding dummy reviews to {hotel.name}...")

    reviews_data = [
        {
            "guest_name": "Sophia Miller",
            "rating": 5,
            "comment": "An absolutely stunning property! The attention to detail in the suite was remarkable. The staff went above and beyond to make our stay perfect.",
            "is_visible": True
        },
        {
            "guest_name": "James Wilson",
            "rating": 4,
            "comment": "Great experience overall. The dining options were excellent, though the check-in took a bit longer than expected. Would definitely come back.",
            "is_visible": True
        },
        {
            "guest_name": "Olivia Thompson",
            "rating": 5,
            "comment": "Perfect location and world-class service. The spa treatment was the highlight of our trip. Highly recommend the deluxe suites.",
            "is_visible": True
        },
        {
            "guest_name": "Ethan Davis",
            "rating": 3,
            "comment": "The room was nice but the air conditioning was a bit noisy. Staff corrected it quickly, but expected a bit more for the price.",
            "is_visible": True
        }
    ]

    for data in reviews_data:
        Review.objects.create(
            hotel=hotel,
            guest_name=data["guest_name"],
            rating=data["rating"],
            comment=data["comment"],
            is_visible=data["is_visible"],
            created_at=timezone.now()
        )

    print(f"Successfully added {len(reviews_data)} dummy reviews to {hotel.name}.")

if __name__ == "__main__":
    populate_dummy_reviews()
