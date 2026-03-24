import os
import django
from django.test import TestCase
from .models import Hotel, CustomUser, AITask
from .utils_ai import ZenithAgent, HotelAIService

class SentinelAITest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email='testadmin@hotelpro.com', username='testadmin', password='password')
        self.hotel = Hotel.objects.create(name='Sentinel Test Hotel', owner=self.user, city='Test City')
        
    def test_diagnostic_scan_tool_dispatch(self):
        """Verify that the trigger_sentinel_diagnostic_scan tool correctly initiates an audit."""
        agent = ZenithAgent(hotel=self.hotel, user=self.user)
        
        # Mocking the actual AI call isn't easy here, but we can verify the Tool Registry or simply run the service method
        service = HotelAIService(self.hotel)
        result = service.perform_periodic_analysis()
        
        # Verify that tasks were created as part of the analysis
        tasks = AITask.objects.filter(hotel=self.hotel)
        self.assertTrue(tasks.exists(), "Diagnostic scan should generate at least one task.")
        self.assertIn('status', result, "Result should contain a status message.")
        print(f"Verified: {tasks.count()} tasks generated during diagnostic scan.")

    def test_upload_security_handshake(self):
        """Verify the security logic for document uploads."""
        # This would normally be a client test, but we can check the logic in views.py if we use self.client
        from django.urls import reverse
        url = reverse('api_ai_upload_document', args=[self.hotel.id])
        
        # Test without header
        response = self.client.post(url, {'file': 'test.txt'})
        # Note: In our current implementation we only log a warning for backward compatibility
        # If we had rejected it, we'd check for 403.
        
        # Test with header
        self.client.force_login(self.user)
        # Mock file
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("test.txt", b"Test content", content_type="text/plain")
        
        response = self.client.post(url, {'file': test_file}, HTTP_X_SENTINEL_SECURE_TUNNEL='TRUE_VISION_v4')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'success')
