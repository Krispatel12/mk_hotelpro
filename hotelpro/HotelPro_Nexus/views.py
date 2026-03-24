from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout, update_session_auth_hash
from django.contrib import messages
from django.conf import settings as django_settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.template.loader import render_to_string
from django.db import models, transaction
from django.db.models import Avg, Sum
from datetime import timedelta, datetime
import time
from django.core.cache import cache
from django.core.mail import send_mail, EmailMessage
from django.contrib.auth.decorators import login_required
from .forms import CustomUserCreationForm, CustomLoginForm, OTPVerificationForm, ContactForm
from .models import (
    CustomUser, OTPVerification, PasswordResetToken, PasswordResetAudit, 
    Hotel, RoomCategory, HotelGallery, RoomPhoto, Booking, Offer, Review,
    AIAgentConfig, AIChatMessage, AITask, AIInsight, AIChatSession, AIDocument,
    SalesLead
)
from .utils_ai import HotelAIService, GuestAIService, SuperAdminAIService, PortfolioAIService, ZenithAgent
from .decorators import hotel_admin_required, super_admin_required, _redirect_to_correct_dashboard
from .utils import (
    _get_client_ip, _validate_password_policy, _hash_token, 
    _send_otp_email, _send_reset_email, _send_reset_success_email
)
import random
import secrets
import json
import logging
import os
import requests
import re
from decimal import Decimal
from . import utils
from google import genai as _genai
from google.genai import types as _types
logger = logging.getLogger('hotelpro')

# ── AI SALES AGENT SYSTEM PROMPT ───────────────────────────────────────────
SYSTEM_PROMPT = """You are Alex, a friendly and expert Sales Representative for HotelPro AI — a next-generation hotel management platform.

YOUR ROLE: 60% Sales Expert + 30% Customer Success + 10% Human Friend
TARGET: Hotel owners, property managers, and hospitality business starters.

PLATFORM VALUE:
- Manage all bookings in one dashboard (no more manual Excel sheets)
- AI-powered automation (auto-confirmations, follow-ups, reviews)
- Real-time revenue insights and occupancy tracking
- Customer CRM — never lose a guest relationship
- Offers & promotions engine
- Multi-hotel support (for property chains)
- Works for small guesthouses to 5-star hotels

DISCOVERY QUESTIONS (ask naturally, one at a time):
- Are you currently running a hotel? How many rooms?
- How do you manage bookings right now? Manually or with software?
- What's your biggest challenge — filling rooms, managing guests, or operations?
- Have you ever lost a booking because of a delayed response?

PERSUASION FRAME — Problem → Solution → Benefit:
- "Most hotel owners we talk to spend 3-4 hours daily on manual bookings. Our platform automates all of that."
- "A 50-room hotel using HotelPro sees an average 23% revenue increase in 3 months."
- "You can set it up in one afternoon — we'll even help you onboard."

TONE RULES:
- NEVER sound like a robot. Sound like a helpful human colleague.
- Keep messages SHORT (2-4 sentences max). No long paragraphs.
- Use emojis sparingly (1 per message max) when it feels natural.
- Ask ONE follow-up question per reply (discovery or closing).
- If they ask a question, answer it FIRST, then ask your question.
- If they show interest → push toward CTA (signup or demo).
- If they're unsure → give a simple, clear benefit.
- If they're not interested → be polite, don't push, offer to come back.
- NEVER make up fake data. If you don't know something, say HotelPro's team will assist.

CALL TO ACTION — Suggest at the right moment:
- "I'd suggest trying the free trial — takes 2 minutes to sign up, no credit card needed."
- "Want me to show you a quick demo of what the dashboard looks like?"
- "If you want, I can get someone from our team to call you and walk you through it."

LEAD SCORING (internal, do not reveal):
After EACH reply, append exactly this JSON block at the very END of your response, on a new line:
{"__meta__":{"interest":"hot"|"warm"|"cold","quick_replies":["option1","option2","option3"],"show_cta":true|false,"cta_label":"Start Free Trial","cta_url":"/start-free/","name":"extracted name or empty string","email":"extracted email or empty string","phone":"extracted phone or empty string"}}
"""

HOTEL_SERVICE_CHOICES = [
    ('Wifi', 'High-speed WiFi'),
    ('Parking', 'Free Parking'),
    ('Pool', 'Swimming Pool'),
    ('Spa', 'Luxury Spa'),
    ('Gym', 'Fitness Center'),
    ('Restaurant', 'Fine Dining'),
    ('Bar', 'Premium Bar'),
    ('Laundry', 'Laundry Service'),
    ('Airport', 'Airport Transfer'),
    ('Conference', 'Conference Room'),
    ('Ev', 'EV Charging'),
    ('Pet', 'Pet Friendly'),
]

# ─────────────────────────────────────────────────────────────────────────────
# SIGNUP OTP APIs
# ─────────────────────────────────────────────────────────────────────────────

