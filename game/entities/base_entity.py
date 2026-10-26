# base_entity.py
# Foundation for any actor or object affected by vibe shifts

from typing import Dict, Any, List


class BaseEntity:
    """
    Represents anything in the world that can respond to changing vibes.

    Subclasses should override `on_vibe_shift()` to implement custom reactions
    such as altering dialogue trees, movement patterns, or available actions.

    Attributes:
        id   : Unique identifier for referencing this entity elsewhere.
        name : Display label used in logs/UI.
        mood : Internal emotional state influenced by vibe shifts.
        tags : Optional metadata (e.g., ['npc', 'hostile']).
    """

    def __init__(self, entity_id: str, name: str = "", tags: List[str] = None):
        self.id = entity_id
        self.name = name or entity_id
        self.mood: float = 0.0          # Ranges from -1.0 (very negative) to +1.0 (positive)
        self.tags: List[str] = tags or []
        self.context_effects: Dict[str, Any] = {}

    def on_vibe_shift(self, crossed_vibes: List[str]):
        """Called whenever the world's vibe field changes significantly."""
        print(f"[{self.name}] Reacting to vibe shift: {', '.join(crossed_vibes)}")

        # Simple example reaction logic – subclasses can expand this
        for vibe_name in crossed_vibes:
            if vibe_name == "angry":
                self.mood -= 0.3
                self.context_effects["dialogue_tone"] = "hostile"
            elif vibe_name == "tense":
                self.mood -= 0.1
                self.context_effects["movement_speed"] = 1.2
            elif vibe_name == "happy":
                self.mood += 0.4
                self.context_effects["dialogue_tone"] = "cheerful"
            else:
                # Neutral or unhandled vibes have minor effects
                pass

        print(f"[{self.name}] New mood level: {round(self.mood, 2)}")

    def get_available_actions(self) -> List[str]:
        """Return list of possible interactions given current context."""
        base_actions = ["look", "talk", "wait"]
        # Modify based on vibe effects
        if self.context_effects.get("dialogue_tone") == "hostile":
            return [a for a in base_actions if a not in ("talk",)] + ["confront"]
        elif self.context_effects.get("dialogue_tone") == "cheerful":
            return base_actions + ["befriend"]

        return base_actions