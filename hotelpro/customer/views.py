from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from HotelPro_Nexus.models import Hotel, Review, Booking, RoomCategory, CustomUser, Offer
from HotelPro_Nexus.utils import _check_room_availability
from django.utils import timezone
from django.db.models import Min, Max, Avg, Q, Sum, F
from datetime import datetime
from decimal import Decimal
import random
import json


# ─────────────────────────────────────────────────────────────────────────────
# AUTH VIEWS (Customer-specific)
# ─────────────────────────────────────────────────────────────────────────────

def customer_landing(request):
    """Public landing page for the customer portal."""
    return render(request, 'customer/landing.html')


def customer_signup(request):
    """Customer registration — Step 3 final form submission (OTP must be verified first)."""
    if request.user.is_authenticated:
        return redirect('customer:customer_home')

    if request.method == 'POST':
        username         = request.POST.get('username', '').strip()
        email            = request.POST.get('email', '').strip()
        password         = request.POST.get('password', '').strip()
        confirm_password = request.POST.get('confirm_password', '').strip()

        # Validate OTP was verified
        if not request.session.get('otp_verified'):
            messages.error(request, 'Please complete the OTP verification step.')
            return render(request, 'customer/auth.html', {'mode': 'signup'})

        if request.session.get('signup_email') != email:
            messages.error(request, 'Email mismatch. Please start again.')
            return render(request, 'customer/auth.html', {'mode': 'signup'})

        if not all([username, email, password, confirm_password]):
            messages.error(request, 'All fields are required.')
            return render(request, 'customer/auth.html', {'mode': 'signup'})

        if password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'customer/auth.html', {'mode': 'signup'})

        if CustomUser.objects.filter(email=email).exists():
            messages.error(request, 'An account with this email already exists.')
            return render(request, 'customer/auth.html', {'mode': 'signup'})

        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=True,
            role='customer',
        )
        # Clear OTP session keys
        for key in ('signup_otp', 'signup_email', 'signup_username', 'otp_verified'):
            request.session.pop(key, None)

        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        messages.success(request, 'Welcome to HotelPro!')
        return redirect('customer:customer_home')

    return render(request, 'customer/auth.html', {'mode': 'signup'})


def customer_login(request):
    """Customer login page."""
    if request.user.is_authenticated:
        return redirect('customer:customer_home')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()

        user = authenticate(request, username=email, password=password)
        if user is not None and user.role == 'customer':
            login(request, user)
            return redirect('customer:customer_home')
        else:
            messages.error(request, 'Invalid email or password.')

    return render(request, 'customer/auth.html', {'mode': 'login'})


def customer_logout(request):
    """Log out the customer and redirect to landing."""
    logout(request)
    return redirect('customer:customer_landing')


# ─────────────────────────────────────────────────────────────────────────────
# OTP API ENDPOINTS (for 3-step signup flow)
# ─────────────────────────────────────────────────────────────────────────────

@require_POST
def api_send_otp(request):
    """Send a 6-digit OTP to the user's email and store in session."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid request body.'}, status=400)

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()

    if not username or not email:
        return JsonResponse({'message': 'Name and email are required.'}, status=400)

    if CustomUser.objects.filter(email=email).exists():
        return JsonResponse({'message': 'An account with this email already exists.'}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        return JsonResponse({'message': 'This username is already taken.'}, status=400)

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))

    # Store in session
    request.session['signup_otp'] = otp
    request.session['signup_email'] = email
    request.session['signup_username'] = username

    # Send email
    try:
        html_body = render_to_string('customer/emails/otp_verification.html', {
            'username': username,
            'otp': otp,
            'support_email': getattr(settings, 'DEFAULT_FROM_EMAIL', 'support@hotelpro.com'),
        })
        send_mail(
            subject='Your HotelPro Verification Code',
            message=f'Your OTP is: {otp}. Valid for 10 minutes.',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hotelpro.com'),
            recipient_list=[email],
            html_message=html_body,
            fail_silently=False,
        )
    except Exception as e:
        # In development, print to console and continue
        print(f'[OTP EMAIL] {email} → {otp}  (mail error: {e})')

    return JsonResponse({'message': 'OTP sent successfully.'}, status=200)


@require_POST
def api_verify_otp(request):
    """Verify the OTP submitted by the user."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'message': 'Invalid request body.'}, status=400)

    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()

    stored_otp = request.session.get('signup_otp')
    stored_email = request.session.get('signup_email')

    if not stored_otp or stored_email != email:
        return JsonResponse({'message': 'Session expired. Please restart the process.'}, status=400)

    if otp != stored_otp:
        return JsonResponse({'message': 'Incorrect OTP. Please try again.'}, status=400)

    # Mark OTP as verified in session
    request.session['otp_verified'] = True
    return JsonResponse({'message': 'OTP verified successfully.'}, status=200)