@require_POST
def api_send_otp(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')

        if not username or not email:
            return JsonResponse({'status': 'error', 'message': 'Username and email are required.'}, status=400)

        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Account with this email already exists.'}, status=400)

        # Rate limit: wait 30 s between resends
        recent_otp = OTPVerification.objects.filter(email=email).order_by('-created_at').first()
        if recent_otp:
            time_diff = timezone.now() - recent_otp.created_at
            if time_diff.total_seconds() < 30:
                seconds_left = int(30 - time_diff.total_seconds())
                return JsonResponse(
                    {'status': 'error', 'message': f'Please wait {seconds_left}s before requesting again.'},
                    status=429
                )

        otp_code = str(random.randint(100000, 999999))
        OTPVerification.objects.update_or_create(
            email=email,
            defaults={'otp': otp_code, 'created_at': timezone.now(), 'is_verified': False}
        )

        try:
            _send_otp_email(email, otp_code, subject="HotelPro - Verify Your Account")
            return JsonResponse({'status': 'success', 'message': f'OTP sent successfully to {email}.'}, status=200)
        except Exception as e:
            # Enhanced professional logging for production diagnostics
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"[Critical] SMTP/OTP System Failure: {str(e)}\n{error_trace}")
            
            # For diagnostics, we provide a hint in the response ONLY if in DEBUG mode
            if django_settings.DEBUG:
                return JsonResponse({'status': 'error', 'message': f'Email Error: {str(e)}'}, status=500)
            
            return JsonResponse({'status': 'error', 'message': 'Failed to send verification email. Security protocols engaged.'}, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid data format.'}, status=400)


@require_POST
def api_verify_otp(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        otp = data.get('otp')

        if not email or not otp:
            return JsonResponse({'status': 'error', 'message': 'Email and OTP are required.'}, status=400)

        otp_record = OTPVerification.objects.filter(email=email).order_by('-created_at').first()

        if not otp_record:
            return JsonResponse({'status': 'error', 'message': 'No OTP requested for this email.'}, status=404)

        if otp_record.is_verified:
            return JsonResponse({'status': 'error', 'message': 'Email is already verified.'}, status=400)

        if timezone.now() - otp_record.created_at > timedelta(minutes=10):
            return JsonResponse({'status': 'error', 'message': 'OTP expired (10m limit). Please request a new one.'}, status=400)

        if otp_record.otp == otp:
            otp_record.is_verified = True
            otp_record.save()
            request.session['verified_signup_email'] = email
            return JsonResponse({'status': 'success', 'message': 'Email verified successfully.'}, status=200)
        else:
            return JsonResponse({'status': 'error', 'message': 'Invalid OTP.'}, status=400)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid data format.'}, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# PAGES
# ─────────────────────────────────────────────────────────────────────────────

def landing_page(request):
    import os
    context = {
        'sales_agent_whatsapp': os.getenv('SALES_AGENT_WHATSAPP', '+919574943240'),
        'sales_agent_phone': os.getenv('SALES_AGENT_PHONE', '+919574943240'),
        'sales_agent_email': os.getenv('SALES_AGENT_EMAIL', 'team@hotelpro.ai'),
        'site_url': os.getenv('SITE_URL', 'http://localhost:8000'),
    }
    return render(request, 'hoteladmin/landingpage/landing.html', context)


def contact_us(request):
    """
    Elite Contact Gateway (Zenith Protocol).
    Redirects to premium account selection/login if unauthenticated,
    unless explicitly continuing as a guest.
    """
    # If not authenticated and didn't select guest path, show selection screen
    if not request.user.is_authenticated and not request.GET.get('guest'):
        return render(request, 'hoteladmin/landingpage/support_auth.html')

    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data['name']
            email = form.cleaned_data['email']
            subject = form.cleaned_data['subject']
            message = form.cleaned_data['message']
            
            # Construct the email payload
            full_subject = f"Contact Form: {subject}"
            email_body = (
                f"New Message from HotelPro Contact Form\n"
                f"------------------------------------\n"
                f"Name: {name}\n"
                f"Email: {email}\n"
                f"Authenticated: {'Yes' if request.user.is_authenticated else 'No'}\n"
                f"User ID: {request.user.id if request.user.is_authenticated else 'N/A'}\n"
                f"Guest Mode: {'True' if request.GET.get('guest') else 'False'}\n"
                f"------------------------------------\n\n"
                f"Message:\n{message}"
            )
            
            try:
                from django.core.mail import send_mail
                # 1. Notify Admin (Internal)
                send_mail(
                    subject=full_subject,
                    message=email_body,
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=['krishpatel123451@gmail.com'],
                    fail_silently=False,
                )

                # 2. AI Agent Auto-Response (External to Client)
                try:
                    from .utils_ai import GuestAIService
                    ai_service = GuestAIService()
                    ai_response = ai_service.generate_guest_response(request.user if request.user.is_authenticated else None, message)
                    
                    ai_subject = f"Re: {subject} - HotelPro AI Support"
                    ai_body = (
                        f"Hello {name},\n\n"
                        f"Thank you for contacting HotelPro. Our AI Agent has analyzed your inquiry:\n"
                        f"------------------------------------\n"
                        f"{ai_response}\n"
                        f"------------------------------------\n\n"
                        f"One of our human administrators has also been notified and will follow up if further action is required.\n\n"
                        f"Best Regards,\n"
                        f"HotelPro AI Strategy Team"
                    )
                    
                    send_mail(
                        subject=ai_subject,
                        message=ai_body,
                        from_email=django_settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[email],
                        fail_silently=True,
                    )
                except Exception as ai_err:
                    logger.warning(f"AI Agent response generation failed: {str(ai_err)}")
                    # Don't fail the whole request if AI fails

                messages.success(request, "Your message has been sent successfully! Check your email for an AI-generated response.")
                return redirect('landing_page')
            except Exception as e:
                logger.error(f"Failed to send contact email: {str(e)}")
                messages.error(request, "There was an error sending your message. Please try again later.")
    else:
        # Pre-fill form if user is authenticated
        initial_data = {}
        if request.user.is_authenticated:
            initial_data = {
                'name': request.user.username,
                'email': request.user.email
            }
        form = ContactForm(initial=initial_data)

    return render(request, 'hoteladmin/landingpage/contact.html', {
        'form': form,
        'is_guest': request.GET.get('guest')
    })


def signup_view(request):
    """
    Hotel Admin signup — role is always set to 'hotel_admin'.
    Requires prior OTP email verification.
    """
    if request.user.is_authenticated:
        # Bounce authenticated users to THEIR own dashboard — no logout.
        return _redirect_to_correct_dashboard(request.user)

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email    = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        confirm  = request.POST.get('confirm_password', '')

        if not all([username, email, password, confirm]):
            messages.error(request, "All fields are required.")
            return render(request, 'user_nexus/signup.html')

        if password != confirm:
            messages.error(request, "Passwords do not match.")
            return render(request, 'user_nexus/signup.html')

        is_valid, policy_error = _validate_password_policy(password)
        if not is_valid:
            messages.error(request, policy_error or "Password policy violation.") # type: ignore
            return render(request, 'user_nexus/signup.html')

        if CustomUser.objects.filter(email=email).exists():
            messages.error(request, "An account with this email already exists.")
            return render(request, 'user_nexus/signup.html')

        verified_email = request.session.get('verified_signup_email')
        if not verified_email or verified_email != email:
            messages.error(request, "Please verify your email with an OTP first.")
            return render(request, 'user_nexus/signup.html')

        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=True,
            role='hotel_admin',
        )
        OTPVerification.objects.filter(email=email).delete()
        request.session.pop('verified_signup_email', None)

        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        messages.success(request, "Account created! Welcome to HotelPro!")
        return redirect('hotel_onboarding')

    return render(request, 'user_nexus/signup.html')


def verify_otp_view(request):
    user_id = request.session.get('otp_user_id')
    if not user_id:
        return redirect('signup')

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return redirect('signup')

    if request.method == 'POST':
        form = OTPVerificationForm(request.POST)
        if form.is_valid():
            entered_otp = form.cleaned_data['otp']
            if user.otp == entered_otp: # type: ignore
                user.is_active = True
                user.is_verified = True # type: ignore
                user.otp = None # type: ignore
                user.save()
                login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                messages.success(request, "Account verified successfully!")
                return redirect('landing_page')
            else:
                messages.error(request, "Invalid OTP.")
    else:
        form = OTPVerificationForm()
    return render(request, 'user_nexus/verify_otp.html', {'form': form})


def login_view(request):
    """
    Hotel Admin login portal — /login/

    Strict Portal Separation:
    - If already logged in as a Hotel Admin, redirect to the dashboard.
    - If authenticated as a different role, and since we now use independent
      session cookies, this portal should effectively be anonymous unless
      the user purposefully navigates between portals in the same cookie space.
    """
    if request.method == 'GET' and request.user.is_authenticated:
        if request.user.role == 'hotel_admin': # type: ignore
            return redirect('dashboard')
        # If any other role ends up here, redirect them back to their own portal.
        return _redirect_to_correct_dashboard(request.user)

    if request.method == 'POST':
        form = CustomLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            if user is not None and user.role == 'hotel_admin': # type: ignore
                login(request, user)
                # First-time login flow check
                if not Hotel.objects.filter(owner=user).exists(): # type: ignore
                    messages.success(request, f"Welcome, {user.username}! Let's set up your hotel.") # type: ignore
                    return redirect('hotel_onboarding')
                messages.success(request, f"Welcome back, {user.username}!") # type: ignore
                return redirect('dashboard')
            else:
                messages.error(
                    request,
                    "Invalid account type for this portal. Please use the correct login page."
                )
        else:
            messages.error(request, "Invalid email or password.")
    else:
        form = CustomLoginForm()

    return render(request, 'user_nexus/login.html', {'form': form})


def logout_view(request):
    """Hotel Admin logout — clears session, returns to hotel admin login."""
    logout(request)
    return redirect('login')


def hotel_admin_login(request):
    """
    Landing-page 'Start Free' entry point — /start-free/
    With the multi-session middleware, this path shares the 'hotel_admin' cookie scope.
    """
    if request.method == 'GET' and request.user.is_authenticated:
        if request.user.role == 'hotel_admin': # type: ignore
            return redirect('dashboard')
        return _redirect_to_correct_dashboard(request.user)

    if request.method == 'POST':
        form = CustomLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            if user is not None and user.role == 'hotel_admin': # type: ignore
                login(request, user)
                if not Hotel.objects.filter(owner=user).exists(): # type: ignore
                    messages.success(request, f"Welcome, {user.username}! Let's start by setting up your hotel.") # type: ignore
                    return redirect('hotel_onboarding')
                messages.success(request, f"Welcome back, {user.username}!") # type: ignore
                return redirect('dashboard')
            else:
                messages.error(request, "Invalid account type for this portal.")
        else:
            messages.error(request, "Invalid email or password.")
    else:
        form = CustomLoginForm()

    return render(request, 'user_nexus/login.html', {'form': form})


# ─────────────────────────────────────────────────────────────────────────────
# ENTERPRISE PASSWORD RESET — TOKEN-BASED FLOW
# ─────────────────────────────────────────────────────────────────────────────

def password_reset_request_view(request):
    """
    Step 1 — User submits their email.

    Security:
    - Response is generic to prevent email discovery.
    - Limit 3 requests per hour.
    - All attempts logged for security.
    - Previous unused tokens are cancelled.
    """
    submitted = False

    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        ip = _get_client_ip(request)

        # ── Rate limiting: max 3 requests/email/hour ──
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_requests = PasswordResetAudit.objects.filter(
            email=email,
            event='REQUEST',
            timestamp__gte=one_hour_ago
        ).count()

        if recent_requests >= 3:
            # Log blocked attempt but still show generic response (anti-enumeration)
            PasswordResetAudit.objects.create(
                email=email, event='BLOCKED', ip_address=ip,
                detail='Rate limit exceeded (3/hr)'
            )
            # Still show the generic success banner — never reveal blocking
            return render(request, 'user_nexus/forgotpassword.html', {'submitted': True})

        # ── Lookup user (silently if not found) ──
        try:
            user = CustomUser.objects.get(email=email)

            # Invalidate all previous unused tokens for this user
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

            # Generate cryptographically secure token
            raw_token = secrets.token_urlsafe(32)
            token_hash = _hash_token(raw_token)

            PasswordResetToken.objects.create(
                user=user,
                token_hash=token_hash,
                expires_at=timezone.now() + timedelta(minutes=15),
                ip_address=ip,
            )

            # Send HTML reset email
            try:
                _send_reset_email(user, raw_token, request)
            except Exception:
                logger.error(
                    f"[RESET] Failed to send reset email to {email}. "
                    f"Dev token hash: {token_hash[:12]}..."
                )

            # Audit log
            PasswordResetAudit.objects.create(
                email=email, event='REQUEST', ip_address=ip,
                detail='Token issued and email dispatched'
            )

        except CustomUser.DoesNotExist:
            # Log the attempt but do NOT reveal that the account doesn't exist
            PasswordResetAudit.objects.create(
                email=email, event='REQUEST', ip_address=ip,
                detail='Email not found (enumeration prevented)'
            )

        # ── Always show the same generic success banner ──
        submitted = True

    return render(request, 'user_nexus/forgotpassword.html', {'submitted': submitted})


def password_reset_confirm_view(request, token):
    """
    Step 2 — User arrives via the link in their email.

    GET:  Validate token → show new-password form.
    POST: Re-validate token → enforce policy → set password → invalidate token
          → flush sessions → send confirmation email → redirect to login.
    """
    ip = _get_client_ip(request)
    token_hash = _hash_token(token)

    # ── Look up and validate the token ──
    try:
        reset_token = PasswordResetToken.objects.select_related('user').get(
            token_hash=token_hash
        )
    except PasswordResetToken.DoesNotExist:
        PasswordResetAudit.objects.create(
            email='unknown', event='INVALID', ip_address=ip,
            detail='Token not found in database'
        )
        return render(request, 'user_nexus/reset_password.html', {'invalid': True})

    if not reset_token.is_valid():
        event = 'EXPIRED' if timezone.now() >= reset_token.expires_at else 'INVALID'
        PasswordResetAudit.objects.create(
            email=reset_token.user.email, event=event, ip_address=ip,
            detail=f"used={reset_token.used}, expires={reset_token.expires_at}"
        )
        return render(request, 'user_nexus/reset_password.html', {
            'expired': True,
            'reset_request_url': 'forget_password',
        })

    user = reset_token.user

    if request.method == 'POST':
        new_password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')

        # ── Server-side policy check ──
        is_valid, policy_error = _validate_password_policy(new_password)
        if not is_valid:
            PasswordResetAudit.objects.create(
                email=user.email, event='FAILED', ip_address=ip,
                detail=f'Policy violation: {policy_error}'
            )
            return render(request, 'user_nexus/reset_password.html', {
                'token': token,
                'error': policy_error,
            })

        if new_password != confirm_password:
            return render(request, 'user_nexus/reset_password.html', {
                'token': token,
                'error': 'Passwords do not match.',
            })

        # ── Re-validate token (prevents race conditions) ──
        reset_token.refresh_from_db()
        if not reset_token.is_valid():
            return render(request, 'user_nexus/reset_password.html', {'expired': True})

        # ── Apply new password ──
        user.set_password(new_password)
        user.save()

        # ── Invalidate token ──
        reset_token.used = True
        reset_token.save()

        # ── Invalidate ALL existing sessions for this user ──
        request.session.flush()

        # ── Log success ──
        PasswordResetAudit.objects.create(
            email=user.email, event='SUCCESS', ip_address=ip,
            detail='Password reset completed, all sessions flushed'
        )

        # ── Send confirmation email ──
        try:
            _send_reset_success_email(user)
        except Exception:
            pass  # Non-critical — don't block the reset flow

        messages.success(
            request,
            "Password reset successful. Please sign in with your new credentials."
        )
        return redirect('login')

    # GET — render the new password form
    return render(request, 'user_nexus/reset_password.html', {'token': token})

@hotel_admin_required
def hotel_onboarding(request):
    """
    Elite Hotel Onboarding Protocol.
    Final verification and persistence of the entire property dossier.
    """
    if request.method == 'POST':
        print("Received POST data:", request.POST)  # Debugging line to inspect incoming data
        # --- DATA HANDSHAKE LOGGING ---
        # Capture all keys for diagnostic audit
        all_post_keys = list(request.POST.keys())
        all_file_keys = list(request.FILES.keys())
        logger.info(f"[Protocol] Start Onboarding Handshake. Found {len(all_post_keys)} post keys and {len(all_file_keys)} files.")
        
        try:
            with transaction.atomic():
                # 1. CORE PROPERTY IDENTITY (Phase 1)
                hotel_name = request.POST.get('hotel_name', 'Untitled Hotel').strip()
                hotel_type = request.POST.get('hotel_type', 'HOTEL').strip()
                address = request.POST.get('address', '').strip()
                narrative = request.POST.get('hotel_narrative', '').strip()
                contact = request.POST.get('contact_number', '').strip()
                website = request.POST.get('website', '').strip()
                
                # Geolocation Metadata
                city = request.POST.get('city', '').strip()
                state = request.POST.get('state', '').strip()
                country = request.POST.get('country', 'India').strip()
                pincode = request.POST.get('pincode', '').strip()
                lat = request.POST.get('lat')
                lng = request.POST.get('lng')

                # 2. OPERATIONAL STANDARDS (Phase 2)
                check_in = request.POST.get('check_in')
                check_out = request.POST.get('check_out')
                policy = request.POST.get('cancellation_policy', '')
                
                # Global Services Handshake
                services_list = request.POST.getlist('services') or []
                if not services_list:
                    services_raw = request.POST.get('services', '[]')
                    try:
                        if "'" in services_raw and '"' not in services_raw:
                            services_raw = services_raw.replace("'", '"')
                        services_list = json.loads(services_raw)
                    except:
                        services_list = []

                # 3. LEGAL & COMPLIANCE (Phase 3)
                id_type = request.POST.get('id_type', 'AADHAAR')
                id_number = request.POST.get('id_number', '').strip()
                govt_reg = request.POST.get('govt_reg_number', '').strip()
                gst = request.POST.get('gst_number', '').strip()

                try:
                    # Strip any non-numeric chars except decimal point from star rating
                    raw_star = "".join(c for c in str(request.POST.get('star_rating') or 0) if c.isdigit() or c == '.')
                    star_val = Decimal(raw_star or 0)
                except:
                    star_val = Decimal('0.0')

                # Persistence: Primary Property Record
                hotel = Hotel.objects.create(
                    owner=request.user,
                    name=hotel_name,
                    category=hotel_type,
                    address=address,
                    narrative=narrative,
                    contact_number=contact,
                    website=website,
                    star_rating=star_val,
                    city=city,
                    state=state,
                    country=country,
                    pincode=pincode,
                    latitude=lat if lat and lat != "null" else None,
                    longitude=lng if lng and lng != "null" else None,
                    check_in_time=check_in if check_in else None,
                    check_out_time=check_out if check_out else None,
                    cancellation_policy=policy,
                    services=services_list,
                    id_type=id_type,
                    id_number=id_number,
                    govt_reg_number=govt_reg,
                    gst_number=gst,
                    doc_id_proof=request.FILES.get('doc_mandatory'),
                    doc_govt_registration=request.FILES.get('doc_certificate'),
                    doc_gst_certificate=request.FILES.get('doc_gst'),
                    status='PENDING',
                    onboarding_step=4
                )
                logger.info(f"[Protocol] Hotel Object Created: {hotel.id}") # type: ignore

                # 4. INVENTORY DYNAMIC INJECTION (Phase 02 Mastery)
                raw_keys = list(request.POST.keys())
                indices = set()
                
                # Enhanced Prefix Detection (Including Aliases)
                # We check for all possible prefixes that might indicate a room entry
                prefixes = [
                    'room_name_', 'room_class_', 'room_guests_', 'room_capacity_', 
                    'room_price_', 'room_count_', 'room_inventory_', 'room_id_',
                    'room_amenities_'
                ]
                
                logger.info(f"[Protocol] Raw Keys: {raw_keys}")
                
                for key in raw_keys:
                    for pref in prefixes:
                        if key.startswith(pref):
                            idx = key.replace(pref, '')
                            if idx and idx != "__prefix__":
                                indices.add(idx)
                                break
                
                # Sort indices numerically to ensure consistent processing
                try:
                    room_indices = sorted(list(indices), key=lambda x: int("".join(c for c in str(x) if c.isdigit())) if any(c.isdigit() for c in str(x)) else 0)
                except Exception as sort_err:
                    logger.warning(f"[Protocol] Index sorting failed: {sort_err}. Using raw order.")
                    room_indices = list(indices)

                logger.info(f"[Protocol] Processing {len(room_indices)} room node(s) for Hotel: {hotel.name} (ID: {hotel.id})") # type: ignore
                logger.info(f"[Protocol] Detected Indices: {room_indices}")

                rooms_saved = 0
                for idx in room_indices:
                    try:
                        # 4a. Identification & Class
                        name = request.POST.get(f'room_name_{idx}', '').strip()
                        r_class = request.POST.get(f'room_class_{idx}', 'STANDARD') or 'STANDARD'
                        
                        logger.info(f"[Inventory] Processing Room Index: {idx}, Name: {name}, Class: {r_class}")
                        
                        if not name:
                            name = f"{r_class.capitalize()} Category Node"

                        # 4b. Financials (Price)
                        p_price = request.POST.get(f'room_price_{idx}')
                        p_raw = "".join(c for c in str(p_price) if c.isdigit() or c == '.') if p_price else "0"
                        price = Decimal(p_raw or "0")
                        
                        # 4c. Capacity (Guests) - Support 'guests' and 'capacity' aliases
                        p_guests = request.POST.get(f'room_guests_{idx}') or request.POST.get(f'room_capacity_{idx}')
                        guests = int("".join(c for c in str(p_guests) if c.isdigit()) or "2") if p_guests else 2
                        
                        # 4d. Inventory (Count) - Support 'count' and 'inventory' aliases
                        p_count = request.POST.get(f'room_count_{idx}') or request.POST.get(f'room_inventory_{idx}')
                        count = int("".join(c for c in str(p_count) if c.isdigit()) or "1") if p_count else 1

                        # 4e. Amenities (JSON Array)
                        amenities_raw = request.POST.get(f'room_amenities_{idx}', '[]')
                        try:
                            # Sanitize if single quotes were used in JS stringification
                            if "'" in amenities_raw and '"' not in amenities_raw:
                                amenities_raw = amenities_raw.replace("'", '"')
                            amenities = json.loads(amenities_raw)
                        except Exception as json_err:
                            logger.warning(f"[Inventory] Amenity parse failure for room {idx}: {json_err}")
                            amenities = []

                        # 4f. Persistence: Room Node (Create or Update)
                        room_id = request.POST.get(f'room_id_{idx}')
                        if room_id:
                            try:
                                room = RoomCategory.objects.get(id=room_id, hotel=hotel)
                                room.name = name
                                room.room_class = r_class
                                room.max_guests = guests
                                room.base_price = price
                                room.inventory_count = count
                                room.amenities = amenities
                                room.save()
                                logger.info(f"[Inventory] Room {idx} updated: {name} (ID: {room_id})")
                            except RoomCategory.DoesNotExist:
                                room = RoomCategory.objects.create(
                                    hotel=hotel, name=name, room_class=r_class,
                                    max_guests=guests, base_price=price,
                                    inventory_count=count, amenities=amenities
                                )
                                logger.info(f"[Inventory] Room {idx} created (fallback from missing ID): {name}")
                        else:
                            room = RoomCategory.objects.create(
                                hotel=hotel, name=name, room_class=r_class,
                                max_guests=guests, base_price=price,
                                inventory_count=count, amenities=amenities
                            )
                        
                        # Process Assets
                        media_files = request.FILES.getlist(f'room_photos_{idx}')
                        for f in media_files:
                            RoomPhoto.objects.create(room_category=room, media_file=f)
                        
                        rooms_saved += 1
                        logger.info(f"[Inventory] Room {idx} synced: {name}")

                    except Exception as room_loop_err:
                        logger.error(f"[Protocol Failure] Error in room node {idx}: {str(room_loop_err)}")
                        continue

                # 5. GLOBAL PROPERTY GALLERY
                gallery_files = request.FILES.getlist('property_images')
                for f in gallery_files:
                    HotelGallery.objects.create(hotel=hotel, media_file=f)
                
                logger.info(f"[Protocol Success] Dossier persistence complete. {rooms_saved} rooms registered.")

            messages.success(request, f"Dossier Synchronized Successfully! {hotel.name} is now in Executive Audit.")
            return redirect('dashboard_specific', hotel_id=hotel.id) # type: ignore

        except Exception as e:
            logger.error(f"[Dossier Refused] Protocol reached terminal state with error: {str(e)}")
            messages.error(request, f"Submission Rejected: {str(e)}")
            return render(request, 'hoteladmin/live_hotel/add_hotel.html', {
                'service_choices': HOTEL_SERVICE_CHOICES,
                'error_context': str(e),
                'post_data': request.POST # Resilient recovery
            })

    return render(request, 'hoteladmin/live_hotel/add_hotel.html', {
        'service_choices': HOTEL_SERVICE_CHOICES
    })

@hotel_admin_required
def dashboard(request, hotel_id=None):
    """
    Zenith Architecture (v26.0): Dual Dashboard Suite.
    - If hotel_id is None: Renders Global Enterprise Dashboard (Command Hub).
    - If hotel_id is provided: Renders Specific Hotel Dashboard.
    """
    all_hotels = Hotel.objects.filter(owner=request.user).order_by('-created_at')
    
    # ══ CASE 1: GLOBAL ENTERPRISE DASHBOARD ══
    if not hotel_id:
        if not all_hotels.exists():
            return redirect('hotel_onboarding')
        
        # Aggregated Metrics
        all_bookings = Booking.objects.filter(hotel__owner=request.user)
        total_revenue = all_bookings.filter(status='CONFIRMED').aggregate(models.Sum('total_revenue'))['total_revenue__sum'] or 0
        total_bookings = all_bookings.count()
        live_hotels_count = all_hotels.filter(is_live=True).count()
        pending_audit_count = all_hotels.filter(status='PENDING').count()
        
        # Today's Revenue (Global)
        today = timezone.now().date()
        revenue_today = all_bookings.filter(status='CONFIRMED', created_at__date=today).aggregate(models.Sum('total_revenue'))['total_revenue__sum'] or 0

        # Global Offers & Reviews
        global_offers = Offer.objects.filter(hotel__in=all_hotels, is_live=True).order_by('-created_at')[:4]
        global_reviews = Review.objects.filter(hotel__in=all_hotels, is_visible=True).order_by('-created_at')[:4]

        return render(request, 'hoteladmin/admin_dashboard/global_dashboard.html', {
            'all_hotels': all_hotels,
            'total_revenue': total_revenue,
            'total_bookings': total_bookings,
            'live_hotels_count': live_hotels_count,
            'pending_audit_count': pending_audit_count,
            'revenue_today': revenue_today,
            'global_offers': global_offers,
            'global_reviews': global_reviews,
        })

    # ══ CASE 2: SPECIFIC HOTEL DASHBOARD ══
    hotel = get_object_or_404(all_hotels, id=hotel_id)

    # ══ ONBOARDING DASHBOARD ══
    if not hotel.is_live:
        # Business logic for onboarding progress (v22.0 Royale)
        total_score = 100
        completed_score = 0
        pending_categories = []

        # Scoring Logic
        if hotel.address and hotel.city: completed_score += 20
        else: pending_categories.append("Property Identity")

        if hotel.govt_reg_number: completed_score += 20
        else: pending_categories.append("Regulatory Compliance")

        has_rooms = hotel.rooms.exists()
        if has_rooms: completed_score += 30
        else: pending_categories.append("Room Inventory")

        image_count = hotel.gallery.count()
        if image_count >= 5: completed_score += 20
        elif image_count > 0: completed_score += 10
        
        if image_count < 5: pending_categories.append("Visual Documentation")

        if hotel.cancellation_policy: completed_score += 10
        else: pending_categories.append("Operations")

        progress_percentage = (completed_score / total_score) * 100
        
        rooms = hotel.rooms.all().prefetch_related('photos') # type: ignore
        gallery = HotelGallery.objects.filter(hotel=hotel).order_by('-created_at')        
        return render(request, 'hoteladmin/admin_dashboard/dashboard.html', {
            'hotel': hotel,
            'all_hotels': all_hotels,
            'progress': int(progress_percentage),
            'pending_categories': pending_categories,
            'has_rooms': has_rooms,
            'rooms': rooms,
            'gallery': gallery,
            'image_count': image_count,
            'has_policy': bool(hotel.cancellation_policy),
        })

    # ══ LIVE PERFORMANCE DASHBOARD (admin_dashboard_pro) ══
    today = timezone.now().date()
    stats = {
        'total_bookings': hotel.bookings.count(),
        'total_revenue': hotel.bookings.filter(status='CONFIRMED').aggregate(models.Sum('total_revenue'))['total_revenue__sum'] or 0, # type: ignore
        'revenue_today': hotel.bookings.filter(status='CONFIRMED', created_at__date=today).aggregate(models.Sum('total_revenue'))['total_revenue__sum'] or 0, # type: ignore
        'avg_rating': hotel.reviews.all().aggregate(models.Avg('rating'))['rating__avg'] or 5.0, # type: ignore
        'active_offers': hotel.offers.filter(is_live=True).count(), # type: ignore
        'recent_bookings': hotel.bookings.all().order_by('-created_at')[:5], # type: ignore
    }

    all_hotels = Hotel.objects.filter(owner=request.user)
    rooms = hotel.rooms.all().prefetch_related('photos') # type: ignore

    # Specific Property Intelligence
    offers = hotel.offers.filter(is_live=True).order_by('-created_at')[:2] # type: ignore
    reviews = hotel.reviews.filter(is_visible=True).order_by('-created_at')[:2] # type: ignore

    return render(request, 'hoteladmin/admin_dashboard/admin_dashboard_pro.html', {
        'hotel': hotel,
        'all_hotels': all_hotels,
        'stats': stats,
        'rooms': rooms,
        'offers': offers,
        'reviews': reviews,
    })

@hotel_admin_required
def my_hotels(request):
    """
    Hotel Collection Management.
    Displays all hotels owned by the current user.
    """
    search_query = request.GET.get('q', '')
    hotels = Hotel.objects.filter(owner=request.user)

    if search_query:
        hotels = hotels.filter(name__icontains=search_query)
    
    # Hotel Stats
    # we use the base set for stats
    all_hotels = Hotel.objects.filter(owner=request.user)
    live_count = all_hotels.filter(is_live=True).count()
    audit_count = all_hotels.filter(status='PENDING').count()
    total_rooms = RoomCategory.objects.filter(hotel__in=all_hotels).count()
    
    return render(request, 'hoteladmin/admin_dashboard/my_hotels.html', {
        'hotels': hotels,
        'live_count': live_count,
        'audit_count': audit_count,
        'total_rooms': total_rooms,
        'search_query': search_query
    })


@hotel_admin_required
def offers(request):
    """
    Manage Hotel Offers and Discounts Portfolio.
    """
    user_hotels = Hotel.objects.filter(owner=request.user)
    if not user_hotels.exists():
        return redirect('hotel_onboarding')
        
    # Dynamic portfolio filtering
    offers_list = Offer.objects.filter(targeted_hotels__in=user_hotels).distinct().order_by('-created_at')
    
    # Professional Analytics (Aggregated)
    total_count = offers_list.count()
    active_count = offers_list.filter(is_live=True).count()
    
    stats = {
        'active_offers': active_count,
        'draft_offers': total_count - active_count,
        'total_offers': total_count,
        'avg_discount': offers_list.aggregate(models.Avg('discount_percent'))['discount_percent__avg'] or 0,
        'total_revenue': offers_list.aggregate(models.Sum('revenue_generated'))['revenue_generated__sum'] or Decimal('0.00'),
        'avg_redemption': offers_list.aggregate(models.Avg('redemption_rate'))['redemption_rate__avg'] or 0,
    }

    # Templates Gallery Data
    templates = [
        {'id': 'early_bird', 'name': 'Early Bird Special', 'discount': 25, 'icon': 'fa-clock', 'category': 'PRICE', 'label': 'Advance Booking'},
        {'id': 'last_minute', 'name': 'Last Minute Deal', 'discount': 40, 'icon': 'fa-bolt', 'category': 'PRICE', 'label': 'Inventory Clearance'},
        {'id': 'fb_experience', 'name': 'Gourmet Stay', 'discount': 15, 'icon': 'fa-utensils', 'category': 'FB', 'label': 'F&B Bundle'},
        {'id': 'wellness', 'name': 'Wellness Retreat', 'discount': 20, 'icon': 'fa-spa', 'category': 'EXPERIENCE', 'label': 'Experience'},
    ]
    
    # Prepare JSON data for the calendar engine
    offers_json = []
    for o in offers_list:
        offers_json.append({
            'name': o.name,
            'activation_date': o.activation_date.strftime('%Y-%m-%d') if o.activation_date else None,
            'expiration_date': o.expiration_date.strftime('%Y-%m-%d') if o.expiration_date else None,
            'is_live': o.is_live
        })

    return render(request, 'hoteladmin/admin_dashboard/offers.html', {
        'offers': offers_list, 
        'offers_json': offers_json,
        'user_hotels': user_hotels,
        'hotel': user_hotels.first(),
        'stats': stats,
        'templates': templates
    })
    
@hotel_admin_required
def offer_usage_details(request, offer_id):
    """AJAX endpoint for enterprise-level strategic drilldown."""
    try:
        from django.http import JsonResponse
        offer = get_object_or_404(Offer, id=offer_id, targeted_hotels__owner=request.user)
        bookings = Booking.objects.filter(applied_offer=offer).order_by('-created_at')
        
        usage_data = []
        for b in bookings:
            usage_data.append({
                'guest_name': b.guest_name,
                'guest_email': b.guest_email,
                'guest_phone': b.guest_phone,
                'room_type': b.room_category.name if b.room_category else "Standard Node",
                'check_in': b.check_in.strftime('%b %d, %Y'),
                'check_out': b.check_out.strftime('%b %d, %Y'),
                'revenue': float(b.total_revenue),
                'reference': b.reference
            })
            
        return JsonResponse({
            'status': 'success',
            'offer_name': offer.name,
            'usage_data': usage_data
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@hotel_admin_required
def offer_rooms_details(request, offer_id):
    """AJAX endpoint for getting targeted rooms of an offer."""
    from django.http import JsonResponse
    try:
        offer = get_object_or_404(Offer, id=offer_id, targeted_hotels__owner=request.user)
        rooms_data = []
        for room in offer.targeted_rooms.all().prefetch_related('photos'):
            photo_url = room.photos.first().media_file.url if room.photos.first() else ""
            rooms_data.append({
                'name': room.name,
                'room_class': room.get_room_class_display(),
                'max_guests': room.max_guests,
                'base_price': float(room.base_price),
                'image': photo_url,
                'hotel_name': room.hotel.name
            })
        return JsonResponse({
            'status': 'success',
            'offer_name': offer.name,
            'rooms': rooms_data
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@hotel_admin_required
def manage_rooms(request, hotel_id=None):

    hotels = Hotel.objects.filter(owner=request.user)
    search_query = request.GET.get('q', '')

    # agar hotel_id diya hai toh specific hotel
    if hotel_id:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
        rooms = RoomCategory.objects.filter(hotel=hotel).prefetch_related('photos')
    else:
        hotel = None
        # Show rooms from ALL hotels owned by the user
        rooms = RoomCategory.objects.filter(hotel__owner=request.user).prefetch_related('photos', 'hotel')

    if search_query:
        rooms = rooms.filter(name__icontains=search_query)

    # Calculate total rooms across selected rooms
    total_rooms = rooms.aggregate(models.Sum('inventory_count'))['inventory_count__sum'] or 0

    return render(request, 'hoteladmin/admin_dashboard/rooms.html', {
        'hotel': hotel,      # selected hotel (might be None)
        'hotels': hotels,    # dropdown list
        'rooms': rooms,
        'total_rooms': total_rooms,
        'search_query': search_query
    })



@hotel_admin_required
def add_room(request, hotel_id=None, room_id=None):
    """
    Add or Edit a room category with media handling.
    """

    hotels = Hotel.objects.filter(owner=request.user)

    hotel = None
    if hotel_id:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)

    room = None
    if room_id:
        room = get_object_or_404(RoomCategory, id=room_id, hotel__owner=request.user)
        hotel = room.hotel

    if hotel_id and not hotel:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)

    # AJAX GET: Fetch room data for editing
    if request.method == "GET" and request.headers.get('x-requested-with') == 'XMLHttpRequest' and room:
        return JsonResponse({
            'status': 'success',
            'data': {
                'id': room.id,
                'name': room.name,
                'room_class': room.room_class,
                'max_guests': room.max_guests,
                'base_price': float(room.base_price),
                'inventory_count': room.inventory_count,
                'amenities': room.amenities,
                'existing_photos': [
                    {
                        'id': p.id,
                        'url': p.media_file.url,
                        'is_video': p.media_file.url.lower().endswith(('.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'))
                    } for p in room.photos.all()
                ]
            }
        })

    if request.method == "POST":
        try:
            name = request.POST.get("name")
            room_class = request.POST.get("room_class", "STANDARD")
            max_guests = request.POST.get("max_guests", 2)
            base_price = request.POST.get("base_price", 0)
            inventory = request.POST.get("inventory_count", 1)

            amenities_data = request.POST.get("amenities", "[]")

            try:
                amenities_list = json.loads(amenities_data)
            except:
                amenities_list = []

            # If hotel not selected
            if not hotel:
                messages.error(request, "Please select a hotel first.")
                return redirect("manage_rooms")

            # EDIT
            if room:
                room.name = name
                room.room_class = room_class
                room.max_guests = max_guests
                room.base_price = base_price
                room.inventory_count = inventory
                room.amenities = amenities_list
                room.save()

                messages.success(request, f"Room '{name}' updated successfully.")

            # CREATE
            else:
                room = RoomCategory.objects.create(
                    hotel=hotel,
                    name=name,
                    room_class=room_class,
                    max_guests=max_guests,
                    base_price=base_price,
                    inventory_count=inventory,
                    amenities=amenities_list,
                    is_active=hotel.is_live
                )

                messages.success(request, f"New Room '{name}' created successfully.")
            
            # ── Asset Management (Deletion & Addition) ──
            deleted_ids_raw = request.POST.get("deleted_photos", "[]")
            try:
                deleted_ids = json.loads(deleted_ids_raw)
                if deleted_ids:
                    # Securely delete only photos belonging to this specific room
                    RoomPhoto.objects.filter(id__in=deleted_ids, room_category=room).delete()
                    logger.info(f"[Media] Deleted artifacts: {deleted_ids} for room {room.id}")
            except Exception as del_err:
                logger.warning(f"[Media] Deletion protocol failed: {del_err}")

            # Upload photos
            room_photos = request.FILES.getlist("room_photos")

            for photo in room_photos:
                RoomPhoto.objects.create(
                    room_category=room,
                    media_file=photo
                )

            # Refresh room with photos pre-fetched for accurate partial rendering
            room = RoomCategory.objects.prefetch_related('photos').get(id=room.id)

            # AJAX Response
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                room_html = render_to_string('hoteladmin/admin_dashboard/partials/room_card_partial.html', {
                    'room': room,
                    'hotel': hotel
                }, request=request)
                return JsonResponse({
                    'status': 'success',
                    'message': f"Room '{name}' {'updated' if room_id else 'created'} successfully.",
                    'room_html': room_html,
                    'is_edit': bool(room_id),
                    'room_id': room.id,
                    'hotel_is_live': hotel.is_live
                })

            return redirect("manage_rooms_hotel", hotel_id=hotel.id) # type: ignore

        except Exception as e:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'status': 'error', 'message': str(e)})
            messages.error(request, f"Error: {str(e)}")

    return render(request, "hoteladmin/admin_dashboard/add_room.html", {
        "hotel": hotel,
        "hotels": hotels,
        "room": room
    })


@hotel_admin_required
@require_POST
def delete_room(request, room_id):
    """Delete a room category."""
    hotel = Hotel.objects.filter(owner=request.user).first()
    room = get_object_or_404(RoomCategory, id=room_id, hotel__owner=request.user)
    name = room.name
    room.delete()
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'status': 'success',
            'message': f"Room '{name}' has been removed successfully."
        })
        
    messages.warning(request, f"Room '{name}' has been removed.")
    return redirect('manage_rooms')


