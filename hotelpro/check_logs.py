import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
django.setup()

from HotelPro_Nexus.models import AIAuditLog

def check_latest_errors():
    print("\n--- Zenith Deep Error Audit ---")
    logs = AIAuditLog.objects.filter(status='FAILED').order_by('-timestamp')[:3]
    if not logs:
        print("No failed logs found.")
        return

    for l in logs:
        print(f"\n[Turn {l.id}] Time: {l.timestamp}")
        print(f"Model: {l.model_used}")
        print(f"Error: {l.error_message}")
        print(f"Trace: {l.execution_trace}")

if __name__ == "__main__":
    check_latest_errors()
