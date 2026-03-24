"""
ZenithModelManager — Production AI Model Orchestration Layer
============================================================
Central intelligence layer for Gemini API model management.
Handles quota tracking, capability detection, smart fallback,
per-model timeouts, and structured logging.

Architecture:
    - Singleton pattern (module-level instance)
    - Django cache for quota state (survives restarts)
    - Zero external dependencies beyond google-genai + Django
"""

import logging
import time
from typing import Optional
from django.core.cache import cache

logger = logging.getLogger("hotelpro.zenith.model_manager")


# ─────────────────────────────────────────────────────────────────────────────
# Model Capability Registry
# Each entry defines:
#   priority          — lower = tried first
#   supports_tools    — whether this model supports function declarations
#   quota_lock_secs   — how long to block model after quota hit (5 min)
#   timeout_secs      — max time to wait for this model's response
# ─────────────────────────────────────────────────────────────────────────────
MODEL_REGISTRY = {
    "models/gemini-2.5-flash": {
        "priority": 1,
        "supports_tools": True,
        "quota_lock_secs": 300,
        "timeout_secs": 8,
        "tier": "primary",
    },
    "models/gemini-2.0-flash": {
        "priority": 2,
        "supports_tools": True,
        "quota_lock_secs": 300,
        "timeout_secs": 6,
        "tier": "primary",
    },
    "models/gemini-2.0-flash-lite": {
        "priority": 3,
        "supports_tools": True,
        "quota_lock_secs": 300,
        "timeout_secs": 5,
        "tier": "secondary",
    },
    "models/gemini-flash-latest": {
        "priority": 4,
        "supports_tools": True,
        "quota_lock_secs": 300,
        "timeout_secs": 5,
        "tier": "secondary",
    },
    "models/gemma-3-27b-it": {
        "priority": 5,
        "supports_tools": False,   # Gemma does NOT support function declarations
        "quota_lock_secs": 120,
        "timeout_secs": 10,
        "tier": "fallback",
    },
}

# Ordered list (priority-sorted) for fast iteration
_ORDERED_MODELS = sorted(MODEL_REGISTRY.keys(), key=lambda m: MODEL_REGISTRY[m]["priority"])


class ZenithModelManager:
    """
    Central AI model orchestration singleton.

    Usage:
        from HotelPro_Nexus.model_manager import model_manager

        chain = model_manager.get_available_chain(require_tools=True)
        for model_name, capabilities in chain:
            # use model_name with model API
    """

    CACHE_PREFIX = "zenith_model_blocked_"

    # ── Quota / Block Management ──────────────────────────────────────────────

    def is_blocked(self, model_name: str) -> bool:
        """Return True if model is currently in quota cooldown."""
        return bool(cache.get(f"{self.CACHE_PREFIX}{model_name}"))

    def block_model(self, model_name: str, seconds: Optional[int] = None) -> None:
        """Put model into quota cooldown for `seconds` (uses registry default if None)."""
        config = MODEL_REGISTRY.get(model_name, {})
        duration = seconds or config.get("quota_lock_secs", 300)
        cache.set(f"{self.CACHE_PREFIX}{model_name}", True, timeout=duration)
        logger.warning(
            f"[ZenithModelManager] 🔒 Blocked '{model_name}' for {duration}s "
            f"(tier={config.get('tier', 'unknown')})"
        )

    def unblock_model(self, model_name: str) -> None:
        """Manually remove quota cooldown for a model (admin/debug)."""
        cache.delete(f"{self.CACHE_PREFIX}{model_name}")
        logger.info(f"[ZenithModelManager] 🔓 Unblocked '{model_name}'")

    def unblock_all(self) -> None:
        """Unblock every model (useful when quota resets at midnight)."""
        for model_name in MODEL_REGISTRY:
            self.unblock_model(model_name)

    # ── Model Chain ───────────────────────────────────────────────────────────

    def get_available_chain(self, require_tools: bool = True):
        """
        Returns a list of (model_name, capabilities_dict) tuples,
        sorted by priority, excluding blocked models.

        Args:
            require_tools: If True, includes ONLY models that support function calling.
                           If False, returns ALL available models (including text-only).
        """
        chain = []
        for model_name in _ORDERED_MODELS:
            if self.is_blocked(model_name):
                logger.debug(f"[ZenithModelManager] Skipping blocked model: {model_name}")
                continue
            caps = MODEL_REGISTRY[model_name]
            if require_tools and not caps["supports_tools"]:
                continue
            chain.append((model_name, caps))
        return chain

    def get_full_chain(self):
        """Returns full chain including text-only models, for use when tools are not required."""
        return self.get_available_chain(require_tools=False)

    def supports_tools(self, model_name: str) -> bool:
        """Return whether a given model supports function calling."""
        return MODEL_REGISTRY.get(model_name, {}).get("supports_tools", False)

    def get_timeout(self, model_name: str) -> float:
        """Return configured timeout in seconds for a specific model."""
        return MODEL_REGISTRY.get(model_name, {}).get("timeout_secs", 6.0)

    # ── Status & Diagnostics ──────────────────────────────────────────────────

    def get_status(self) -> dict:
        """Returns the current status of all models (for health-check endpoints)."""
        status = {}
        for model_name, caps in MODEL_REGISTRY.items():
            status[model_name] = {
                "tier": caps["tier"],
                "supports_tools": caps["supports_tools"],
                "blocked": self.is_blocked(model_name),
                "priority": caps["priority"],
            }
        return status

    def log_model_attempt(self, model_name: str, success: bool, elapsed_ms: float, error: str = "") -> None:
        """Structured log for each model dispatch attempt."""
        status_icon = "✅" if success else "❌"
        tier = MODEL_REGISTRY.get(model_name, {}).get("tier", "?")
        if success:
            logger.info(
                f"[ZenithModelManager] {status_icon} {model_name} "
                f"[{tier}] responded in {elapsed_ms:.0f}ms"
            )
        else:
            logger.warning(
                f"[ZenithModelManager] {status_icon} {model_name} "
                f"[{tier}] FAILED in {elapsed_ms:.0f}ms — {error[:120]}"
            )


# ── Module-level singleton ─────────────────────────────────────────────────
model_manager = ZenithModelManager()
