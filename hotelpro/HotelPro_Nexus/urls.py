from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing_page, name='landing_page'),
    path('contact/', views.contact_us, name='contact_us'),

    # ── AI Sales Agent — Public (Pre-Login) ──────────────────────────────────
    path('api/sales-agent/chat/', views.api_sales_agent_chat, name='api_sales_agent_chat'),
    path('api/sales-agent/lead/', views.api_sales_agent_capture_lead, name='api_sales_agent_capture_lead'),
    path('api/sales-agent/meta-webhook/', views.meta_webhook, name='meta_webhook'),
    path('api/sales-agent/voice-webhook/', views.voice_webhook, name='voice_webhook'),

    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),
    # Landing page "Start Free" — always shows login, clears any active session
    path('start-free/', views.hotel_admin_login, name='hotel_admin_login'),

    # AJAX OTP endpoints (signup flow)
    path('api/signup/send-otp/', views.api_send_otp, name='api_send_otp'),
    path('api/signup/verify-otp/', views.api_verify_otp, name='api_verify_otp'),
    path('api/bookings/latest/', views.api_latest_booking, name='api_latest_booking'),

    path('verify-otp/', views.verify_otp_view, name='verify_otp'),

    # Enterprise password reset — token-based flow
    path('forgot-password/', views.password_reset_request_view, name='forget_password'),
    path('reset-password/<str:token>/', views.password_reset_confirm_view, name='password_reset_confirm'),

    path('hotel-onboarding/', views.hotel_onboarding, name='hotel_onboarding'),
    path('admin-dashboard/', views.dashboard, name='admin_dashboard_pro'),
    path('admin-dashboard/<int:hotel_id>/', views.dashboard, name='admin_dashboard_specific'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/<int:hotel_id>/', views.dashboard, name='dashboard_specific'),
    path('my-hotels/', views.my_hotels, name='my_hotels'),
    path('hotels/delete/<int:hotel_id>/', views.delete_hotel, name='delete_hotel'),
    path('hotels/edit/<int:hotel_id>/', views.edit_hotel, name='edit_hotel'),
    path('rooms/', views.manage_rooms, name='manage_rooms'),
    path('rooms/<int:hotel_id>/', views.manage_rooms, name='manage_rooms_hotel'),
    path('rooms/add', views.add_room, name='new_add_room'),
    path('rooms/<int:hotel_id>/add/', views.add_room, name='add_room'),
    path('rooms/edit/<int:room_id>/', views.add_room, name='edit_room'),
    path('rooms/delete/<int:room_id>/', views.delete_room, name='delete_room'),
    path('rooms/toggle/<int:room_id>/', views.toggle_room_status, name='room_toggle_status'),
    path('offers/', views.offers, name='offers'),
    path('bookings/', views.bookings, name='bookings'),
    path('api/bookings/', views.api_bookings, name='api_bookings'),
    path('bookings/<int:booking_id>/update/', views.update_booking_status, name='update_booking_status'),
    path('insights/', views.insights, name='insights'),
    path('reviews/', views.reviews, name='reviews'),
    path('api/reviews/', views.api_reviews, name='api_reviews'),
    path('settings/', views.profile_settings, name='profile_settings'),


    # Super Admin Quality Control Protocols
    path('admin/verify/', views.admin_verify_list, name='admin_verify_list'),
    path('admin/offers/', views.admin_offer_list, name='admin_offer_list'),
    path('admin/offers/<int:offer_id>/review/', views.admin_review_offer, name='admin_review_offer'),
    path('offers/add/', views.add_offer, name='add_offer'),
    path('offers/edit/<int:offer_id>/', views.add_offer, name='edit_offer'),
    path('offers/toggle/<int:offer_id>/', views.toggle_offer_status, name='toggle_offer_status'),
    path('offers/delete/<int:offer_id>/', views.delete_offer, name='delete_offer'),
    path('api/offers/<int:offer_id>/usage/', views.offer_usage_details, name='offer_usage_details'),
    path('api/offers/<int:offer_id>/rooms/', views.offer_rooms_details, name='offer_rooms_details'),

    # AI Agent Architecture (Elite)
    path('ai-dashboard/', views.ai_dashboard, name='ai_dashboard'),
    path('ai-dashboard/<int:hotel_id>/', views.ai_dashboard, name='ai_dashboard_specific'),
    path('ai-chat/', views.ai_chat, name='ai_chat'),
    path('ai-chat/<int:hotel_id>/', views.ai_chat, name='ai_chat_specific'),
    path('ai-tasks/', views.ai_tasks, name='ai_tasks'),
    path('ai-tasks/<int:hotel_id>/', views.ai_tasks, name='ai_tasks_specific'),
    path('ai-analyst/', views.ai_analyst, name='ai_analyst'),
    path('ai-analyst/<int:hotel_id>/', views.ai_analyst, name='ai_analyst_specific'),
    path('ai-live/', views.ai_live, name='ai_live'),
    path('ai-live/<int:hotel_id>/', views.ai_live, name='ai_live_specific'),
    path('api/ai/<int:hotel_id>/chat/', views.api_ai_chat, name='api_ai_chat'),
    path('api/ai/<int:hotel_id>/toggle-automation/', views.api_ai_toggle_automation, name='api_ai_toggle_automation'),
    path('api/ai/<int:hotel_id>/execute-task/<int:task_id>/', views.api_ai_execute_task, name='api_ai_execute_task'),
    path('api/ai/guest/chat/', views.api_ai_guest_chat, name='api_ai_guest_chat'),
    path('api/ai/admin/strategy/', views.api_ai_super_admin_strategy, name='api_ai_super_admin_strategy'),
    path('api/ai/admin/hotel-audit/<int:hotel_id>/', views.api_ai_hotel_audit, name='api_ai_hotel_audit'),
    path('api/ai/<int:hotel_id>/review-response/<int:review_id>/', views.api_ai_generate_review_response, name='api_ai_generate_review_response'),
    path('api/ai/portfolio/insights/', views.api_ai_portfolio_insights, name='api_ai_portfolio_insights'),
    path('admin/ai-strategy/', views.admin_ai_strategy, name='admin_ai_strategy'),
    
    # Sentinel v4.0 — Session & Intelligence Stream
    path('api/ai/<int:hotel_id>/sessions/', views.api_ai_sessions, name='api_ai_sessions'),
    path('api/ai/<int:hotel_id>/sessions/<int:session_id>/messages/', views.api_ai_session_messages, name='api_ai_session_messages'),
    path('api/ai/<int:hotel_id>/messages/<int:message_id>/edit/', views.api_ai_edit_message, name='api_ai_edit_message'),
    path('api/ai/<int:hotel_id>/messages/<int:message_id>/update-response/', views.api_ai_update_message_response, name='api_ai_update_message_response'),
    path('api/ai/<int:hotel_id>/upload/', views.api_ai_upload_document, name='api_ai_upload_document'),
    path('api/ai/<int:hotel_id>/search/', views.api_ai_search_chat, name='api_ai_search_chat'),
    path('api/ai/<int:hotel_id>/recycle-bin/', views.api_ai_recycle_bin, name='api_ai_recycle_bin'),
    path('api/ai/<int:hotel_id>/recycle-bin/action/', views.api_ai_recycle_bin_action, name='api_ai_recycle_bin_action'),
    path('api/ai/theme/', views.api_ai_set_theme, name='api_ai_set_theme'),

    # ── DIRECT BOOKING ENGINE — Public (Guest Facing) ────────────────────────
    path('hotel/p/<int:hotel_id>/', views.hotel_public_view, name='hotel_public_view'),
    path('api/hotel/p/<int:hotel_id>/book/', views.api_guest_create_booking, name='api_guest_create_booking'),
]
