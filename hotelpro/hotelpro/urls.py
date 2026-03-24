from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Hotel Admin + Shared Auth (signup, login, onboarding, dashboard)
    path('', include('HotelPro_Nexus.urls')),

    # Super Admin Portal (separate login at /super/)
    path('super/', include('superadmin.urls')),

    # Customer Booking Portal
    path('explore/', include('customer.urls')),

    # AI Avatar Agent — Gemini + Wav2Lip pipeline
    path('', include('ai_agent.urls')),

    # Google OAuth & Allauth

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
