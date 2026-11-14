# Chime Terraces — recorded aims

Seed `20261114` is provenance. It is not applied to the solver. Origin is 0 and the rail index is 1 on every shot below. Dynamics are face speed (`normal-speed`). Plates are ordinary metal. Ramps are ordinary timber.

The pitches, west to east, are:

| Row | x = −10, −6, −2, 2, 6, 10 |
| --- | --- |
| High, lift 10 m, z = 34 | A4, G4, A4, G4, G4, E4 |
| Mid, lift 6 m, z = 29 | E4, D4, G4, E4, E4, D4 |
| Low, lift 2 m, z = 24 | C4, C4, D4, C4, D4, C4 |
| Ramps, z = 16 | C4 at x = −11, E4 at x = 0, D4 at x = 11 |

Every plate tilts −15°, leaning toward the tee.

## Printed aim

Yaw 0°, elevation 18°, charge 0.55. The ball meets the two centre plates of the low row (D4 then C4, and each of them again) and leaves the yard at 2.217 s. That is not a three-note run.

## Phrase aims

These are the recorded representatives. A half-degree nudge often keeps three or more notes and changes which plates they are. Counts are how many of the six one-step nudges (yaw ±0.5°, elevation ±0.5°, charge ±0.01) still had three or more notes, and how many stayed on the same first three pieces.

| Id | Yaw | Elevation | Charge | Notes, in ear order | Nudges still 3+ | Nudges same family |
| --- | --- | --- | --- | --- | --- | --- |
| centre-climb | 0° | 8° | 0.55 | ramp E4, then high A4 and high G4 together, then mid E4 | 6 | 4 |
| centre-drop | 0° | 20° | 0.55 | mid G4 and mid E4 together, then low C4 | 4 | 4 |
| west-climb | −14° | 8° | 0.55 | ramp E4, high A4, mid E4, high A4, mid E4 | 6 | 6 |
| east-climb | 8° | 16° | 0.45 | ramp E4, high G4, mid E4 | 6 | 5 |
| east-walk | 8° | 20° | 0.65 | mid E4 and mid E4 together, then low D4 | 5 | 5 |
| near-miss | −24° | 12° | 0.35 | west ramp C4 only | — | — |

`centre-drop` is the cleanest descent on the page: two middle-row notes at the same instant, then a lower C4 about 0.23 s later. `west-climb` returns to the same two plates. `near-miss` is a single timber knock.

Terminals and contact bodies are in `worlds/foundry/chime-terraces/manifest.json`. The validator replays them. Face-speed gains, peak, and RMS for five of these shots are in `audio-manifest.json`.
