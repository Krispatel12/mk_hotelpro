"""
HotelPro Super Admin Views
===========================
Complete, self-contained Super Admin backend.
Uses only HotelPro_Nexus models — no dependency on non-existent apps.
All views are protected by the @super_admin_required decorator.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.http import JsonResponse
from django.core.mail import send_mail
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q
from django.conf import settings

from HotelPro_Nexus.models import (
    CustomUser, Hotel, RoomCategory, Booking, Review, Offer, HotelGallery,
    OTPVerification, PasswordResetToken, PasswordResetAudit
)
from HotelPro_Nexus.decorators import super_admin_required, _redirect_to_correct_dashboard
from HotelPro_Nexus.utils import (
    _get_client_ip, _send_hotel_approval_email, _send_hotel_rejection_email,
    _validate_password_policy, _send_otp_email, _hash_token, _send_reset_email,
    _send_reset_success_email
)
from django.views.decorators.http import require_POST
from datetime import timedelta, date
import logging
import json
import random
import secrets

logger = logging.getLogger('hotelpro')


# ─────────────────────────────────────────────────────────────────────────────
# SUPER ADMIN LOGIN / LOGOUT
# ─────────────────────────────────────────────────────────────────────────────

def super_landing(request):
    """
    Super Admin public landing page — /super/
    Renders the marketing/info page for the Super Admin portal.
    If already authenticated as super_admin, redirect to dashboard.
    """
    if request.user.is_authenticated and request.user.role == 'super_admin':
        return redirect('super_dashboard')
    return render(request, 'superadmin/landing.html')


def super_login(request):
    """
    Super Admin login portal — /super/login/

    Strict rules:
    • GET with authenticated super_admin  → super dashboard (no-op).
    • GET with other authenticated role   → their own dashboard (no cross-logout).
    • POST: only super_admin role is accepted.
      Any other role gets a clear error — no cross-login, no session touching.
    """
    if request.method == 'GET' and request.user.is_authenticated:
        if request.user.role == 'super_admin':
            return redirect('super_dashboard')
        return _redirect_to_correct_dashboard(request.user)

    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')

        user = authenticate(request, username=email, password=password)
        if user is not None:
            if user.role == 'super_admin':
                if user.is_active:
                    login(request, user)
                    messages.success(request, f"Welcome back, {user.username}.")
                    return redirect('super_dashboard')
                else:
                    messages.error(request, "This Super Admin account has been deactivated.")
            else:
                messages.error(
                    request,
                    "Access denied. This portal is restricted to Super Admins. "
                    "Please use the Hotel Admin or Customer portal."
                )
        else:
            messages.error(request, "Invalid credentials. Please try again.")

    admin_exists = CustomUser.objects.filter(role='super_admin').exists()
    return render(request, 'superadmin/auth/login.html', {'admin_exists': admin_exists})


@require_POST
def super_api_send_otp(request):
    """AJAX endpoint to send OTP for Super Admin registration."""
    if CustomUser.objects.filter(role='super_admin').exists():
        return JsonResponse({'status': 'error', 'message': 'Registration closed.'}, status=403)

    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email', '').lower()

        if not username or not email:
            return JsonResponse({'status': 'error', 'message': 'All fields are required.'}, status=400)

        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Email already exists.'}, status=400)

        otp_code = str(random.randint(100000, 999999))
        OTPVerification.objects.update_or_create(
            email=email,
            defaults={'otp': otp_code, 'created_at': timezone.now(), 'is_verified': False}
        )

        try:
            _send_otp_email(email, otp_code, username=username)
            return JsonResponse({'status': 'success', 'message': 'OTP sent.'})
        except Exception as e:
            # Fallback for dev: log OTP if mail fails
            logger.warning(f"[DEV] Super Admin OTP for {email}: {otp_code} (Error: {e})")
            return JsonResponse({'status': 'success', 'message': f'OTP (preview) logged in console. Code: {otp_code}'})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
def super_api_verify_otp(request):
    """AJAX endpoint to verify OTP for Super Admin registration."""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').lower()
        otp = data.get('otp')

        otp_rec = OTPVerification.objects.filter(email=email).order_by('-created_at').first()
        if not otp_rec or otp_rec.otp != otp:
            return JsonResponse({'status': 'error', 'message': 'Invalid OTP.'}, status=400)

        if timezone.now() - otp_rec.created_at > timedelta(minutes=10):
            return JsonResponse({'status': 'error', 'message': 'OTP expired.'}, status=400)

        otp_rec.is_verified = True
        otp_rec.save()
        request.session['verified_super_email'] = email
        return JsonResponse({'status': 'success', 'message': 'Verified.'})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def super_signup(request):
    """
    Super Admin Registration — /super/signup/
    Handles final POST from the 3-step JS form.
    """
    if CustomUser.objects.filter(role='super_admin').exists():
        messages.error(request, "A Super Admin already exists.")
        return redirect('super_login')

    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email', '').lower()
        password = request.POST.get('password')
        confirm = request.POST.get('confirm_password')

        if password != confirm:
            messages.error(request, "Passwords do not match.")
            return render(request, 'superadmin/auth/signup.html')

        # Check OTP verification session
        if request.session.get('verified_super_email') != email:
            messages.error(request, "Please verify your email with an OTP first.")
            return render(request, 'superadmin/auth/signup.html')

        is_valid, err = _validate_password_policy(password)
        if not is_valid:
            messages.error(request, err)
            return render(request, 'superadmin/auth/signup.html')

        try:
            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='super_admin',
                is_active=True
            )
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            request.session.pop('verified_super_email', None)
            messages.success(request, f"Welcome to HotelPro Nexus, Super Admin {username}!")
            return redirect('super_dashboard')
        except Exception as e:
            messages.error(request, f"Creation failed: {str(e)}")

    return render(request, 'superadmin/auth/signup.html')


def forgot_password(request):
    """
    Initiates a secure password reset for Super Admins.
    """
    submitted = False
    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        ip = _get_client_ip(request)

        try:
            user = CustomUser.objects.get(email=email, role='super_admin')
            # Token logic
            raw_token = secrets.token_urlsafe(32)
            token_hash = _hash_token(raw_token)
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            PasswordResetToken.objects.create(
                user=user, token_hash=token_hash,
                expires_at=timezone.now() + timedelta(minutes=15),
                ip_address=ip
            )
            try:
                _send_reset_email(user, raw_token, request, url_name='super_reset_password')
            except Exception:
                pass
            PasswordResetAudit.objects.create(email=email, event='REQUEST', ip_address=ip)
        except CustomUser.DoesNotExist:
            PasswordResetAudit.objects.create(email=email, event='REQUEST_NOT_FOUND', ip_address=ip)

        # ── Always show success for security ──
        submitted = True

    return render(request, 'superadmin/auth/forgotpassword.html', {'submitted': submitted})


def reset_password(request, token):
    """
    Handles both GET display and POST setting of a new password via token.
    """
    ip = _get_client_ip(request)
    token_hash = _hash_token(token)

    try:
        reset_token = PasswordResetToken.objects.select_related('user').get(
            token_hash=token_hash
        )
    except PasswordResetToken.DoesNotExist:
        return render(request, 'superadmin/auth/reset_password.html', {'invalid': True})

    if not reset_token.is_valid():
        expired = timezone.now() >= reset_token.expires_at
        return render(request, 'superadmin/auth/reset_password.html', {
            'expired': expired,
            'invalid': not expired
        })

    user = reset_token.user
    if request.method == 'POST':
        password = request.POST.get('password')
        confirm = request.POST.get('confirm_password')

        if password != confirm:
            return render(request, 'superadmin/auth/reset_password.html', {
                'token': token, 'error': "Passwords do not match."
            })

        is_valid, err = _validate_password_policy(password)
        if not is_valid:
            return render(request, 'superadmin/auth/reset_password.html', {
                'token': token, 'error': err
            })

        # Update password
        user.set_password(password)
        user.save()

        # Invalidate token
        reset_token.used = True
        reset_token.save()

        # Log & Notify
        PasswordResetAudit.objects.create(
            email=user.email, event='SUCCESS', ip_address=ip, detail='Reset via token'
        )
        try:
            _send_reset_success_email(user)
        except:
            pass

        messages.success(request, "Password has been reset. Please log in.")
        return redirect('super_login')

    return render(request, 'superadmin/auth/reset_password.html', {'token': token})


def super_logout(request):
    """Super Admin logout — clears session, returns to Super Admin landing."""
    logout(request)
    return redirect('super_landing')


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def dashboard(request):
    """
    Super Admin Command Centre.
    Real-time platform statistics across all roles and entities.
    """
    # Platform-wide statistics
    stats = {
        # Users
        'total_hotel_admins': CustomUser.objects.filter(role='hotel_admin').count(),
        'total_customers': CustomUser.objects.filter(role='customer').count(),

        # Hotels
        'pending_hotels': Hotel.objects.filter(status='PENDING').count(),
        'live_hotels': Hotel.objects.filter(status='LIVE').count(),
        'rejected_hotels': Hotel.objects.filter(status='REJECTED').count(),
        'total_hotels': Hotel.objects.count(),

        # Bookings
        'total_bookings': Booking.objects.count(),
        'confirmed_bookings': Booking.objects.filter(status='CONFIRMED').count(),
        'total_revenue': Booking.objects.filter(
            status='CONFIRMED'
        ).aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0,

        # Reviews
        'total_reviews': Review.objects.filter(is_visible=True).count(),
        'avg_platform_rating': round(
            Review.objects.filter(is_visible=True).aggregate(Avg('rating'))['rating__avg'] or 0.0, 1
        ),
    }

    # Recent pending hotels for quick action
    recent_pending = Hotel.objects.filter(status='PENDING').order_by('-created_at')[:5]

    # Recent bookings across platform
    recent_bookings = Booking.objects.select_related('hotel', 'room_category').order_by('-created_at')[:5]

    return render(request, 'superadmin/dashboard.html', {
        'stats': stats,
        'recent_pending': recent_pending,
        'recent_bookings': recent_bookings,
    })


# ─────────────────────────────────────────────────────────────────────────────
# HOTEL MANAGEMENT — APPROVAL WORKFLOW
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def hotels_manage(request):
    """
    Hotel Approval Centre.
    Lists all hotels grouped by status: Pending, Live, Rejected.
    """
    status_filter = request.GET.get('status', 'PENDING')
    valid_statuses = ['PENDING', 'LIVE', 'REJECTED', 'INCOMPLETE']

    if status_filter not in valid_statuses:
        status_filter = 'PENDING'

    hotels = Hotel.objects.select_related('owner').filter(
        status=status_filter
    ).order_by('-created_at')

    counts = {
        'pending': Hotel.objects.filter(status='PENDING').count(),
        'live': Hotel.objects.filter(status='LIVE').count(),
        'rejected': Hotel.objects.filter(status='REJECTED').count(),
        'incomplete': Hotel.objects.filter(status='INCOMPLETE').count(),
    }

    return render(request, 'superadmin/hotels.html', {
        'hotels': hotels,
        'status_filter': status_filter,
        'counts': counts,
    })


@super_admin_required
def approve_hotel(request, hotel_id):
    """Approve a pending hotel — sets status to LIVE and is_live=True."""
    hotel = get_object_or_404(Hotel, id=hotel_id)

    if hotel.status != 'PENDING':
        messages.warning(request, f"Hotel '{hotel.name}' is not in pending state.")
        return redirect('super_hotels')

    hotel.status = 'LIVE'
    hotel.is_live = True
    hotel.verification_remarks = f"Approved by Super Admin on {timezone.now().strftime('%Y-%m-%d %H:%M')}"
    hotel.save()

    # Notify the hotel owner via utility helper
    _send_hotel_approval_email(hotel)

    messages.success(request, f"✅ '{hotel.name}' has been approved and is now LIVE.")
    return redirect('super_hotels')


@super_admin_required
def reject_hotel(request, hotel_id):
    """Reject a hotel with a mandatory reason. Sends email notification."""
    hotel = get_object_or_404(Hotel, id=hotel_id)

    if request.method == 'POST':
        reason = request.POST.get('reason', '').strip()
        if not reason:
            messages.error(request, "A rejection reason is required.")
            return render(request, 'superadmin/reject_form.html', {'hotel': hotel})

        hotel.status = 'REJECTED'
        hotel.is_live = False
        hotel.verification_remarks = reason
        hotel.save()

        # Notify the hotel owner via utility helper
        _send_hotel_rejection_email(hotel, reason)

        messages.warning(request, f"'{hotel.name}' has been rejected. Owner notified.")
        return redirect('super_hotels')

    return render(request, 'superadmin/reject_form.html', {'hotel': hotel})


@super_admin_required
def toggle_hotel_live(request, hotel_id):
    """Manually activate or deactivate a live hotel."""
    hotel = get_object_or_404(Hotel, id=hotel_id)
    if hotel.status != 'LIVE':
        messages.warning(request, "Only 'LIVE' hotels can be deactivated/activated.")
        return redirect('super_hotels')

    hotel.is_live = not hotel.is_live
    hotel.save()
    status = "activated" if hotel.is_live else "deactivated"
    messages.success(request, f"Hotel '{hotel.name}' has been {status}.")
    return redirect('super_hotels')


@super_admin_required
def hotel_detail_view(request, hotel_id):
    """Full hotel detail view for Super Admin review."""
    hotel = get_object_or_404(Hotel, id=hotel_id)
    rooms = hotel.rooms.all()
    gallery = hotel.gallery.all()
    reviews = hotel.reviews.filter(is_visible=True).order_by('-created_at')[:10]
    bookings = hotel.bookings.order_by('-created_at')[:10]

    return render(request, 'superadmin/hotel_detail.html', {
        'hotel': hotel,
        'rooms': rooms,
        'gallery': gallery,
        'reviews': reviews,
        'bookings': bookings,
    })


# ─────────────────────────────────────────────────────────────────────────────
# HOTEL ADMIN MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def hotel_admins(request):
    """List all hotel admin accounts with their hotel status."""
    admins = CustomUser.objects.filter(role='hotel_admin').order_by('-date_joined')
    admin_data = []
    for admin in admins:
        hotels = Hotel.objects.filter(owner=admin)
        admin_data.append({
            'user': admin,
            'total_hotels': hotels.count(),
            'live_hotels': hotels.filter(status='LIVE').count(),
            'pending_hotels': hotels.filter(status='PENDING').count(),
        })

    return render(request, 'superadmin/owners.html', {'admin_data': admin_data})


@super_admin_required
def toggle_hotel_admin(request, user_id):
    """Enable or disable a hotel admin account."""
    admin = get_object_or_404(CustomUser, id=user_id, role='hotel_admin')
    admin.is_active = not admin.is_active
    admin.save()
    status = "enabled" if admin.is_active else "disabled"
    messages.success(request, f"Account for {admin.email} has been {status}.")
    return redirect('super_hotel_admins')


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def customers_manage(request):
    """List all customer accounts with booking stats."""
    customers = CustomUser.objects.filter(role='customer').order_by('-date_joined')
    customer_data = []
    for c in customers:
        total_bookings = Booking.objects.filter(guest_email=c.email).count()
        customer_data.append({
            'user': c,
            'total_bookings': total_bookings,
        })
    return render(request, 'superadmin/customers.html', {'customer_data': customer_data})


@super_admin_required
def toggle_customer(request, user_id):
    """Enable or disable a customer account."""
    customer = get_object_or_404(CustomUser, id=user_id, role='customer')
    customer.is_active = not customer.is_active
    customer.save()
    status = "enabled" if customer.is_active else "disabled"
    messages.success(request, f"Customer account {customer.email} has been {status}.")
    return redirect('super_customers')


# ─────────────────────────────────────────────────────────────────────────────
# BOOKINGS MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def bookings_manage(request):
    """Platform-wide booking management."""
    status_filter = request.GET.get('status', '')
    bookings_qs = Booking.objects.select_related('hotel', 'room_category').order_by('-created_at')

    if status_filter:
        bookings_qs = bookings_qs.filter(status=status_filter)

    stats = {
        'total': Booking.objects.count(),
        'confirmed': Booking.objects.filter(status='CONFIRMED').count(),
        'pending': Booking.objects.filter(status='PENDING').count(),
        'cancelled': Booking.objects.filter(status='CANCELLED').count(),
        'total_revenue': Booking.objects.filter(
            status='CONFIRMED'
        ).aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0,
    }

    return render(request, 'superadmin/bookings.html', {
        'bookings': bookings_qs[:100],
        'stats': stats,
        'status_filter': status_filter,
    })


# ─────────────────────────────────────────────────────────────────────────────
# REVIEWS MODERATION
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def reviews_moderate(request):
    """Review moderation — show all reviews across platform."""
    reviews = Review.objects.select_related('hotel').order_by('-created_at')
    return render(request, 'superadmin/reviews.html', {'reviews': reviews})


@super_admin_required
def toggle_review_visibility(request, review_id):
    """Hide or show a review."""
    review = get_object_or_404(Review, id=review_id)
    review.is_visible = not review.is_visible
    review.save()
    status = "visible" if review.is_visible else "hidden"
    messages.success(request, f"Review by {review.guest_name} is now {status}.")
    return redirect('super_reviews')


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@super_admin_required
def platform_analytics(request):
    """Platform-level analytics for Super Admin."""
    # Revenue by hotel
    hotel_revenue = (
        Booking.objects.filter(status='CONFIRMED')
        .values('hotel__name')
        .annotate(total=Sum('total_revenue'))
        .order_by('-total')[:10]
    )

    # Bookings trend (last 7 days)
    today_date = date.today()
    booking_trend = []
    for i in range(6, -1, -1):
        day = today_date - timedelta(days=i)
        count = Booking.objects.filter(created_at__date=day).count()
        booking_trend.append({'date': day.strftime('%b %d'), 'count': count})

    # Top rated hotels
    top_hotels = (
        Review.objects.filter(is_visible=True)
        .values('hotel__name', 'hotel__city')
        .annotate(avg_rating=Avg('rating'), review_count=Count('id'))
        .order_by('-avg_rating')[:5]
    )

    return render(request, 'superadmin/analytics.html', {
        'hotel_revenue': list(hotel_revenue),
        'booking_trend': booking_trend,
        'top_hotels': list(top_hotels),
    })