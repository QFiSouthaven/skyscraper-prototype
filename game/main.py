# main.py
# Entry point for running the dynamic vibe-driven simulation

import sys
import os

# Ensure game/ directory is on path so 'game.*' imports resolve correctly
# This works whether running from project root ('python game/main.py') or inside game/
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)  # Add C:/Dev/Game so 'game' is importable as package

try:
    from game.state.gamestate import GameState
    from game.systems.vibe_accumulator import VibeAccumulator
    from game.systems.threshold_manager import ThresholdManager
    from game.systems.context_shifter import ContextShifter
    from game.systems.tunnel import TunnelSystem
    from game.entities.npc_agent import FatherEntity, NurseEntity, AutonomousNPC
except ImportError as e:
    print(f'Import error: {e}')
    raise


def run_simulation():
    """Main simulation loop demonstrating the feedback cycle."""
    print("=== Starting Dynamic World Simulation ===\n")

    # Initialize core state and systems
    game_state = GameState()
    accumulator = VibeAccumulator(game_state)
    threshold_manager = ThresholdManager(game_state)
    context_shifter = ContextShifter(game_state)
    tunnel = TunnelSystem(game_state)  # Cross-dimensional communication layer (Tunnel diagram)

    # Register specialized entities representing key character archetypes from the game design
    father = FatherEntity()
    nurse = NurseEntity(name="Nurse Kelly")
    autonpc = AutonomousNPC(name="Dr. Chen")  # Future LLM agent placeholder

    game_state.entities[father.id] = father
    game_state.entities[nurse.id] = nurse
    game_state.entities[autonpc.id] = autonpc

    # Define a sequence of sample player choices/influences to simulate progression
    scenario_inputs = [
        {"angry": 5},           # Player does something mildly provocative
        {"tense": 8},           # Environment grows more charged
        {"suspicious": 6},      # NPCs start noticing odd behavior
        {"angry": 12},          # Escalation – guard gets upset
        {"happy": -3},          # Attempt to calm situation backfires slightly
        {"tense": 7},           # Situation remains unstable
        {"angry": 8},           # Final push pushes into high alert territory
    ]

    print("Simulating player choices and observing world reactions...\n")

    for i, influence_batch in enumerate(scenario_inputs):
        print(f"\n--- Cycle {i+1} ---")

        # Step 1a: Autonomous NPCs act on their daily routines (future LLM agent behavior)
        if hasattr(autonpc, 'simulate_daily_routine'):
            routine_activities = autonpc.simulate_daily_routine(
                "morning" if i < 3 else ("afternoon" if i < 5 else "evening")
            )
            # Autonomous entities generate vibe influences that travel through the Tunnel
            # (LLM -> tunnel -> player timeline, per the Tunneling diagram)
            auto_influences = autonpc.generate_autonomous_influence()
            if auto_influences:
                print(f"[Autonomous] {autonpc.name} generates: {auto_influences}")
                # Send through tunnel — this may trigger mutations/anomalies
                tunnel_result = tunnel.send_through_tunnel(auto_influences, source=f'AutonomousNPC:{autonpc.name}')
                for effect in tunnel_result['side_effects']:
                    print(f"  [Tunnel {effect['type'].upper()}] {effect['description']}")
                    if effect['type'] == 'parallel_universe_shift':
                        print("  *** REALITY HAS SHIFTED TO A PARALLEL UNIVERSE ***")
                # Apply amplification from anomalies (if any were triggered)
                amp = tunnel.get_amplification_factor()
                amplified = {k: round(v * amp, 2) for k, v in auto_influences.items()}
                if amp != 1.0:
                    print(f"  [Tunnel] Influence amplified by {amp}x due to anomaly")
                    print(f"  Amplified payload: {amplified}")
                accumulator.add_influence(amplified)

            # Process any time echoes from previous tunneling events
            echo_actions = tunnel.process_echoes()
            if echo_actions:
                print(f"[Tunnel Echo] Time echo detected — repeating with variation: {echo_actions}")

        # Step 1b: Apply player choice influences to vibe accumulator
        accumulator.add_influence(influence_batch)

        # Step 2: Let vibes naturally decay a little each turn
        accumulator.apply_decay()

        # Step 3: Check if any thresholds were crossed this cycle
        crossed = threshold_manager.evaluate_shifts()

        # Step 4: Apply context shifts to world (modify entities, unlock events...)
        changed = context_shifter.apply_context_shift(crossed)

        # Step 5: Describe current atmosphere + tunnel state to player
        description = context_shifter.describe_atmosphere()
        print(f"Atmosphere Report:\n> {description}")

        # Report tunnel condition and any active anomalies
        tunnel_state = tunnel.describe_tunnel_state()
        print(f"Tunnel Status: > {tunnel_state}")
        for anomaly in tunnel.get_active_anomaly_summary():
            print(f"  [Anomaly] {anomaly}")

        # Show available actions for each entity based on updated context
        for ent_id, ent_obj in game_state.entities.items():
            actions = ent_obj.get_available_actions()
            print(f"{ent_obj.name}'s Available Actions: {actions}")

        # Advance simulation cycle counter
        game_state.advance_cycle()

    # Also send player's final influence through the tunnel for narrative closure
    final_tunnel = tunnel.send_through_tunnel({"tense": 1}, source="Player:final_choice")
    if final_tunnel['side_effects']:
        print("\n[Final Tunnel Event]")
        for eff in final_tunnel['side_effects']:
            print(f"  {eff['description']}")

    print("\n=== Simulation Complete ===")
    print("Final Vibe Levels:")
    for vibe, value in sorted(game_state.vibes.items(), key=lambda x: x[1], reverse=True):
        if isinstance(vibe, str):
            label = vibe
        else:
            label = vibe.value
        print(f"  {label}: {value:.2f}")
    risk_level = "CRITICAL" if tunnel.tunnel_depth >= tunnel.max_stable_depth else "stable"
    print("\nTunnel Depth: {}/{} (parallel shift risk: {})".format(
        tunnel.tunnel_depth, tunnel.max_stable_depth, risk_level
    ))
    print(f"Active Anomalies: {len(tunnel.active_anomalies)}")


if __name__ == "__main__":
    run_simulation()