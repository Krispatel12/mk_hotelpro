"""
AI Agent URL Configuration
"""
from django.urls import path
from . import views

app_name = 'ai_agent'

urlpatterns = [
    # Main avatar pipeline endpoint
    path('ask/', views.ask_avatar, name='ask_avatar'),

    # Diagnostic status endpoint (admin use)
    path('ask/status/', views.avatar_status, name='avatar_status'),
]