@hotel_admin_required
@require_POST
def toggle_room_status(request, room_id):
    """Toggle room active status via AJAX (Live vs. Draft)."""
    hotel = Hotel.objects.filter(owner=request.user).first()
    room = get_object_or_404(RoomCategory, id=room_id, hotel__owner=request.user)
    
    room.is_active = not room.is_active
    room.save()
    
    return JsonResponse({
        'status': 'success',
        'is_active': room.is_active,
        'message': f"Room '{room.name}' {'deployed live' if room.is_active else 'set to draft'}."
    })


@hotel_admin_required
def add_offer(request, offer_id=None):
    """
    Create or Edit Hotel Offers.
    Handles precise targeting across multiple properties and specific room categories.
    """
    user_hotels = Hotel.objects.filter(owner=request.user)
    if not user_hotels.exists(): 
        return redirect('hotel_onboarding')
        
    offer = None
    if offer_id:
        # Secure retrieval: must be owned by user through at least one targeted hotel
        offer = get_object_or_404(Offer, id=offer_id, targeted_hotels__owner=request.user)
        
    if request.method == 'POST':
        try:
            name = request.POST.get('name')
            if offer:
                code = offer.code
            else:
                import uuid
                code = uuid.uuid4().hex[:8].upper()
            
            # Elite field mapping
            category = request.POST.get('category', 'PRICE')
            promotion_type = request.POST.get('promo_type', 'PERCENT')
            discount = request.POST.get('discount_value', 0)
            min_nights = request.POST.get('min_nights_stay', 1)
            
            # Window mapping
            start_date_str = request.POST.get('start_date')
            end_date_str = request.POST.get('end_date')
            
            # Professional date parsing
            activation_date = None
            expiration_date = None
            if start_date_str:
                activation_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            if end_date_str:
                expiration_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

            strategy = request.POST.get('strategy', 'DIRECT')
            limit = request.POST.get('usage_limit', -1)
            min_spend = request.POST.get('min_booking_amount', 0)
            max_disc = request.POST.get('max_discount_amount')
            description = request.POST.get('description', '')
            is_public = request.POST.get('is_public') == 'on'
            is_live = request.POST.get('is_live') == 'true'
            is_stackable = request.POST.get('is_stackable') == 'true'

            # Asset Orchestration
            hotel_ids = [hid for hid in request.POST.getlist('targeted_hotels') if hid.isdigit()]
            room_selection_mode = request.POST.get('room_selection_mode', 'ALL')
            
            if room_selection_mode == 'ALL':
                room_ids = list(RoomCategory.objects.filter(hotel_id__in=hotel_ids).values_list('id', flat=True))
            else:
                room_ids = [rid for rid in request.POST.getlist('targeted_rooms') if rid.isdigit()]

            if not hotel_ids:
                messages.warning(request, "Portfolio Alert: At least one property must be selected for activation.")
                return redirect('add_offer')

            perks = request.POST.get('perks', '')

            if offer:
                offer.name = name
                offer.code = code
                offer.strategy = strategy
                offer.category = category
                offer.promotion_type = promotion_type
                offer.min_nights_stay = min_nights
                offer.perks = perks
                offer.is_stackable = is_stackable
                offer.discount_percent = discount
                offer.activation_date = activation_date
                offer.expiration_date = expiration_date
                offer.usage_limit = limit
                offer.min_booking_amount = min_spend
                offer.max_discount_amount = max_disc if max_disc else None
                offer.description = description
                offer.is_public = is_public
                offer.is_live = is_live
                offer.status = 'ACTIVE' if is_live else 'DRAFT'
                offer.save()
            else:
                offer = Offer.objects.create(
                    name=name,
                    code=code,
                    strategy=strategy,
                    category=category,
                    promotion_type=promotion_type,
                    min_nights_stay=min_nights,
                    perks=perks,
                    is_stackable=is_stackable,
                    discount_percent=discount,
                    activation_date=activation_date,
                    expiration_date=expiration_date,
                    usage_limit=limit,
                    min_booking_amount=min_spend,
                    max_discount_amount=max_disc if max_disc else None,
                    description=description,
                    is_public=is_public,
                    is_live=is_live,
                    status='ACTIVE' if is_live else 'DRAFT',
                    scope='HOTEL'
                )

            # Sync M2M Relationships
            offer.targeted_hotels.set(Hotel.objects.filter(id__in=hotel_ids, owner=request.user))
            offer.targeted_rooms.set(RoomCategory.objects.filter(id__in=room_ids, hotel__owner=request.user))

            if is_stackable:
                combinable_ids = [cid for cid in request.POST.getlist('combinable_offers') if cid.isdigit()]
                offer.combinable_offers.set(Offer.objects.filter(id__in=combinable_ids, targeted_hotels__owner=request.user))
            else:
                offer.combinable_offers.clear()
            
            # Bonded Legacy Link (Unified Indexing)
            offer.hotel = offer.targeted_hotels.first()
            offer.save()

            status_msg = "Campaign activated across dossier." if is_live else "Strategic draft saved for future deployment."
            messages.success(request, f"Strategic Update: {status_msg}")
            return redirect('offers')
            
        except Exception as e:
            import traceback
            logger.error(f"[Strategic Failure] Offer Persistence Error: {str(e)}\n{traceback.format_exc()}")
            messages.error(request, f"Strategic Failure: {str(e)}")

    # Data for the "Elite" Selection Matrix
    all_rooms = RoomCategory.objects.filter(hotel__owner=request.user).select_related('hotel').prefetch_related('photos')
    
    # Pre-compute JSON for dynamic room rendering on frontend
    rooms_by_hotel = {}
    for room in all_rooms:
        hotel_id = str(room.hotel.id)
        if hotel_id not in rooms_by_hotel:
            rooms_by_hotel[hotel_id] = []
            
        photo_url = room.photos.first().media_file.url if room.photos.first() else ""
        
        rooms_by_hotel[hotel_id].append({
            'id': str(room.id),
            'name': room.name,
            'room_class': room.room_class,
            'max_guests': room.max_guests,
            'base_price': float(room.base_price),
            'image': photo_url,
            'hotel_name': room.hotel.name
        })
        
    import json
    rooms_by_hotel_json = json.dumps(rooms_by_hotel)
    
    # Strategy Metadata for the refined Elite UI
    # Structure: (CODE, NAME, ICON, THEME, SUBTITLE, CATEGORY, PROMO_TYPE, DISCOUNT, MIN_NIGHTS)
    strategy_data = [
        ('SEASONAL', 'Summer Cycle', 'fa-sun', 'seasonal', '15% MAGNITUDE'),
        ('RETENTION', 'Extended Stay', 'fa-moon', 'stay', 'STAY 3+, PAY 2'),
        ('PREMIUM', 'Elite Retreat', 'fa-crown', 'experience', 'INCLUSION BUNDLE'),
        ('GROWTH', 'Strategic Expansion', 'fa-chart-line', 'growth', 'VOLUME BOOST'),
        ('URGENCY', 'Flash Velocity', 'fa-fire-alt', 'urgency', 'LIMITED WINDOW'),
        ('LOYALTY', 'Elite Member', 'fa-award', 'loyalty', 'RETENTION MAGNET'),
        ('ARCHITECT', 'Bespoke Offer', 'fa-pen-nib', 'custom', 'BUILD FROM ZERO'),
    ]
    
    # Professional Wizard Metadata
    default_perks = [
        'Complimentary Breakfast', 'Airport Transfer', 'Late Check-out', 
        'Early Check-in', 'Free High-Speed Wi-Fi', 'Spa Voucher', 
        'Dinner Credit', 'Room Upgrade', 'Welcome Drink'
    ]
    
    # Fetch existing offers for combinable options
    existing_offers = Offer.objects.filter(targeted_hotels__owner=request.user).distinct()
    if offer and hasattr(offer, 'id'):
        existing_offers = existing_offers.exclude(id=offer.id)
    
    return render(request, 'hoteladmin/admin_dashboard/add_offer.html', {
        'offer': offer,
        'user_hotels': user_hotels,
        'all_rooms': all_rooms,
        'rooms_by_hotel_json': rooms_by_hotel_json,
        'strategy_data': strategy_data,
        'default_perks': default_perks,
        'categories': Offer.CATEGORY_CHOICES,
        'promotion_types': Offer.PROMOTION_TYPE_CHOICES,
        'guest_segments': Offer.GUEST_SEGMENT_CHOICES,
        'existing_offers': existing_offers,
    })


