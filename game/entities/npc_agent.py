# npc_agent.py
# Specialized entity types representing key character archetypes from the game design

from typing import List, Dict, Any
import sys
import os

# Ensure package imports work when run as script or module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from entities.base_entity import BaseEntity
except ImportError:
    # Fallback for direct execution within game/ directory
    parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent not in sys.path:
        sys.path.insert(0, parent)
    from entities.base_entity import BaseEntity


class NPCEntity(BaseEntity):
    """
    A standard non-player character with personality traits that influence reactions.

    Personality traits determine how strongly an entity responds to different vibes.
    For example, a naturally anxious NPC might react more dramatically to 'tense' vibes,
    while someone cheerful might resist negative atmosphere shifts longer.

    Attributes:
        personality : Dict mapping trait names ('anxious', 'cheerful') to float modifiers (0.0-1.0)
        relationships : Tracks affinity with other entities by ID
    """

    def __init__(self, entity_id: str, name: str = "", tags: List[str] = None,
                 personality: Dict[str, float] = None):
        super().__init__(entity_id, name, tags)
        self.personality: Dict[str, float] = personality or {}
        # Ensure baseline traits exist if none provided
        for trait in ("anxious", "cheerful", "observant"):
            if trait not in self.personality:
                self.personality[trait] = 0.5

    def on_vibe_shift(self, crossed_vibes: List[str]):
        """Process vibe shifts with personality-modified reactions."""
        print(f"[{self.name}] Reacting to vibe shift: {', '.join(crossed_vibes)}")

        for vibe_name in crossed_vibes:
            # Personality modifiers affect reaction magnitude
            anxious_mod = self.personality.get("anxious", 0.5)
            cheerful_mod = self.personality.get("cheerful", 0.5)

            if vibe_name == "angry":
                base_reaction = -0.3 * (1 + anxious_mod)
                self.mood += base_reaction
                self.context_effects["dialogue_tone"] = "hostile"
                print(f"[{self.name}] Mood shifted by {round(base_reaction, 2)} due to anger")

            elif vibe_name == "tense":
                reaction = -0.1 * (1 + anxious_mod)
                self.mood += reaction
                self.context_effects["movement_speed"] = 1.2
                if anxious_mod > 0.7:
                    print(f"[{self.name}] Becomes visibly nervous...")

            elif vibe_name == "suspicious":
                reaction = -0.15 * (1 + cheerful_mod * 0.3)
                self.mood += reaction
                self.context_effects["dialogue_tone"] = "guarded"
                print(f"[{self.name}] Eyes narrow suspiciously")

            elif vibe_name == "happy":
                base_reaction = 0.4 * (1 + cheerful_mod)
                # Anxious personalities resist positive shifts more
                resistance = anxious_mod * 0.3
                net_reaction = base_reaction * (1 - resistance)
                self.mood += net_reaction
                self.context_effects["dialogue_tone"] = "cheerful"

            elif vibe_name == "sad":
                reaction = -0.25
                # Cheerful entities are more affected by sadness
                if cheerful_mod > 0.6:
                    reaction *= (1 + cheerful_mod)
                self.mood += reaction
                self.context_effects["movement_speed"] = 0.8

        print(f"[{self.name}] New mood level: {round(self.mood, 2)}")

    def get_available_actions(self) -> List[str]:
        """Actions depend on current context effects and personality."""
        base_actions = ["look", "wait"]

        # Dialogue actions vary based on vibe state
        dialogue_tone = self.context_effects.get("dialogue_tone")
        if dialogue_tone == "hostile":
            return base_actions + ["confront", "threaten"]
        elif dialogue_tone == "cheerful":
            return base_actions + ["talk", "befriend", "greet"]
        elif dialogue_tone == "guarded":
            return base_actions + ["probe", "wait"]

        # Default: can talk normally unless movement is impaired
        if self.context_effects.get("movement_speed") != 0.8:
            return base_actions + ["talk"]
        else:
            return base_actions


class FatherEntity(NPCEntity):
    """
    Represents the player's father character from the game design.

    Fathers tend to be more stoic — slower to react emotionally but deeper shifts once triggered.
    They're also more observant, picking up on vibe changes others might miss.
    """

    def __init__(self, entity_id: str = "father_01", name: str = "Father"):
        # Fathers are typically less anxious and moderately cheerful by default
        personality = {
            "anxious": 0.2,       # Stoic nature — doesn't panic easily
            "cheerful": 0.5,      # Balanced optimism
            "observant": 0.9,     # Picks up on subtle environmental changes
        }
        super().__init__(entity_id, name, tags=["npc", "family"], personality=personality)

    def on_vibe_shift(self, crossed_vibes: List[str]):
        """Father has delayed but amplified reactions."""
        print(f"[{self.name}] (Pauses, then responds...)")

        for vibe_name in crossed_vibes:
            if vibe_name == "angry":
                # Fathers react more strongly to anger — protective instincts
                self.mood -= 0.5
                self.context_effects["dialogue_tone"] = "stern"
                print(f"[{self.name}] 'I won't tolerate this behavior.'")

            elif vibe_name == "tense":
                # Minimal reaction to general tension unless very high
                current_anxiousness = self.personality.get("anxious", 0.2)
                if current_anxiousness > 0.5:
                    self.mood -= 0.2
                    print(f"[{self.name}] 'Something's wrong here...'")

            elif vibe_name == "sad":
                # Fathers show concern when sensing sadness in others
                self.mood -= 0.3
                self.context_effects["dialogue_tone"] = "concerned"
                print(f"[{self.name}] 'You've been quiet lately.'")

            elif vibe_name == "happy":
                # Rarely cheerful, but when he is it's genuine
                self.mood += 0.3
                self.context_effects["dialogue_tone"] = "proud"

        print(f"[{self.name}] New mood level: {round(self.mood, 2)}")


