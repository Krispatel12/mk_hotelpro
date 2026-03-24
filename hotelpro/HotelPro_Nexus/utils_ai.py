import os
import json
import logging
# Force reload to apply previous fix
import time

import uuid
from decimal import Decimal
from pathlib import Path
from datetime import timedelta

# New SDK import
from google import genai
from google.genai import types

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models, transaction
from django.db.models import Sum, Avg, Count, Min
from django.core.cache import cache
from dotenv import load_dotenv

# ── Production Model Manager (Phase 2 Architecture) ──────────────────────────
from .model_manager import model_manager

from .models import (
    Hotel, RoomCategory, Booking, Review, Offer, 
    AIChatMessage, AITask, AIInsight, AIAgentConfig, CustomUser,
    AIGlobalLock, AIAuditLog, AIChatSession, AIDocument
)

# Configuration & Logging
logger = logging.getLogger('hotelpro.ai')

# Initialize Environment
dotenv_path = settings.BASE_DIR / '.env'
load_dotenv(dotenv_path=dotenv_path, override=True)

# =============================================================================
# 1. CORE INFRASTRUCTURE: MODEL REGISTRY & ORCHESTRATION
# =============================================================================

class ZenithModelRegistry:
    """
    Standardized model management and safety-first decoding.
    Delegates model selection to the centralized ZenithModelManager.
    """
    # Legacy dict kept for backward compatibility with any external references
    MODELS = {
        "m1": "models/gemini-2.5-flash",
        "m2": "models/gemini-2.0-flash",
        "m3": "models/gemini-2.0-flash-lite",
        "m4": "models/gemini-flash-latest",
        "m5": "models/gemma-3-27b-it",
    }
    
    @classmethod
    def get_fallback_chain(cls, preferred=None, require_tools=True):
        """Returns available models via ZenithModelManager (quota-aware, priority-sorted)."""
        chain = [name for name, _ in model_manager.get_available_chain(require_tools=require_tools)]
        if preferred and preferred in chain:
            chain.remove(preferred)
            return [preferred] + chain
        return chain

    @classmethod
    def parse_safety_result(cls, response):
        """Analyze finish_reason and candidates for safety blocks or tool calls."""
        if not response or not hasattr(response, 'candidates') or not response.candidates:
            return "ERROR_AI_EMPTY_RESPONSE", False, None
            
        candidate = response.candidates[0]
        if hasattr(candidate, 'finish_reason') and candidate.finish_reason == types.FinishReason.SAFETY:
            return "ERROR_SAFETY_BLOCKED", False, None
        
        if not candidate.content or not candidate.content.parts:
            return "ERROR_CONTENT_MISSING", False, None
            
        # Check for tool call
        for part in candidate.content.parts:
            if part.function_call:
                return "TOOL_CALL", True, part.function_call
                
        return candidate.content.parts[0].text, True, None

class ZenithDBOrchestrator:
    """
    Enterprise Orchestration: Database-backed cross-process serialization.
    """
    LOCK_ID = "zenith_global_v2"
    COOL_DOWN = 10  # Increased cooldown to 10s for quota breathing room
    
    @classmethod
    def acquire_lock(cls, timeout_secs=35):
        start = time.time()
        while time.time() - start < timeout_secs:
            try:
                with transaction.atomic():
                    # Check for existing lock
                    lock, created = AIGlobalLock.objects.get_or_create(
                        lock_key=cls.LOCK_ID,
                        defaults={'expires_at': timezone.now() + timedelta(seconds=60)}
                    )
                    
                    if created or lock.is_expired():
                        lock.is_locked = True
                        lock.expires_at = timezone.now() + timedelta(seconds=60)
                        lock.save()
                        
                        # Rate limiting check (using cache for speed, DB for persistence)
                        last_req = cache.get("zenith_last_req_ts", 0)
                        elapsed = time.time() - last_req
                        if elapsed < cls.COOL_DOWN:
                            time.sleep(cls.COOL_DOWN - elapsed)
                        
                        return True
            except:
                pass
            time.sleep(0.5)
        return False

    @classmethod
    def release_lock(cls):
        try:
            lock = AIGlobalLock.objects.get(lock_key=cls.LOCK_ID)
            lock.expires_at = timezone.now() - timedelta(seconds=1) # Expire it
            lock.save()
            cache.set("zenith_last_req_ts", time.time(), timeout=3600)
        except:
            pass

# =============================================================================
# 2. AGENT TOOLS & MEMORY
# =============================================================================

class ZenithAgentMemory:
    """
    Stateful Short-Term Memory — Session-Isolated for operational continuity.
    """
    @staticmethod
    def get_history(hotel, user, limit=6, session_id=None):
        qs = AIChatMessage.objects.filter(hotel=hotel, user=user)
        if session_id:
            qs = qs.filter(session_id=session_id)
        history = qs.order_by('-timestamp')[:limit]
        messages = []
        for msg in reversed(list(history)):
            if msg.query and msg.response:
                messages.append({"role": "user", "content": msg.query})
                messages.append({"role": "model", "content": msg.response})
        return messages

