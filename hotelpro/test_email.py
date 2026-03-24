import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from django.core.mail import send_mail
from django.core.mail.backends.smtp import EmailBackend
from django.conf import settings

print(f"USER: {settings.EMAIL_HOST_USER}")

# Strip spaces from password!
clean_pass = str(settings.EMAIL_HOST_PASSWORD).replace(' ', '')
backend = EmailBackend(
    host=settings.EMAIL_HOST,
    port=settings.EMAIL_PORT,
    username=settings.EMAIL_HOST_USER,
    password=clean_pass,
    use_tls=settings.EMAIL_USE_TLS,
)

try:
    backend.send_messages([
        django.core.mail.EmailMessage(
            'Test Subject',
            'Test Body from test_email.py with stripped spaces!',
            settings.DEFAULT_FROM_EMAIL,
            [settings.EMAIL_HOST_USER],
            reply_to=[settings.EMAIL_HOST_USER]
        )
    ])
    print("SUCCESS: Email sent successfully after stripping spaces!")
except Exception as e:
    print(f"ERROR: {e}")
