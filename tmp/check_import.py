import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

try:
    from HotelPro_Nexus.utils_ai import ZenithAgent
    print("Import successful")
except Exception as e:
    print(f"Import failed: {e}")
