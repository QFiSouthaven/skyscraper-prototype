# constants.py
# Central definitions for vibe types, thresholds, and default modifiers

from enum import Enum


class VibeType(Enum):
    """Types of emotional atmosphere that can accumulate."""
    TENSE = "tense"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SUSPICIOUS = "suspicious"
    NEUTRAL = "neutral"


class VibeIntensity(Enum):
    """Levels of intensity for each vibe."""
    LOW = 1      # Subtle presence, minimal effect
    MEDIUM = 2   # Noticeable shift in tone/behavior
    HIGH = 3     # Dominant atmosphere, strong behavioral changes


# Threshold values that trigger context shifts
VIBE_THRESHOLDS = {
    VibeType.TENSE: 15,
    VibeType.HAPPY: 20,
    VibeType.SAD: 18,
    VibeType.ANGRY: 25,
    VibeType.SUSPICIOUS: 22,
}

# How much each vibe decays per cycle (to prevent runaway accumulation)
VIBE_DECAY_RATE = {
    VibeType.TENSE: 0.3,
    VibeType.HAPPY: 0.5,
    VibeType.SAD: 0.4,
    VibeType.ANGRY: 0.2,
    VibeType.SUSPICIOUS: 0.3,
}

# Base modifiers applied to entities when a vibe is active at given intensity
VIBE_MODIFIERS = {
    VibeType.TENSE: {
        VibeIntensity.LOW: {"dialogue_tone": "nervous", "movement_speed": 1.2},
        VibeIntensity.MEDIUM: {"dialogue_tone": "cautious", "movement_speed": 1.4, "alertness": True},
        VibeIntensity.HIGH: {"dialogue_tone": "panicked", "movement_speed": 1.8, "combat_ready": True},
    },
    VibeType.ANGRY: {
        VibeIntensity.LOW: {"dialogue_tone": "irritable", "trust_modifier": -0.2},
        VibeIntensity.MEDIUM: {"dialogue_tone": "hostile", "trust_modifier": -0.5, "aggression": True},
        VibeIntensity.HIGH: {"dialogue_tone": "enraged", "trust_modifier": -1.0, "attack_on_sight": True},
    },
    VibeType.SAD: {
        VibeIntensity.LOW: {"dialogue_tone": "melancholy", "movement_speed": 0.9, "empathy_boost": True},
        VibeIntensity.MEDIUM: {"dialogue_tone": "despairing", "movement_speed": 0.7, "help_desire": True},
        VibeIntensity.HIGH: {"dialogue_tone": "devastated", "movement_speed": 0.5, "withdrawal": True},
    },
    VibeType.HAPPY: {
        VibeIntensity.LOW: {"dialogue_tone": "content", "movement_speed": 1.1, "social_boost": True},
        VibeIntensity.MEDIUM: {"dialogue_tone": "cheerful", "movement_speed": 1.3, "trust_modifier": 0.3},
        VibeIntensity.HIGH: {"dialogue_tone": "elated", "movement_speed": 1.5, "trust_modifier": 0.6, "contagion_radius": True},
    },
    VibeType.SUSPICIOUS: {
        VibeIntensity.LOW: {"dialogue_tone": "guarded", "alertness": True, "share_info": False},
        VibeIntensity.MEDIUM: {"dialogue_tone": "cautious", "movement_speed": 1.2, "secretive": True},
        VibeIntensity.HIGH: {"dialogue_tone": "paranoid", "movement_speed": 0.8, "withhold_resources": True},
    },
}

# Default starting values for the player character
PLAYER_DEFAULTS = {
    "age": 0,                # Game-time age (affected by Hysteria)
    "hysteria_level": VibeIntensity.LOW.value,
    "max_age_threshold": 100,  # Age at which major lifecycle events occur
}

# Default starting vibes for a fresh game session
DEFAULT_VIBES = {vibe: 0 for vibe in VibeType}