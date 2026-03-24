import random
import hashlib
import re
import secrets
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

def _get_client_ip(request):
    """Extract real client IP, respecting reverse proxies."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

def _validate_password_policy(password):
    """
    Server-side password policy enforcement.
    Returns (is_valid: bool, error_message: str | None)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number."
    if not re.search(r'[^A-Za-z0-9]', password):
        return False, "Password must contain at least one special character."
    return True, None

def _hash_token(raw_token):
    """SHA-256 hash a raw token for safe DB storage."""
    return hashlib.sha256(raw_token.encode()).hexdigest()

def _send_otp_email(email, otp, username="Admin", subject="Verify Your Email — HotelPRO"):
    """Send branded HTML signup OTP email."""
    context = {
        'username': username,
        'otp': otp,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL),
    }
    html_body = render_to_string('emails/otp_verification.html', context)
    text_body = (
        f"Hello {username},\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code is valid for 10 minutes. Do not share it with anyone.\n\n"
        f"— HotelPRO Security Team"
    )
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)

def _send_reset_email(user, raw_token, request, url_name='password_reset_confirm'):
    """Send branded HTML password reset link email."""
    from django.urls import reverse
    reset_url = request.build_absolute_uri(
        reverse(url_name, args=[raw_token])
    )
    context = {
        'user': user,
        'reset_url': reset_url,
        'expiry_minutes': 15,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL),
    }
    html_body = render_to_string('emails/password_reset_request.html', context)
    text_body = (
        f"Hello {user.username},\n\n"
        f"A password reset was requested for your HotelPRO account.\n\n"
        f"Reset Link: {reset_url}\n\n"
        f"This link expires in 15 minutes. If you did not request this, ignore this email.\n\n"
        f"— HotelPRO Security Team"
    )
    msg = EmailMultiAlternatives(
        subject="HotelPRO — Reset Your Password",
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)

def _send_reset_success_email(user):
    """Send branded HTML password reset confirmation email."""
    context = {
        'user': user,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL),
        'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M UTC'),
    }
    html_body = render_to_string('emails/password_reset_success.html', context)
    text_body = (
        f"Hello {user.username},\n\n"
        f"Your HotelPRO password was successfully reset at {context['timestamp']}.\n\n"
        f"If you did not perform this action, contact {context['support_email']} immediately.\n\n"
        f"— HotelPRO Security Team"
    )
    msg = EmailMultiAlternatives(
        subject="HotelPRO — Password Changed Successfully",
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)

def _send_hotel_approval_email(hotel):
    """Notify owner of hotel approval."""
    subject = "🎉 Your Hotel Has Been Approved — HotelPRO"
    message = (
        f"Congratulations, {hotel.owner.username}!\n\n"
        f"Your hotel '{hotel.name}' has been reviewed and approved by our team.\n"
        f"It is now LIVE on the HotelPRO platform and visible to customers.\n\n"
        f"Log in to your dashboard to start receiving bookings.\n\n"
        f"— HotelPRO Platform Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[hotel.owner.email],
        fail_silently=True,
    )

def _send_hotel_rejection_email(hotel, reason):
    """Notify owner of hotel rejection with reason."""
    subject = "Hotel Application Update — HotelPRO"
    message = (
        f"Dear {hotel.owner.username},\n\n"
        f"Your hotel application for '{hotel.name}' has been reviewed.\n\n"
        f"Decision: NOT APPROVED\n"
        f"Reason: {reason}\n\n"
        f"You may update your hotel details and resubmit for review.\n"
        f"If you have questions, please contact our support team at {getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL)}.\n\n"
        f"— HotelPRO Platform Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[hotel.owner.email],
        fail_silently=True,
    )

def _check_room_availability(room_category, check_in, check_out):
    """
    Check if a room category has availability for a given date range.
    Returns (is_available: bool, available_count: int)
    """
    from .models import Booking
    from django.db.models import Q
    from datetime import datetime

    if isinstance(check_in, str):
        check_in = datetime.strptime(check_in, '%Y-%m-%d').date()
    if isinstance(check_out, str):
        check_out = datetime.strptime(check_out, '%Y-%m-%d').date()

    # Find overlapping bookings
    # Overlap if: (B.check_in < check_out) AND (B.check_out > check_in)
    overlapping_bookings = Booking.objects.filter(
        room_category=room_category,
        status__in=['CONFIRMED', 'ARRIVED']
    ).filter(
        Q(check_in__lt=check_out) & Q(check_out__gt=check_in)
    ).count()

    available_count = room_category.inventory_count - overlapping_bookings
    return available_count > 0, available_count
