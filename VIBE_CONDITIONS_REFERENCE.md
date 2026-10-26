# Vibe Conditions in the State Machine Framework

## Diagram Overview (UML State Machine)

Your mxGraphModel diagram defines a state machine for vibe-driven entity behavior:

```
┌──────────────────────────────────────────┐  ← Swimlane "State1"
│ State1                                   │      [invariant1]
│ <<extended/final>>                       │
│                                          │
│   ┌──────────────┐                      │  ← Container (cell id=3)
│   │    State2    │                      │     Nested sub-state (cell id=4)
│   └──────────────┘                      │
│                                          │
│   ──────────────────────────────────      │  ← Separator line (cell id=5)
│   behavior1                              │  ← Behavior label (cell id=6)
│   ──────────────────────────────────      │  ← Separator line (cell id=7)
│   transition1                            │  ← Transition label (cell id=8)
└──────────────────────────────────────────┘
```

## Element-to-Code Mapping

| Diagram Element | Concrete Implementation | Code File / Line |
|---|---|---|
| **State1** (`<<extended/final>>`) | System is in an extended vibe-driven state — at least one active vibe has crossed its threshold and persists across cycles with decay. `<<final>>` = terminal narrative branch (e.g., attack_on_sight). | `constants.py` VIBE_THRESHOLDS + `gamestate.py` get_vibe_intensity() |
| **State2** (nested) | A specific vibe at MEDIUM intensity — crossed base threshold but not yet 2x HIGH tier. Primary active state where context shifts take effect. | `VIBE_MODIFIERS[vibe][MEDIUM]` entries in constants.py |
| **[invariant1]** | Boolean guard: "stay in State1 while this vibe remains >= its activation threshold." If the vibe decays below threshold, invariant breaks → transition out. | `threshold_manager.py` evaluate_shifts() — clears and re-evaluates thresholds_met each cycle |
| **behavior1** | Entry/do/exit actions executed while in state: push modifier dicts onto entities + call entity on_vibe_shift(). This is the behavior block that fires when entering State2. | `context_shifter.py` apply_context_shift() → _update_entities() |
| **transition1** | How system leaves State1 or shifts between sub-states. Two trigger mechanisms: (a) explicit threshold crossing, (b) dominant vibe change detected without explicit crossing. | `threshold_manager.py` evaluate_shifts() + get_dominant_vibe(); `context_shifter.py` _dominant_changed() |

## Vibe Condition Implementation Status

All five active vibes now have complete modifier tables across all intensity levels:

| Vibe | Threshold | Decay Rate | LOW Modifiers | MEDIUM Modifiers | HIGH Modifiers | Entity Reactions | Atmosphere Text |
|---|---|---|---|---|---|---|---|
| **ANGRY** | 25 | 0.2 | irritable, trust-0.2 | hostile, trust-0.5, aggression | enraged, trust-1.0, attack_on_sight | All entities (Father: -0.5 stern; Nurse: de-escalation) | "anger simmers..." |
| **TENSE** | 15 | 0.3 | nervous, speed+1.2 | cautious, speed+1.4, alertness | panicked, speed+1.8, combat_ready | All entities react with movement/anxiety changes | "tightness in the air" |
| **SAD** | 18 | 0.4 | melancholy, speed-0.9, empathy_boost | despairing, speed-0.7, help_desire | devastated, speed-0.5, withdrawal | Nurse (sympathetic), Father (concerned) | "heavy silence hangs about" |
| **HAPPY** | 20 | 0.5 | content, speed+1.1, social_boost | cheerful, speed+1.3, trust+0.3 | elated, speed+1.5, trust+0.6, contagion | NPCEntity + Nurse (warm); Father resistant (proud) | "warm energy pulses through" |
| **SUSPICIOUS** | 22 | 0.3 | guarded, alertness, no sharing | cautious, speed+1.2, secretive | paranoid, speed-0.8, withhold_resources | NPCEntity + Nurse (cautious); Father ignores | "eyes dart nervously" |

## How to Use Vibe Conditions in the Game Loop

### Step 1: Player/Autonomous Action Generates Influence
```python
# From main.py — player choice or autonomous NPC behavior
influence_batch = {"angry": 5, "tense": 3}
accumulator.add_influence(influence_batch)
```
→ Calls `GameState.update_vibe()` for each vibe → accumulates in `game_state.vibes`

