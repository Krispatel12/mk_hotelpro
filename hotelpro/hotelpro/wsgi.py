"""
WSGI config for hotelpro project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import sys

# Harden WSGI startup to capture early boot errors in Render logs
try:
    from django.core.wsgi import get_wsgi_application
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
    application = get_wsgi_application()
except Exception as e:
    # This will show up in Render logs even if the site shows 500
    print(f"CRITICAL WSGI STARTUP ERROR: {e}", file=sys.stderr)
    raise e