@hotel_admin_required
def bookings(request):
    """
    Guest Bookings and Payment Status.
    """
    user_hotels = Hotel.objects.filter(owner=request.user)
    if not user_hotels.exists():
        return redirect('hotel_onboarding')
        
    return render(request, 'hoteladmin/admin_dashboard/bookings.html', {
        'user_hotels': user_hotels,
        # We pass an empty structure so that JS handles the initial load
        'hotel': None, 
    })



@hotel_admin_required
@require_POST
def update_booking_status(request, booking_id):
    """
    Hotel Admin updates booking status.
    """
    hotel = Hotel.objects.filter(owner=request.user).first()
    if not hotel:
        return JsonResponse({'status': 'error', 'message': 'Hotel not found.'}, status=404)

    booking = get_object_or_404(Booking, id=booking_id, hotel=hotel)
    new_status = request.POST.get('status')
    new_payment = request.POST.get('payment_status')

    if new_status and new_status in dict(Booking.STATUS_CHOICES):
        booking.status = new_status
    
    if new_payment and new_payment in dict(Booking.PAYMENT_STATUS):
        booking.payment_status = new_payment

    booking.save()
    messages.success(request, f"Booking {booking.reference} updated to {booking.status}.")
    return redirect('bookings')


@hotel_admin_required
def api_bookings(request):
    """
    Returns latest 8 bookings filtered by hotelId or grouped by hotel.
    """
    hotel_id = request.GET.get('hotelId')
    user_hotels = Hotel.objects.filter(owner=request.user)
    
    if hotel_id and hotel_id != 'all':
        try:
            hotels = [user_hotels.get(id=hotel_id)]
        except Hotel.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Hotel not found'}, status=404)
    else:
        hotels = list(user_hotels)
        
    data = {"hotels": []}
    
    for h in hotels:
        reservations = h.bookings.all().order_by('-created_at') # type: ignore
        top_bookings = reservations[:8]
        active_count = reservations.filter(status__in=['CONFIRMED', 'PENDING']).count()
        total_bookings = reservations.count()
        
        booking_list = []
        for b in top_bookings:
            nights = 0
            if b.check_in and b.check_out:
                td = b.check_out - b.check_in
                nights = td.days if td.days > 0 else 1
                
            booking_list.append({
                "id": b.id,
                "guest_name": b.guest_name,
                "room_category": b.room_category.name if b.room_category else "Unassigned",
                "status": b.status,
                "payment_status": b.payment_status or "UNPAID",
                "check_in": b.check_in.strftime("%b %d, %Y") if b.check_in else "-",
                "check_out": b.check_out.strftime("%b %d, %Y") if b.check_out else "-",
                "nights": nights,
            })
            
        data["hotels"].append({
            "id": h.id,
            "name": h.name,
            "active_count": active_count,
            "status": "ONLINE",
            "total_bookings": total_bookings,
            "bookings": booking_list,
            "has_more": total_bookings > 8
        })
        
    # Aggregate Stats
    total_res = 0
    total_rev = Decimal(0)
    total_confirmed = 0
    
    for h in hotels:
        h_res = h.bookings.all() # type: ignore
        total_res += h_res.count()
        total_confirmed += h_res.filter(status='CONFIRMED').count()
        rev = h_res.filter(status='CONFIRMED').aggregate(models.Sum('total_revenue'))['total_revenue__sum']
        if rev:
            total_rev += rev
            
    aggregated_stats = {
        "total_bookings": total_res,
        "total_revenue": str(total_rev),
        "confirmed_stays": total_confirmed
    }
        
    return JsonResponse({'status': 'success', 'data': data, 'stats': aggregated_stats})




@hotel_admin_required
def insights(request):
    """
    Market Trends and Performance Data.
    """
    hotel = Hotel.objects.filter(owner=request.user).first()
    if not hotel:
        return redirect('hotel_onboarding')
        
    # ── Operational Intelligence Analytics (v34.0) ──
    # Calculating real occupancy based on current inventory vs confirmed bookings
    total_rooms = hotel.rooms.aggregate(models.Sum('inventory_count'))['inventory_count__sum'] or 1
    recent_confirmed = hotel.bookings.filter(status='CONFIRMED', check_in__lte=timezone.now().date(), check_out__gte=timezone.now().date()).count()
    
    occupancy_rate = min(100, int((recent_confirmed / total_rooms) * 100))
    
    analytics = {
        'occupancy_trend': [65, 78, 82, 74, 88, 92, occupancy_rate],
        'revenue_growth': "+14.8%" if occupancy_rate > 70 else "+6.2%",
        'market_share': f"{12.5 + (occupancy_rate/20):.1f}%",
        'competitor_index': "High Velocity" if occupancy_rate > 80 else "Stable"
    }
    
    return render(request, 'hoteladmin/admin_dashboard/insights.html', {
        'hotel': hotel,
        'analytics': analytics,
        'current_occupancy': occupancy_rate
    })


@hotel_admin_required
def reviews(request):
    """
    Guest Reviews and Ratings.
    """
    hotel = Hotel.objects.filter(owner=request.user).first()
    if not hotel:
        return redirect('hotel_onboarding')
        
    feedback_log = hotel.reviews.filter(is_visible=True).order_by('-created_at') # type: ignore
    avg_rating = feedback_log.aggregate(models.Avg('rating'))['rating__avg'] or 0.0
    
    # Using format string for rounding to bypass round() overload issues in this environment
    try:
        avg_display = float(f"{avg_rating:.1f}")
    except:
        avg_display = 0.0

    stats = {
        'avg_rating': avg_display,
        'total_feedback': feedback_log.count(),
        'sentiment_index': "Positive" if avg_rating >= 4.0 else "Neutral" if avg_rating >= 3.0 else "Needs Strategy"
    }
    
    user_hotels = Hotel.objects.filter(owner=request.user)
    
    return render(request, 'hoteladmin/admin_dashboard/reviews.html', {
        'reviews': feedback_log,
        'hotel': hotel,
        'user_hotels': user_hotels,
        'stats': stats
    })


@require_http_methods(["GET"])
@login_required
def api_reviews(request):
    """
    JSON API for Guest Reviews.
    Supports ?hotelId=all or specific ID. Links Reviews to actual Bookings.
    """
    hotel_id = request.GET.get('hotelId', 'all')
    user_hotels = Hotel.objects.filter(owner=request.user)
    
    if hotel_id != 'all' and hotel_id.isdigit():
        hotels = user_hotels.filter(id=hotel_id)
    else:
        hotels = user_hotels
        
    if not hotels.exists():
        return JsonResponse({'status': 'error', 'message': 'No hotels found'})

    data = {"hotels": []}
    
    total_rating_sum = 0
    total_reviews_count = 0
    
    for h in hotels:
        feedback_log = h.reviews.filter(is_visible=True).order_by('-created_at') # type: ignore
        count = feedback_log.count()
        
        if count == 0:
            continue
            
        hotel_rating_sum = feedback_log.aggregate(models.Sum('rating'))['rating__sum'] or 0
        total_rating_sum += hotel_rating_sum
        total_reviews_count += count
        
        # We limit to 150 latest reviews per group for professional history
        reviews_trimmed = feedback_log[:150]
        reviews_data = []
        
        for r in reviews_trimmed:
            # Attempt to locate the actual booking the guest made
            booking = Booking.objects.filter(hotel=h, guest_name__iexact=r.guest_name).order_by('-created_at').first()
            booking_info = None
            if booking:
                nights = (booking.check_out - booking.check_in).days
                booking_info = {
                    'room_category': booking.room_category.name if booking.room_category else 'Standard',
                    'check_in': booking.check_in.strftime("%b %d, %Y"),
                    'check_out': booking.check_out.strftime("%b %d, %Y"),
                    'nights': nights if nights > 0 else 1
                }
                
            reviews_data.append({
                'id': r.id,
                'guest_name': r.guest_name.title(),
                'rating': r.rating,
                'comment': r.comment,
                'created_at': r.created_at.strftime("%b %d, %Y"),
                'booking_info': booking_info
            })
            
        data["hotels"].append({
            "id": h.id,
            "name": h.name,
            "active_count": count,
            "status": "ONLINE" if h.is_live else "MAINTENANCE",
            "reviews": reviews_data,
            "has_more": count > 150
        })

    # Global Stats Calculate
    avg_rating_val = (total_rating_sum / total_reviews_count) if total_reviews_count > 0 else 0.0
    try:
        avg_display = float(f"{avg_rating_val:.1f}")
    except:
        avg_display = 0.0
        
    global_stats = {
        'avg_rating': avg_display,
        'total_feedback': total_reviews_count,
        'sentiment_index': "Excellent Rating" if avg_rating_val >= 4.0 else "Positive" if avg_rating_val >= 3.0 else "Needs Strategy",
        # Simulating sub-metrics dynamically based off rating baseline
        'service_quality': f"{min(98.4, (avg_display/5)*100 + 4):.1f}%",
        'food_dining': f"{min(95.0, (avg_display/5)*100 - 1):.1f}%",
        'room_details': f"{min(92.1, (avg_display/5)*100 - 3):.1f}%",
        'checkin_process': f"{min(96.8, (avg_display/5)*100 + 1):.1f}%",
    }
        
    return JsonResponse({'status': 'success', 'data': data, 'stats': global_stats})


@login_required
def profile_settings(request):
    """
    Handle user profile and property settings.
    """
    hotel = Hotel.objects.filter(owner=request.user).first()
    
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip().lower()
        contact = request.POST.get('contact', '').strip()
        website = request.POST.get('website', '').strip()

        if not username or not email:
            messages.error(request, "Username and Email are required.")
            return redirect('profile_settings')

        # Check for existing email if changed
        if email != request.user.email:
            if CustomUser.objects.filter(email=email).exists():
                messages.error(request, "This email is already associated with another account.")
                return redirect('profile_settings')

        try:
            user = request.user
            user.username = username
            user.email = email
            user.save()
            
            if hotel:
                hotel.contact_number = contact
                hotel.website = website
                hotel.save()
                
            messages.success(request, "Your profile has been updated successfully.")
            return redirect('profile_settings')
        except Exception as e:
            logger.error(f"[Settings Error] {str(e)}")
            messages.error(request, "Failed to update settings. Please try again.")
            return redirect('profile_settings')
        
    return render(request, 'hoteladmin/admin_dashboard/settings.html', {'hotel': hotel})


@login_required
def admin_verify_list(request):
    """
    Admin Verification List.
    Review all hotels waiting for approval.
    """
    if not request.user.is_staff:
        return redirect('dashboard')
        
    pending = Hotel.objects.filter(status='PENDING').order_by('-created_at')
    return render(request, 'hoteladmin/admin_dashboard/admin/verify_list.html', {
        'pending_hotels': pending
    })


@login_required
def admin_offer_list(request):
    """
    Admin Offer Review List.
    """
    if not request.user.is_staff:
        return redirect('dashboard')
        
    pending_offers = Offer.objects.filter(is_live=True).order_by('-created_at')
    return render(request, 'hoteladmin/admin_dashboard/admin/offer_review_list.html', {
        'pending_offers': pending_offers
    })


@login_required
def admin_review_offer(request, offer_id):
    """
    Review and Approve/Reject Offers.
    """
    if not request.user.is_staff:
        return redirect('dashboard')
        
    offer = get_object_or_404(Offer, id=offer_id)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'approve':
            offer.is_live = True
            offer.save()
            messages.success(request, f"Offer Approved: {offer.name} is now live.")
        elif action == 'reject':
            reason = request.POST.get('rejection_reason', 'Does not meet requirements.')
            offer.is_live = False
            offer.save()
            messages.warning(request, f"Offer Rejected: {offer.name} was not approved. Reason: {reason}")
            
        return redirect('admin_offer_list')
        
    return render(request, 'hoteladmin/admin_dashboard/admin/offer_review_detail.html', {
        'offer': offer
    })


