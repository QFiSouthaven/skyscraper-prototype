# vibe_accumulator.py
# Manages accumulation, decay, and threshold detection for vibes

from typing import Dict, List

# Relative imports only — no sys.path hacks needed when run as package
from game.state.constants import VibeType, VIBE_THRESHOLDS, VIBE_DECAY_RATE


class VibeAccumulator:
    """
    Tracks incoming vibe influences and manages natural decay over time.

    Methods:
        add_influence   : Add a weighted input to the accumulator.
        apply_decay     : Reduce all vibes slightly each cycle.
        check_thresholds: Return list of newly crossed thresholds.
        get_current_vibes: Accessor for current vibe levels.
    """

    def __init__(self, game_state):
        self.game_state = game_state
        self._newly_crossed: List[VibeType] = []

    def add_influence(self, influences: Dict[VibeType, float]):
        """
        Apply a batch of vibe inputs from player choice or autonomous event.

        Args:
            influences : Mapping of VibeType -> influence strength (positive/negative)
        """
        for vibe, amount in influences.items():
            if isinstance(vibe, str):
                # Allow string keys for convenience ("tense", "angry")
                try:
                    vibe = VibeType(vibe.lower())
                except ValueError:
                    continue  # Skip unknown vibes

            self.game_state.update_vibe(vibe, amount)

    def apply_decay(self):
        """Reduce all accumulated vibes by their decay rate."""
        for vibe in list(self.game_state.vibes.keys()):
            current = self.game_state.vibes[vibe]
            decay_rate = VIBE_DECAY_RATE.get(vibe, 0.5)

            # Apply proportional decay (never goes below zero unless negative input was applied)
            new_value = max(current - (current * decay_rate), 0) if current > 0 else min(current + abs(decay_rate), 0)
            self.game_state.vibes[vibe] = round(new_value, 2)

    def check_thresholds(self) -> List[VibeType]:
        """Identify which vibes have crossed their activation thresholds."""
        self._newly_crossed.clear()

        for vibe in VIBE_THRESHOLDS:
            threshold = VIBE_THRESHOLDS[vibe]
            current_level = self.game_state.vibes.get(vibe, 0)

            # Mark as crossed if we've reached medium intensity or above
            if current_level >= threshold and vibe not in self.game_state.thresholds_met:
                self._newly_crossed.append(vibe)
                self.game_state.thresholds_met.append(vibe)

        return list(self._newly_crossed)