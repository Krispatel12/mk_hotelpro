from django.urls import path
from . import views

app_name = 'customer'

urlpatterns = [
    # Customer Landing & Auth
    path('', views.customer_landing, name='customer_landing'),
    path('signup/', views.customer_signup, name='customer_signup'),
    path('login/', views.customer_login, name='customer_login'),
    path('logout/', views.customer_logout, name='customer_logout'),

    # OTP API (for 3-step signup)
    path('api/send-otp/', views.api_send_otp, name='api_send_otp'),
    path('api/verify-otp/', views.api_verify_otp, name='api_verify_otp'),

    # Hotel Discovery
    path('hotels/', views.customer_home, name='customer_home'),
    path('hotel/<int:hotel_id>/', views.hotel_detail, name='hotel_detail'),

    # Booking
    path('book/<int:room_id>/', views.book_room, name='book_room'),
    path('api/validate-coupon/', views.validate_coupon, name='validate_coupon'),
    path('booking/<str:ref>/payment/', views.process_payment, name='process_payment'),
    path('booking/<str:ref>/confirmation/', views.booking_confirmation, name='booking_confirmation'),
    path('my-bookings/', views.my_bookings, name='my_bookings'),

    # Review
    path('hotel/<int:hotel_id>/review/', views.add_review, name='add_review'),
]
