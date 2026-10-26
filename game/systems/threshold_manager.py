# threshold_manager.py
# Detects significant shifts in vibe accumulation and signals context changes

from typing import List, Dict

# Relative imports only — no sys.path hacks needed when run as package
from game.state.constants import VibeType, VIBE_THRESHOLDS, VibeIntensity


class ThresholdManager:
    """
    Monitors vibe levels and determines when significant shifts occur.

    A threshold is considered "crossed" when a vibe reaches sufficient intensity
    to warrant updating the world context (e.g., NPCs becoming angry).

    Methods:
        evaluate_shifts : Check current vibes against known thresholds.
        get_dominant_vibe: Determine which vibe currently dominates overall atmosphere.
        reset_crossings  : Clear temporary crossing flags after processing.
    """

    def __init__(self, game_state):
        self.game_state = game_state
        self.last_dominant: VibeType = VibeType.NEUTRAL

    def evaluate_shifts(self) -> List[VibeType]:
        """Check all vibes and return those that have newly crossed thresholds."""
        newly_crossed: List[VibeType] = []

        # Reset previous cycle's flags (but keep permanent unlocks if desired later)
        self.game_state.thresholds_met.clear()

        for vibe in VIBE_THRESHOLDS:
            threshold_value = VIBE_THRESHOLDS[vibe]
            current_level = self.game_state.vibes.get(vibe, 0)

            # Crossed medium intensity?
            if current_level >= threshold_value:
                newly_crossed.append(vibe)
                self.game_state.thresholds_met.append(vibe)

        return newly_crossed

    def get_dominant_vibe(self) -> VibeType:
        """Find which vibe currently holds the highest value."""
        max_vibe = VibeType.NEUTRAL
        max_value = 0.0

        for vibe, value in self.game_state.vibes.items():
            if abs(value) > max_value and vibe != VibeType.NEUTRAL:
                max_vibe = vibe
                max_value = abs(value)

        # Only update dominant if there's a clear leader above baseline
        if max_value < 1.0:
            return VibeType.NEUTRAL

        self.last_dominant = max_vibe
        return max_vibe