"""
HotelPro RBAC Decorator Module
-------------------------------
Centralised, production-ready role-based access control decorators.

Rules:
  - Each portal (Hotel Admin, Super Admin, Customer) is completely independent.
  - An authenticated user with the WRONG role is shown a clear warning and
    redirected to THEIR own correct dashboard — never to the current portal.
  - Unauthenticated users are redirected to their portal's own login page.
  - No cross-role logout occurs anywhere in this module.
"""

from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages


# ─────────────────────────────────────────────────────────────────────────────
# ROLE ↔ DASHBOARD / LOGIN MAPPING
# ─────────────────────────────────────────────────────────────────────────────

# Where each role lands after login
ROLE_DASHBOARD = {
    'hotel_admin': 'dashboard',
    'super_admin':  'super_dashboard',
    'customer':     'customer:customer_home',
}

# Login URL per role (used for unauthenticated redirects)
ROLE_LOGIN = {
    'hotel_admin': 'login',
    'super_admin':  'super_login',
    'customer':     'customer_login',
}


def _redirect_to_correct_dashboard(user):
    """
    Send an authenticated user to their own role's dashboard.
    Falls back to the main landing page for unknown roles.
    """
    target = ROLE_DASHBOARD.get(user.role, 'landing_page')
    return redirect(target)


# ─────────────────────────────────────────────────────────────────────────────
# DECORATORS
# ─────────────────────────────────────────────────────────────────────────────

def hotel_admin_required(view_func):
    """
    Restricts access to authenticated users with role='hotel_admin'.

    • Not logged in          → Hotel Admin login page (/login/)
    • Logged in, wrong role  → Warning + redirect to THEIR own dashboard
    • Correct role           → View executes normally
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.info(request, "Please sign in to access the Hotel Admin portal.")
            return redirect('login')

        if request.user.role != 'hotel_admin':
            messages.warning(
                request,
                f"Access denied. This area is for Hotel Admins only. "
                f"You are signed in as {request.user.get_role_display() if hasattr(request.user, 'get_role_display') else request.user.role}."
            )
            return _redirect_to_correct_dashboard(request.user)

        return view_func(request, *args, **kwargs)
    return wrapper


def super_admin_required(view_func):
    """
    Restricts access to authenticated users with role='super_admin'.

    • Not logged in          → Super Admin login page (/super/)
    • Logged in, wrong role  → Warning + redirect to THEIR own dashboard
    • Correct role           → View executes normally
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.info(request, "Super Admin authentication required.")
            return redirect('super_login')

        if request.user.role != 'super_admin':
            messages.warning(
                request,
                "Access denied. Super Admin credentials required."
            )
            return _redirect_to_correct_dashboard(request.user)

        return view_func(request, *args, **kwargs)
    return wrapper


def customer_required(view_func):
    """
    Restricts access to authenticated users with role='customer'.

    • Not logged in          → Customer login page (/explore/login/)
    • Logged in, wrong role  → Warning + redirect to THEIR own dashboard
    • Correct role           → View executes normally
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.info(request, "Please sign in to your customer account.")
            return redirect('customer_login')

        if request.user.role != 'customer':
            messages.warning(
                request,
                "Access denied. This area is for customers only."
            )
            return _redirect_to_correct_dashboard(request.user)

        return view_func(request, *args, **kwargs)
    return wrapper
