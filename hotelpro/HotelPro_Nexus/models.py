from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid
import itertools
from decimal import Decimal

class CustomUser(AbstractUser):
    """
    Custom User Model.
    Uses email as primary login. Automatic role-based redirects.
    """
    ROLE_CHOICES = [
        ('hotel_admin', 'Hotel Admin'),
        ('super_admin', 'Super Admin'),
        ('customer', 'Customer'),
    ]

    first_name = None
    last_name = None

    username = models.CharField(
        max_length=150,
        unique=False,
        verbose_name='Display Name'
    )
    email = models.EmailField(
        unique=True,
        verbose_name='Email Address'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='hotel_admin',
        verbose_name='System Role',
        db_index=True,
    )

    otp = models.CharField(max_length=6, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    # AI Sentinel Extensions
    ai_theme_mode = models.IntegerField(default=1, help_text="Sentinel UI Theme (1-5)")

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'System User'
        verbose_name_plural = 'System Users'

    def __str__(self):
        return f"{self.email} [{self.role}]"

    @property
    def is_hotel_admin(self):
        return self.role == 'hotel_admin'

    @property
    def is_super_admin(self):
        return self.role == 'super_admin'

    @property
    def is_customer(self):
        return self.role == 'customer'


class OTPVerification(models.Model):
    """Store for OTP verification."""
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    is_verified = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'OTP Verification'
        verbose_name_plural = 'OTP Verifications'

    def __str__(self):
        return f"{self.email} - {self.otp}"


class PasswordResetToken(models.Model):
    """Password reset tokens."""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='reset_tokens'
    )
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'

    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    def __str__(self):
        return f"ResetToken({self.user.email}, used={self.used})"


class PasswordResetAudit(models.Model):
    """Immutable security logs for password management events."""
    EVENT_CHOICES = [
        ('REQUEST',  'Reset Requested'),
        ('SUCCESS',  'Reset Successful'),
        ('FAILED',   'Validation Failed'),
        ('EXPIRED',  'Token Expired'),
        ('INVALID',  'Invalid Token'),
        ('BLOCKED',  'Rate Limited'),
    ]

    email = models.EmailField(db_index=True)
    event = models.CharField(max_length=10, choices=EVENT_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    detail = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Password Reset Audit'
        verbose_name_plural = 'Password Reset Audits'

    def __str__(self):
        return f"[{self.event}] {self.email} @ {self.timestamp:%Y-%m-%d %H:%M}"


# =============================================================================
# ENTERPRISE ASSET MANAGEMENT & PROPERTY MODELS
# =============================================================================

class Hotel(models.Model):
    """
    Elite Property Registry.
    Manages complex lifecycle states from Onboarding to Live Operational status.
    """
    STATUS_CHOICES = [
        ('INCOMPLETE', 'Onboarding In Progress'),
        ('PENDING', 'Awaiting Executive Audit'),
        ('REJECTED', 'Action Required'),
        ('APPROVED', 'System Approved'),
        ('LIVE', 'Live & Syncing'),
        ('DELETION_PENDING', 'Decommissioning Under Audit'),
    ]

    owner = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='owned_hotels',
        verbose_name="Hotel Owner"
    )

    # Basic Info
    name = models.CharField(max_length=255, verbose_name="Hotel Name")
    category = models.CharField(max_length=100, verbose_name="Hotel Type")
    narrative = models.TextField(blank=True, verbose_name="Hotel Description")
    
    # Contact & Portfolio Intelligence
    contact_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    star_rating = models.DecimalField(max_digits=2, decimal_places=1, default=Decimal('0.0'))

    # Location
    address = models.TextField(verbose_name="Address")
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='India')
    pincode = models.CharField(max_length=20, blank=True)
    
    latitude = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True)

    # Operational Parameters
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    cancellation_policy = models.TextField(blank=True)
    services = models.JSONField(default=list, blank=True)

    # Regulatory & Compliance
    id_type = models.CharField(max_length=50, default='AADHAAR')
    id_number = models.CharField(max_length=100, blank=True)
    govt_reg_number = models.CharField(max_length=150, blank=True, null=True, default=None)
    gst_number = models.CharField(max_length=100, blank=True)

    # Documents
    doc_id_proof = models.FileField(upload_to='vault/identity/', null=True, blank=True)
    doc_govt_registration = models.FileField(upload_to='vault/legal/', null=True, blank=True)
    doc_gst_certificate = models.FileField(upload_to='vault/legal/', null=True, blank=True)

    # Global Lifecycle State
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INCOMPLETE')
    verification_remarks = models.TextField(blank=True)
    is_live = models.BooleanField(default=False)
    onboarding_step = models.IntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def can_delete_directly(self):
        """Unverified/Incomplete hotels can be removed instantly."""
        return self.status in ['INCOMPLETE', 'PENDING', 'REJECTED']

    class Meta:
        verbose_name = "Hotel"
        verbose_name_plural = "Hotels"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} | {self.owner.email}"