@hotel_admin_required
def api_latest_booking(request):
    """API for real-time dashboard notifications."""
    hotel = Hotel.objects.filter(owner=request.user).first()
    if not hotel:
        return JsonResponse({'status': 'none'})
    
    latest = hotel.bookings.order_by('-created_at').first() # type: ignore
    if latest:
        # Check if created in the last 60 seconds
        if (timezone.now() - latest.created_at).total_seconds() < 60:
            return JsonResponse({
                'status': 'new',
                'ref': latest.reference,
                'guest': latest.guest_name,
                'room': latest.room_category.name if latest.room_category else "N/A"
            })
            
    return JsonResponse({'status': 'none'})


@hotel_admin_required
@require_POST
def delete_hotel(request, hotel_id):
    """
    Elite Deletion Protocol:
    1. Unverified properties (INCOMPLETE, PENDING, REJECTED) are removed instantly.
    2. Verified/Approved properties are put into DELETION_PENDING for audit.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    
    if hotel.can_delete_directly:
        name = hotel.name
        hotel.delete()
        messages.warning(request, f"Property '{name}' has been completely removed from your portfolio.")
    else:
        # Professional Decommissioning Path
        hotel.status = 'DELETION_PENDING'
        hotel.save()
        messages.info(
            request, 
            f"Deletion request for '{hotel.name}' initiated. "
            "Our audit team will review and decommission the property within 24-48 business hours."
        )
    return redirect('my_hotels')
    
@hotel_admin_required
def edit_hotel(request, hotel_id):
    """
    Master Property Editor: Update Global Dossier.
    Handles updates for Identity, Inventory (Rooms), and Compliance.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    
    if request.method == 'POST':
        from decimal import Decimal
        try:
            # 1. Update Core Identity (Step 1 Fields)
            hotel.name = request.POST.get('hotel_name', hotel.name).strip()
            hotel_type = request.POST.get('hotel_type', '').strip()
            if hotel_type:
                hotel.category = hotel_type
                
            hotel.address = request.POST.get('address', hotel.address).strip()
            hotel.narrative = request.POST.get('hotel_narrative', hotel.narrative).strip()
            hotel.contact_number = request.POST.get('contact_number', hotel.contact_number).strip()
            hotel.website = request.POST.get('website', hotel.website).strip()
            try:
                hotel.star_rating = Decimal(request.POST.get('star_rating') or hotel.star_rating)
            except (TypeError, ValueError):
                pass
            
            # Location Intelligence
            hotel.city = request.POST.get('city', hotel.city).strip()
            hotel.state = request.POST.get('state', hotel.state).strip()
            hotel.pincode = request.POST.get('pincode', hotel.pincode).strip()
            lat = request.POST.get('lat')
            lng = request.POST.get('lng')
            if lat: hotel.latitude = lat
            if lng: hotel.longitude = lng

            # Global Protocol Update: Services & Identity
            services_raw = request.POST.get('services', '[]')
            if services_raw:
                # Fix for Python-style single quotes in rendered templates
                if "'" in services_raw and '"' not in services_raw:
                    services_raw = services_raw.replace("'", '"')
                try:
                    hotel.services = json.loads(services_raw)
                    if not isinstance(hotel.services, list): hotel.services = []
                except:
                    hotel.services = request.POST.getlist('services')
            
            hotel.name = request.POST.get('hotel_name', hotel.name)
            hotel.category = request.POST.get('hotel_type', hotel.category)
            hotel.address = request.POST.get('address', hotel.address)
            hotel.city = request.POST.get('city', hotel.city)
            hotel.state = request.POST.get('state', hotel.state)
            hotel.pincode = request.POST.get('pincode', hotel.pincode)
            hotel.contact_number = request.POST.get('contact_number', hotel.contact_number)
            hotel.website = request.POST.get('website', hotel.website)
            hotel.narrative = request.POST.get('hotel_narrative', hotel.narrative)
            
            from decimal import Decimal
            try:
                hotel.star_rating = Decimal(str(request.POST.get('star_rating') or hotel.star_rating))
            except: pass
            
            hotel.check_in_time = request.POST.get('check_in', hotel.check_in_time)
            hotel.check_out_time = request.POST.get('check_out', hotel.check_out_time)
            hotel.cancellation_policy = request.POST.get('cancellation_policy', hotel.cancellation_policy)
                
            # 3. Compliance Data (Step 3 Fields)
            hotel.id_type = request.POST.get('id_type', hotel.id_type)
            hotel.id_number = request.POST.get('id_number', hotel.id_number).strip()
            hotel.govt_reg_number = request.POST.get('govt_reg_number', hotel.govt_reg_number)
            hotel.gst_number = request.POST.get('gst_number', hotel.gst_number).strip()
            
            # Document Preservation
            if request.FILES.get('doc_mandatory'): hotel.doc_id_proof = request.FILES.get('doc_mandatory')
            if request.FILES.get('doc_certificate'): hotel.doc_govt_registration = request.FILES.get('doc_certificate')
            if request.FILES.get('doc_gst'): hotel.doc_gst_certificate = request.FILES.get('doc_gst')
            
            hotel.save()
            logger.info(f"[Edit Hotel] Identity & Compliance saved for '{hotel.name}'")

            # 4. Inventory Matrix Sync (Dynamic Rooms)
            room_indices = []
            for key in request.POST.keys():
                if key.startswith('room_name_'):
                    idx = key.replace('room_name_', '')
                    if idx and idx != "__prefix__":
                        room_indices.append(idx)
            
            processed_room_ids = []
            logger.info(f"[Edit Hotel] Detected {len(room_indices)} room node(s) for sync: {room_indices}")
            logger.info(f"[Edit Hotel] All POST keys: {list(request.POST.keys())}")
            for idx in room_indices:
                # Unified Sync Logic for Existing/New Nodes
                try:
                    room_id = request.POST.get(f'room_id_{idx}')
                    name = request.POST.get(f'room_name_{idx}', '').strip()
                    if not name: continue # Safety skip for ghost nodes

                    try:
                        p_price = request.POST.get(f'room_price_{idx}')
                        p_raw = "".join(c for c in str(p_price) if c.isdigit() or c == '.') if p_price else "0"
                        price = Decimal(p_raw or "0")
                        
                        p_guests = request.POST.get(f'room_guests_{idx}')
                        guests = int("".join(c for c in str(p_guests) if c.isdigit()) or "2") if p_guests else 2
                        
                        p_count = request.POST.get(f'room_count_{idx}')
                        count = int("".join(c for c in str(p_count) if c.isdigit()) or "1") if p_count else 1
                    except Exception as num_err:
                        price, guests, count = Decimal('0.0'), 2, 1
                        logger.warning(f"[Edit Hotel] Numeric fallback used for node {idx}: {str(num_err)}")

                    r_class = request.POST.get(f'room_class_{idx}', 'STANDARD') or 'STANDARD'
                    
                    # Robust Amenities Capture (Handles Python-style single quotes)
                    amenities_data = request.POST.get(f'room_amenities_{idx}', '[]')
                    if "'" in amenities_data and '"' not in amenities_data:
                        amenities_data = amenities_data.replace("'", '"')
                    try: 
                        amenities_list = json.loads(amenities_data)
                        if not isinstance(amenities_list, list): amenities_list = []
                    except: 
                        amenities_list = []

                    if room_id: # Precise Existing Registry Sync
                        try:
                            room = RoomCategory.objects.get(id=room_id, hotel=hotel)
                            room.name = name
                            room.room_class = r_class
                            room.max_guests = guests
                            room.base_price = price
                            room.inventory_count = count
                            room.amenities = amenities_list
                            room.save()
                        except RoomCategory.DoesNotExist:
                            # If ID specified but not found in this hotel context, create new
                            room = RoomCategory.objects.create(
                                hotel=hotel, name=name, room_class=r_class,
                                max_guests=guests, base_price=price,
                                inventory_count=count, amenities=amenities_list
                            )
                    else: # Create New Category Protocol
                        room = RoomCategory.objects.create(
                            hotel=hotel, name=name, room_class=r_class,
                            max_guests=guests, base_price=price,
                            inventory_count=count, amenities=amenities_list
                        )
                    
                    processed_room_ids.append(room.id) # type: ignore
                    logger.info(f"[Edit Hotel] Category '{name}' synced successfully.")

                    # Deletions within current room node
                    deleted_photos_data = request.POST.get(f'deleted_room_photos_{idx}', '[]')
                    try:
                        deleted_photos_ids = json.loads(deleted_photos_data)
                        if deleted_photos_ids:
                            RoomPhoto.objects.filter(id__in=deleted_photos_ids, room_category=room).delete()
                    except: pass

                    # Append new Assets
                    room_media = request.FILES.getlist(f'room_photos_{idx}')
                    for f in room_media:
                        RoomPhoto.objects.create(room_category=room, media_file=f)

                except Exception as room_err:
                    logger.error(f"[Edit Hotel] Failure in room loop {idx}: {str(room_err)}")

            # Decommission rooms not present in the current sync packet
            hotel.rooms.exclude(id__in=processed_room_ids).delete() # type: ignore

            # 5. Global Gallery Synchronization
            deleted_gallery_data = request.POST.get('deleted_gallery_photos', '[]')
            try:
                deleted_gallery_ids = json.loads(deleted_gallery_data)
                if deleted_gallery_ids:
                    HotelGallery.objects.filter(id__in=deleted_gallery_ids, hotel=hotel).delete()
            except: pass

            gallery_files = request.FILES.getlist('property_images')
            for f in gallery_files:
                HotelGallery.objects.create(hotel=hotel, media_file=f)
 
            messages.success(request, f"Global Property Dossier for '{hotel.name}' has been securely synchronized.")
            return redirect('my_hotels')

        except Exception as e:
            logger.error(f"[Edit Hotel Error] {str(e)}")
            messages.error(request, f"Protocol Failure: {str(e)}")

    # Prefetch data for elite rendering
    # We use .all() to ensure we get all RoomCategory objects linked to this hotel
    rooms = hotel.rooms.all().prefetch_related('photos') # type: ignore
    gallery = hotel.gallery.all() # type: ignore
    
    return render(request, 'hoteladmin/admin_dashboard/edit_hotel.html', {
        'hotel': hotel,
        'rooms': rooms,
        'gallery': gallery,
        'service_choices': HOTEL_SERVICE_CHOICES,
        'is_edit': True # Context flag for high-fidelity UI
    })
@login_required
def toggle_offer_status(request, offer_id):
    """
    Strategic Status Orchestration: Toggles an offer between LIVE and DRAFT.
    """
    offer = get_object_or_404(Offer, id=offer_id)
    
    # Security: Ensure user owns either the bound hotel or at least one of the targeted hotels
    user_hotels = Hotel.objects.filter(owner=request.user)
    has_bound_access = offer.hotel and offer.hotel.owner == request.user
    has_targeted_access = offer.targeted_hotels.filter(owner=request.user).exists()
    
    if not (has_bound_access or has_targeted_access):
        return JsonResponse({'status': 'error', 'message': 'Unauthorized Architecture Access'}, status=403)
    
    offer.is_live = not offer.is_live
    offer.save()
    
    status_label = "LIVE" if offer.is_live else "DRAFT"
    return JsonResponse({
        'status': 'success',
        'is_live': offer.is_live,
        'message': f'Offer is now {status_label}'
    })

@login_required
def delete_offer(request, offer_id):
    """
    Secure Decommissioning: Removes an offer from the portfolio archive.
    """
    offer = get_object_or_404(Offer, id=offer_id)
    
    # Security: Ensure user owns either the bound hotel or at least one of the targeted hotels
    user_hotels = Hotel.objects.filter(owner=request.user)
    has_bound_access = offer.hotel and offer.hotel.owner == request.user
    has_targeted_access = offer.targeted_hotels.filter(owner=request.user).exists()

    if not (has_bound_access or has_targeted_access):
        return JsonResponse({'status': 'error', 'message': 'Unauthorized Decommissioning Request'}, status=403)
    
    offer.delete()
    return JsonResponse({
        'status': 'success',
        'message': 'Strategy successfully removed from portfolio'
    })

# ─────────────────────────────────────────────────────────────────────────────
# AI AGENT ARCHITECTURE (v61.0 ELITE)
# ─────────────────────────────────────────────────────────────────────────────

from .models import AIAgentConfig

@hotel_admin_required
def ai_dashboard(request, hotel_id=None):

    all_hotels = Hotel.objects.filter(owner=request.user)
    is_global = (hotel_id == 0)
    
    if is_global:
        hotel = all_hotels.first()
        if not hotel:
            return redirect('hotel_onboarding')

    elif not hotel_id:
        hotel = all_hotels.first()
        if not hotel:
            return redirect('hotel_onboarding')
        return redirect('ai_dashboard_specific', hotel_id=hotel.id)

    else:
        hotel = get_object_or_404(all_hotels, id=hotel_id)

    ai_service = HotelAIService(hotel)

    # ✅ FIX HERE
    config, created = AIAgentConfig.objects.get_or_create(hotel=hotel)

    analysis_in_progress_key = f"ai_analysis_lock_{hotel.id}"

    if not config.last_analysis_at or (timezone.now() - config.last_analysis_at).total_seconds() > 86400:
        if not cache.get(analysis_in_progress_key):
            cache.set(analysis_in_progress_key, True, timeout=300)
            try:
                ai_service.perform_periodic_analysis()
            except Exception as e:
                logger.error(f"[AI Analysis Trigger Error] {e}")

    if is_global:
        from .models import AIInsight, AITask, AIChatMessage

        insights = AIInsight.objects.filter(
            hotel__owner=request.user, is_active=True
        ).order_by('-priority', '-created_at')[:15]

        tasks = AITask.objects.filter(
            hotel__owner=request.user
        ).order_by('-created_at')[:10]

        chat_history = AIChatMessage.objects.filter(
            hotel__owner=request.user
        ).order_by('-timestamp')[:20]

        config = None  # OK for global

    else:
        insights = hotel.ai_insights.filter(is_active=True)
        tasks = hotel.ai_tasks.all()[:10]
        chat_history = hotel.ai_chat_history.all()[:20]

        # ❌ REMOVE THIS LINE:
        # config = hotel.ai_config

        # ✅ Already created above

    context = {
        'hotel': hotel,
        'all_hotels': all_hotels,
        'is_global': is_global,
        'config': config,
        'insights': insights,
        'tasks': tasks,
        'chat_history': chat_history,
    }

    return render(request, 'hoteladmin/admin_dashboard/ai_dashboard.html', context)
@require_POST
@login_required
def api_ai_chat(request, hotel_id):
    """
    AJAX endpoint for the AI Chat interface.
    Supports Portfolio Global Mode if hotel_id=0.
    """
    if hotel_id == 0:
        # GLOBAL PORTFOLIO CONTEXT
        hotel_anchor = None
    else:
        hotel_anchor = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
        
    try:
        data = json.loads(request.body)
        query = data.get('query')
        session_id = data.get('session_id')
        document_id = data.get('document_id')
        
        if not query:
            return JsonResponse({'status': 'error', 'message': 'Empty query handshake failed.'}, status=400)
            
        ai_service = HotelAIService(hotel_anchor)
        response = ai_service.generate_chat_response(
            request.user, 
            query, 
            session_id=session_id, 
            document_id=document_id
        )
        
        if "Zenith Shield Active" in response or "temporarily busy" in response or "Request queued" in response:
            return JsonResponse({
                'status': 'error',
                'message': response if ("Zenith Shield" in response or "temporarily busy" in response) else 'Zenith Core is currently syncing high-density telemetry. Request queued. Please retry in 10s.',
                'diagnostics': response if django_settings.DEBUG else None
            }, status=200)

        # Get the ID of the newly created message to allow frontend editing
        last_msg = AIChatMessage.objects.filter(session_id=session_id).order_by('-timestamp').first()
        msg_id = last_msg.id if last_msg else None

        # Check if first message in session to send the PDF
        if session_id:
            message_count = AIChatMessage.objects.filter(session_id=session_id).count()
            logger.info(f"[AI Chat Debug] session_id={session_id}, message_count={message_count}")
            if message_count == 1:
                logger.info(f"[AI Chat Debug] Triggering PDF email for {request.user.email}")
                # Trigger background email (or synchronous for now as per instructions)
                _send_saas_strategy_pdf(request.user)

        return JsonResponse({
            'status': 'success',
            'response': response,
            'message_id': msg_id
        })
    except Exception as e:
        logger.error(f"[AI Resonance Critical] {str(e)}")
        return JsonResponse({
            'status': 'error', 
            'message': 'Neural link synchronization failure. Please verify connection and retry.'
        }, status=200)

