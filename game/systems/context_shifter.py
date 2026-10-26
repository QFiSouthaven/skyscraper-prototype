# context_shifter.py
# Applies environmental and behavioral changes based on detected vibe shifts

from typing import List, Dict, Any

# Relative imports only — no sys.path hacks needed when run as package
from game.state.constants import VibeType, VibeIntensity, VIBE_MODIFIERS


class ContextShifter:
    """
    Transforms world elements based on current vibe conditions.

    When thresholds are crossed or dominant vibes shift, this system updates:
        - NPC behavioral parameters (dialogue tone, aggression levels...)
        - Available event triggers
        - Scene atmosphere descriptors visible to the player

    Methods:
        apply_context_shift : Main entry point called after threshold evaluation.
        _update_entities     : Push modified stats onto all registered entities.
        describe_atmosphere  : Generate human-readable summary of current vibe field.
    """

    def __init__(self, game_state):
        from .threshold_manager import ThresholdManager
        self.game_state = game_state
        self.last_dominant = VibeType.NEUTRAL
        self.last_description: str = ""
        # Pre-create threshold manager to avoid circular imports in _dominant_changed()
        self._tm = ThresholdManager(game_state)

    def apply_context_shift(self, crossed_thresholds: List[VibeType]):
        """Apply modifications to world state based on newly triggered vibes."""
        # Build effective list of vibes that should trigger context changes
        effective_vibes = list(crossed_thresholds)
        dominant_changed = self._dominant_changed()  # Store result – calling twice would reset internal state

        if not effective_vibes and not dominant_changed:
            # No significant change this cycle – do nothing
            return False

        print("[ContextShifter] Applying context shift due to vibe changes...")

        # If dominant changed but no explicit thresholds crossed, use the dominant as the trigger
        if not effective_vibes and dominant_changed:
            effective_vibes.append(self.last_dominant)

        for vibe in effective_vibes:
            intensity = self.game_state.get_vibe_intensity(vibe) or VibeIntensity.LOW
            modifiers = VIBE_MODIFIERS.get(vibe, {}).get(intensity, {})

            if modifiers:
                print(f"  -> Applying {vibe.value} ({intensity.name}) modifiers:")
                for key, value in modifiers.items():
                    print(f"    - {key}: {value}")

        # Update all entities with current vibe context
        self._update_entities(effective_vibes)

        return True

    def _dominant_changed(self) -> bool:
        """Check if the dominant vibe has switched since last update."""
        current_dominant = self._tm.get_dominant_vibe()
        changed = (current_dominant != self.last_dominant)
        self.last_dominant = current_dominant
        return changed

    def _update_entities(self, crossed_thresholds: List[VibeType]):
        """Push updated context info to all entities in the world."""
        for entity_id, entity_obj in self.game_state.entities.items():
            try:
                # Call optional update hook if implemented by entity
                if hasattr(entity_obj, 'on_vibe_shift'):
                    crossed_names = [v.value for v in crossed_thresholds]
                    entity_obj.on_vibe_shift(crossed_names)
            except Exception as e:
                print(f"  ⚠️ Error updating {entity_id}: {e}")

    def describe_atmosphere(self) -> str:
        """Generate a short text description of the current vibe atmosphere."""
        dominant = self._tm.get_dominant_vibe()

        if dominant == VibeType.NEUTRAL:
            desc = "The air feels still and unremarkable."
        elif dominant == VibeType.TENSE:
            desc = "There's a tightness in the air - everyone seems watchful."
        elif dominant == VibeType.HAPPY:
            desc = "A warm energy pulses through the space; spirits feel lifted."
        elif dominant == VibeType.SAD:
            desc = "Heavy silence hangs about, weighing down movements and words."
        elif dominant == VibeType.ANGRY:
            desc = "Raw tension crackles visibly - anger simmers just beneath the surface."
        elif dominant == VibeType.SUSPICIOUS:
            desc = "Eyes dart nervously; trust feels thin in this place."
        else:
            desc = "Something indefinable shifts in the atmosphere..."

        self.last_description = desc
        return desc