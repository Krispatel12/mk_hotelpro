import os
import sys

# Get the path to this directory (the outer hotelpro folder)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Change directory to the outer hotelpro folder 
# This is critical so Django file paths work
os.chdir(current_dir)

# Add it to the Python path so it can import the inner `hotelpro` and other apps
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# VERY CRITICAL FIX: Gunicorn imported the *outer* hotelpro as `hotelpro`.
# This shadows the *inner* hotelpro namespace holding settings.py!
# We delete the cached outer module so Django successfully finds the inner one.
sys.modules.pop('hotelpro', None)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')

# Import the actual WSGI application and expose it as `application`
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
