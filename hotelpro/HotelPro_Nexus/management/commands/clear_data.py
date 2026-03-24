from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from HotelPro_Nexus.models import Hotel, RoomCategory, Booking, Review, Offer, HotelGallery, RoomPhoto

User = get_user_model()

class Command(BaseCommand):
    help = 'Clears all dummy data from the database while preserving superusers'

    def handle(self, *args, **options):
        self.stdout.write("Clearing database...")

        # 1. Delete Bookings and Reviews
        Booking.objects.all().delete()
        Review.objects.all().delete()
        self.stdout.write("Deleted all bookings and reviews.")

        # 2. Delete Offers
        Offer.objects.all().delete()
        self.stdout.write("Deleted all offers.")

        # 3. Delete Hotels and related (Room Categories, Photos, etc.)
        # This will cascade delete RoomCategory, HotelGallery, RoomPhoto? 
        # (Assuming on_delete=models.CASCADE is set)
        Hotel.objects.all().delete()
        self.stdout.write("Deleted all hotels and room categories.")

        # 4. Delete non-superuser accounts
        users_deleted = User.objects.filter(is_superuser=False).delete()
        self.stdout.write(f"Deleted {users_deleted[0]} user accounts (Admins & Customers).")

        self.stdout.write(self.style.SUCCESS("Database cleared successfully! (Superusers preserved)"))