def _send_saas_strategy_pdf(user):
    """
    Professional Email Dispatch: Sends the Hotel SaaS Strategy PDF to the user's email.
    """
    try:
        logger.info(f"[Email Trigger] Initiating SaaS Strategy PDF dispatch for {user.email}")
        subject = "Your Hotel SaaS Strategic Breakdown — HotelPro Nexus"
        
        # Professional HTML body if possible, or clean text
        message = f"""
Hello {user.username},

It was a pleasure starting our conversation today. 

As part of our commitment to your property's growth, I've attached the complete **Hotel Management SaaS Strategy & Breakdown**. This document outlines our core architecture, unique AI features, and the roadmap for transforming your hotel operations.

Key highlights in the document:
- Dynamic Pricing & AI Suggestions
- Global Portfolio Intelligence
- Unified Booking Engine Strategy

If you have any questions about the roadmap, feel free to ask me during our next session!

Best Regards,
Alex (HotelPro AI)
HotelPro Nexus Intelligence Team
"""
        
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        
        # Resolve PDF Path
        pdf_path = django_settings.STATIC_DIR / 'pdfs' / 'hotel_saas_strategy (3).pdf'
        
        if os.path.exists(pdf_path):
            with open(pdf_path, 'rb') as f:
                email.attach('Hotel_SaaS_Strategy_Breakdown.pdf', f.read(), 'application/pdf')
            
            email.send(fail_silently=False)
            logger.info(f"[Email Success] SaaS Strategy PDF dispatched successfully to {user.email}")
            return True
        else:
            logger.error(f"[Email Error] Strategic PDF not found at {pdf_path}")
            return False
            
    except Exception as e:
        logger.error(f"[Email Critical] Dispatch failed for {user.email}: {str(e)}")
        return False

@require_POST
@login_required
def api_ai_toggle_automation(request, hotel_id):
    """
    Enables/Disables AI Action Mode.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    config = hotel.ai_config
    config.is_action_mode_enabled = not config.is_action_mode_enabled
    config.save()
    
    state = "ENABLED" if config.is_action_mode_enabled else "DISABLED"
    return JsonResponse({
        'status': 'success',
        'is_enabled': config.is_action_mode_enabled,
        'message': f'AI Action Mode {state}'
    })

@require_POST
@login_required
def api_ai_execute_task(request, hotel_id, task_id):
    """
    Executes a specific AI-suggested task.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    ai_service = HotelAIService(hotel)
    
    success, message = ai_service.execute_task(task_id)
    
    if success:
        return JsonResponse({'status': 'success', 'message': message})
    else:
        return JsonResponse({'status': 'error', 'message': message}, status=500)

@require_POST
def api_ai_guest_chat(request):
    """
    Public API for the Guest AI Concierge.
    """
    try:
        data = json.loads(request.body)
        query = data.get('query')
        if not query:
            return JsonResponse({'status': 'error', 'message': 'No query provided'}, status=400)
        
        guest_service = GuestAIService()
        response = guest_service.generate_guest_response(request.user, query)
        
        return JsonResponse({'status': 'success', 'response': response})
    except Exception as e:
        logger.error(f"[Guest AI Failure] {str(e)}")
        return JsonResponse({
            'status': 'error', 
            'message': 'Our AI concierge is currently assisting many guests. Please feel free to browse our hotels while it recharges!'
        }, status=200)

@login_required
@super_admin_required
def admin_ai_strategy(request):
    """
    Renders the Super Admin Strategic Intelligence Hub.
    """
    return render(request, 'hoteladmin/admin_dashboard/admin/ai_strategy.html', {
        'active_menu': 'ai_strategy'
    })

@login_required
@super_admin_required
def api_ai_super_admin_strategy(request):
    """
    Strategic intelligence for Super Admins.
    """
    admin_service = SuperAdminAIService()
    try:
        report = admin_service.generate_strategy_report()
        return JsonResponse({'status': 'success', 'report': report})
    except Exception as e:
        logger.error(f"[Super Admin AI Failure] {str(e)}")
        return JsonResponse({
            'status': 'error', 
            'message': 'Strategic data currently unavailable. The system is re-indexing global performance indices.'
        }, status=200)

@login_required
@super_admin_required
def api_ai_hotel_audit(request, hotel_id):
    """
    Quality Control Audit for Super Admin during hotel verification.
    """
    admin_service = SuperAdminAIService()
    try:
        audit_json = admin_service.audit_hotel(hotel_id)
        # Clean response text
        raw_text = audit_json.replace('```json', '').replace('```', '').strip()
        audit_data = json.loads(raw_text)
        
        return JsonResponse({
            'status': 'success',
            'audit': audit_data
        })
    except Exception as e:
        logger.error(f"[AI Audit Failure] {str(e)}")
        return JsonResponse({
            'status': 'error', 
            'message': 'Audit paused due to AI rate limits. Please review manually for now.'
        }, status=200)

@login_required
@hotel_admin_required
def api_ai_generate_review_response(request, hotel_id, review_id):
    """
    Generate an AI response to a guest review.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    ai_service = HotelAIService(hotel)
    try:
        response_text = ai_service.generate_review_response(review_id)
        return JsonResponse({
            'status': 'success',
            'response': response_text
        })
    except Exception as e:
        logger.error(f"[Review AI Failure] {str(e)}")
        return JsonResponse({
            'status': 'error', 
            'message': 'Review architect is currently at capacity. Please try again soon.'
        }, status=200)

@login_required
@hotel_admin_required
def api_ai_portfolio_insights(request):
    """
    API for generating aggregate portfolio intelligence for multi-property owners.
    """
    hotels = Hotel.objects.filter(owner=request.user)
    if not hotels.exists():
        return JsonResponse({'status': 'error', 'message': 'No hotels found.'}, status=404)
    
    portfolio_service = PortfolioAIService(request.user, hotels)
    try:
        report_json = portfolio_service.generate_portfolio_insights()
        # Clean response text
        raw_text = report_json.replace('```json', '').replace('```', '').strip()
        data = json.loads(raw_text)
        
        return JsonResponse({
            'status': 'success',
            'insights': data
        })
    except Exception as e:
        logger.error(f"[Portfolio AI Failure] {str(e)}")
        return JsonResponse({
            'status': 'error', 
            'message': 'Dossier analysis interrupted. High-density metrics are being cached.'
        }, status=200)


# =============================================================================
# SENTINEL AI v4.0 — SESSION & INTELLIGENCE STREAM ENDPOINTS
# =============================================================================

@login_required
@hotel_admin_required
def api_ai_sessions(request, hotel_id):
    """List, create, rename, or delete AI chat sessions."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)

    if request.method == 'GET':
        sessions = AIChatSession.objects.filter(hotel=hotel, user=request.user, is_deleted=False)
        data = [{
            'id': s.id,
            'title': s.title,
            'updated_at': s.updated_at.strftime('%b %d, %H:%M'),
            'message_count': s.messages.count()
        } for s in sessions]
        return JsonResponse({'status': 'success', 'sessions': data})

    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action', 'create')
        
        if action == 'create':
            session = AIChatSession.objects.create(
                hotel=hotel, user=request.user,
                title=data.get('title', 'New Intelligence Session')
            )
            return JsonResponse({'status': 'success', 'session_id': session.id, 'title': session.title})
        
        elif action == 'rename':
            session = get_object_or_404(AIChatSession, id=data.get('session_id'), hotel=hotel, user=request.user)
            session.title = data.get('title', session.title)
            session.save()
            return JsonResponse({'status': 'success'})
        
        elif action == 'delete':
            session = get_object_or_404(AIChatSession, id=data.get('session_id'), hotel=hotel, user=request.user)
            session.is_deleted = True
            session.save()
            return JsonResponse({'status': 'success'})
        
        elif action == 'delete_all':
            AIChatSession.objects.filter(hotel=hotel, user=request.user, is_deleted=False).update(is_deleted=True)
            return JsonResponse({'status': 'success'})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)


@login_required
@hotel_admin_required
def api_ai_session_messages(request, hotel_id, session_id):
    """Get all messages in a session or clear them."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    session = get_object_or_404(AIChatSession, id=session_id, hotel=hotel, user=request.user)

    if request.method == 'GET':
        messages_qs = session.messages.filter(is_deleted=False).order_by('timestamp')
        data = [{
            'id': m.id,
            'query': m.query,
            'response': m.response,
            'is_edited': m.is_edited,
            'version': m.version,
            'timestamp': m.timestamp.strftime('%H:%M'),
            'has_document': m.attached_document_id is not None,
            'document_url': m.attached_document.file.url if m.attached_document else None,
            'document_type': m.attached_document.file_type if m.attached_document else None,
        } for m in messages_qs]
        return JsonResponse({'status': 'success', 'messages': data})
    
    if request.method == 'DELETE':
        session.messages.filter(is_deleted=False).update(is_deleted=True)
        return JsonResponse({'status': 'success', 'message': 'History cleared.'})

    return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)


@login_required
@hotel_admin_required
def api_ai_edit_message(request, hotel_id, message_id):
    """Edit a previous query and regenerate the AI response."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    original_msg = get_object_or_404(AIChatMessage, id=message_id, hotel=hotel, user=request.user)

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)
    
    data = json.loads(request.body)
    new_query = data.get('query', '').strip()
    if not new_query:
        return JsonResponse({'status': 'error', 'message': 'Query cannot be empty.'}, status=400)

    try:
        agent = ZenithAgent(hotel=hotel, user=request.user)
        new_response = agent.execute(
            query=new_query,
            session_id=original_msg.session_id,
            document_context=original_msg.attached_document.extracted_text if original_msg.attached_document else None
        )
        # Branch the edit as a new versioned message
        new_msg = AIChatMessage.objects.create(
            session=original_msg.session,
            hotel=hotel,
            user=request.user,
            query=new_query,
            response=new_response,
            is_edited=True,
            version=original_msg.version + 1,
            parent=original_msg
        )
        # Archive the original to keep clean thread
        original_msg.is_edited = True
        original_msg.save()

        return JsonResponse({'status': 'success', 'response': new_response, 'message_id': new_msg.id})
    except Exception as e:
        logger.error(f"[Edit Message Failure] {str(e)}")
        return JsonResponse({'status': 'error', 'message': 'Re-analysis failed. Intelligence engine is rate-limited.'}, status=200)


@login_required
@hotel_admin_required
@require_POST
def api_ai_update_message_response(request, hotel_id, message_id):
    """Manually update/correct an AI response text."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    msg = get_object_or_404(AIChatMessage, id=message_id, hotel=hotel, user=request.user)
    
    try:
        data = json.loads(request.body)
        new_response = data.get('response', '').strip()
        if not new_response:
            return JsonResponse({'status': 'error', 'message': 'Response cannot be empty.'}, status=400)
            
        msg.response = new_response
        msg.is_edited = True
        msg.save()
        
        return JsonResponse({'status': 'success', 'response': msg.response})
    except Exception as e:
        logger.error(f"[Update Response Failure] {str(e)}")
        return JsonResponse({'status': 'error', 'message': 'Internal update failure.'}, status=500)


@login_required
@hotel_admin_required
def api_ai_recycle_bin(request, hotel_id):
    """List all soft-deleted sessions and documents in the recycle bin."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    
    deleted_sessions = AIChatSession.objects.filter(hotel=hotel, user=request.user, is_deleted=True)
    deleted_docs = AIDocument.objects.filter(session__hotel=hotel, user=request.user, is_deleted=True)
    
    data = {
        'status': 'success',
        'sessions': [{
            'id': s.id,
            'title': s.title,
            'deleted_at': s.updated_at.strftime('%b %d, %H:%M'),
            'type': 'session'
        } for s in deleted_sessions],
        'documents': [{
            'id': d.id,
            'filename': d.filename,
            'file_type': d.file_type,
            'url': d.file.url if getattr(d, 'file', None) and d.file else None,
            'deleted_at': d.created_at.strftime('%b %d, %H:%M'),
            'type': 'document'
        } for d in deleted_docs]
    }
    return JsonResponse(data)


@login_required
@hotel_admin_required
@require_POST
def api_ai_recycle_bin_action(request, hotel_id):
    """Restore or permanently purge items from the recycle bin."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    data = json.loads(request.body)
    item_id = data.get('item_id')
    item_type = data.get('type') # 'session' or 'document'
    action = data.get('action') # 'restore' or 'purge'
    
    if item_type == 'session':
        item = get_object_or_404(AIChatSession, id=item_id, hotel=hotel, user=request.user)
    elif item_type == 'document':
        item = get_object_or_404(AIDocument, id=item_id, user=request.user)
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid item type'}, status=400)
        
    if action == 'restore':
        item.is_deleted = False
        item.save()
        return JsonResponse({'status': 'success', 'message': f'{item_type.capitalize()} restored.'})
    
    elif action == 'purge':
        item.delete()
        return JsonResponse({'status': 'success', 'message': f'{item_type.capitalize()} permanently deleted.'})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid action'}, status=400)


@login_required
@hotel_admin_required
def api_ai_upload_document(request, hotel_id):
    """Upload a document for AI analysis and context injection."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    
    # 🛡️ Sentinel Secure Tunnel Handshake
    secure_tunnel = request.headers.get('X-Sentinel-Secure-Tunnel')
    if not secure_tunnel:
        logger.warning(f"[Unsecured Stream] Upload detected for Hotel ID: {hotel_id} without Sentinel Tunnel Protocol.")
        # We allow it for now for backward compatibility, but in high-security mode we would reject.
    else:
        logger.info(f"[Secure Stream] Sentinel Vision Tunnel established for Hotel ID: {hotel_id}")

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)
    
    uploaded_file = request.FILES.get('file')
    session_id = request.POST.get('session_id')
    
    if not uploaded_file:
        return JsonResponse({'status': 'error', 'message': 'No file provided.'}, status=400)
    
    # Validate file type
    allowed_extensions = ['.pdf', '.txt', '.docx', '.doc', '.csv', '.jpg', '.jpeg', '.png', '.webp', '.gif']
    file_ext = '.' + uploaded_file.name.rsplit('.', 1)[-1].lower() if '.' in uploaded_file.name else ''
    if file_ext not in allowed_extensions:
        return JsonResponse({'status': 'error', 'message': f'Unsupported format. Allowed: Document and Image types'}, status=400)
    
    # Get or create session
    session = None
    if session_id:
        session = AIChatSession.objects.filter(id=session_id, hotel=hotel, user=request.user).first()
    if not session:
        session = AIChatSession.objects.create(hotel=hotel, user=request.user, title=f'Doc: {uploaded_file.name[:30]}')
    
    # Create document record
    doc = AIDocument.objects.create(
        session=session,
        user=request.user,
        file=uploaded_file,
        filename=uploaded_file.name,
        file_type=file_ext.lstrip('.'),
        status='PROCESSING'
    )
    
    # Synchronous text extraction for now
    extracted = ''
    try:
        if file_ext == '.txt':
            extracted = uploaded_file.read().decode('utf-8', errors='ignore')
        elif file_ext == '.pdf':
            try:
                import pypdf
                reader = pypdf.PdfReader(doc.file.path)
                extracted = '\n'.join(page.extract_text() or '' for page in reader.pages)
            except ImportError:
                extracted = '[PDF parsing requires pypdf. Install with: pip install pypdf]'
        elif file_ext in ['.docx', '.doc']:
            try:
                import docx
                document = docx.Document(doc.file.path)
                extracted = '\n'.join(p.text for p in document.paragraphs)
            except ImportError:
                extracted = '[DOCX parsing requires python-docx. Install with: pip install python-docx]'
        elif file_ext == '.csv':
            import csv, io
            content = uploaded_file.read().decode('utf-8', errors='ignore')
            reader = csv.reader(io.StringIO(content))
            rows = list(reader)
            extracted = '\n'.join([','.join(row) for row in rows[:100]])  # cap at 100 rows
        elif file_ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            # Sentinel Vision Engine: Prepare image for multimodal analysis
            extracted = f"[Sentinel Vision Mode Active: {uploaded_file.name}]\nSpatial and visual features will be analyzed in real-time during chat interaction."
            status = 'READY'
        
        doc.extracted_text = extracted[:50000]  # Cap at 50k chars
        doc.status = 'READY'
    except Exception as e:
        doc.status = 'FAILED'
        logger.error(f"[Doc Extraction Failure] {str(e)}")
    
    doc.save()
    
    return JsonResponse({
        'status': 'success',
        'document_id': doc.id,
        'session_id': session.id,
        'filename': doc.filename,
        'file_url': doc.file.url,
        'file_type': doc.file_type,
        'extraction_status': doc.status,
        'preview': extracted[:200] + '...' if len(extracted) > 200 else extracted
    })


