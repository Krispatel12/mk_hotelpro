import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from HotelPro_Nexus.models import Hotel, RoomCategory, Booking, Review

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds database with premium dummy data for demonstration'

    def handle(self, *args, **options):
        self.stdout.write("Seeding data...")

        # 1. Create Hotel Admins
        emails = ['owner1@hotelpro.com', 'owner2@hotelpro.com', 'owner3@hotelpro.com']
        owners = []
        for email in emails:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'username': email.split('@')[0], 'role': 'hotel_admin', 'is_active': True}
            )
            if created:
                user.set_password('password123')
                user.save()
            owners.append(user)

        # 2. Create Hotels
        hotel_data = [
            {'name': 'The Royal Palace', 'city': 'Mumbai', 'category': 'LUXURY', 'rating': 5},
            {'name': 'Ocean Breeze Resort', 'city': 'Goa', 'category': 'RESORT', 'rating': 4},
            {'name': 'Urban Loft Stay', 'city': 'Bangalore', 'category': 'BOUTIQUE', 'rating': 3},
        ]

        hotels = []
        for i, data in enumerate(hotel_data):
            hotel, created = Hotel.objects.get_or_create(
                name=data['name'],
                owner=owners[i % len(owners)],
                defaults={
                    'city': data['city'],
                    'category': data['category'],
                    'star_rating': data['rating'],
                    'status': 'LIVE',
                    'is_live': True,
                    'address': f"123 {data['city']} Main St",
                    'narrative': f"A premium {data['category'].lower()} experience in the heart of {data['city']}."
                }
            )
            hotels.append(hotel)

        # 3. Create Rooms
        room_types = [
            {'name': 'Deluxe Room', 'class': 'DELUXE', 'price': 5000},
            {'name': 'Premium Suite', 'class': 'SUITE', 'price': 12000},
            {'name': 'Standard Stay', 'class': 'STANDARD', 'price': 2500},
        ]

        rooms = []
        for hotel in hotels:
            for rt in room_types:
                room, created = RoomCategory.objects.get_or_create(
                    hotel=hotel,
                    name=rt['name'],
                    defaults={
                        'room_class': rt['class'],
                        'base_price': rt['price'],
                        'max_guests': random.randint(2, 4),
                        'inventory_count': 10,
                        'amenities': ['Wi-Fi', 'AC', 'TV', 'Coffee Maker']
                    }
                )
                rooms.append(room)

        # 4. Create Customers
        customers = []
        for i in range(5):
            c_email = f'guest{i}@example.com'
            user, created = User.objects.get_or_create(
                email=c_email,
                defaults={'username': f'guest{i}', 'role': 'customer', 'is_active': True}
            )
            if created:
                user.set_password('password123')
                user.save()
            customers.append(user)

        # 5. Create Bookings & Reviews
        for i in range(20):
            hotel = random.choice(hotels)
            room = random.choice(hotel.rooms.all())
            customer = random.choice(customers)
            
            check_in = timezone.now() - timedelta(days=random.randint(-10, 30))
            check_out = check_in + timedelta(days=random.randint(1, 5))
            
            booking = Booking.objects.create(
                hotel=hotel,
                room_category=room,
                guest_name=customer.username,
                guest_email=customer.email,
                check_in=check_in,
                check_out=check_out,
                total_revenue=room.base_price * (check_out - check_in).days,
                status=random.choice(['CONFIRMED', 'PENDING', 'DEPARTED']),
                payment_status=random.choice(['PAID', 'UNPAID'])
            )

            # Add reviews for older bookings
            if booking.check_out < timezone.now():
                Review.objects.create(
                    hotel=hotel,
                    guest_name=customer.username,
                    rating=random.randint(3, 5),
                    comment=random.choice([
                        "Amazing stay! Very clean.",
                        "Good value for money but service was slow.",
                        "Excellent location and staff.",
                        "The room was a bit small but overall good."
                    ]),
                    is_visible=True
                )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
