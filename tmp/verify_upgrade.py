import os
import sys

# Try to find the correct project root
possible_root = r'c:\Users\krish\Desktop\kris(20)\kris(20)\hotelpro'
sys.path.append(possible_root)

try:
    print(f"PYTHONPATH: {sys.path[-1]}")
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelpro.settings')
    django.setup()
    print("✓ Django setup OK")
    
    from HotelPro_Nexus.utils_ai import HotelAIService
    print("✓ HotelAIService import OK")
    
    from ai_agent.services.ai_service import generate_response
    print("✓ generate_response import OK")
    
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