@login_required
@hotel_admin_required
def api_ai_search_chat(request, hotel_id):
    """Search across all AI chat messages for this hotel."""
    hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user)
    query = request.GET.get('q', '').strip()
    
    if not query:
        return JsonResponse({'status': 'error', 'message': 'Search query required'}, status=400)
    
    results = AIChatMessage.objects.filter(
        hotel=hotel, user=request.user
    ).filter(
        models.Q(query__icontains=query) | models.Q(response__icontains=query)
    ).order_by('-timestamp')[:20]
    
    data = [{
        'id': m.id,
        'session_id': m.session_id,
        'query': m.query[:100],
        'response_snippet': m.response[:150],
        'timestamp': m.timestamp.strftime('%b %d, %H:%M')
    } for m in results]
    
    return JsonResponse({'status': 'success', 'results': data, 'count': len(data)})


@login_required
def api_ai_set_theme(request):
    """Toggle between the 5 Sentinel UI themes."""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)
    
    data = json.loads(request.body)
    theme_id = int(data.get('theme', 1))
    if theme_id not in range(1, 6):
        return JsonResponse({'status': 'error', 'message': 'Theme must be 1–5'}, status=400)
    
    request.user.ai_theme_mode = theme_id
    request.user.save(update_fields=['ai_theme_mode'])
    
    return JsonResponse({'status': 'success', 'theme': theme_id})

@login_required
@hotel_admin_required
def ai_chat(request, hotel_id=None):
    """Render the Sentinel Image Analyzer (Chatbot) UI."""
    is_global = (hotel_id == 0) or (request.GET.get('mode') == 'global')
    
    if is_global:
        hotel = Hotel.objects.filter(owner=request.user).first()
    else:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user) if hotel_id else Hotel.objects.filter(owner=request.user).first()
    
    if not hotel: return redirect('hotel_onboarding')
    
    return render(request, 'hoteladmin/admin_dashboard/ai_chat.html', {
        'hotel': hotel,
        'is_global': is_global
    })

@login_required
@hotel_admin_required
def ai_tasks(request, hotel_id=None):
    """Render the AI Agent Tasks UI with real task data."""
    from django.db.models import Count
    is_global = (hotel_id == 0)
    
    if is_global:
        hotel = Hotel.objects.filter(owner=request.user).first()
        tasks = AITask.objects.filter(hotel__owner=request.user).order_by('-created_at')
        all_hotels = Hotel.objects.filter(owner=request.user)
    else:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user) if hotel_id else Hotel.objects.filter(owner=request.user).first()
        if not hotel: return redirect('hotel_onboarding')
        tasks = hotel.ai_tasks.all().order_by('-created_at')
        all_hotels = Hotel.objects.filter(owner=request.user)
    
    if not hotel: return redirect('hotel_onboarding')

    # Stats for right panel
    task_stats = {
        'total': tasks.count(),
        'suggested': tasks.filter(status='SUGGESTED').count(),
        'executed': tasks.filter(status='EXECUTED').count(),
        'failed': tasks.filter(status='FAILED').count(),
        'ignored': tasks.filter(status='IGNORED').count(),
        'revenue': tasks.filter(category='REVENUE').count(),
        'experience': tasks.filter(category='EXPERIENCE').count(),
        'operations': tasks.filter(category='OPERATIONS').count(),
        'risk': tasks.filter(category='RISK').count(),
    }

    return render(request, 'hoteladmin/admin_dashboard/ai_tasks.html', {
        'hotel': hotel,
        'is_global': is_global,
        'all_hotels': all_hotels,
        'tasks': tasks[:30],
        'task_stats': task_stats,
    })

@login_required
@hotel_admin_required
def ai_analyst(request, hotel_id=None):
    """Render the AI Agent Analyst UI with real metrics."""
    from django.db.models import Count
    from datetime import timedelta
    is_global = (hotel_id == 0)
    
    if is_global:
        hotel = Hotel.objects.filter(owner=request.user).first()
        qs_hotels = Hotel.objects.filter(owner=request.user)
        bookings = Booking.objects.filter(hotel__in=qs_hotels)
        insights = AIInsight.objects.filter(hotel__owner=request.user, is_active=True).order_by('-priority', '-created_at')[:15]
    else:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user) if hotel_id else Hotel.objects.filter(owner=request.user).first()
        if not hotel: return redirect('hotel_onboarding')
        qs_hotels = Hotel.objects.filter(id=hotel.id)
        bookings = hotel.bookings.all()
        insights = hotel.ai_insights.filter(is_active=True).order_by('-priority', '-created_at')[:15]
    
    if not hotel: return redirect('hotel_onboarding')

    # Revenue analytics
    confirmed = bookings.filter(status='CONFIRMED')
    total_revenue = confirmed.aggregate(total=Sum('total_revenue'))['total'] or 0
    avg_booking_value = confirmed.aggregate(avg=Avg('total_revenue'))['avg'] or 0

    today = timezone.now().date()
    last_30 = today - timedelta(days=30)
    prev_30_start = today - timedelta(days=60)
    rev_this_month = confirmed.filter(created_at__date__gte=last_30).aggregate(total=Sum('total_revenue'))['total'] or 0
    rev_last_month = confirmed.filter(created_at__date__range=[prev_30_start, last_30]).aggregate(total=Sum('total_revenue'))['total'] or 0
    bookings_this_month = confirmed.filter(created_at__date__gte=last_30).count()

    # Reviews & sentiment
    reviews = Review.objects.filter(hotel__in=qs_hotels)
    avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    positive = reviews.filter(rating__gte=4).count()
    negative = reviews.filter(rating__lte=2).count()

    # Revenue growth %
    if rev_last_month > 0:
        rev_growth = ((float(rev_this_month) - float(rev_last_month)) / float(rev_last_month)) * 100
    else:
        rev_growth = 0

    all_hotels = Hotel.objects.filter(owner=request.user)

    return render(request, 'hoteladmin/admin_dashboard/ai_analyst.html', {
        'hotel': hotel,
        'is_global': is_global,
        'all_hotels': all_hotels,
        'insights': insights,
        'total_revenue': total_revenue,
        'avg_booking_value': avg_booking_value,
        'rev_this_month': rev_this_month,
        'rev_last_month': rev_last_month,
        'rev_growth': rev_growth,
        'bookings_this_month': bookings_this_month,
        'avg_rating': avg_rating,
        'positive_reviews': positive,
        'negative_reviews': negative,
        'total_reviews': reviews.count(),
    })

@login_required
@hotel_admin_required
def ai_live(request, hotel_id=None):
    """Render the AI Agent Live UI with real session activity."""
    is_global = (hotel_id == 0)
    
    if is_global:
        hotel = Hotel.objects.filter(owner=request.user).first()
        recent_sessions = AIChatSession.objects.filter(hotel__owner=request.user, is_archived=False).order_by('-updated_at')[:8]
        recent_messages = AIChatMessage.objects.filter(hotel__owner=request.user).order_by('-timestamp')[:15]
    else:
        hotel = get_object_or_404(Hotel, id=hotel_id, owner=request.user) if hotel_id else Hotel.objects.filter(owner=request.user).first()
        if not hotel: return redirect('hotel_onboarding')
        recent_sessions = AIChatSession.objects.filter(hotel=hotel, is_archived=False).order_by('-updated_at')[:8]
        recent_messages = AIChatMessage.objects.filter(hotel=hotel).order_by('-timestamp')[:15]
        
    if not hotel: return redirect('hotel_onboarding')

    all_hotels = Hotel.objects.filter(owner=request.user)
    total_sessions = AIChatSession.objects.filter(hotel__owner=request.user).count()
    total_messages = AIChatMessage.objects.filter(hotel__owner=request.user).count()

    return render(request, 'hoteladmin/admin_dashboard/ai_live.html', {
        'hotel': hotel,
        'is_global': is_global,
        'all_hotels': all_hotels,
        'recent_sessions': recent_sessions,
        'recent_messages': recent_messages,
        'total_sessions': total_sessions,
        'total_messages': total_messages,
    })


# =============================================================================
# PUBLIC AI SALES AGENT — Pre-Login Engagement System
# =============================================================================

# ── Shared System Prompt for all Sales Channels (Web, IG, FB, WA) ───────────
SYSTEM_PROMPT = """
You are an expert AI Sales Agent for a Hotel Management SaaS platform (HotelPro AI).

Your goal is NOT just to answer — your goal is to CONVERT the user into a customer.
You behave like a smart, persuasive, emotionally intelligent human sales expert.

-----------------------------------
🎯 YOUR OBJECTIVE:
- Convince hotel owners to join the platform
- Explain benefits clearly (Booking system, Dynamic pricing, CRM, OTA sync, WhatsApp automation, Analytics, Staff management)
- Handle objections smartly
- Build trust
- Push toward signup/demo

-----------------------------------
🧠 YOUR PERSONALITY:
- Friendly, confident, human-like (not robotic)
- Understand emotions (frustration, doubt, confusion)
- Use simple English (easy to understand)
- कभी-कभी Hindi tone mix (natural conversation like "Honestly bolu toh...")

-----------------------------------
💡 YOUR STRATEGY:
1. First understand user problem
2. Relate with their pain (manual bookings, lost revenue, 24/7 stress)
3. Show how platform solves it
4. Add proof (logic, numbers, examples)
5. Give small push (CTA: "Demo dekhna chahoge?")

-----------------------------------
🔥 PERSUASION RULES:
- Never give generic answers. Always connect answer with user's business.
- Use examples like: "maan lijiye aapke hotel me 20 rooms hai..."
- Show money impact: "aap 20% extra earn kar sakte ho"
- Use "Alex" as your name. Sign off as Alex, HotelPro AI Team.

-----------------------------------
❗ OBJECTION HANDLING:
- "price high hai" → show ROI ("Ek baar try karoge toh difference khud samajh jaoge")
- "time nahi hai" → show automation (saving 3-4 hours daily)
- "trust nahi hai" → explain security + simplicity

-----------------------------------
🎁 EXCLUSIVE ASSET:
You have a **'Hotel Management SaaS Strategy & Breakdown'** PDF ready. 
- Mention it naturally: "I have a complete strategy breakdown in PDF that I can send you."
- If the user provides their email, tell them: "Done! I've just sent the Strategic Breakdown PDF to your email."

-----------------------------------
💬 RESPONSE STYLE:
- Short paragraphs, conversational.
- Slight emotional tone (You CARE about their success).
- No boring explanations.

-----------------------------------
🚀 CLOSING STYLE:
Always try to move user forward:
- "Main aapko setup dikha deta hoon"
- "Aapka hotel kis city me hai?"

-----------------------------------
📊 LEAD SCORING (STRICT TECHNICAL REQUIREMENT):
After EACH reply, append exactly this JSON block at the very END of your response, on a new line:
{"__meta__":{"interest":"hot"|"warm"|"cold","quick_replies":["option1","option2","option3"],"show_cta":true|false,"cta_label":"Start Free Trial","cta_url":"/start-free/","name":"extracted name","email":"extracted email","phone":"extracted phone"}}

interest rules: "hot" (ready to sign up), "warm" (curious/engaging), "cold" (unresponsive/browsing).
quick_replies = 3 short button labels (max 4 words each).
show_cta = true when interest is "hot" or "warm".
"""

@require_POST
@csrf_exempt
def api_sales_agent_chat(request):
    """
    POST /api/sales-agent/chat/
    Public endpoint — no login required.
    Interactive web chat on the landing page.
    """
    try:
        body = json.loads(request.body)
        user_message = (body.get('message') or '').strip()
        session_id   = (body.get('session_id') or 'default')[:64]
    except Exception:
        return JsonResponse({'status': 'error', 'error': 'Invalid JSON body.'}, status=400)

    if not user_message:
        return JsonResponse({'status': 'error', 'error': 'Message cannot be empty.'}, status=400)

    # 1. Get History from Session (more persistent for web visitors)
    history_key = f'sales_agent_history_{session_id}'
    history = request.session.get(history_key, [])

    # 2. Get AI Response using Unified Helper
    res_data = _get_ai_sales_reply(user_message, session_id, history=history)

    # 3. Persist Updated History back to Session
    request.session[history_key] = history
    request.session.modified = True

    # 4. Log Lead (Lead scoring/details extracted by helper)
    meta = res_data['meta']
    _log_sales_lead(
        session_id=session_id,
        source='chat',
        interest=meta['interest'],
        summary=res_data['clean_reply'],
        name=meta['name'],
        email=meta['email'],
        phone=meta['phone']
    )

    # 5. Proactive PDF Delivery: If user shared email in chat for the first time
    if meta.get('email'):
        email_sent_key = f"pdf_sent_{session_id}_{meta['email']}"
        if not cache.get(email_sent_key):
            # Create a mock user object for the helper or call it directly with email
            class MockUser:
                def __init__(self, email, username):
                    self.email = email
                    self.username = username
            
            logger.info(f"[Sales Agent Chat] Proactive PDF trigger for {meta['email']}")
            _send_saas_strategy_pdf(MockUser(meta['email'], meta['name'] or 'there'))
            cache.set(email_sent_key, True, timeout=86400)

    return JsonResponse({
        'reply': res_data['clean_reply'],
        'quick_replies': meta.get('quick_replies', [])[:4],
        'show_cta': meta['show_cta'],
        'cta_label': meta['cta_label'],
        'cta_url': meta['cta_url'],
    })


@require_POST
@csrf_exempt
def api_sales_agent_capture_lead(request):
    """
    POST /api/sales-agent/lead/
    Public endpoint — captures leads from "Get in Touch" email modal.
    Saves SalesLead, sends AI-written auto-reply to user, notifies admin.
    """
    try:
        body = json.loads(request.body)
        name    = (body.get('name') or '').strip()[:255]
        email   = (body.get('email') or '').strip()[:254]
        phone   = (body.get('phone') or '').strip()[:30]
        message = (body.get('message') or '').strip()[:2000]
        source  = (body.get('source') or 'email_form')[:20]
    except Exception:
        return JsonResponse({'status': 'error', 'error': 'Invalid data.'}, status=400)

    if not email and not phone:
        return JsonResponse({'status': 'error', 'error': 'Please provide an email or phone number.'}, status=400)

    # 1. Log Lead (Centralized logic)
    lead = _log_sales_lead(
        session_id=None,
        source=source,
        interest='warm',
        summary=f"Contact Form Inquiry: {message}",
        name=name,
        email=email,
        phone=phone
    )

    # 2. Generate and Send AI Auto-Reply
    agent_email = os.getenv('SALES_AGENT_EMAIL', django_settings.DEFAULT_FROM_EMAIL)
    if email:
        ai_reply = _get_ai_email_body(name, message)
        try:
            email_msg = EmailMessage(
                subject='Re: Your HotelPro AI Enquiry — We Got Your Message!',
                body=ai_reply,
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                to=[email],
                reply_to=[agent_email] if agent_email else None,
            )
            
            # Attach Strategic Breakdown PDF
            pdf_path = django_settings.STATIC_DIR / 'pdfs' / 'hotel_saas_strategy (3).pdf'
            if os.path.exists(pdf_path):
                with open(pdf_path, 'rb') as f:
                    email_msg.attach('Hotel_SaaS_Strategy_Breakdown.pdf', f.read(), 'application/pdf')
                logger.info(f"[Sales Agent] Attached PDF to auto-reply for {email}")

            email_msg.send(fail_silently=False)
        except Exception as e:
            logger.warning(f'[SalesAgent] User email error: {e}')

    # 3. Notify Admin
    try:
        admin_body = (
            f"NEW SALES LEAD captured via {source.upper()}\n"
            f"{'─'*40}\n"
            f"Name:    {name or '—'}\n"
            f"Email:   {email or '—'}\n"
            f"Phone:   {phone or '—'}\n"
            f"Source:  {source}\n"
            f"Message: {message}\n"
            f"{'─'*40}\n"
            f"View CRM: {os.getenv('SITE_URL', 'http://localhost:8000')}/admin/HotelPro_Nexus/saleslead/{lead.pk}/change/"
        )
        email_msg = EmailMessage(
            subject=f'🔥 New Lead: {name or email or phone} via {source}',
            body=admin_body,
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            to=[agent_email],
            reply_to=[email] if email else None,
        )
        email_msg.send(fail_silently=True)
    except Exception as e:
        logger.warning(f'[SalesAgent] Admin email error: {e}')

    return JsonResponse({
        'status': 'success',
        'message': "Got it! We'll be in touch soon. Check your email for more info 📩",
    })

