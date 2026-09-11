# Timber Courtyard v0.1 — first playable slice

A mill and working yard share one play space: two angled timber banks in front,
lumber stacks along the right, a mill and saw carriage to the left, and a bell gantry
beyond the far landing. The ground stays level in this first slice.

## Play and progression

Use `/courtyard`, accessible from the practice-range brief. Across the Yard is open
first. A normal first-kiss target landing unlocks Switchback Gallery; mastery is not
required for progression. Progress uses its own device-local storage key. Restore
line remains per challenge. Returning to the practice range preserves its records.

The gallery's stamp requires **A → B → landing** in one stroke. Reversing the banks,
hitting A twice, or combining achievements from separate attempts does not qualify.
Targets, bank volumes and wall rotations live in `lib/courtyard.js`; the renderer
and grounded Havok fixture both use `lib/courtyard-scene.js`. Rotated wall evidence
uses a swept sphere in the wall's local frame. Havok provides the physical reflection;
there is no assisted velocity redirect, trajectory preview or auto-aim.

## QA reference lines (not shown or precharged in the game)

Rail indices below are zero-based.

| Challenge | Rail | Yaw | Elevation | Charge | Expected |
| --- | --- | --- | --- | --- | --- |
| Across the Yard | 1 | 0° | 42° | 0.89 | ACE at roughly 146 m |
| Switchback Gallery | 0 | −1° | 25° | 0.90 | BANK A → BANK B → target |

Long-shot checks cover charges 0.87, 0.89 and 0.91. Gallery checks cover the nine
combinations of yaw −2°, −1°, 0° and charge 0.85, 0.90, 0.95. Each asserts real
collisions against both physical bank bodies, with evidence below the top edge.
The fixture includes the mill, carriage, lumber and gantry colliders, not just the
abstract scoring boxes. Mobile camera projection/occlusion checks cover both target
centres and beacons from all three rails at the opening poses.

## Sound changes

A short landing impact now sounds on the locked physics event. A successful result
chord sounds when the card appears after the theatre hold. A mechanism-only miss no
longer plays a second explosion for an earlier bank or breach. The context requests
interactive latency, the master gain silences existing tails on mute, and finished
oscillators/buffers disconnect. Hardware/Bluetooth latency and subjective mix quality
remain listening checks, not claims established by source inspection.

## Next iteration

Playtest the carry, bank camera turn and mobile target labels before adding more
mechanisms. A six-challenge course can reuse this yard from several authored stations.
Unlock stations with ordinary clears. Shooting to a station can later be an optional
shortcut/discovery objective, without making travel a repeated failure penalty.
Height needs explicit landing-surface authority; a hinge needs resettable physical
state. Neither is silently approximated here. No moving machinery is implemented yet.