# ─────────────────────────────────────────────────────────────────────────────
# HOTEL DISCOVERY
# ─────────────────────────────────────────────────────────────────────────────

def customer_home(request):
    """Main hotel browsing page with advanced filtering and template-ready context."""
    hotels = Hotel.objects.filter(is_live=True)

    # 1. Inputs
    query = request.GET.get('q', '').strip()
    city = request.GET.get('city', '').strip()
    star = request.GET.get('star', '').strip()
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    sort_by = request.GET.get('sort', 'newest')

    # 2. Filtering
    if query:
        hotels = hotels.filter(Q(name__icontains=query) | Q(city__icontains=query))
    if city:
        hotels = hotels.filter(city__icontains=city)
    if star:
        hotels = hotels.filter(star_rating__gte=star)
    
    if min_price:
        hotels = hotels.filter(rooms__base_price__gte=min_price).distinct()
    if max_price:
        hotels = hotels.filter(rooms__base_price__lte=max_price).distinct()

    # 3. Sorting
    if sort_by == 'rating':
        hotels = hotels.order_by('-star_rating')
    elif sort_by == 'price_low':
        # Sorting by related model min price is tricky in standard ORM, 
        # but for this scale we'll just order by created_at as fallback or use annotate
        hotels = hotels.annotate(min_p=Min('rooms__base_price')).order_by('min_p')
    else:
        hotels = hotels.order_by('-created_at')

    # 4. Prepare Context Data (Match template's 'hotel_list' structure)
    hotel_list = []
    now = timezone.now()
    for h in hotels:
        primary_image = h.gallery.filter(is_primary=True).first() or h.gallery.first()
        min_p = h.rooms.filter(is_active=True).aggregate(Min('base_price'))['base_price__min']
        avg_r = h.reviews.filter(is_visible=True).aggregate(Avg('rating'))['rating__avg'] or 0.0
        rev_c = h.reviews.filter(is_visible=True).count()
        
        # Check for active offers
        active_offer = h.offers.filter(
            is_live=True,
            activation_date__lte=now,
            expiration_date__gte=now
        ).filter(
            Q(usage_limit=-1) | Q(usage_count__lt=F('usage_limit'))
        ).first()

        hotel_list.append({
            'hotel': h,
            'image': primary_image,
            'min_price': min_p,
            'avg_rating': round(float(avg_r), 1),
            'review_count': rev_c,
            'active_offer': active_offer
        })

    # Available cities for dropdown
    available_cities = Hotel.objects.filter(is_live=True).values_list('city', flat=True).distinct()

    context = {
        'hotel_list': hotel_list,
        'total_results': len(hotel_list),
        'available_cities': available_cities,
        'query': query,
        'city': city,
        'star': star,
        'min_price': min_price,
        'max_price': max_price,
        'sort_by': sort_by,
    }

    return render(request, 'customer/home.html', context)


def hotel_detail(request, hotel_id):
    """Hotel detail page with rooms and reviews."""
    hotel = get_object_or_404(Hotel, id=hotel_id, is_live=True)
    rooms = hotel.rooms.filter(is_active=True)
    reviews = hotel.reviews.filter(is_visible=True).order_by('-created_at')[:10]
    
    # Active Offers
    now = timezone.now()
    active_offers = hotel.offers.filter(
        is_live=True,
        activation_date__lte=now,
        expiration_date__gte=now
    ).filter(
        Q(usage_limit=-1) | Q(usage_count__lt=F('usage_limit'))
    )

    avg_rating = hotel.reviews.filter(is_visible=True).aggregate(Avg('rating'))['rating__avg'] or 0
    review_count = hotel.reviews.filter(is_visible=True).count()

    return render(request, 'customer/hotel_detail.html', {
        'hotel': hotel,
        'rooms': rooms,
        'reviews': reviews,
        'active_offers': active_offers,
        'avg_rating': round(float(avg_rating), 1),
        'review_count': review_count,
    })


# ─────────────────────────────────────────────────────────────────────────────
# BOOKING FLOW
# ─────────────────────────────────────────────────────────────────────────────