class RoomCategory(models.Model):
    """Room categories for a hotel."""
    ROOM_CLASS_CHOICES = [
        ('STANDARD',     'Standard'),
        ('DELUXE',       'Deluxe'),
        ('SUITE',        'Suite'),
        ('VILLA',        'Villa'),
        ('LUXURY',       'Luxury'),
        ('ECONOMY',      'Economy'),
        ('PREMIUM',      'Premium'),
        ('EXECUTIVE',    'Executive'),
        ('CLUB',         'Club'),
        ('PRESIDENTIAL', 'Presidential'),
        ('ROYAL',        'Royal'),
        ('FAMILY',       'Family'),
        ('SPECIALTY',    'Specialty'),
        ('OTHER',        'Other'),
    ]

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='rooms')
    name = models.CharField(max_length=150)
    room_class = models.CharField(max_length=20, choices=ROOM_CLASS_CHOICES, default='STANDARD')
    
    max_guests = models.PositiveIntegerField(default=2)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    inventory_count = models.PositiveIntegerField(default=1)
    
    amenities = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Room Category"
        verbose_name_plural = "Room Categories"

    def __str__(self):
        return f"{self.name} @ {self.hotel.name}"

    @property
    def first_image(self):
        """Intelligently retrieves the first image for the card cover."""
        video_extensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv']
        for photo in self.photos.all():
            if not any(photo.media_file.name.lower().endswith(ext) for ext in video_extensions):
                return photo
        return self.photos.first()

    @property
    def has_video(self):
        """Returns True if the room category has any video assets."""
        video_extensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv']
        return any(str(photo.media_file.name).lower().endswith(ext) for ext in video_extensions for photo in self.photos.all())


