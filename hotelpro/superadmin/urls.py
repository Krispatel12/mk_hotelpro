from django.urls import path
from . import views

urlpatterns = [
    path('', views.super_landing, name='super_landing'),
    path('login/', views.super_login, name='super_login'),
    path('signup/', views.super_signup, name='super_signup'),
    path('api/send-otp/', views.super_api_send_otp, name='super_api_send_otp'),
    path('api/verify-otp/', views.super_api_verify_otp, name='super_api_verify_otp'),
    path('logout/', views.super_logout, name='super_logout'),
    path('forgot-password/', views.forgot_password, name='super_forgot_password'),
    path('reset-password/<str:token>/', views.reset_password, name='super_reset_password'),
    path('reset-password/', views.reset_password, name='super_reset_password_post'),
    # Dashboard
    path('dashboard/', views.dashboard, name='super_dashboard'),

    # Hotel Management / Approval Workflow
    path('hotels/', views.hotels_manage, name='super_hotels'),
    path('hotels/<int:hotel_id>/', views.hotel_detail_view, name='super_hotel_detail'),
    path('hotels/<int:hotel_id>/approve/', views.approve_hotel, name='super_approve_hotel'),
    path('hotels/<int:hotel_id>/reject/', views.reject_hotel, name='super_reject_hotel'),
    path('hotels/<int:hotel_id>/toggle-live/', views.toggle_hotel_live, name='super_toggle_hotel_live'),

    # Hotel Admin Management
    path('admins/', views.hotel_admins, name='super_hotel_admins'),
    path('admins/<int:user_id>/toggle/', views.toggle_hotel_admin, name='super_toggle_admin'),

    # Customer Management
    path('customers/', views.customers_manage, name='super_customers'),
    path('customers/<int:user_id>/toggle/', views.toggle_customer, name='super_toggle_customer'),

    # Bookings
    path('bookings/', views.bookings_manage, name='super_bookings'),

    # Reviews Moderation
    path('reviews/', views.reviews_moderate, name='super_reviews'),
    path('reviews/<int:review_id>/toggle/', views.toggle_review_visibility, name='super_toggle_review'),

    # Analytics
    path('analytics/', views.platform_analytics, name='super_analytics'),
]