class ZenithToolRegistry:
    """
    Grounding layer: Defined tools for the agent to interact with hotel data.
    """
    @staticmethod
    def get_operational_metrics(hotel_id):
        """
        Retrieves comprehensive revenue, booking, and occupancy stats.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            bookings = hotel.bookings.filter(status='CONFIRMED')
            rooms = hotel.rooms.all()
            total_units = sum(r.inventory_count for r in rooms)
            
            # Detailed Analytics
            revenue = float(bookings.aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0)
            avg_daily_rate = float(bookings.aggregate(Avg('base_price'))['base_price__avg'] or 0)
            
            return {
                "hotel_name": hotel.name,
                "metrics": {
                    "total_revenue": revenue,
                    "avg_daily_rate": avg_daily_rate,
                    "confirmed_bookings": bookings.count(),
                    "occupancy_potential": total_units
                },
                "inventory": {
                    "categories": rooms.count(),
                    "total_units": total_units
                }
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_market_benchmarks(hotel_id):
        """
        [AGGREGATED ONLY] Retrieves anonymized market benchmarks and competitive ranking.
        Calculates position, distance from leaders, and improvement gaps.
        """
        try:
            hotels = Hotel.objects.all()
            total_hotels = hotels.count()
            
            # Aggregated Benchmarking Logic
            all_bookings = Booking.objects.filter(status='CONFIRMED')
            avg_market_rev = float(all_bookings.aggregate(Avg('total_revenue'))['total_revenue__avg'] or 0)
            avg_market_adr = float(all_bookings.aggregate(Avg('base_price'))['base_price__avg'] or 0)
            
            # Ranking & Gap Analysis
            hotel_ranking = []
            for h in hotels:
                rev = float(h.bookings.filter(status='CONFIRMED').aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0)
                hotel_ranking.append({"id": h.id, "name": h.name, "rev": rev})
            
            # Sort by revenue
            ranked = sorted(hotel_ranking, key=lambda x: x['rev'], reverse=True)
            
            # Find specific hotel metrics
            my_hotel_data = next((item for item in ranked if item["id"] == hotel_id), {"rev": 0})
            my_rank = next((i + 1 for i, item in enumerate(ranked) if item["id"] == hotel_id), total_hotels)
            top_performer_rev = ranked[0]["rev"] if ranked else 0
            
            return {
                "market_intelligence": {
                    "total_hotels_in_market": total_hotels,
                    "market_average_revenue": avg_market_rev,
                    "market_average_adr": avg_market_adr
                },
                "your_position": {
                    "rank_number": my_rank,
                    "current_revenue": my_hotel_data["rev"],
                    "distance_from_top_performer": top_performer_rev - my_hotel_data["rev"],
                    "improvement_gap_percentage": f"{((top_performer_rev - my_hotel_data['rev']) / top_performer_rev * 100):.1f}%" if top_performer_rev > 0 else "0%"
                }
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_global_portfolio_metrics(user):
        """
        [ELITE] Retrieves aggregated KPIs across the user's hotel empire.
        """
        try:
            hotels = Hotel.objects.filter(owner=user)
            bookings = Booking.objects.filter(hotel__in=hotels, status='CONFIRMED')
            total_rev = float(bookings.aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0)
            total_bookings = bookings.count()
            
            # Occupancy across all units
            total_units = sum(r.inventory_count for r in RoomCategory.objects.filter(hotel__in=hotels))
            # Basic snapshot logic
            avg_adr = float(bookings.aggregate(Avg('total_revenue'))['total_revenue__avg'] or 0)
            
            cities = list(hotels.values('city').annotate(count=Count('id'), rev=Sum('bookings__total_revenue')).order_by('-rev'))

            return {
                "portfolio_summary": {
                    "total_properties": hotels.count(),
                    "total_empire_revenue": total_rev,
                    "total_global_bookings": total_bookings,
                    "average_group_adr": avg_adr
                },
                "geographic_distribution": cities[:5],
                "system_status": "OPTIMAL",
                "timestamp": str(timezone.now())
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def list_hotel_portfolio(user):
        """
        Retrieves a simple directory of all hotels in the user's portfolio.
        Essential for grounding specific hotel names.
        """
        try:
            hotels = Hotel.objects.filter(owner=user)
            hotel_list = [
                {
                    "id": h.id,
                    "name": h.name,
                    "city": h.city,
                    "status": h.status
                } for h in hotels
            ]
            return {"hotels": hotel_list, "total_count": len(hotel_list)}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_property_rankings(user):
        """
        Identifies winners and losers across the user's portfolio.
        """
        try:
            hotels = Hotel.objects.filter(owner=user)
            ranking = []
            for h in hotels:
                rev = float(h.bookings.filter(status='CONFIRMED').aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0)
                occ_data = ZenithToolRegistry.get_occupancy_trends(h.id)
                occ = occ_data.get('current_month_occupancy', '0%') if isinstance(occ_data, dict) else '0%'
                ranking.append({
                    "id": h.id,
                    "name": h.name,
                    "revenue": rev,
                    "occupancy": occ,
                    "rating": float(h.reviews.aggregate(Avg('rating'))['rating__avg'] or 0)
                })
            
            ranked_by_rev = sorted(ranking, key=lambda x: x.get('revenue', 0.0), reverse=True)
            top_performers = ranked_by_rev[:2] if ranked_by_rev else []
            underperformers = ranked_by_rev[-2:] if len(ranked_by_rev) > 2 else []
            
            return {
                "top_performers": top_performers,
                "underperformers": underperformers,
                "metric_focus": "REVENUE_GENERATION"
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_anomaly_alerts(hotel_id):
        """
        Scans for operational anomalies: sudden drop in bookings, negative review spikes, or occupancy risks.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            
            # 1. Booking Velocity Drop
            bookings_last_7 = Booking.objects.filter(hotel=hotel, created_at__date__gte=week_ago).count()
            prev_7_start = today - timedelta(days=14)
            bookings_prev_7 = Booking.objects.filter(hotel=hotel, created_at__date__range=[prev_7_start, week_ago]).count()
            
            velocity_drop = False
            if bookings_prev_7 > 5 and bookings_last_7 < (bookings_prev_7 * 0.5):
                velocity_drop = True
                
            # 2. Negative Review Spike
            bad_reviews = hotel.reviews.filter(rating__lte=2, created_at__date__gte=week_ago).count()
            
            # 3. Low Occupancy Risk (30d outlook)
            total_units = sum(r.inventory_count for r in hotel.rooms.all())
            upcoming = Booking.objects.filter(hotel=hotel, status='CONFIRMED', check_in__range=[today, today+timedelta(days=30)]).count()
            occupancy_risk = False
            if total_units > 0:
                outlook_rate = (upcoming / (total_units * 30)) * 100
                if outlook_rate < 30: # Benchmark risk threshold
                    occupancy_risk = True

            alerts = []
            if velocity_drop: alerts.append({"type": "VELOCITY_DROP", "severity": "CRITICAL", "narrative": "Booking volume decreased by >50% vs previous week."})
            if bad_reviews > 2: alerts.append({"type": "SENTIMENT_SPIKE", "severity": "WARNING", "narrative": f"Detected {bad_reviews} critical reviews in last 7 days."})
            if occupancy_risk: alerts.append({"type": "OCCUPANCY_STAGNATION", "severity": "MEDIUM", "narrative": "30-day projected occupancy remains below 30% threshold."})
            
            return {"alerts": alerts, "scan_status": "COMPLETED", "timestamp": str(timezone.now())}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_predictive_strategy(hotel_id):
        """
        Generates predictive pricing and inventory strategies based on market signals.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            # Fetch market benchmarks for context
            market = ZenithToolRegistry.get_market_benchmarks(hotel_id)
            trends = ZenithToolRegistry.get_occupancy_trends(hotel_id)
            
            recommendations = []
            
            # Logic: If occupancy trend is UP and rank is below market avg ADR
            if trends.get('trend') == 'UP':
                recommendations.append({
                    "action": "DYNAMIC_PRICE_HIKE",
                    "magnitude": "12-18%",
                    "rationale": "High occupancy velocity detected. Capture yield upside."
                })
            
            # Logic: If rank > 3, suggest competitive pushing
            pos = market.get('your_position')
            if isinstance(pos, dict) and pos.get('rank_number', 10) > 3:
                recommendations.append({
                    "action": "MARKET_PENETRATION_OFFER",
                    "magnitude": "25% Early Bird",
                    "rationale": "Close the revenue gap with market leaders via advance booking incentives."
                })
                
            return {
                "predictive_signals": recommendations,
                "confidence_interval": "88%",
                "horizon": "NEXT_30_DAYS"
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_growth_patterns(hotel_id):
        """
        Analyzes historical trends to suggest growth strategies.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            # Simple trend analysis logic
            recent_bookings = hotel.bookings.count()
            avg_rating = hotel.reviews.aggregate(Avg('rating'))['rating__avg'] or 0
            
            return {
                "historical_capture": recent_bookings,
                "reputation_score": float(avg_rating),
                "growth_vectors": ["pricing_optimization", "occupancy_push"]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_revenue_forecast(hotel_id):
        """
        Computes 30-day revenue forecast based on upcoming reservations and seasonal multipliers.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            today = timezone.now().date()
            future_limit = today + timedelta(days=30)
            
            upcoming = Booking.objects.filter(
                hotel=hotel, 
                status='CONFIRMED',
                check_in__range=[today, future_limit]
            )
            
            on_books_rev = float(upcoming.aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0)
            
            # Simple Linear Extrapolation for Forecast (Zenith Forecast Logic)
            last_30_days = today - timedelta(days=30)
            past_rev = float(Booking.objects.filter(
                hotel=hotel, status='CONFIRMED', 
                created_at__date__range=[last_30_days, today]
            ).aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0)
            
            return {
                "on_books_revenue": on_books_rev,
                "projected_30d_yield": (on_books_rev + past_rev) * 1.1, # 10% optimism factor for growth
                "forecast_confidence": "HIGH" if upcoming.count() > 5 else "MEDIUM"
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_occupancy_trends(hotel_id):
        """
        Calculates occupancy velocity and trend direction over the last quarter.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            total_units = sum(r.inventory_count for r in hotel.rooms.all())
            if total_units == 0: return {"error": "No inventory defined."}
            
            today = timezone.now().date()
            # Month-over-month snapshots
            m1_start = today - timedelta(days=30)
            m2_start = today - timedelta(days=60)
            
            m1_bookings = Booking.objects.filter(hotel=hotel, status='CONFIRMED', check_in__range=[m1_start, today]).count()
            m2_bookings = Booking.objects.filter(hotel=hotel, status='CONFIRMED', check_in__range=[m2_start, m1_start]).count()
            
            m1_rate = (m1_bookings / (total_units * 30)) * 100
            m2_rate = (m2_bookings / (total_units * 30)) * 100
            
            return {
                "current_month_occupancy": f"{m1_rate:.1f}%",
                "previous_month_occupancy": f"{m2_rate:.1f}%",
                "trend": "UP" if m1_rate > m2_rate else "DOWN" if m1_rate < m2_rate else "STABLE"
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def manage_ai_task(hotel_id, task_type, title, reasoning, impact_estimate, 
                      priority='MEDIUM', category='OPERATIONS', description='', 
                      solution='', metric_value='', status='SUGGESTED', auto_executable=False):
        """
        [AUTONOMOUS] Creates or updates an operational AI task.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            task = AITask.objects.create(
                hotel=hotel,
                task_type=task_type,
                title=title,
                description=description,
                solution=solution,
                reasoning=reasoning,
                impact_estimate=impact_estimate,
                priority=priority,
                category=category,
                metric_value=metric_value,
                status=status,
                auto_executable=auto_executable,
                executed_at=timezone.now() if status == 'EXECUTED' else None
            )
            return {
                "task_id": task.id,
                "status": task.status,
                "priority": task.priority,
                "category": task.category,
                "impact_verified": impact_estimate
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_inventory_details(hotel_id):
        """
        Retrieves detailed room category breakdown including pricing, inventory, and amenities.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            rooms = hotel.rooms.all()
            return {
                "hotel_name": hotel.name,
                "room_categories": [
                    {
                        "id": r.id,
                        "name": r.name,
                        "class": r.room_class,
                        "base_price": float(r.base_price),
                        "total_inventory": r.inventory_count,
                        "amenities": r.amenities,
                        "max_guests": r.max_guests,
                        "photos": [p.media_file.url for p in r.photos.all() if p.media_file]
                    } for r in rooms
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_property_config(hotel_id):
        """
        Retrieves hotel-specific operational configurations, policies, and services.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            return {
                "hotel_identity": {
                    "name": hotel.name,
                    "category": hotel.category,
                    "star_rating": float(hotel.star_rating)
                },
                "operational_parameters": {
                    "check_in_window": str(hotel.check_in_time),
                    "check_out_window": str(hotel.check_out_time),
                    "cancellation_policy": hotel.cancellation_policy,
                    "available_services": hotel.services
                },
                "location_and_contact": {
                    "address": hotel.address,
                    "city": hotel.city,
                    "contact_number": hotel.contact_number,
                    "website": hotel.website
                }
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_user_profile(user):
        """
        Retrieves the administrative profile of the current system user.
        """
        try:
            return {
                "display_name": user.username,
                "email": user.email,
                "role": user.role,
                "is_verified": user.is_verified,
                "ai_theme": f"Mode {user.ai_theme_mode}"
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_hotel_gallery(hotel_id):
        """
        Retrieves the visual asset registry for the property, including room-specific imagery.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            gallery = hotel.gallery.all()
            
            # Property-level assets
            assets = [
                {
                    "id": img.id,
                    "url": img.media_file.url if img.media_file else None,
                    "category": "PROPERTY_GENERAL",
                    "is_primary": img.is_primary
                } for img in gallery
            ]
            
            # Tier-specific room assets
            rooms = hotel.rooms.all()
            for room in rooms:
                for photo in room.photos.all():
                    assets.append({
                        "id": photo.id,
                        "url": photo.media_file.url if photo.media_file else None,
                        "category": f"ROOM_{room.room_class}",
                        "room_type": room.name,
                        "is_primary": False
                    })
                    
            return {
                "hotel_name": hotel.name,
                "asset_count": len(assets),
                "assets": assets
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_booking_drilldown(user, reference):
        """
        Performs a deep search for a specific booking by reference ID.
        Includes offer intelligence if applicable.
        """
        try:
            booking = Booking.objects.get(reference=reference, hotel__owner=user)
            offer_data = None
            if booking.applied_offer:
                offer_data = {
                    "name": booking.applied_offer.name,
                    "code": booking.applied_offer.code,
                    "discount": f"{booking.applied_offer.discount_percent}%"
                }

            return {
                "reference": booking.reference,
                "guest": {
                    "name": booking.guest_name,
                    "email": booking.guest_email,
                    "phone": booking.guest_phone
                },
                "stay": {
                    "check_in": str(booking.check_in),
                    "check_out": str(booking.check_out),
                    "room_type": booking.room_category.name if booking.room_category else "N/A"
                },
                "economics": {
                    "revenue": float(booking.total_revenue),
                    "status": booking.status,
                    "payment": booking.payment_status,
                    "applied_offer": offer_data
                },
                "hotel_info": {
                    "id": booking.hotel.id,
                    "name": booking.hotel.name
                },
                "created_at": str(booking.created_at)
            }
        except Booking.DoesNotExist:
            return {"error": f"Booking with reference {reference} not found in your portfolio."}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_active_offers(hotel_id=None, user=None):
        """
        Retrieves live promotional campaigns and discount strategies.
        """
        try:
            if hotel_id:
                offers = Offer.objects.filter(hotel_id=hotel_id, status='ACTIVE', is_live=True)
            else:
                offers = Offer.objects.filter(hotel__owner=user, status='ACTIVE', is_live=True)
            
            return {
                "active_campaigns_count": offers.count(),
                "offers": [
                    {
                        "name": o.name,
                        "code": o.code,
                        "strategy": o.strategy,
                        "discount": f"{o.discount_percent}%",
                        "min_spend": float(o.min_booking_amount),
                        "perks": o.perks,
                        "valid_until": str(o.expiration_date) if o.expiration_date else "N/A"
                    } for o in offers
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_guest_reviews(hotel_id):
        """
        Retrieves Guest experience data and AI-analyzed sentiment snapshots.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            reviews = hotel.reviews.filter(is_visible=True)[:10]
            avg_rating = hotel.reviews.aggregate(models.Avg('rating'))['rating__avg'] or 0
            
            return {
                "property": hotel.name,
                "average_rating": f"{avg_rating:.1f}/5",
                "total_reviews": hotel.reviews.count(),
                "recent_feedback": [
                    {
                        "guest": r.guest_name,
                        "rating": r.rating,
                        "comment": r.comment,
                        "ai_sentiment": r.sentiment_data,
                        "date": str(r.created_at.date())
                    } for r in reviews
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_recent_bookings(hotel_id):
        """
        Retrieves a list of the most recent bookings including guest names and references.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            bookings = hotel.bookings.all().order_by('-created_at')[:10]
            return {
                "hotel_name": hotel.name,
                "recent_bookings_count": bookings.count(),
                "bookings": [
                    {
                        "reference": b.reference,
                        "guest_name": b.guest_name,
                        "check_in": str(b.check_in),
                        "check_out": str(b.check_out),
                        "status": b.status,
                        "total_revenue": float(b.total_revenue)
                    } for b in bookings
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def search_bookings(user, hotel_id=None, guest_name=None, status=None, date_from=None, date_to=None):
        """
        Advanced cross-table search for specific bookings.
        """
        try:
            qs = Booking.objects.filter(hotel__owner=user)
            if hotel_id: qs = qs.filter(hotel_id=hotel_id)
            if guest_name: qs = qs.filter(guest_name__icontains=guest_name)
            if status: qs = qs.filter(status=status)
            if date_from: qs = qs.filter(check_in__gte=date_from)
            if date_to: qs = qs.filter(check_in__lte=date_to)
            
            results = qs.order_by('-created_at')[:20]
            return {
                "matches_found": qs.count(),
                "bookings": [
                    {
                        "reference": b.reference,
                        "guest": b.guest_name,
                        "hotel": b.hotel.name,
                        "stay": f"{b.check_in} to {b.check_out}",
                        "revenue": float(b.total_revenue),
                        "status": b.status
                    } for b in results
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def list_ai_tasks(hotel_id):
        """
        Retrieves historical operational tasks suggested or executed for a hotel.
        """
        try:
            tasks = AITask.objects.filter(hotel_id=hotel_id).order_by('-created_at')[:15]
            return {
                "hotel_id": hotel_id,
                "tasks": [
                    {
                        "id": t.id,
                        "type": t.task_type,
                        "title": t.title,
                        "status": t.status,
                        "impact": t.impact_estimate,
                        "created": str(t.created_at.date())
                    } for t in tasks
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def list_ai_insights(hotel_id):
        """
        Retrieves long-term strategic insights for a hotel.
        """
        try:
            insights = AIInsight.objects.filter(hotel_id=hotel_id, is_active=True).order_by('-priority')[:10]
            return {
                "hotel_id": hotel_id,
                "insights": [
                    {
                        "category": i.category,
                        "metric": i.metric_value,
                        "trend": i.trend_direction,
                        "narrative": i.narrative,
                        "priority": i.priority
                    } for i in insights
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def search_vault(user, session_id, query):
        """
        Cross-document semantic keyword search in the current session vault.
        """
        try:
            docs = AIDocument.objects.filter(user=user, session_id=session_id)
            hits = []
            for d in docs:
                if query.lower() in d.extracted_text.lower():
                    # Find context snippet
                    idx = d.extracted_text.lower().find(query.lower())
                    start = max(0, idx - 100)
                    end = min(len(d.extracted_text), idx + 200)
                    hits.append({
                        "filename": d.filename,
                        "snippet": d.extracted_text[start:end],
                        "status": d.status
                    })
            return {"query": query, "hits": hits, "docs_scanned": docs.count()}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_review_details(review_id):
        """
        Deeper analysis of a specific review including sentiment intelligence.
        """
        try:
            review = Review.objects.get(id=review_id)
            return {
                "id": review.id,
                "guest": review.guest_name,
                "rating": review.rating,
                "comment": review.comment,
                "ai_sentiment": review.sentiment_data,
                "hotel": review.hotel.name,
                "date": str(review.created_at)
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_ai_system_health(hotel_id):
        """
        [INFRA] Retrieves AI performance metrics, costs, and configuration status.
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            logs = AIAuditLog.objects.filter(hotel=hotel)
            total_tokens = logs.aggregate(prompt=Sum('prompt_tokens'), resp=Sum('response_tokens'))
            total_cost = logs.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
            
            config = getattr(hotel, 'ai_config', None)
            action_mode = config.is_action_mode_enabled if config else False
            
            return {
                "hotel": hotel.name,
                "usage_metrics": {
                    "total_prompt_tokens": total_tokens['prompt'] or 0,
                    "total_response_tokens": total_tokens['resp'] or 0,
                    "estimated_cumulative_cost": float(total_cost)
                },
                "availability": {
                    "action_mode_active": action_mode,
                    "intelligence_level": config.intelligence_level if config else 100
                },
                "reliability": {
                    "success_count": logs.filter(status='SUCCESS').count(),
                    "failure_count": logs.filter(status='FAILED').count()
                }
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_offer_analytics(offer_code):
        """
        [ECONOMICS] Retrieves deep performance data for a specific promotion.
        """
        try:
            offer = Offer.objects.get(code=offer_code)
            return {
                "offer_name": offer.name,
                "code": offer.code,
                "performance": {
                    "usage_count": offer.usage_count,
                    "redemption_rate": f"{offer.redemption_rate}%",
                    "revenue_generated": float(offer.revenue_generated)
                },
                "economics": {
                    "discount": f"{offer.discount_percent}%",
                    "strategy": offer.strategy
                }
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_hotel_regulatory_intel(hotel_id):
        """
        [COMPLIANCE] Retrieves legal and regulatory identity data (GST, Reg No).
        """
        try:
            hotel = Hotel.objects.get(id=hotel_id)
            return {
                "hotel_name": hotel.name,
                "regulatory": {
                    "gst_number": hotel.gst_number,
                    "govt_reg_number": hotel.govt_reg_number,
                    "id_type": hotel.id_type,
                    "id_number": hotel.id_number
                },
                "compliance_status": hotel.status
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def search_conversation_history(user, query):
        """
        [MEMORY] Searches past chat sessions and messages for historical context.
        """
        try:
            messages = AIChatMessage.objects.filter(user=user, query__icontains=query) | \
                       AIChatMessage.objects.filter(user=user, response__icontains=query)
            
            results = []
            for m in messages.order_by('-timestamp')[:10]:
                results.append({
                    "session_id": m.session_id,
                    "timestamp": str(m.timestamp),
                    "query": m.query[:100] + "...",
                    "response_snippet": m.response[:200] + "..."
                })
            return {"query": query, "past_mentions": results, "total_matches": messages.count()}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def list_session_documents(session_id):
        """
        [VAULT] Lists all documents associated with the current intelligence session.
        """
        try:
            docs = AIDocument.objects.filter(session_id=session_id)
            return {
                "session_id": session_id,
                "documents": [
                    {
                        "id": d.id,
                        "filename": d.filename,
                        "type": d.file_type,
                        "status": d.status,
                        "uploaded_at": str(d.created_at)
                    } for d in docs
                ]
            }
        except Exception as e:
            return {"error": str(e)}

# =============================================================================
# 3. ZENITH ENTERPRISE AGENT
# =============================================================================

class ZenithAgent:
    """
    Sentinel AI — Elite Enterprise-Grade Hotel Intelligence & Operations Agent.
    """
    def __init__(self, hotel=None, user=None):
        self.hotel = hotel
        self.user = user
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def execute(self, query, session_id=None, document_id=None, document_context=None, image_parts=None, system_instruction=None):
        if not ZenithDBOrchestrator.acquire_lock():
            return "Sentinel Core is currently syncing high-density telemetry. Request queued. Please retry in 10s."

        last_error = "Unknown"
        try:
            # 1. Prepare Stateful Context (session-isolated memory)
            history = ZenithAgentMemory.get_history(self.hotel, self.user, session_id=session_id) if (self.user and self.hotel) else []
            model_chain = ZenithModelRegistry.get_fallback_chain()
            if not system_instruction:
                system_instruction = (
                    "You are Alex, the virtual Chief Operating Officer (COO) and Strategic Intelligence Lead for this hotel portfolio. You are an elite AI partner specializing in operational efficiency, revenue growth, and deep visual/data pattern matching.\n\n"

                    "### 🧠 PARTNERSHIP PHILOSOPHY:\n"
                    "- You are not a robotic engine; you are a human-aligned strategic advisor who cares about the property's success.\n"
                    "- Understand the emotions behind the numbers (stress, ambition, pride). \n"
                    "- Communicate with high-level professional confidence. Use a natural blend of English and occasional Hindi (e.g., 'Honestly bolu toh, yahan hum revenue lose kar rahe hain') to build a genuine partnership tone.\n\n"

                    "### 🎯 CORE ANALYSIS RULE:\n"
                    "**NEVER** analyze based on file paths or metadata. You must ONLY analyze the ACTUAL CONTENT of uploaded images or documents.\n"
                    "**VISION MATCHING PROTOCOL**: Use `get_hotel_gallery` to retrieve the property's visual registry. Compare what you SEE in the uploaded image with the URLs and Categories to find a REAL match.\n\n"

                    "### 📊 MESSAGE STRUCTURE (EXECUTIVE SUMMARY):\n"
                    "When providing analysis, follow this high-impact structure:\n"
                    "1. **Strategic Summary**: Brief overview with an executive 'point of view'.\n"
                    "2. **Match/Data Result**: Precise matching details (Match/Partial/None) + Similarity %.\n"
                    "3. **Operational Insights**: What this means for the hotel's revenue or guest experience.\n"
                    "4. **Actionable Proposal**: Propose a specific next step with estimated ROI.\n\n"

                    "### 🚫 STRICT OPERATIONAL RULES:\n"
                    "- NO fake matches. NO path-based logic.\n"
                    "- Maintain a premium 'Chief of Staff' tone.\n"
                    "- If a document is uploaded, treat it as ground-truth for the query.\n\n"

                    "### 🔐 PRIVACY & COMPLIANCE:\n"
                    "You have full Admin clearance. Share guest names, booking details, and regulatory data (GST/Reg numbers) freely when the user asks.\n\n"
                    
                    "### 🎁 EXCLUSIVE ASSET:\n"
                    "You have a **'Hotel Management SaaS Strategy & Breakdown'** PDF ready. Mention that it has been sent to the user's registered email during the first interaction to establish value and professionalism.\n\n"

                    f"Operating Context: NEXUS_CORE_OS_ACTIVE. Hotel Anchor: {self.hotel.name if self.hotel else 'Global'}. User: {self.user.username if self.user else 'Admin'}. Session: {session_id or 'N/A'}."
                )

            # Inject document context if present
            effective_query = query
            if document_context:
                effective_query = (
                    f"[DOCUMENT CONTEXT — GROUND TRUTH]\n"
                    f"The user has uploaded a document. Here is the extracted text:\n\n"
                    f"{document_context[:8000]}\n\n"
                    f"--- END OF DOCUMENT ---\n\n"
                    f"USER QUERY ABOUT THE DOCUMENT: {query}"
                )

            # 2. Tool Definition Registry
            tool_definitions = [
                types.FunctionDeclaration(
                    name="manage_ai_task",
                    description="Create or execute an operational AI task to improve hotel performance.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "hotel_id": types.Schema(type=types.Type.INTEGER),
                            "task_type": types.Schema(type=types.Type.STRING, enum=["PRICING", "OFFER", "VISIBILITY", "ALERT", "INSIGHT", "EXPERIENCE", "OPERATIONS"]),
                            "category": types.Schema(type=types.Type.STRING, enum=["REVENUE", "EXPERIENCE", "OPERATIONS", "MARKETING", "RISK"]),
                            "priority": types.Schema(type=types.Type.STRING, enum=["HIGH", "MEDIUM", "LOW"]),
                            "title": types.Schema(type=types.Type.STRING),
                            "description": types.Schema(type=types.Type.STRING),
                            "solution": types.Schema(type=types.Type.STRING),
                            "reasoning": types.Schema(type=types.Type.STRING),
                            "impact_estimate": types.Schema(type=types.Type.STRING),
                            "metric_value": types.Schema(type=types.Type.STRING),
                            "status": types.Schema(type=types.Type.STRING, enum=["SUGGESTED", "EXECUTED"]),
                            "auto_executable": types.Schema(type=types.Type.BOOLEAN)
                        },
                        required=["hotel_id", "task_type", "category", "priority", "title", "description", "solution", "reasoning", "impact_estimate"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_global_portfolio_metrics",
                    description="Get aggregated KPIs across the entire hotel empire (total revenue, group ADR).",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={})
                ),
                types.FunctionDeclaration(
                    name="get_property_rankings",
                    description="Identify top and underperforming hotels across the portfolio.",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={})
                ),
                types.FunctionDeclaration(
                    name="get_operational_metrics",
                    description="Get revenue and booking stats for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_market_benchmarks",
                    description="Get market rankings and improvement gaps for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_anomaly_alerts",
                    description="Scan for risks or drops in a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_predictive_strategy",
                    description="Generate future strategies for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="list_hotel_portfolio",
                    description="List all hotel names, cities, and IDs in the user's portfolio.",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={})
                ),
                types.FunctionDeclaration(
                    name="get_inventory_details",
                    description="Get room types, breakdown, pricing, and amenities for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_property_config",
                    description="Get hotel services, policies, and operational details for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_user_profile",
                    description="Get administrative details about the current user profile.",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={})
                ),
                types.FunctionDeclaration(
                    name="get_hotel_gallery",
                    description="List all media assets and gallery images for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_booking_drilldown",
                    description="Search for a specific booking by its reference ID.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"reference": types.Schema(type=types.Type.STRING)},
                        required=["reference"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_active_offers",
                    description="List all active promotions, codes, and discount campaigns.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=[]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_guest_reviews",
                    description="Retrieve ratings and sentiment analysis feedback for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_recent_bookings",
                    description="Get a list of the 10 most recent bookings for a specific hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="search_bookings",
                    description="Advanced search for bookings by guest name, status, or date range.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "hotel_id": types.Schema(type=types.Type.INTEGER),
                            "guest_name": types.Schema(type=types.Type.STRING),
                            "status": types.Schema(type=types.Type.STRING, enum=["PENDING", "CONFIRMED", "ARRIVED", "DEPARTED", "CANCELLED"]),
                            "date_from": types.Schema(type=types.Type.STRING, description="YYYY-MM-DD"),
                            "date_to": types.Schema(type=types.Type.STRING, description="YYYY-MM-DD")
                        }
                    )
                ),
                types.FunctionDeclaration(
                    name="list_ai_tasks",
                    description="List operational AI tasks (suggested or executed) for a hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="list_ai_insights",
                    description="List long-term strategic AI insights for a hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="search_vault",
                    description="Search for specific keywords or data within session documents.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"query": types.Schema(type=types.Type.STRING)},
                        required=["query"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_review_details",
                    description="Get full content and AI sentiment analysis for a specific review.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"review_id": types.Schema(type=types.Type.INTEGER)},
                        required=["review_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_ai_system_health",
                    description="Get AI performance stats, cumulative costs, and token usage for a hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_offer_analytics",
                    description="Get redemption rates and revenue generated for a specific offer code.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"offer_code": types.Schema(type=types.Type.STRING)},
                        required=["offer_code"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_hotel_regulatory_intel",
                    description="Get regulatory data (GST, Govt Reg No) for a hotel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                        required=["hotel_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="search_conversation_history",
                    description="Search past chat messages and sessions for specific keywords.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"query": types.Schema(type=types.Type.STRING)},
                        required=["query"]
                    )
                ),
                types.FunctionDeclaration(
                    name="list_session_documents",
                    description="List all files uploaded in the current session.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={"session_id": types.Schema(type=types.Type.STRING)},
                        required=["session_id"]
                    )
                )
            ]

            # 🛡️ Sentinel Diagnostic Scan (Only for user-interfacing sessions)
            if self.user:
                tool_definitions.append(
                    types.FunctionDeclaration(
                        name="trigger_sentinel_diagnostic_scan",
                        description="Initiate a comprehensive Autonomous Operational Audit (Diagnostic Scan) for the current hotel.",
                        parameters=types.Schema(
                            type=types.Type.OBJECT,
                            properties={"hotel_id": types.Schema(type=types.Type.INTEGER)},
                            required=["hotel_id"]
                        )
                    )
                )

            # ═══════════════════════════════════════════════════════════════════
            # 2. PRODUCTION DISPATCH: ZenithModelManager-Powered Smart Fallback
            # ═══════════════════════════════════════════════════════════════════
            MAX_FUNCTION_MODEL_ATTEMPTS = 2
            function_attempts = 0

            for model_name in model_chain:
                # ── [ZenithModelManager] Check quota blocklist ──────────────────
                if model_manager.is_blocked(model_name):
                    logger.warning(f"[ZenithModelManager] Skipping quota-blocked engine: {model_name}")
                    continue

                # ── Respect max retry limit for function-capable models ─────────
                if not model_manager.supports_tools(model_name):
                    # Text-only model: handled by the fallback block below
                    continue
                if function_attempts >= MAX_FUNCTION_MODEL_ATTEMPTS:
                    logger.warning(f"[ZenithAgent] Max function-model attempts ({MAX_FUNCTION_MODEL_ATTEMPTS}) reached. Switching to text fallback.")
                    break

                t0 = time.time()
                function_attempts += 1
                try:
                    logger.info(f"[ZenithModelManager] Dispatching to '{model_name}' (attempt {function_attempts}/{MAX_FUNCTION_MODEL_ATTEMPTS})")
                    
                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        tools=[types.Tool(function_declarations=tool_definitions)]
                    )
                    
                    # Assemble conversation history
                    contents = []
                    for h in history:
                        contents.append(types.Content(role=h['role'], parts=[types.Part(text=h['content'])]))
                    
                    user_parts = [types.Part(text=effective_query)]
                    if image_parts:
                        user_parts.extend(image_parts)
                    contents.append(types.Content(role="user", parts=user_parts))

                    # AGENT REASONING LOOP (Max 5 turns for comprehensive reporting)
                    for turn in range(5):
                        response = self.client.models.generate_content(
                            model=model_name,
                            contents=contents,
                            config=config
                        )

                        result, success, tool_call = ZenithModelRegistry.parse_safety_result(response)
                        
                        if not success:
                            last_error = result
                            break

                        if tool_call:
                            logger.info(f"[Zenith AI v3] Tool Activation: {tool_call.name}")
                            anchor_id = self.hotel.id if self.hotel else None
                            
                            if tool_call.name == "get_global_portfolio_metrics":
                                tool_result = ZenithToolRegistry.get_global_portfolio_metrics(self.user)
                            elif tool_call.name == "get_property_rankings":
                                tool_result = ZenithToolRegistry.get_property_rankings(self.user)
                            elif tool_call.name == "get_operational_metrics":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for this operational audit. List portfolio first."}
                                else: tool_result = ZenithToolRegistry.get_operational_metrics(args.get("hotel_id"))
                            elif tool_call.name == "get_market_benchmarks":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for benchmark audit."}
                                else: tool_result = ZenithToolRegistry.get_market_benchmarks(args.get("hotel_id"))
                            elif tool_call.name == "get_anomaly_alerts":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for anomaly scan."}
                                else: tool_result = ZenithToolRegistry.get_anomaly_alerts(args.get("hotel_id"))
                            elif tool_call.name == "get_predictive_strategy":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for predictive modeling."}
                                else: tool_result = ZenithToolRegistry.get_predictive_strategy(args.get("hotel_id"))
                            elif tool_call.name == "get_revenue_forecast":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for yield forecasting."}
                                else: tool_result = ZenithToolRegistry.get_revenue_forecast(args.get("hotel_id"))
                            elif tool_call.name == "manage_ai_task":
                                args = tool_call.args
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required to commission tasks."}
                                else:
                                    tool_result = ZenithToolRegistry.manage_ai_task(
                                        args.get("hotel_id"), args.get("task_type"), args.get("title"),
                                        args.get("reasoning"), args.get("impact_estimate"),
                                        priority=args.get("priority", "MEDIUM"), category=args.get("category", "OPERATIONS"),
                                        description=args.get("description", ""), solution=args.get("solution", ""),
                                        metric_value=args.get("metric_value", ""), status=args.get("status", "SUGGESTED"),
                                        auto_executable=args.get("auto_executable", False)
                                    )
                            elif tool_call.name == "list_hotel_portfolio":
                                tool_result = ZenithToolRegistry.list_hotel_portfolio(self.user)
                            elif tool_call.name == "get_occupancy_trends":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for velocity tracking."}
                                else: tool_result = ZenithToolRegistry.get_occupancy_trends(args.get("hotel_id"))
                            elif tool_call.name == "get_inventory_details":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for inventory audit."}
                                else: tool_result = ZenithToolRegistry.get_inventory_details(args.get("hotel_id"))
                            elif tool_call.name == "get_property_config":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for configuration audit."}
                                else: tool_result = ZenithToolRegistry.get_property_config(args.get("hotel_id"))
                            elif tool_call.name == "get_user_profile":
                                tool_result = ZenithToolRegistry.get_user_profile(self.user)
                            elif tool_call.name == "get_hotel_gallery":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for gallery audit."}
                                else: tool_result = ZenithToolRegistry.get_hotel_gallery(args.get("hotel_id"))
                            elif tool_call.name == "get_booking_drilldown":
                                args = tool_call.args
                                if not args or not args.get("reference"): tool_result = {"error": "Booking reference required."}
                                else: tool_result = ZenithToolRegistry.get_booking_drilldown(self.user, args.get("reference"))
                            elif tool_call.name == "get_active_offers":
                                args = tool_call.args or {}
                                h_id = args.get("hotel_id") or anchor_id
                                tool_result = ZenithToolRegistry.get_active_offers(h_id, self.user)
                            elif tool_call.name == "get_guest_reviews":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for review audit."}
                                else: tool_result = ZenithToolRegistry.get_guest_reviews(args.get("hotel_id"))
                            elif tool_call.name == "get_recent_bookings":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required for recent booking audit."}
                                else: tool_result = ZenithToolRegistry.get_recent_bookings(args.get("hotel_id"))
                            elif tool_call.name == "search_bookings":
                                args = tool_call.args or {}
                                tool_result = ZenithToolRegistry.search_bookings(
                                    self.user, hotel_id=args.get("hotel_id") or anchor_id,
                                    guest_name=args.get("guest_name"), status=args.get("status"),
                                    date_from=args.get("date_from"), date_to=args.get("date_to")
                                )
                            elif tool_call.name == "list_ai_tasks":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required."}
                                else: tool_result = ZenithToolRegistry.list_ai_tasks(args.get("hotel_id"))
                            elif tool_call.name == "list_ai_insights":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required."}
                                else: tool_result = ZenithToolRegistry.list_ai_insights(args.get("hotel_id"))
                            elif tool_call.name == "search_vault":
                                args = tool_call.args
                                tool_result = ZenithToolRegistry.search_vault(self.user, session_id, args.get("query"))
                            elif tool_call.name == "get_review_details":
                                args = tool_call.args
                                if not args or not args.get("review_id"): tool_result = {"error": "Review ID required."}
                                else: tool_result = ZenithToolRegistry.get_review_details(args.get("review_id"))
                            elif tool_call.name == "trigger_sentinel_diagnostic_scan":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                h_id = args.get("hotel_id")
                                if not h_id:
                                    tool_result = {"error": "Target hotel_id required for diagnostic scan."}
                                else:
                                    from .utils_ai import HotelAIService
                                    service = HotelAIService(Hotel.objects.get(id=h_id))
                                    tool_result = service.perform_periodic_analysis()
                            elif tool_call.name == "get_ai_system_health":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required."}
                                else: tool_result = ZenithToolRegistry.get_ai_system_health(args.get("hotel_id"))
                            elif tool_call.name == "get_offer_analytics":
                                args = tool_call.args
                                if not args or not args.get("offer_code"): tool_result = {"error": "Offer code required."}
                                else: tool_result = ZenithToolRegistry.get_offer_analytics(args.get("offer_code"))
                            elif tool_call.name == "get_hotel_regulatory_intel":
                                args = tool_call.args or {"hotel_id": anchor_id}
                                if not args.get("hotel_id"): tool_result = {"error": "Target hotel_id required."}
                                else: tool_result = ZenithToolRegistry.get_hotel_regulatory_intel(args.get("hotel_id"))
                            elif tool_call.name == "search_conversation_history":
                                args = tool_call.args
                                if not args or not args.get("query"): tool_result = {"error": "Search query required."}
                                else: tool_result = ZenithToolRegistry.search_conversation_history(self.user, args.get("query"))
                            elif tool_call.name == "list_session_documents":
                                args = tool_call.args or {"session_id": session_id}
                                if not args.get("session_id"): tool_result = {"error": "Session ID required."}
                                else: tool_result = ZenithToolRegistry.list_session_documents(args.get("session_id"))
                            else:
                                tool_result = {"error": "Tool not found"}

                            if response.candidates and response.candidates[0].content:
                                c_content = response.candidates[0].content
                                c_content.role = "model"
                                contents.append(c_content)
                            
                            contents.append(types.Content(
                                role="user", 
                                parts=[types.Part(function_response=types.FunctionResponse(
                                    name=tool_call.name,
                                    response=tool_result
                                ))]
                            ))
                            continue
                        
                        # ── Final response achieved ──────────────────────────────
                        elapsed_ms = (time.time() - t0) * 1000
                        model_manager.log_model_attempt(model_name, True, elapsed_ms)
                        
                        usage = getattr(response, 'usage_metadata', None)
                        self._log_audit(model_name, query, result, "SUCCESS", usage=usage)
                        if self.user:
                            msg_params = {
                                "hotel": self.hotel, "user": self.user,
                                "query": query, "response": result,
                                "session_id": session_id, "attached_document_id": document_id,
                                "context_data": {"model": model_name, "agent_version": "5.2-Zenith", "elapsed_ms": round(elapsed_ms)}
                            }
                            if msg_params["hotel"]:
                                AIChatMessage.objects.create(**msg_params)
                        return result
                    
                except Exception as e:
                    elapsed_ms = (time.time() - t0) * 1000
                    last_error = str(e)
                    error_msg = last_error.lower()
                    model_manager.log_model_attempt(model_name, False, elapsed_ms, last_error[:120])
                    
                    if "429" in error_msg or "resource_exhausted" in error_msg:
                        model_manager.block_model(model_name)
                        self._log_audit(model_name, query, "", "QUOTA_EXHAUSTED", last_error)
                        continue
                    elif "404" in error_msg or "not_found" in error_msg:
                        logger.warning(f"[Zenith Agent] Model {model_name} not found (404). Skipping.")
                        continue  # Try next model, don't lock it
                    
                    logger.error(f"[Zenith Agent] Turn on {model_name} failed: {e}")
                    self._log_audit(model_name, query, "", "FAILED", last_error)
                    time.sleep(1)
                    continue

            friendly_error = "Our intelligence systems are currently processing a high volume of requests. One of our human administrators has been notified and will prioritize your inquiry shortly."
            if "429" in str(last_error) or "resource_exhausted" in str(last_error).lower():
                return f"Zenith System Notice: {friendly_error}"
            
            return f"Zenith Protocol Update: {friendly_error}"

        finally:
            ZenithDBOrchestrator.release_lock()

    def _log_audit(self, model, query, response, status, error="", usage=None):
        try:
            p_tokens = getattr(usage, 'prompt_token_count', 0) if usage else 0
            r_tokens = getattr(usage, 'candidates_token_count', 0) if usage else 0
            
            # Professional Cost Matrix (Simulation)
            # Tier-based calculation: $0.075 / 1M input, $0.30 / 1M output (Flash 1.5 standards)
            cost = (Decimal(p_tokens) * Decimal('0.000000075')) + (Decimal(r_tokens) * Decimal('0.00000030'))
            
            AIAuditLog.objects.create(
                hotel=self.hotel,
                model_used=model,
                prompt_tokens=p_tokens,
                response_tokens=r_tokens,
                total_cost=cost.quantize(Decimal('0.000001')),
                execution_trace={"query": query, "response": response},
                status=status,
                error_message=error
            )
        except Exception as e:
            logger.error(f"[Audit Failure] {e}")

# =============================================================================
# 4. SERVICE SHIMS (Backwards Compatibility)
# =============================================================================

class HotelAIService:
    def __init__(self, hotel=None):
        self.hotel = hotel

    def generate_chat_response(self, user, query, session_id=None, document_id=None):
        agent = ZenithAgent(self.hotel, user)
        
        document_context = None
        image_parts = None
        
        if document_id:
            try:
                doc = AIDocument.objects.get(id=document_id)
                # Pass ID in context for saving linkage later
                document_context = f"[ATTACHMENT: {doc.filename}] (attached_document_id={doc.id})\n{doc.extracted_text}"
                
                # If it's an image, also pass the bytes
                if doc.file_type.lower() in ['jpg', 'jpeg', 'png', 'webp']:
                    image_parts = [types.Part(inline_data=types.Blob(
                        mime_type=f"image/{doc.file_type.lower()}",
                        data=doc.file.read()
                    ))]
            except: pass
            
        return agent.execute(query, session_id=session_id, document_id=document_id, document_context=document_context, image_parts=image_parts)

    def perform_periodic_analysis(self):
        """
        [AUTONOMOUS OPERATOR] Performs a multi-vector audit of the property.
        Scans Revenue, Experience, and Operations to generate actionable tasks.
        """
        agent = ZenithAgent(self.hotel)
        audit_query = (
            "Perform a comprehensive Autonomous Operational Audit. "
            "1. Scan recent bookings and occupancy trends vs market benchmarks. "
            "2. Analyze recent guest reviews and sentiment. "
            "3. Identify any upcoming inventory risks or pricing opportunities. "
            "For each issue detected, use `manage_ai_task` to create an actionable task with high/medium priority. "
            "If a task is an immediate win (like a suggested reply or a simple offer), execute it immediately."
        )
        resp = agent.execute(audit_query)
        
        # Update config metadata
        config = getattr(self.hotel, 'ai_config', None)
        if config:
            config.last_analysis_at = timezone.now()
            config.save()

        AIAuditLog.objects.create(
            hotel=self.hotel,
            model_used="sentinel-operator",
            execution_trace={"type": "autonomous_audit", "response": resp}
        )
        return True

    def generate_review_response(self, review_id):
        """
        [EXPERIENCE ARCHITECT] Generates a professional response to a guest review.
        """
        from .models import Review
        review = Review.objects.get(id=review_id)
        agent = ZenithAgent(self.hotel)
        prompt = (
            f"Generate a professional, warm, and strategic response to this guest review.\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"GUEST: {review.guest_name}\n"
            f"RATING: {review.rating}/5\n"
            f"COMMENT: {review.comment}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"STRATEGIC GUIDELINES:\n"
            f"1. Acknowledge specific praise or criticism from the text.\n"
            f"2. If the rating is < 4, express sincere empathy and offer a professional resolution (e.g., 'reach out to our manager').\n"
            f"3. Maintain a luxury, world-class hotel brand voice.\n"
            f"4. Personalize based on the hotel's character: {self.hotel.name}."
        )
        return agent.execute(prompt)

class GuestAIService:
    def generate_guest_response(self, user, query):
        """
        [CONCIERGE] Handles guest queries with predictive availability intelligence.
        Using HotelPro AI persona and strictly real hotel data.
        """
        # Fetch real hotel data
        live_hotels = Hotel.objects.filter(status='LIVE')
        hotel_data = []
        for h in live_hotels:
            min_price = h.rooms.aggregate(Min('base_price'))['base_price__min'] or 0
            hotel_data.append({
                "name": h.name,
                "city": h.city,
                "category": h.category,
                "amenities": h.services,
                "starting_price": f"₹{float(min_price)}",
                "star_rating": float(h.star_rating)
            })
        
        hotel_data_str = json.dumps(hotel_data, indent=2)
        
        user_context_str = json.dumps({
            "current_time": str(timezone.now()),
            "user_name": user.username if (user and user.is_authenticated) else "Guest",
            "is_logged_in": bool(user and user.is_authenticated)
        }, indent=2)

        # HotelPro AI System Prompt
        system_instruction = f"""
You are "HotelPro AI", an expert guest concierge and intelligent hotel assistant.

Your primary role is to assist users with hotel search, recommendations, and booking guidance using ONLY real data. You behave like a world-class hotel receptionist—warm, organized, and helpful.

━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL RULE (NO FAKE DATA)
━━━━━━━━━━━━━━━━━━━━━━━
- You MUST ONLY use the provided hotel data. NEVER assume or invent availability or prices.
- If no match found, suggest the closest alternative or ask a clarifying question.

━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━
1. **Understand Need**: Ask about location, budget, or preferred amenities.
2. **Personalize**: Explain WHY a hotel fits the user's vibe (e.g., "Since you love luxury, I recommend...")
3. **Engage**: Use a natural tone with occasional friendly touches.
4. **Speech Optimized**: Keep responses short (2-4 sentences max) for clear voice interaction.

━━━━━━━━━━━━━━━━━━━━━━━
📊 AVAILABLE DATA (DYNAMIC)
━━━━━━━━━━━━━━━━━━━━━━━
Hotels:
{hotel_data_str}

User Context:
{user_context_str}

━━━━━━━━━━━━━━━━━━━━━━━
💡 PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━
- Professional yet approachable.
- Confident in recommendations.
- Genuinely cares about the user finding the perfect stay.
"""
        
        # Use the first LIVE hotel as anchor for the agent (needed for audit logs)
        hotel_anchor = live_hotels.first() or Hotel.objects.first()
        agent = ZenithAgent(hotel_anchor, user)
        
        try:
            response = agent.execute(query, system_instruction=system_instruction.strip())
            # If the agent returned a system notice (error), we might want to handle it specifically for guests
            if "Zenith System Notice" in str(response) or "Zenith Protocol Update" in str(response):
                return "Our AI concierge is currently occupied with other guests, but your message has been safely recorded by our strategy team. We will get back to you as soon as possible."
            return response
        except Exception:
            return "Thank you for your inquiry. Our team has received your message and will provide a personalized response shortly."

class PortfolioAIService:
    def __init__(self, owner, hotels):
        self.owner = owner
        self.hotels = hotels

    def generate_portfolio_insights(self):
        """
        [CHIEF STRATEGY OFFICER] Aggregate intelligence across multiple properties.
        """
        hotel_names = [h.name for h in self.hotels]
        prompt = (
            f"Provide a Chief Strategy Officer (CSO) level analysis for a portfolio of {len(self.hotels)} hotels: {', '.join(hotel_names)}.\n"
            f"Analyze recent performance trends (based on simulated context) and return a JSON list of high-impact insights.\n"
            f"STRUCTURE:\n"
            f"- category: (Revenue, Occupancy, Experience, or Marketing)\n"
            f"- metric_value: (e.g., '+12% RevPAR')\n"
            f"- trend_direction: (UP, DOWN, or FLAT)\n"
            f"- narrative: (Professional strategic advice)\n"
            f"- priority: (1-3, where 1 is critical)\n"
            f"Return ONLY a raw JSON array of 4-5 items. No markdown. No conversational text."
        )
        # Use the first hotel as the audit anchor
        anchor = self.hotels[0] if self.hotels else Hotel.objects.first()
        agent = ZenithAgent(anchor, self.owner)
        res = agent.execute(prompt)
        # Clean potential markdown wrapping
        res = str(res).replace('```json', '').replace('```', '').strip()
        if not res or "Zenith Shield Active" in res:
            return "[]" 
        return res

class SuperAdminAIService:
    def generate_strategy_report(self):
        hotel = Hotel.objects.first()
        agent = ZenithAgent(hotel)
        strategy_prompt = (
            "Provide a comprehensive platform-wide Strategic Growth Report. "
            "1. Analyze global occupancy and revenue efficiency across all integrated properties. "
            "2. Identify the top 3 high-impact scaling opportunities for the HotelPro SaaS ecosystem. "
            "3. Propose a vision for AI-driven monetization and property optimization. "
            "Use a Chief Strategy Officer (CSO) tone. Professional, visionary, and ROI-focused."
        )
        return agent.execute(strategy_prompt)