class HotelGallery(models.Model):
    """Hotel photo gallery."""
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='gallery')
    media_file = models.FileField(upload_to='gallery/property/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Hotel Image"
        verbose_name_plural = "Hotel Images"


class RoomPhoto(models.Model):
    """Tier-Specific Visual Documentation."""
    room_category = models.ForeignKey(RoomCategory, on_delete=models.CASCADE, related_name='photos')
    media_file = models.FileField(upload_to='gallery/rooms/')
    created_at = models.DateTimeField(auto_now_add=True)


class Booking(models.Model):
    """Guest bookings."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('ARRIVED', 'Arrived'),
        ('DEPARTED', 'Departed'),
        ('CANCELLED', 'Cancelled'),
    ]

    PAYMENT_STATUS = [
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partial Settlement'),
        ('PAID', 'Fully Settled'),
        ('REFUNDED', 'Refunded'),
    ]

    booking_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    reference = models.CharField(max_length=12, unique=True, blank=True)
    
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='bookings')
    room_category = models.ForeignKey(RoomCategory, on_delete=models.SET_NULL, null=True)
    
    guest_name = models.CharField(max_length=255)
    guest_email = models.EmailField()
    guest_phone = models.CharField(max_length=20, blank=True)
    
    check_in = models.DateField()
    check_out = models.DateField()
    
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='UNPAID')
    applied_offer = models.ForeignKey('Offer', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            # Separate steps to assist linter in broken environments
            self.reference = "".join(itertools.islice(uuid.uuid4().hex, 12)).upper()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference} | {self.guest_name}"


class Offer(models.Model):
    """
    Advanced Offer & Coupon Engine.
    Supports hotel-specific deals, platform-wide coupons, and strategic growth campaigns.
    """
    OFFER_SCOPE = [
        ('HOTEL', 'Hotel Specific'),
        ('GLOBAL', 'Platform Wide'),
    ]

    STRATEGY_CHOICES = [
        ('GROWTH', 'Growth (New Customers)'),
        ('URGENCY', 'Urgency (Flash Sale)'),
        ('LOYALTY', 'Loyalty (Repeat Guests)'),
        ('SEASONAL', 'Seasonal (Festivals/Holidays)'),
        ('DIRECT', 'Direct Discount'),
        ('SKIM', 'Skim (Premium Yield Scheme)'),
        ('CUSTOM', 'Custom (Bespoke Strategy)'),
    ]

    CATEGORY_CHOICES = [
        ('PRICE', 'Price Discount'),
        ('STAY', 'Stay Duration'),
        ('FB', 'Dining & F&B'),
        ('EXPERIENCE', 'Experience/Activity'),
        ('PERKS', 'Special Perks'),
    ]

    GUEST_SEGMENT_CHOICES = [
        ('PUBLIC', 'All Guests'),
        ('MEMBERS', 'Club Members Only'),
        ('PRIVATE', 'Private Link/Referral'),
    ]

    # Identity & Scope
    # Nullable hotel means it's a Platform-Wide (GLOBAL) offer/coupon
    hotel = models.ForeignKey(
        Hotel, 
        on_delete=models.CASCADE, 
        related_name='offers',
        null=True,
        blank=True,
        verbose_name="Bound Hotel"
    )
    # targeted_hotels = models.ManyToManyField(Hotel, related_name='targeted_offers', blank=True)
    # targeted_rooms = models.ManyToManyField(RoomCategory, related_name='targeted_offers', blank=True)
    targeted_hotels = models.ManyToManyField(Hotel, related_name='targeted_offers', blank=True)
    targeted_rooms = models.ManyToManyField(RoomCategory, related_name='targeted_offers', blank=True)

    scope = models.CharField(max_length=10, choices=OFFER_SCOPE, default='HOTEL')
    
    name = models.CharField(max_length=255, verbose_name="Offer Title")
    description = models.TextField(blank=True, verbose_name="Detailed Description")
    code = models.CharField(max_length=50, unique=True, verbose_name="Coupon Code")
    
    # Economics
    strategy = models.CharField(max_length=20, choices=STRATEGY_CHOICES, default='DIRECT')
    discount_percent = models.PositiveIntegerField(default=10, verbose_name="Discount Percentage")
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Capped discount value (null for uncapped)"
    )
    min_booking_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        help_text="Minimum total required to apply this offer"
    )
    
    # Professional Wizard Extensions
    PROMOTION_TYPE_CHOICES = [
        ('PERCENT', 'Percentage Discount'),
        ('FIXED', 'Fixed Amount Discount'),
        ('BOGO', 'Buy One Get One'),
        ('UPGRADE', 'Free Room Upgrade'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='PRICE')
    promotion_type = models.CharField(max_length=20, choices=PROMOTION_TYPE_CHOICES, default='PERCENT')
    guest_type = models.CharField(max_length=20, choices=GUEST_SEGMENT_CHOICES, default='PUBLIC')
    min_nights_stay = models.PositiveIntegerField(default=1)
    perks = models.TextField(blank=True, help_text="Comma-separated perks")
    is_stackable = models.BooleanField(default=False)
    combinable_offers = models.ManyToManyField('self', symmetrical=False, blank=True, help_text="Specific offers this deal can be combined with.")

    # Performance Analytics (Simulation)
    redemption_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    revenue_generated = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Lifecycle Windows
    activation_date = models.DateField(null=True, blank=True)  # Booking Start
    expiration_date = models.DateField(null=True, blank=True)  # Booking End
    stay_start_date = models.DateField(null=True, blank=True)
    stay_end_date = models.DateField(null=True, blank=True)
    
    usage_limit = models.IntegerField(default=-1, help_text="-1 for unlimited total uses")
    usage_count = models.IntegerField(default=0)
    
    user_limit = models.IntegerField(default=1, help_text="Max uses per customer account")
    
    is_live = models.BooleanField(default=True)
    status = models.CharField(
        max_length=15, 
        choices=[('ACTIVE', 'Active'), ('DRAFT', 'Draft'), ('EXPIRED', 'Expired'), ('ARCHIVED', 'Archived')],
        default='ACTIVE'
    )
    is_public = models.BooleanField(
        default=True, 
        help_text="Show on listings? (False = hidden/private coupon)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Offer & Coupon"
        verbose_name_plural = "Offers & Coupons"

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_expired(self):
        return timezone.now() > self.expiration_date

    @property
    def is_active(self):
        if not self.is_live or self.is_expired:
            return False
        if self.usage_limit != -1 and self.usage_count >= self.usage_limit:
            return False
        return True


class Review(models.Model):
    """Customer reviews."""
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='reviews')
    guest_name = models.CharField(max_length=255)
    rating = models.PositiveIntegerField()
    sentiment_data = models.TextField(blank=True) # AI analyzed keywords
    comment = models.TextField()
    
    is_verified = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

# =============================================================================
# AI AGENT & AUTOMATION ENGINE MODELS
# =============================================================================

class AIAgentConfig(models.Model):
    """
    Control Hub for AI Agent behaviors per hotel property.
    """
    hotel = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='ai_config')
    
    is_action_mode_enabled = models.BooleanField(
        default=False, 
        verbose_name="AI Action Mode Enabled",
        help_text="Allows AI to automatically trigger promotions and pricing adjustments."
    )
    
    last_analysis_at = models.DateTimeField(null=True, blank=True)
    intelligence_level = models.IntegerField(default=100) # For scaling capabilities
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Agent Configuration"
        verbose_name_plural = "AI Agent Configurations"

    def __str__(self):
        return f"AI Logic | {self.hotel.name}"


# =============================================================================
# AI SENTINEL CORE & SESSION MODELS
# =============================================================================

class AIChatSession(models.Model):
    """
    Groups AI conversations into isolated, searchable sessions.
    """
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='ai_sessions')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='ai_sessions')
    
    title = models.CharField(max_length=255, default='New Intelligence Session')
    category = models.CharField(max_length=50, default='GENERAL', blank=True, help_text="Session category tag (e.g. GENERAL, ANALYSIS, TASK)")
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = "AI Chat Session"
        verbose_name_plural = "AI Chat Sessions"

    def __str__(self):
        return f"{self.title} | {self.user.email}"

class AIChatMessage(models.Model):
    """
    Enterprise-grade conversation logs with versioning and edit support.
    """
    session = models.ForeignKey(
        AIChatSession, 
        on_delete=models.CASCADE, 
        related_name='messages',
        null=True, # For backwards compatibility during migration
        blank=True
    )
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='ai_chat_history')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='ai_messages')
    
    query = models.TextField()
    response = models.TextField()
    
    # Edit & Versioning Logic
    is_edited = models.BooleanField(default=False)
    version = models.IntegerField(default=1)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='branched_versions'
    )
    
    # Document Intelligence
    attached_document = models.ForeignKey(
        'AIDocument',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referenced_messages'
    )
    
    # Context snapshot
    context_data = models.JSONField(default=dict, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "AI Chat Message"
        verbose_name_plural = "AI Chat Messages"


class AITask(models.Model):
    """
    Operational log for AI-generated decisions and automated actions.
    """
    TASK_TYPE_CHOICES = [
        ('PRICING', 'Pricing Optimization'),
        ('OFFER', 'Promotion Activation'),
        ('VISIBILITY', 'Visibility Adjustment'),
        ('ALERT', 'Operational Alert'),
        ('INSIGHT', 'Strategic Recommendation'),
        ('EXPERIENCE', 'Customer Experience'),
        ('OPERATIONS', 'Operational Efficiency'),
    ]

    PRIORITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    CATEGORY_CHOICES = [
        ('REVENUE', 'Revenue Optimization'),
        ('EXPERIENCE', 'Customer Experience'),
        ('OPERATIONS', 'Operational Efficiency'),
        ('MARKETING', 'Marketing & Growth'),
        ('RISK', 'Risk & Alerts'),
    ]
    
    STATUS_CHOICES = [
        ('SUGGESTED', 'Suggested (Manual Review)'),
        ('EXECUTED', 'Successfully Executed'),
        ('FAILED', 'Execution Failed'),
        ('IGNORED', 'User Dismissed'),
    ]

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='ai_tasks')
    task_type = models.CharField(max_length=20, choices=TASK_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUGGESTED')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='OPERATIONS')
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, help_text="Clear problem statement.")
    solution = models.TextField(blank=True, help_text="Suggested actionable solution.")
    reasoning = models.TextField(help_text="The AI's data-driven justification for this task.")
    
    data_snapshot = models.JSONField(default=dict, blank=True, help_text="Metrics used for this decision.")
    metric_value = models.CharField(max_length=100, blank=True, help_text="Trigger value or impact metric.")
    impact_estimate = models.CharField(max_length=100, blank=True, help_text="e.g., '+15% Anticipated Yield'")
    
    auto_executable = models.BooleanField(default=False)
    
    executed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "AI Operational Task"
        verbose_name_plural = "AI Operational Tasks"


class AIInsight(models.Model):
    """
    Long-term strategic insights generated by periodically analyzing patterns.
    """
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='ai_insights')
    
    category = models.CharField(max_length=50) # e.g., 'Revenue', 'Occupancy', 'Sentiment'
    metric_value = models.CharField(max_length=100)
    trend_direction = models.CharField(max_length=10, choices=[('UP', 'Up'), ('DOWN', 'Down'), ('FLAT', 'Flat')])
    
    narrative = models.TextField()
    priority = models.IntegerField(default=1) # 1=Critical, 2=Important, 3=Note
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-priority', '-created_at']

class AIGlobalLock(models.Model):
    """
    Database-backed distributed lock for AI operations.
    Ensures cross-process request serialization without Redis.
    """
    lock_key = models.CharField(max_length=100, unique=True)
    is_locked = models.BooleanField(default=True)
    locked_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Lock: {self.lock_key} | {self.is_locked}"

class AIAuditLog(models.Model):
    """
    Professional audit trail for AI interactions.
    Tracks tokens, costs, and full execution traces.
    """
    session = models.ForeignKey(AIChatSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='ai_audit_logs')
    model_used = models.CharField(max_length=100)
    prompt_tokens = models.IntegerField(default=0)
    response_tokens = models.IntegerField(default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=6, default=Decimal('0.000000'))
    
    execution_trace = models.JSONField(default=dict, help_text="Multi-step agent logic trace.")
    status = models.CharField(max_length=20, default='SUCCESS')
    error_message = models.TextField(blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "AI Audit Log"
        verbose_name_plural = "AI Audit Logs"
class AIDocument(models.Model):
    """
    Vault for AI-analyzed documents (PDF, DOCX, TXT).
    """
    session = models.ForeignKey(AIChatSession, on_delete=models.CASCADE, related_name='documents')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='ai_documents')
    
    file = models.FileField(upload_to='vault/ai_intel/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10) # pdf, docx, txt
    
    extracted_text = models.TextField(blank=True, help_text="Sanitized text for AI analysis.")
    summary = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=20, 
        choices=[('UPLOADED', 'Uploaded'), ('PROCESSING', 'Analyzing'), ('READY', 'Ready'), ('FAILED', 'Failed')],
        default='UPLOADED'
    )
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "AI Sentinel Document"
        verbose_name_plural = "AI Sentinel Documents"

    def __str__(self):
        return f"DOC | {self.filename}"


# =============================================================================
# SALES AGENT — LEAD CRM
# =============================================================================

class SalesLead(models.Model):
    """
    Mini-CRM: Captures public visitor leads from the AI Sales Agent chatbot
    and the 'Get in Touch' section (pre-login, no account required).
    """
    SOURCE_CHOICES = [
        ('chat',        'AI Chatbot'),
        ('whatsapp',    'WhatsApp'),
        ('email_form',  'Email Form'),
        ('instagram',   'Instagram'),
        ('facebook',    'Facebook'),
        ('call',        'Call Button'),
    ]

    INTEREST_CHOICES = [
        ('hot',  '🔥 Hot Lead'),
        ('warm', '⚡ Warm Lead'),
        ('cold', '❄️ Cold Lead'),
    ]

    # Contact Info (all optional — user may not share everything)
    name  = models.CharField(max_length=255, blank=True, verbose_name='Name')
    email = models.EmailField(blank=True, verbose_name='Email')
    phone = models.CharField(max_length=30, blank=True, verbose_name='Phone')

    # Classification
    source         = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='chat', db_index=True)
    interest_level = models.CharField(max_length=10, choices=INTEREST_CHOICES, default='cold', db_index=True)

    # AI-generated conversation summary
    chat_summary = models.TextField(blank=True, verbose_name='Chat Summary')

    # CRM State
    external_id = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name='External ID (Meta/Voice)')
    followed_up = models.BooleanField(default=False, verbose_name='Followed Up?')
    notes       = models.TextField(blank=True, verbose_name='Admin Notes')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Sales Lead'
        verbose_name_plural = 'Sales Leads'

    def __str__(self):
        label = self.name or self.email or 'Anonymous'
        return f"[{self.get_interest_level_display()}] {label} via {self.get_source_display()}"