### Step 2: Decay Applied Each Cycle
```python
# From VibeAccumulator.apply_decay()
for vibe in game_state.vibes:
    decay_rate = VIBE_DECAY_RATE.get(vibe, 0.5)
    new_value = max(current - (current * decay_rate), 0) if current > 0 else ...
```
→ Implements the `<<extended>>` aspect — values persist and fade over time

### Step 3: Threshold Evaluation Detects State Transitions
```python
# From ThresholdManager.evaluate_shifts()
for vibe in VIBE_THRESHOLDS:
    threshold = VIBE_THRESHOLDS[vibe]       # e.g., ANGRY=25
    current = game_state.vibes.get(vibe, 0)  # e.g., 30.0

    if current >= threshold:
        newly_crossed.append(vibe)          # Transition trigger!
```
→ This is your `transition1` — entering State1/State2 when invariant holds

### Step 4: Context Shift Applies Behaviors to Entities
```python
# From ContextShifter.apply_context_shift()
for vibe in effective_vibes:
    intensity = game_state.get_vibe_intensity(vibe)   # LOW/MEDIUM/HIGH
    modifiers = VIBE_MODIFIERS.get(vibe, {}).get(intensity, {})

    if modifiers:
        for key, value in modifiers.items():
            print(f"  - {key}: {value}")   # behavior1 actions pushed to entities
```
→ This is your `behavior1` — entity reactions and stat modifications applied

### Step 5: Entity Reactions Execute (on_vibe_shift)
Each entity class implements personality-specific responses:

- **NPCEntity**: Scales reaction magnitude by anxious/cheerful/observant traits
- **FatherEntity**: Stoic (-0.2 anxious); strong anger response (-0.5 stern), protective on sad, proud on happy; ignores suspicious
- **NurseEntity**: Empathetic (-0.6 anxious, 0.7 cheerful); de-escalates anger ("Let's take a breath"), becomes sympathetic on sadness
- **AutonomousNPC**: Inherits NPCEntity reactions; future LLM agent integration point

### Step 6: Atmosphere Description (Output to Player)
```python
# From ContextShifter.describe_atmosphere()
dominant = threshold_manager.get_dominant_vibe()   # Highest absolute value vibe
return ATMOSPHERE_TEXTS[dominant]                  # e.g., "anger simmers just beneath the surface"
```

## Concrete Example: ANGRY Crosses Threshold (Cycle 1 of Simulation)

Given input `{"angry": 5}` in cycle 1, after accumulation and decay:
- `ANGRY` reaches ~4.0 → below threshold (25), so no explicit crossing
- But `_dominant_changed()` returns True (NEUTRAL → ANGRY as highest value)
- System still applies context shift via dominant-change path

When `{"angry": 12}` is applied in cycle 4:
- `ANGRY` reaches ~15.46 → below threshold but closest to crossing
- Dominant stays ANGRY, no new transition triggered (already active)

The simulation needs larger inputs or more cycles to reach actual threshold crossings — this is by design for gradual atmosphere building.

## Remaining Gaps and Recommendations

### 1. Missing Entity Reaction Coverage
- **FatherEntity** has no branch for `suspicious` — falls through silently in on_vibe_shift()
  - *Fix*: Add `elif vibe_name == "suspicious": self.mood -= 0.2; self.context_effects["dialogue_tone"] = "watchful"`

### 2. Mood Value Bounds Not Enforced
- Documented range is -1.0 to +1.0, but no clamping exists — mood can go arbitrarily negative with stacked vibe shifts
  - *Fix*: Add `self.mood = max(-1.0, min(1.0, self.mood))` at end of each on_vibe_shift()

### 3. Duplicate ThresholdManager Instances
- main.py creates one ThresholdManager; ContextShifter.__init__ creates another — independent last_dominant state can diverge
  - *Fix*: Pass the shared instance to ContextShifter instead of creating internally, or use a single source of truth in GameState

### 4. Modifier Application Is Cumulative Per-Cycle
- When multiple vibes are active, ALL crossed thresholds get their modifiers applied each cycle (not just newly-crossed ones)
  - This means if ANGRY and TENSE are both above threshold, both modifier sets apply simultaneously — the last one wins for shared keys like dialogue_tone

### 5. NEUTRAL Vibe Has No Threshold or Decay Entry
- Listed in enum but missing from VIBE_THRESHOLDS and VIBE_DECAY_RATE — handled via .get() fallbacks but should be explicit if intended as a real condition