def _get_ai_email_body(name, message):
    """Helper to generate AI-written email response with model fallback"""
    blocked_key = "gemini_api_blocked_sales"
    fallback = (
        f"Hi {name or 'there'},\n\n"
        "Thank you for reaching out to HotelPro AI! 🙏\n\n"
        "We received your message and our team will be in touch shortly.\n\n"
        "In the meantime, why not explore our platform?\n"
        "• Manage all bookings in one place\n"
        "• Automate guest communication\n"
        "• Track revenue in real-time\n\n"
        "Start your free trial today — no credit card needed:\n"
        f"👈 {os.getenv('SITE_URL', 'http://localhost:8000')}/start-free/\n\n"
        "Best regards,\nAlex\nHotelPro AI Team"
    )
    
    if cache.get(blocked_key): return fallback

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key: return fallback

    # Build prompt safely
    api_key = os.getenv('GEMINI_API_KEY')
    client = _genai.Client(api_key=api_key)
    site_url = os.getenv('SITE_URL', 'https://hotelpro.ai')
    prompt = f"Write a warm, professional reply email from HotelPro AI team to a hotel owner who sent this message:\nName: {name or 'Valued Guest'}\nMessage: {message}\n\nRules: Under 150 words. Start your free trial today at {site_url}/start-free/ — no card needed. Sign off Alex, HotelPro AI."

    for model_name in ['models/gemini-2.0-flash', 'models/gemini-2.0-flash-lite', 'models/gemini-1.5-flash']:
        try:
            r = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=_types.GenerateContentConfig(max_output_tokens=350, temperature=0.7),
            )
            if r and r.candidates:
                return r.candidates[0].content.parts[0].text.strip()
        except: continue
    return fallback


def _log_sales_lead(session_id, source, interest, summary, name='', email='', phone=''):
    """Centralized helper to save/update leads from ANY channel (Web, Meta, Voice)"""
    try:
        # 1. Try to find existing lead by external_id, email, or phone
        lead = None
        if session_id:
            lead = SalesLead.objects.filter(external_id=session_id).first()
        if not lead and email:
            lead = SalesLead.objects.filter(email=email).first()
        if not lead and phone:
            lead = SalesLead.objects.filter(phone=phone).first()
        
        if lead:
            # Update existing
            lead.interest_level = interest or lead.interest_level
            if summary:
                # Deduplicate/Append summary
                if summary not in (lead.chat_summary or ''):
                    lead.chat_summary = f"{lead.chat_summary or ''}\n---\n{summary}"[:5000]
            if name and not lead.name: lead.name = name
            if email and not lead.email: lead.email = email
            if phone and not lead.phone: lead.phone = phone
            # Update external_id to the latest session if it was missing
            if session_id and not lead.external_id: lead.external_id = session_id
            lead.save()
        else:
            # Create new
            lead = SalesLead.objects.create(
                external_id=session_id,
                source=source,
                interest_level=interest or 'cold',
                chat_summary=summary or '',
                name=name or '',
                email=email or '',
                phone=phone or '',
            )

        # 2. 🔥 Critical Alert for Hot Leads
        if interest == 'hot':
            try:
                admin_email = os.getenv('SALES_AGENT_EMAIL', django_settings.DEFAULT_FROM_EMAIL)
                site_url = os.getenv('SITE_URL', 'http://localhost:8000')
                msg = (
                    f"🔥 HOT SALES LEAD detected via {source.upper()}\n"
                    f"Name: {lead.name or '—'}\n"
                    f"Email: {lead.email or '—'}\n"
                    f"Phone: {lead.phone or '—'}\n"
                    f"View CRM: {site_url}/admin/HotelPro_Nexus/saleslead/{lead.pk}/change/"
                )
                send_mail(
                    subject=f"🔥 HOT LEAD: {lead.name or lead.email}",
                    message=msg,
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin_email],
                    reply_to=[lead.email] if lead.email else None,
                    fail_silently=True,
                )
            except: pass
            
    except Exception as e:
        logger.warning(f'[SalesLeadSync] Error: {e}')
    return lead


@csrf_exempt
def meta_webhook(request):
    """
    GET: Verification for Meta (Instagram/Facebook)
    POST: Handling message events
    """
    if request.method == 'GET':
        verify_token = os.getenv('META_VERIFY_TOKEN', 'hotelpro_ai_verify_token')
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode and token:
            if mode == 'subscribe' and token == verify_token:
                logger.info('[MetaWebhook] Verification successful')
                from django.http import HttpResponse
                return HttpResponse(challenge)
            else:
                return HttpResponse('Verification failed', status=403)
        return HttpResponse('Missing params', status=400)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            logger.info(f'[MetaWebhook] Received: {data}')

            # Basic parsing for Instagram/Messenger messages
            if data.get('object') in ['instagram', 'page']:
                for entry in data.get('entry', []):
                    for messaging_event in entry.get('messaging', []):
                        if messaging_event.get('message'):
                            sender_id = messaging_event['sender']['id']
                            message_text = messaging_event['message'].get('text')

                            if message_text:
                                # ── Process via Sales Agent AI ──
                                reply_data = _get_ai_sales_reply(message_text, f"meta_{sender_id}")
                                _send_meta_message(sender_id, reply_data['reply'])
                                
                                # Log Lead
                                meta_source = 'facebook' if data.get('object') == 'page' else 'instagram'
                                _log_sales_lead(
                                    session_id=f"meta_{sender_id}",
                                    source=meta_source,
                                    interest=reply_data['meta']['interest'],
                                    summary=f"User: {message_text}\nAI: {reply_data['reply']}",
                                    name=reply_data['meta']['name'],
                                    email=reply_data['meta']['email']
                                )

            # WhatsApp Cloud API Parsing
            if data.get('object') == 'whatsapp_business_account':
                for entry in data.get('entry', []):
                    for change in entry.get('changes', []):
                        value = change.get('value', {})
                        if value.get('messages'):
                            for msg in value['messages']:
                                wa_id = msg['from']
                                wa_text = msg.get('text', {}).get('body')
                                
                                if wa_text:
                                    # ── Process via Sales Agent AI ──
                                    reply_data = _get_ai_sales_reply(wa_text, f"wa_{wa_id}")
                                    _send_whatsapp_message(wa_id, reply_data['reply'])
                                    
                                    # Log Lead
                                    _log_sales_lead(
                                        session_id=f"wa_{wa_id}",
                                        source='whatsapp',
                                        interest=reply_data['meta']['interest'],
                                        summary=f"User: {wa_text}\nAI: {reply_data['reply']}",
                                        name=reply_data['meta']['name']
                                    )

            return JsonResponse({'status': 'ok'})
        except Exception as e:
            logger.error(f'[MetaWebhook] error: {e}')
            return JsonResponse({'status': 'error'}, status=500)


def _get_ai_sales_reply(message, session_id, history=None):
    """Refactored shared helper to get AI response for any channel (Web, Meta, etc.)"""
    # Use Cache/Session history if not provided (important for stateless webhooks)
    history_cache_key = f"sales_agent_hist_{session_id}"
    if history is None:
        history = cache.get(history_cache_key, [])

    blocked_key = "gemini_api_blocked_sales"
    if cache.get(blocked_key):
        return _parse_ai_meta("I'm taking a quick break to recharge. ⚡ Are you managing a hotel? {\"__meta__\":{\"interest\":\"cold\",\"quick_replies\":[\"Yes, I manage a hotel\",\"Just exploring\"],\"show_cta\":false}}")

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.error('[SalesAgent] GEMINI_API_KEY missing')
        return _parse_ai_meta('I am having trouble connecting. {"__meta__":{"interest":"cold","quick_replies":[]}}')

    client = _genai.Client(api_key=api_key)

    # Format history for Gemini SDK
    contents = []
    for turn in history[-10:]:
        role = 'user' if turn.get('role') == 'user' else 'model'
        contents.append({'role': role, 'parts': [{'text': turn.get('text', '')}]})
    contents.append({'role': 'user', 'parts': [{'text': message}]})

    MODEL_CHAIN = [
        'models/gemini-2.0-flash',
        'models/gemini-2.0-flash-lite',
        'models/gemini-1.5-flash',
    ]

    raw_reply = None
    for model_name in MODEL_CHAIN:
        model_blocked = f"blocked_model_{model_name.replace('/','_')}"
        if cache.get(model_blocked): continue

        try:
            resp = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=_types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=400,
                    temperature=0.75,
                ),
            )
            if resp and resp.candidates:
                raw_reply = resp.candidates[0].content.parts[0].text.strip()
                break
        except Exception as e:
            err_str = str(e).lower()
            if '429' in err_str or 'resource_exhausted' in err_str:
                cache.set(blocked_key, True, timeout=300) # Global block
                cache.set(model_blocked, True, timeout=600) # Specific model block
                logger.info(f'[SalesAgent] Quota reached for {model_name}. Switching/Blocking.')
            else:
                logger.warning(f'[SalesAgent] AI error with {model_name}: {e}')
            continue

    if not raw_reply:
        raw_reply = "I'm having a quiet moment of trouble connecting. 😅 Can you tell me — are you currently managing a hotel? {\"__meta__\":{\"interest\":\"cold\",\"quick_replies\":[\"Yes\",\"No\",\"Tell me more\"],\"show_cta\":false}}"

    # Parse and add to history (caller should persist if session-based)
    res = _parse_ai_meta(raw_reply)
    history.append({'role': 'user', 'text': message})
    history.append({'role': 'model', 'text': res['clean_reply']})
    if len(history) > 20: history = history[-20:]
    
    # Persist in cache for stateless channels
    cache.set(history_cache_key, history, timeout=3600)
    
    return res


def _parse_ai_meta(raw_reply):
    """Helper to extract JSON metadata from AI response"""
    meta = {
        'interest': 'cold',
        'quick_replies': ['Yes, I manage a hotel', 'Just exploring', 'Show me a demo'],
        'show_cta': False,
        'cta_label': 'Start Free Trial',
        'cta_url': os.getenv('SITE_URL', 'http://localhost:8000') + '/start-free/',
        'name': '', 'email': '', 'phone': '',
    }
    clean_reply = raw_reply
    meta_match = re.search(r'\{"\s*__meta__\s*".*\}', raw_reply, re.DOTALL)
    if meta_match:
        try:
            parsed_meta = json.loads(meta_match.group(0))
            inner = parsed_meta.get('__meta__', {})
            meta.update({k: inner[k] for k in meta if k in inner})
            clean_reply = raw_reply[:meta_match.start()].strip()
        except: pass
    return {'clean_reply': clean_reply, 'meta': meta, 'reply': clean_reply}


def _send_meta_message(recipient_id, message_text):
    """Sends a message back to the user via Meta Send API"""
    access_token = os.getenv('META_ACCESS_TOKEN')
    if not access_token:
        logger.warning('[MetaWebhook] Access token missing')
        return

    url = f"https://graph.facebook.com/v19.0/me/messages?access_token={access_token}"
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message_text}
    }
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
    except Exception as e:
        logger.error(f'[MetaWebhook] Send error: {e}')


def _send_whatsapp_message(recipient_id, message_text):
    """Sends a message back to the user via WhatsApp Cloud API"""
    access_token = os.getenv('META_ACCESS_TOKEN')
    phone_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
    
    if not access_token or not phone_id:
        logger.warning('[WhatsApp] Config missing')
        return

    url = f"https://graph.facebook.com/v19.0/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient_id,
        "type": "text",
        "text": {"body": message_text}
    }
    try:
        r = requests.post(url, headers={"Authorization": f"Bearer {access_token}"}, json=payload, timeout=10)
        r.raise_for_status()
    except Exception as e:
        logger.error(f'[WhatsApp] Send error: {e}')


@csrf_exempt
def voice_webhook(request):
    """
    Unified Voice Webhook for VAPI and Twilio.
    Handles real-time call events and returns AI-generated responses.
    """
    from django.http import HttpResponse

    # 1. Handle VAPI (Voice AI Platform)
    if 'application/json' in request.content_type:
        try:
            data = json.loads(request.body)
            # VAPI 'func' or 'request-response' handling
            if data.get('message', {}).get('type') == 'assistant-request':
                text = data['message'].get('content', '')
                res = _get_ai_sales_reply(text, f"vapi_{data['message'].get('callId')}")
                return JsonResponse({'content': res['reply']})
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            logger.error(f'[Voice] VAPI error: {e}')
            return JsonResponse({'status': 'error'}, status=500)

    # 2. Handle Twilio (TwiML for traditional telephony)
    # Twilio sends Form Data by default
    user_speech = request.POST.get('SpeechResult')
    call_sid = request.POST.get('CallSid')

    if user_speech:
        res = _get_ai_sales_reply(user_speech, f"twilio_{call_sid}")
        reply_text = res['reply']
        # Log Lead
        _log_sales_lead(
            session_id=f"twilio_{call_sid}",
            source='call',
            interest=res['meta']['interest'],
            summary=f"Call Speech: {user_speech}\nAI Voice: {reply_text}"
        )
    else:
        reply_text = "Hi! I'm Alex from HotelPro. How can I help you today?"

    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Say>{reply_text}</Say><Gather input="speech" action="/api/sales-agent/voice-webhook/" timeout="3" /></Response>'
    return HttpResponse(twiml, content_type='text/xml')


# ── DIRECT BOOKING ENGINE — Public (Guest Facing) ────────────────────────

def hotel_public_view(request, hotel_id):
    """
    Renders the public, commission-free landing page for guests.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, is_live=True)
    rooms = hotel.rooms.filter(is_active=True).prefetch_related('photos')
    gallery = hotel.gallery.all().order_by('-created_at')
    
    # Calculate starting price (simulated)
    min_price = rooms.aggregate(models.Min('base_price'))['base_price__min'] or 0
    
    return render(request, 'hoteladmin/live_hotel/public_landing.html', {
        'hotel': hotel,
        'rooms': rooms,
        'gallery': gallery,
        'min_price': min_price,
    })


@require_POST
def api_guest_create_booking(request, hotel_id):
    """
    Public API endpoint for guest reservations.
    """
    hotel = get_object_or_404(Hotel, id=hotel_id, is_live=True)
    
    try:
        data = json.loads(request.body)
        room_id = data.get('roomId')
        guest_name = data.get('guestName')
        guest_email = data.get('guestEmail')
        guest_phone = data.get('guestPhone')
        check_in_str = data.get('checkIn')
        check_out_str = data.get('checkOut')
        
        # Validation
        if not all([room_id, guest_name, guest_email, check_in_str, check_out_str]):
            return JsonResponse({'status': 'error', 'message': 'Registration protocol incomplete. All fields required.'}, status=400)
            
        room = get_object_or_404(RoomCategory, id=room_id, hotel=hotel)
        
        # Date Parsing
        check_in = datetime.strptime(check_in_str, '%Y-%m-%d').date()
        check_out = datetime.strptime(check_out_str, '%Y-%m-%d').date()
        
        if check_in >= check_out:
             return JsonResponse({'status': 'error', 'message': 'Temporal anomaly: Check-out must follow check-in.'}, status=400)
             
        # Calculate Revenue
        nights = (check_out - check_in).days
        total_revenue = room.base_price * nights
        
        # Persistence
        import uuid
        booking = Booking.objects.create(
            hotel=hotel,
            room_category=room,
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
            check_in=check_in,
            check_out=check_out,
            total_revenue=total_revenue,
            status='PENDING',
            reference=f"ZT-{uuid.uuid4().hex[:8].upper()}"
        )
        
        # Success response with transaction details
        return JsonResponse({
            'status': 'success',
            'message': 'Reservation recorded in the Zenith Ledger.',
            'booking_ref': booking.reference,
            'amount': str(total_revenue)
        })
        
    except Exception as e:
        logger.error(f"[Public Booking] Error: {str(e)}")
        return JsonResponse({'status': 'error', 'message': 'System refused persistence. Please try again later.'}, status=500)