@login_required(login_url='/explore/login/')
def book_room(request, room_id):
    """Book a specific room with multi-scope offer/coupon support and advanced constraints."""
    room = get_object_or_404(RoomCategory, id=room_id, is_active=True)
    hotel = room.hotel

    # 1. Fetch Active Offers for this Context
    now = timezone.now()
    # Union of Hotel-Specific and GLOBAL (Platform) public offers
    context_offers = Offer.objects.filter(
        (Q(hotel=hotel) | Q(scope='GLOBAL')),
        is_live=True,
        is_public=True,
        activation_date__lte=now,
        expiration_date__gte=now
    ).filter(
        Q(usage_limit=-1) | Q(usage_count__lt=F('usage_limit'))
    ).distinct()

    if request.method == 'POST':
        guest_name = request.POST.get('guest_name', '').strip()
        guest_email = request.POST.get('guest_email', '').strip()
        guest_phone = request.POST.get('guest_phone', '').strip()
        check_in_str = request.POST.get('check_in')
        check_out_str = request.POST.get('check_out')
        
        # Two ways to apply: selected from list OR manual input
        selected_offer_id = request.POST.get('offer_id')
        manual_coupon = request.POST.get('coupon_code', '').strip().upper()

        if not all([guest_name, guest_email, check_in_str, check_out_str]):
            messages.error(request, 'All fields are required.')
            return render(request, 'customer/book_room.html', {'room': room, 'hotel': hotel, 'active_offers': context_offers})

        try:
            check_in = datetime.strptime(check_in_str, '%Y-%m-%d').date()
            check_out = datetime.strptime(check_out_str, '%Y-%m-%d').date()
            
            if check_in < datetime.now().date():
                messages.error(request, 'Check-in date cannot be in the past.')
                return render(request, 'customer/book_room.html', {'room': room, 'hotel': hotel, 'active_offers': context_offers})
            
            if check_out <= check_in:
                messages.error(request, 'Check-out date must be after check-in.')
                return render(request, 'customer/book_room.html', {'room': room, 'hotel': hotel, 'active_offers': context_offers})
            
            # Availability Check
            is_available, _ = _check_room_availability(room, check_in, check_out)
            if not is_available:
                messages.error(request, 'Sorry, this room type is fully booked for the selected dates.')
                return render(request, 'customer/book_room.html', {'room': room, 'hotel': hotel, 'active_offers': context_offers})

            # Base Revenue Calculation
            nights = (check_out - check_in).days
            base_total = room.base_price * nights
            final_total = base_total
            
            # Application of Logic
            applied_offer = None
            
            # If manual coupon is entered, it takes priority
            if manual_coupon:
                try:
                    applied_offer = Offer.objects.get(
                        code=manual_coupon, 
                        is_live=True,
                        activation_date__lte=now,
                        expiration_date__gte=now
                    )
                    # Verify scope for manual coupon too
                    if applied_offer.scope == 'HOTEL' and applied_offer.hotel != hotel:
                        applied_offer = None
                        messages.warning(request, "This coupon is not valid for this property.")
                except Offer.DoesNotExist:
                    messages.error(request, "Invalid or expired coupon code.")
            elif selected_offer_id:
                try:
                    applied_offer = context_offers.get(id=selected_offer_id)
                except Offer.DoesNotExist:
                    pass

            # Constraints Check & Discount Engineering
            if applied_offer:
                # 1. Usage Limits
                if applied_offer.usage_limit != -1 and applied_offer.usage_count >= applied_offer.usage_limit:
                    messages.error(request, "This offer has reached its maximum usage limit.")
                    applied_offer = None
                
                # 2. Minimum Spend Requirement
                elif base_total < applied_offer.min_booking_amount:
                    messages.warning(request, f"Minimum booking of ₹{applied_offer.min_booking_amount} required for this offer.")
                    applied_offer = None
                
                # 3. Apply Discount
                else:
                    discount = (base_total * Decimal(applied_offer.discount_percent)) / Decimal(100)
                    
                    # 4. Max Discount Cap
                    if applied_offer.max_discount_amount and discount > applied_offer.max_discount_amount:
                        discount = applied_offer.max_discount_amount
                        
                    final_total = base_total - discount

            # Create the Registry Entry
            booking = Booking.objects.create(
                hotel=hotel,
                room_category=room,
                guest_name=guest_name,
                guest_email=guest_email,
                guest_phone=guest_phone,
                check_in=check_in,
                check_out=check_out,
                total_revenue=final_total,
                applied_offer=applied_offer,
                status='CONFIRMED', # Elite system: instant confirmation
                payment_status='UNPAID',
            )

            # Atomic Counter Update
            if applied_offer:
                applied_offer.usage_count += 1
                applied_offer.save()

            messages.success(request, f'Experience secured! Booking Reference: {booking.reference}')
            return redirect('customer:booking_confirmation', ref=booking.reference)

        except (ValueError, TypeError):
            messages.error(request, 'Something went wrong with your request.')
            return render(request, 'customer/book_room.html', {'room': room, 'hotel': hotel, 'active_offers': context_offers})

    return render(request, 'customer/book_room.html', {'room': room, 'hotel': hotel, 'active_offers': context_offers})


