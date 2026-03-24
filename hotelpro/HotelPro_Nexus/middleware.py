import datetime
from django.conf import settings
from django.contrib.sessions.middleware import SessionMiddleware
from django.utils import timezone
from django.utils.cache import patch_vary_headers
from django.utils.http import http_date

class IndependentSessionMiddleware(SessionMiddleware):
    """
    Custom Session Middleware to handle completely independent sessions
    for Super Admin and other portal roles in the same browser.

    - Path starts with '/super/' → uses 'sessionid_super' cookie.
    - Path starts with '/explore/' → uses 'sessionid_customer' cookie.
    - All other paths → uses default 'sessionid' cookie.

    This ensures that logging into the Super Admin portal does NOT affect
    the Hotel Admin session, and vice versa.
    """

    def _get_cookie_name(self, request):
        if request.path.startswith('/super/'):
            return 'sessionid_super'
        if request.path.startswith('/explore/'):
            return 'sessionid_customer'
        return settings.SESSION_COOKIE_NAME

    def process_request(self, request):
        cookie_name = self._get_cookie_name(request)
        request.session_cookie_name = cookie_name
        
        # Load the session based on the path-specific cookie name
        session_key = request.COOKIES.get(cookie_name)
        request.session = self.SessionStore(session_key)

    def process_response(self, request, response):
        """
        Manually save and set the cookie using the dynamic cookie name.
        """
        try:
            accessed = request.session.accessed
            modified = request.session.modified
            empty = request.session.is_empty()
        except AttributeError:
            return response

        cookie_name = getattr(request, 'session_cookie_name', self._get_cookie_name(request))

        if modified or settings.SESSION_SAVE_EVERY_REQUEST:
            if empty:
                if request.session.session_key:
                    response.delete_cookie(
                        cookie_name,
                        path=settings.SESSION_COOKIE_PATH,
                        domain=settings.SESSION_COOKIE_DOMAIN,
                    )
            else:
                if accessed:
                    patch_vary_headers(response, ('Cookie',))
                if modified or accessed:
                    # Determine session expiry logic
                    if request.session.get_expire_at_browser_close():
                        max_age = None
                        expires = None
                    else:
                        max_age = request.session.get_expiry_age()
                        expires_at = timezone.now() + datetime.timedelta(seconds=max_age)
                        expires = http_date(expires_at.timestamp())

                    # Save session data only if modified or accessed
                    request.session.save()
                    
                    response.set_cookie(
                        cookie_name,
                        request.session.session_key,
                        max_age=max_age,
                        expires=expires,
                        domain=settings.SESSION_COOKIE_DOMAIN,
                        path=settings.SESSION_COOKIE_PATH,
                        secure=settings.SESSION_COOKIE_SECURE or None,
                        httponly=settings.SESSION_COOKIE_HTTPONLY or None,
                        samesite=settings.SESSION_COOKIE_SAMESITE,
                    )
        return response