class NurseEntity(NPCEntity):
    """
    Represents a healthcare worker from the game design.

    Nurses are naturally caring but can become overwhelmed in hostile environments.
    They're highly observant and respond quickly to patient distress signals.
    """

    def __init__(self, entity_id: str = "nurse_01", name: str = "Nurse"):
        personality = {
            "anxious": 0.6,       # Caring but prone to worry about others
            "cheerful": 0.7,      # Generally optimistic despite stress
            "observant": 0.95,    # Trained to notice subtle changes in people/environment
        }
        super().__init__(entity_id, name, tags=["npc", "medical"], personality=personality)

    def on_vibe_shift(self, crossed_vibes: List[str]):
        """Nurses react quickly and empathetically to vibe shifts."""
        print(f"[{self.name}] (Looks up from chart, concerned...)")

        for vibe_name in crossed_vibes:
            if vibe_name == "angry":
                # Nurses try to de-escalate but may become defensive themselves
                self.mood -= 0.25
                self.context_effects["dialogue_tone"] = "trying_to_help"
                print(f"[{self.name}] 'Let's take a breath and talk about this.'")

            elif vibe_name == "tense":
                # Highly reactive to tension — scans environment for threats/problems
                self.mood -= 0.2
                self.context_effects["dialogue_tone"] = "alert"
                print(f"[{self.name}] Glances around the room nervously")

            elif vibe_name == "suspicious":
                # Becomes cautious about sharing information or resources
                self.mood -= 0.15
                self.context_effects["dialogue_tone"] = "cautious"
                print(f"[{self.name}] Holds back slightly...")

            elif vibe_name == "happy":
                # Brightens visibly — contagious optimism
                self.mood += 0.35
                self.context_effects["dialogue_tone"] = "warm"
                print(f"[{self.name}] Smiles and pats your shoulder")

            elif vibe_name == "sad":
                # Empathetic response — wants to help but may get drained
                self.mood -= 0.35 * (1 + self.personality.get("anxious", 0.6))
                self.context_effects["dialogue_tone"] = "sympathetic"
                print(f"[{self.name}] 'Are you feeling alright? Let me check...'")

        print(f"[{self.name}] New mood level: {round(self.mood, 2)}")


class AutonomousNPC(NPCEntity):
    """
    An NPC governed by autonomous behavior logic (future LLM-agent integration point).

    This class represents the "Backend Logic" swimlane from your diagram — entities that
    have internal routines and decision matrices driving their actions independently of player input.

    For now, it simulates basic daily rhythms but is structured to accept real AI agent backends later.
    """

    def __init__(self, entity_id: str = "autonpc_01", name: str = "Autonomous Being"):
        personality = {
            "anxious": 0.4,       # Moderate baseline anxiety from existence uncertainty
            "cheerful": 0.5,      # Neutral optimism
            "observant": 0.7,     # Pays attention to environmental cues
        }
        super().__init__(entity_id, name, tags=["npc", "autonomous"], personality=personality)

        # Daily routine state (will be driven by actual agent logic in future versions)
        self.current_activity: str = "idle"
        self.daily_schedule: Dict[str, List[str]] = {
            "morning": ["wake_up", "check_environment", "plan_day"],
            "afternoon": ["work_on_task", "interact_with_others", "rest"],
            "evening": ["reflect_on_day", "prepare_for_rest", "sleep"]
        }

    def simulate_daily_routine(self, time_of_day: str = "morning"):
        """Advance through a simulated daily routine."""
        activities = self.daily_schedule.get(time_of_day, ["idle"])
        print(f"[{self.name}] Starting {time_of_day} routine...")

        for activity in activities:
            self.current_activity = activity
            print(f"  -> Doing: {activity}")

            # Each activity generates minor vibe influences (stubbed for now)
            if activity == "check_environment":
                print("    Scanning atmosphere... no major shifts detected.")
            elif activity == "interact_with_others":
                print("    Engaging with nearby entities...")
            elif activity == "reflect_on_day":
                # Reflection can amplify existing moods
                if self.mood < -0.3:
                    print("    Feels burdened by recent events.")

        return activities

    def generate_autonomous_influence(self) -> Dict[str, float]:
        """Generate vibe influences based on current state and activity (stubbed)."""
        # Placeholder — real implementation would use LLM agent decision-making
        base_influences: Dict[str, float] = {}

        if self.current_activity == "interact_with_others":
            mood_factor = max(-0.5, min(0.5, self.mood))  # Clamp between -0.5 and +0.5
            base_influences["tense"] = abs(mood_factor) * 0.3

        return base_influences