@login_required(login_url='/explore/login/')
def booking_confirmation(request, ref):
    """Booking confirmation page."""
    booking = get_object_or_404(Booking, reference=ref)
    return render(request, 'customer/booking_confirm.html', {'booking': booking})


@login_required(login_url='/explore/login/')
def my_bookings(request):
    """List bookings for the logged-in customer by email and calculate stats."""
    bookings = Booking.objects.filter(guest_email=request.user.email).order_by('-created_at')
    
    stats = {
        'total': bookings.count(),
        'confirmed': bookings.filter(status='CONFIRMED').count(),
        'cancelled': bookings.filter(status='CANCELLED').count(),
    }
    
    return render(request, 'customer/my_bookings.html', {
        'bookings': bookings,
        'stats': stats
    })


@login_required(login_url='/explore/login/')
def process_payment(request, ref):
    """
    Mock Stripe payment processing.
    In a real app, this would redirect to Stripe Checkout.
    """
    booking = get_object_or_404(Booking, reference=ref)
    
    if request.method == 'POST':
        # Simulate successful payment
        booking.payment_status = 'PAID'
        booking.save()
        messages.success(request, f'Payment successful for booking #{ref}!')
        return redirect('customer:booking_confirmation', ref=ref)
        
    return render(request, 'customer/payment.html', {'booking': booking})


@login_required(login_url='/explore/login/')
def booking_details(request):
    """Generic booking details page."""
    return render(request, 'customer/booking_details.html')


# ─────────────────────────────────────────────────────────────────────────────
# REVIEWS
# ─────────────────────────────────────────────────────────────────────────────

@login_required(login_url='/explore/login/')
def add_review(request, hotel_id):
    """Leave a review for a hotel."""
    hotel = get_object_or_404(Hotel, id=hotel_id)

    if request.method == 'POST':
        rating = request.POST.get('rating')
        comment = request.POST.get('comment', '').strip()
        guest_name = request.user.username or request.user.email

        if not rating or not comment:
            messages.error(request, 'Please provide a rating and comment.')
            return render(request, 'customer/add_review.html', {'hotel': hotel})

        Review.objects.create(
            hotel=hotel,
            guest_name=guest_name,
            rating=int(rating),
            comment=comment,
        )

        messages.success(request, 'Thank you for your review!')
        return redirect('customer:hotel_detail', hotel_id=hotel_id)

    return render(request, 'customer/add_review.html', {'hotel': hotel})


# ─────────────────────────────────────────────────────────────────────────────
# MISC
# ─────────────────────────────────────────────────────────────────────────────

@login_required(login_url='/explore/login/')
def dashboard(request):
    """Customer dashboard."""
    return render(request, 'customer/dashboard.html')

@login_required(login_url='/explore/login/')
@require_POST
def validate_coupon(request):
    """AJAX endpoint to validate a coupon code."""
    code = request.POST.get('code', '').strip().upper()
    hotel_id = request.POST.get('hotel_id')
    booking_amount = float(request.POST.get('amount', 0))

    try:
        hotel = Hotel.objects.get(id=hotel_id)
        offer = Offer.objects.get(
            code=code, 
            is_live=True,
            activation_date__lte=timezone.now(),
            expiration_date__gte=timezone.now()
        )

        # 1. Scope Verification
        if offer.scope == 'HOTEL' and offer.hotel != hotel:
            return JsonResponse({'valid': False, 'message': 'This coupon is not valid for this property.'})

        # 2. Usage Limit
        if offer.usage_limit != -1 and offer.usage_count >= offer.usage_limit:
            return JsonResponse({'valid': False, 'message': 'This coupon has reached its maximum usage.'})

        # 3. Min Spend
        if booking_amount < float(offer.min_booking_amount):
            return JsonResponse({
                'valid': False, 
                'message': f'Minimum booking of ₹{offer.min_booking_amount} required.'
            })

        return JsonResponse({
            'valid': True,
            'discount': offer.discount_percent,
            'max_discount': float(offer.max_discount_amount) if offer.max_discount_amount else None,
            'message': f'Success! {offer.discount_percent}% discount applied.'
        })

    except (Hotel.DoesNotExist, Offer.DoesNotExist):
        return JsonResponse({'valid': False, 'message': 'Invalid or expired coupon code.'})
    except Exception as e:
        return JsonResponse({'valid': False, 'message': 'Error validating coupon.'})
