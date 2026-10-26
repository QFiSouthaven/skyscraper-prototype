# gamestate.py
# Central shared state for the game world

from typing import Dict, List, Any, Optional
from datetime import datetime

# Absolute imports within game package — avoids dual-module loading issues
from game.state.constants import (
    VibeType,
    VibeIntensity,
    DEFAULT_VIBES,
    PLAYER_DEFAULTS,
)


class GameState:
    """
    Holds all mutable game data that both player and world systems interact with.

    Attributes:
        vibes         : Current accumulated values for each vibe type.
        thresholds_met: Which vibe thresholds have been crossed this cycle.
        active_events : List of currently triggered events based on vibes.
        entities      : Dictionary of all entities in the world (NPCs, items...).
        player_state  : Player-specific data like age and hysteria level.
        history       : Log of past choices/actions affecting vibes.
        cycle_count   : Number of simulation cycles elapsed since start.
    """

    def __init__(self):
        self.vibes: Dict[VibeType, float] = dict(DEFAULT_VIBES)
        self.thresholds_met: List[VibeType] = []
        self.active_events: List[str] = []
        self.entities: Dict[str, Any] = {}

        # Initialize player state from defaults
        self.player_state: Dict[str, Any] = {
            "age": PLAYER_DEFAULTS["age"],
            "hysteria_level": PLAYER_DEFAULTS["hysteria_level"],
            "max_age_threshold": PLAYER_DEFAULTS["max_age_threshold"]
        }

        # Track how vibes change over time for debugging/visualization
        self.history: List[Dict[str, Any]] = []

        # Simulation cycle counter (each choice/action increments this)
        self.cycle_count: int = 0

    def update_vibe(self, vibe_type: VibeType, amount: float):
        """Add to a specific vibe's accumulation value."""
        # Normalize string inputs to enum
        if isinstance(vibe_type, str):
            try:
                vibe_type = VibeType(vibe_type.lower())
            except ValueError:
                return  # Ignore unknown vibes silently

        if vibe_type in self.vibes:
            self.vibes[vibe_type] += amount
            print(f"[GameState] Updated {vibe_type.value}: now at {self.vibes[vibe_type]}")

    def get_vibe_intensity(self, vibe_type: VibeType) -> Optional[VibeIntensity]:
        """Determine current intensity level based on accumulated value."""
        from game.state.constants import VIBE_THRESHOLDS
        try:
            threshold = VIBE_THRESHOLDS[vibe_type]
        except KeyError:
            return None

        if self.vibes.get(vibe_type, 0) >= threshold * 2:
            return VibeIntensity.HIGH
        elif self.vibes.get(vibe_type, 0) >= threshold:
            return VibeIntensity.MEDIUM
        else:
            return VibeIntensity.LOW

    def log_cycle(self):
        """Record current state snapshot for later analysis/debugging."""
        self.history.append({
            "cycle": self.cycle_count,
            "timestamp": datetime.now().isoformat(),
            "vibes": dict(self.vibes),
            "thresholds_met": list(self.thresholds_met),
            "active_events": list(self.active_events)
        })

    def advance_cycle(self):
        """Move the simulation forward by one step."""
        self.cycle_count += 1
        self.log_cycle()
        print(f"[GameState] Advanced to cycle {self.cycle_count}")