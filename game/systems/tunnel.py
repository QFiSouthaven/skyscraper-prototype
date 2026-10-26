# tunnel.py
# Cross-dimensional communication layer between LLM agents and the player's timeline.
# Implements the "Tunneling" mechanism from the design diagram:
#   - The ONLY source of inter-timeline communication
#   - Carries physical objects + information through parallel dimensions
#   - Causes side effects: mutations, anomalies, sequential state changes

from typing import Dict, List, Any, Optional
import random

from game.state.constants import VibeType


class TunnelSystem:
    """
    Manages cross-timeline communication between LLM agents and the player's reality.

    The tunnel is the sole conduit through which influences from alternate timelines
    (represented by LLM-generated data) reach the player's timeline. Each time an
    influence passes through, it can cause side effects that manifest as:

      - **Mutations**: Entity stats/traits change unpredictably
      - **Anomalies**: Physical objects or events behave inconsistently with prior cycles
      - **Sequential State Changes**: Objects/entities shift state in chains across cycles
      - **Alternate Decisions**: Available actions and entity behaviors diverge from expected paths
      - **Parallel Shift**: After enough tunneling, the player may be teleported to a parallel universe

    Attributes:
        tunnel_depth   : Number of influences that have passed through (affects mutation chance)
        max_stable_depth : Tunneling beyond this risks parallel universe teleportation
        active_anomalies  : Currently manifesting anomaly effects in the world
        timeline_log      : History of all tunneling events for debugging/analysis
    """

    def __init__(self, game_state):
        self.game_state = game_state
        self.tunnel_depth: int = 0
        # After this many tunnelings, parallel universe risk becomes significant
        self.max_stable_depth: int = 25
        self.active_anomalies: List[Dict[str, Any]] = []
        self.timeline_log: List[Dict[str, Any]] = []

    def send_through_tunnel(self, payload: Dict[VibeType, float], source: str = "LLM") -> Dict[str, Any]:
        """
        Send a vibe influence payload through the tunnel from an alternate timeline.

        This is the primary entry point called by autonomous agents (AutonomousNPC) or
        external LLM systems to inject influences into the player's reality.

        Args:
            payload : Vibe influences to transmit (VibeType -> strength)
            source  : Origin label for logging ("LLM", "AutonomousNPC:Chen", etc.)

        Returns:
            Dict describing what happened during tunneling including any side effects triggered.
        """
        self.tunnel_depth += 1
        result = {
            "depth": self.tunnel_depth,
            "payload_delivered": dict(payload),
            "source": source,
            "side_effects": [],
            "parallel_shift": False,
        }

        # Roll for side effects based on tunnel depth (deeper = more chaotic)
        mutation_chance = min(0.1 + (self.tunnel_depth * 0.03), 0.6)
        anomaly_chance = min(0.05 + (self.tunnel_depth * 0.02), 0.4)

        if random.random() < mutation_chance:
            effect = self._trigger_mutation()
            result["side_effects"].append(effect)

        if random.random() < anomaly_chance:
            effect = self._trigger_anomaly()
            result["side_effects"].append(effect)

        # Check for parallel universe shift at extreme depths
        if self.tunnel_depth >= self.max_stable_depth and random.random() < 0.3:
            result["parallel_shift"] = True
            result["side_effects"].append(self._trigger_parallel_shift())

        # Log the tunneling event
        cycle_num = self.game_state.cycle_count
        self.timeline_log.append({
            "cycle": cycle_num,
            "source": source,
            "payload": dict(payload),
            "effects": result["side_effects"],
        })

        return result

    def _trigger_mutation(self) -> Dict[str, Any]:
        """Cause an entity's personality trait or mood to shift unpredictably."""
        effect = {
            "type": "mutation",
            "description": "",
            "target_entity": None,
            "change": {},
        }

        # Pick a random registered entity to mutate
        if not self.game_state.entities:
            return effect

        target_id = random.choice(list(self.game_state.entities.keys()))
        entity = self.game_state.entities[target_id]

        mutation_type = random.choice(["mood_shift", "trait_drift", "context_override"])

        if mutation_type == "mood_shift":
            delta = round(random.uniform(-0.5, 0.5), 2)
            entity.mood += delta
            # Clamp to documented range (-1.0 to +1.0)
            entity.mood = max(-1.0, min(1.0, entity.mood))
            effect["description"] = f"{entity.name}'s mood shifted by {delta:+} (mutation)"
            effect["change"]["mood"] = delta

        elif mutation_type == "trait_drift" and hasattr(entity, 'personality'):
            # Drift a personality trait slightly
            trait = random.choice(list(entity.personality.keys()))
            drift = round(random.uniform(-0.15, 0.15), 2)
            entity.personality[trait] = max(0.0, min(1.0, entity.personality[trait] + drift))
            effect["description"] = f"{entity.name}'s {trait} trait drifted by {drift:+}"
            effect["change"]["personality." + trait] = drift

        elif mutation_type == "context_override":
            # Randomly override a context effect
            key = random.choice(["dialogue_tone", "movement_speed"])
            values = ["hostile", "cheerful", "cautious", "despairing"] if key == "dialogue_tone" else [0.5, 1.0, 1.5, 0.8]
            entity.context_effects[key] = random.choice(values)
            effect["description"] = f"{entity.name}'s {key} was overridden to {entity.context_effects[key]}"
            effect["change"][key] = entity.context_effects[key]

        else:
            # Fallback for BaseEntity without personality
            delta = round(random.uniform(-0.3, 0.3), 2)
            entity.mood += delta
            entity.mood = max(-1.0, min(1.0, entity.mood))
            effect["description"] = f"{entity.name}'s mood shifted by {delta:+} (mutation)"
            effect["change"]["mood"] = delta

        effect["target_entity"] = target_id
        return effect

    def _trigger_anomaly(self) -> Dict[str, Any]:
        """Create a persistent anomaly that affects future cycles."""
        anomaly_types = [
            "memory_fragment",   # Entity remembers events from alternate timeline
            "object_duplication",  # A physical object appears in duplicate
            "time_echo",          # An action repeats with slight variation next cycle
            "vibe_amplification",  # Next vibe influence is amplified by 1.5x
        ]

        anomaly_type = random.choice(anomaly_types)
        anomaly = {
            "type": "anomaly",
            "kind": anomaly_type,
            "description": "",
            "persistent_cycles": 3,
        }

        if anomaly_type == "memory_fragment":
            # Add a fake past event to an entity's context
            target_id = random.choice(list(self.game_state.entities.keys()))
            entity = self.game_state.entities[target_id]
            fragment = f"recalls a conversation that never happened in this timeline"
            if not hasattr(entity, '_memory_fragments'):
                entity._memory_fragments = []
            entity._memory_fragments.append(fragment)
            anomaly["description"] = f"{entity.name} {fragment}"

        elif anomaly_type == "object_duplication":
            # Add a duplicate physical object to active_events
            item = random.choice(["key", "note", "cup", "photo", "letter"])
            self.game_state.active_events.append(f"duplicate_{item}_appeared")
            anomaly["description"] = f"A {item} appeared that shouldn't exist here"

        elif anomaly_type == "time_echo":
            # Mark the next cycle to repeat an action with variation
            if not hasattr(self, '_echo_queue'):
                self._echo_queue = []
            echo_action = random.choice(["dialogue", "movement", "decision"])
            self._echo_queue.append(echo_action)
            anomaly["description"] = f"An {echo_action} will repeat with variation next cycle"

        elif anomaly_type == "vibe_amplification":
            # Store amplification for the next influence batch
            if not hasattr(self, '_amplification_factor'):
                self._amplification_factor = 1.0
            self._amplification_factor = round(random.uniform(1.3, 2.5), 2)
            anomaly["description"] = f"Next vibe influence amplified {self._amplification_factor}x"

        # Store persistent anomalies for tracking
        self.active_anomalies.append(anomaly)
        return anomaly

    def _trigger_parallel_shift(self) -> Dict[str, Any]:
        """Teleport the player to a parallel universe — major world reset."""
        effect = {
            "type": "parallel_universe_shift",
            "description": "",
            "world_changes": {},
        }

        # Swap some entity personalities (they're from alternate versions)
        entities = list(self.game_state.entities.values())
        if len(entities) >= 2:
            e1, e2 = random.sample(entities, 2)
            if hasattr(e1, 'personality') and hasattr(e2, 'personality'):
                # Swap a trait between two entities from parallel versions
                common_traits = set(e1.personality.keys()) & set(e2.personality.keys())
                if common_traits:
                    trait = random.choice(list(common_traits))
                    e1.personality[trait], e2.personality[trait] = e2.personality[trait], e1.personality[trait]
                    effect["world_changes"]["personality_swap"] = f"{e1.name} and {e2.name} swapped {trait}"

        # Reset some vibes to different values (parallel universe has different emotional baseline)
        for vibe in list(self.game_state.vibes.keys()):
            if vibe != VibeType.NEUTRAL:
                old_val = self.game_state.vibes[vibe]
                new_val = round(random.uniform(0, 15), 2)
                self.game_state.vibes[vibe] = new_val
                effect["world_changes"][vibe.value] = f"changed from {old_val} to {new_val}"

        # Reset tunnel depth (we've shifted to a fresh timeline)
        old_depth = self.tunnel_depth
        self.tunnel_depth = 0
        self.active_anomalies.clear()

        effect["description"] = f"Player teleported to parallel universe! Tunnel reset from depth {old_depth} to 0."
        return effect

    def get_amplification_factor(self) -> float:
        """Return and consume any pending vibe amplification from anomalies."""
        if hasattr(self, '_amplification_factor'):
            factor = self._amplification_factor
            delattr(self, '_amplification_factor')
            return factor
        return 1.0

    def process_echoes(self) -> List[str]:
        """Process any time echoes queued from previous cycles."""
        if not hasattr(self, '_echo_queue'):
            return []
        echoes = list(self._echo_queue)
        self._echo_queue.clear()
        return echoes

    def describe_tunnel_state(self) -> str:
        """Generate a description of the current tunnel condition for atmosphere reporting."""
        depth_ratio = self.tunnel_depth / max(self.max_stable_depth, 1)

        if self.tunnel_depth == 0:
            return "The tunnel is dormant — no cross-dimensional influence has passed through."
        elif depth_ratio < 0.3:
            return f"A faint resonance hums in the tunnel (depth {self.tunnel_depth}). Reality feels thin."
        elif depth_ratio < 0.6:
            return f"The tunnel pulses with unstable energy (depth {self.tunnel_depth}). Minor distortions are visible."
        elif depth_ratio < 1.0:
            return f"The tunnel thrums dangerously (depth {self.tunnel_depth}/{self.max_stable_depth}). Reality warps around the edges."
        else:
            return f"CRITICAL: The tunnel is at maximum capacity (depth {self.tunnel_depth})! Parallel shift imminent!"

    def get_active_anomaly_summary(self) -> List[str]:
        """Return human-readable descriptions of currently active anomalies."""
        return [a["description"] for a in self.active_anomalies]


# Convenience function for integration with main.py simulation loop
def integrate_tunnel_into_simulation(game_state, tunnel_system: TunnelSystem):
    """
    Hook to call at the start of each cycle. Processes persistent anomalies and echoes.

    Usage in main.py:
        # Before applying player influences:
        echo_actions = tunnel.integrate_tunnel_into_simulation(game_state, tunnel)
        if echo_actions:
            print(f"[Tunnel Echo] Repeating with variation: {echo_actions}")
    """
    return tunnel_system.process_echoes()
