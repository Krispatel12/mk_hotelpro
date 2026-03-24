from django.apps import AppConfig


class HotelproNexusConfig(AppConfig):
    name = 'HotelPro_Nexus'

    def ready(self):
        import HotelPro_Nexus.signals
