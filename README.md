# Game Project

A dynamic vibe-driven world simulation where player choices continuously reshape the emotional atmosphere ("vibes") of the game world, which in turn affects what options and interactions are available.

## Core Concept

This isn't a traditional goal-based game — instead, every action ripples through a **Vibe Condition Engine** that modulates how entities behave, what events occur, and what choices become possible. Nothing is permanently good or bad; everything just shifts the ambient emotional texture over time.

### How It Works
1. Player makes a choice (or NPC acts autonomously)
2. That input flows into the **Vibe Accumulator** which tracks ongoing influence
3. Vibes naturally decay each cycle to prevent runaway accumulation
4. The **Threshold Manager** detects when vibe levels cross significant boundaries
5. The **Context Shifter** applies behavioral changes to all entities based on current vibes
6. World re-renders with updated atmosphere descriptions and available actions

## Project Structure

```
/game/
├── main.py                      # Entry point - runs the simulation loop
├── README.md                    # This file
│
├── state/                       # Core shared game state
│   ├── constants.py             # Vibe types, thresholds, decay rates, modifiers
│   └── gamestate.py             # Central mutable state container
│
├── systems/                     # Major subsystems handling core loops
│   ├── vibe_accumulator.py      # Collects and tracks influence over time + applies decay
│   ├── threshold_manager.py     # Detects when vibe levels cross critical points
│   └── context_shifter.py       # Modifies active entities/events based on current vibes
│
├── entities/                    # Everything that responds to world state
│   └── base_entity.py           # Base class for actors/objects affected by vibes
│
└── utils/                       # Helper utilities (placeholder)
```

## Running the Simulation

From the project root (`C:/Dev/Game`):

```bash
python game/main.py
```

This runs a sample scenario showing 7 cycles of player choices and how they affect:
- Vibe accumulation levels over time
- Atmosphere descriptions ("anger simmers", "tightness in the air")
- NPC mood shifts and available interaction options

## Key Concepts Explained

### Vibes vs Thresholds vs Context Shifts
- **Vibes**: Continuous values (like meters) that accumulate from player/NPC actions. Examples: angry, tense, suspicious, happy, sad
- **Thresholds**: Predefined levels at which a vibe becomes significant enough to matter. When crossed, they trigger context changes
- **Context Shifts**: Actual modifications applied to entities — changing dialogue tones, movement speeds, available actions (e.g., "talk" → "confront")

### Entity Reactions
Entities implement an optional `on_vibe_shift()` method that lets them react dynamically:
```python
class BaseEntity:
    def on_vibe_shift(self, crossed_vibes):
        for vibe_name in crossed_vibes:
            if vibe_name == "angry":
                self.mood -= 0.3
                self.context_effects["dialogue_tone"] = "hostile"
```

## Extending the System

### Adding New Vibe Types
1. Add new member to `VibeType` enum in `constants.py`
2. Define threshold and decay rate values
3. (Optional) Add specific modifiers for that vibe at each intensity level

### Entity Archetypes Included
The project includes several pre-built character types based on your game design diagrams:

| Class | Description |
|-------|-------------|
| `BaseEntity` | Foundation class for all actors. Implements basic vibe reactions and action selection. |
| `NPCEntity` | Standard NPC with personality traits (anxious/cheerful/observant) that modify reaction intensity. |
| `FatherEntity` | Stoic character — slower to react but deeper emotional shifts once triggered. Protective of family. |
| `NurseEntity` | Healthcare worker — highly empathetic and observant, tries to de-escalate conflict. Becomes concerned by sadness. |
| `AutonomousNPC` | Placeholder for future LLM-agent integration. Simulates daily routines (wake up → check environment → plan day) and can generate autonomous vibe influences. |

### Creating Custom Entities
Subclass `NPCEntity` or `BaseEntity` and override:
- `on_vibe_shift()` — implement personality-specific reactions to vibe changes
- `get_available_actions()` — define what players can do with this entity given current context
- Personality traits (`anxious`, `cheerful`, `observant`) automatically scale reaction magnitudes

### Plugging in Real LLM Agents
The architecture is designed so that autonomous NPC behavior (the "Backend Logic" swimlane from the original diagram) can be added later as a new system that generates vibe influences based on simulated daily routines and decision matrices.

## Design Notes

- Built with Python for rapid iteration and flexibility
- All imports use absolute package paths (`game.*`) to avoid module duplication issues
- Vibe decay prevents stale atmosphere states from persisting indefinitely
- Neutral starting state ensures no inherent bias toward "good" or "bad" outcomes