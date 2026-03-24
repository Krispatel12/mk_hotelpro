from django.contrib import admin
from django.utils.html import format_html
from .models import Hotel, RoomCategory, HotelGallery, RoomPhoto, SalesLead

class RoomPhotoInline(admin.TabularInline):
    model = RoomPhoto
    extra = 1

class RoomCategoryInline(admin.StackedInline):
    model = RoomCategory
    extra = 0
    fieldsets = [
        ('Inventory Identity', {'fields': ['name', 'room_class', 'base_price', 'inventory_count']}),
        ('Capacity & Meta', {'fields': ['max_guests', 'amenities']}),
    ]

class HotelGalleryInline(admin.TabularInline):
    model = HotelGallery
    extra = 3

@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'category', 'is_live', 'created_at')
    list_filter = ('is_live', 'category', 'created_at')
    search_fields = ('name', 'owner__email', 'address')
    inlines = [HotelGalleryInline, RoomCategoryInline]
    
    fieldsets = (
        ('Property Identity', {
            'fields': ('owner', 'name', 'category', 'address', 'narrative', ('latitude', 'longitude'))
        }),
        ('Operations', {
            'fields': (('check_in_time', 'check_out_time'), 'cancellation_policy', 'services')
        }),
        ('Dossier Compliance', {
            'fields': (('id_type', 'id_number'), ('govt_reg_number', 'gst_number'))
        }),
        ('Digital Vault (Documents)', {
            'fields': ('doc_id_proof', 'doc_govt_registration', 'doc_gst_certificate')
        }),
        ('Registry Status', {
            'fields': ('is_live', 'onboarding_step')
        }),
    )

@admin.register(RoomCategory)
class RoomCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'hotel', 'room_class', 'base_price', 'inventory_count')
    list_filter = ('room_class', 'hotel')
    inlines = [RoomPhotoInline]

@admin.register(HotelGallery)
class HotelGalleryAdmin(admin.ModelAdmin):
    list_display = ('hotel', 'media_file', 'is_primary', 'created_at')

@admin.register(RoomPhoto)
class RoomPhotoAdmin(admin.ModelAdmin):
    list_display = ('room_category', 'media_file', 'created_at')


# ─────────────────────────────────────────────────────────────────────────────
# SALES LEAD CRM — Django Admin
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(SalesLead)
class SalesLeadAdmin(admin.ModelAdmin):
    list_display = (
        'display_name', 'email', 'phone',
        'source_badge', 'interest_badge',
        'followed_up', 'external_id', 'created_at',
    )
    list_filter  = ('source', 'interest_level', 'followed_up', 'created_at')
    search_fields = ('name', 'email', 'phone', 'chat_summary', 'external_id')
    list_editable = ('followed_up',)
    readonly_fields = ('created_at', 'chat_summary')
    ordering = ('-created_at',)

    fieldsets = (
        ('Contact Info', {
            'fields': ('name', 'email', 'phone')
        }),
        ('Lead Classification', {
            'fields': ('source', 'interest_level', 'followed_up', 'notes')
        }),
        ('AI Intelligence', {
            'fields': ('chat_summary', 'external_id', 'created_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Name')
    def display_name(self, obj):
        return obj.name or obj.email or '—Anonymous—'

    @admin.display(description='Source')
    def source_badge(self, obj):
        COLORS = {
            'chat':       ('#6366f1', '💬'),
            'whatsapp':   ('#25d366', '📱'),
            'email_form': ('#f59e0b', '📧'),
            'instagram':  ('#e1306c', '📸'),
            'facebook':   ('#1877f2', '👥'),
            'call':       ('#ef4444', '📞'),
        }
        color, icon = COLORS.get(obj.source, ('#94a3b8', '❓'))
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_source_display()
        )

    @admin.display(description='Interest')
    def interest_badge(self, obj):
        COLORS = {
            'hot':  '#ef4444',
            'warm': '#f59e0b',
            'cold': '#3b82f6',
        }
        color = COLORS.get(obj.interest_level, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">'
            '{}</span>',
            color, obj.get_interest_level_display()
        )

