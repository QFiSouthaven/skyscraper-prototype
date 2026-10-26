# vibe_registry.py
# Central registry for all vibe types, their thresholds, and decay rates.
# Supports dynamic discovery — new vibes auto-register with default values when first encountered.

from typing import Dict, Any


class VibeRegistry:
    """Thread-safe registry storing metadata for each registered vibe type."""

    # Default configuration applied to newly discovered vibes
    DEFAULT_THRESHOLD = 5.0
    DEFAULT_DECAY_RATE = 0.1

    def __init__(self):
        self._registry: Dict[str, Dict[str, float]] = {}

    def register_vibe(self, name: str) -> None:
        """Register a new vibe with default threshold and decay rate if not already present."""
        if name not in self._registry:
            self._registry[name] = {
                "threshold": self.DEFAULT_THRESHOLD,
                "decay_rate": self.DEFAULT_DECAY_RATE,
            }

    def get_threshold(self, vibe_name: str) -> float:
        """Return the threshold for a vibe. Auto-registers if missing."""
        if vibe_name not in self._registry:
            self.register_vibe(vibe_name)
        return self._registry[vibe_name]["threshold"]

    def get_decay_rate(self, vibe_name: str) -> float:
        """Return the decay rate for a vibe. Auto-registers if missing."""
        if vibe_name not in self._registry:
            self.register_vibe(vibe_name)
        return self._registry[vibe_name]["decay_rate"]

    def get_all_registered(self) -> list[str]:
        """Return all currently registered vibe names, sorted alphabetically."""
        return sorted(self._registry.keys())

    def is_registered(self, vibe_name: str) -> bool:
        """Check whether a vibe has been explicitly registered."""
        return vibe_name in self._registry


# Global singleton instance — shared across all modules
_registry = VibeRegistry()

# Initial registration of the 6 concrete vibes for psychological drama genre
for _vibe in ("anxiety", "nostalgia", "resentment", "dread", "joy", "suspicion"):
    _registry.register_vibe(_vibe)


def get_registry() -> VibeRegistry:
    """Return the global registry singleton."""
    return _registry


# ---------------------------------------------------------------------------
# VIBE_MODIFIERS Constant
# Maps each vibe to its modifier effects on player/NPC stats.
# These are applied during context shifts via ContextShifter.apply_shift().
# ---------------------------------------------------------------------------

VIBE_MODIFIERS: Dict[str, Dict[str, float]] = {
    "anxiety": {"player_stealth": -0.4, "npc_trust_base": -0.7},
    "nostalgia": {"memory_recall_chance": +0.3, "present_moment_awareness": -0.2},
    "resentment": {"dialogue_aggression": +0.5, "trust_regen_rate": -0.4},
    "dread": {"player_movement_speed": -0.3, "npc_flee_chance": +0.6},
    "joy": {"social_bonus": +0.4, "dialogue_tone_base": +0.3},
    "suspicion": {"npc_share_info_prob": -0.5, "player_stealth_detection": +0.2},
}

# ---------------------------------------------------------------------------
# Atmosphere flavor text mapping — used by ContextShifter.generate_atmosphere_text()
# ---------------------------------------------------------------------------

ATMOSPHERE_TEXT: Dict[str, list[str]] = {
    "anxiety": [
        "Tension claws at the edges of every conversation.",
        "Your palms sweat unconsciously against your thighs.",
    ],
    "nostalgia": [
        "Faint echoes of better days linger in the air.",
        "Everything reminds you of someone who's gone.",
    ],
    "resentment": [
        "Anger simmers just beneath the surface.",
        "Every word feels like a small betrayal waiting to happen.",
    ],
    "dread": [
        "A cold weight presses against your chest, as if the air itself is holding its breath.",
        "You glance over your shoulder, certain something is following — though nothing is there.",
    ],
    "joy": [
        "Light filters through in unexpected shafts; even shadows feel gentler here.",
        "Your shoulders relax without you noticing it first.",
    ],
    "suspicion": [
        "Glances are exchanged with practiced casualness — too casual, almost rehearsed.",
        "Every friendly smile seems to hide a question you can't quite place.",
    ],
}

# Fallback text for vibes without dedicated flavor entries (auto-discovered)
ATMOSPHERE_FALLBACK = [
    "Something indefinable shifts in the atmosphere...",
    "The air carries an unfamiliar weight today.",
]


def get_atmosphere_text(vibe_name: str) -> str:
    """Return a random flavor text string for the given vibe."""
    import random

    if vibe_name in ATMOSPHERE_TEXT and ATMOSPHERE_TEXT[vibe_name]:
        return random.choice(ATMOSPHERE_TEXT[vibe_name])
    return random.choice(ATMOSPHERE_FALLBACK)


def get_modifiers_for_vibe(vibe_name: str) -> dict[str, float]:
    """Return the modifier dict for a vibe. Returns empty dict if not found."""
    return VIBE_MODIFIERS.get(vibe_name, {})
