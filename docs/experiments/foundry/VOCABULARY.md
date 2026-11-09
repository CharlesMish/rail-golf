# Foundry vocabulary

What Worldcraft can place on `lab/wc-foundry-20261109`, cut from `46e59a781722081546457086e1d87a7d2e8f7453`. This page audits the validated catalog. It does not add prefabs.

The enforced numbers live in `lib/worldcraft-model.js` and `lib/worldcraft-range.js`. `WORLDCRAFT_GRID` also names a 1 m coarse step and a 15° coarse turn. The validator and the editor do not use those two fields. Position is 0.5 m. Turn is 5°.

## Placeable pieces

A world holds at most 12 pieces. Each piece is a catalog box. There is no scale, no height offset, and no second pitch. Friction and restitution are the catalog numbers. A document cannot change them.

| Kind | Size (width × height × depth) | Centre height | Pitch | Friction | Restitution | Voice |
| --- | --- | --- | --- | --- | --- | --- |
| Bank | 12 × 7 × 1 m | 3.5 m | 0° | 0.18 | 0.86 | Optional. Metal or timber, scale degree 0–4. |
| Ramp | 10 × 0.8 × 10 m | About 2.1 m | Fixed −20° | 0.18 | 0.86 | Optional, same scale. |
| Block | 6 × 4 × 5 m | 2 m | 0° | 0.8 | 0.1 | None. A dull block cannot ring. |
| Plate | 4 × 4 × 0.35 m | 2 m | 0° | 0.18 | 0.86 | Required. Same scale as a bank. |

Voice is sound only. It does not change the flight.

Placement: x from −30 m to 30 m, z from 10 m to 96 m, both on a 0.5 m grid. Yaw from −180° to 175°, step 5°. The whole footprint must sit in that yard, must miss the other pieces, and must miss the launcher corridor (x −12..12 m, z −8..10 m). Launcher x is −10..10 m, step 0.5 m. The carriage stays at z 0. It does not add speed.

## What a preset can lock

A range preset compiles into a v1 world. `launcher.fixed: true` locks origin, yaw, elevation, and charge. `launcher.fixed: false` with no window leaves aim inside the rail stops: yaw −70°..70°, elevation 5°..85°, charge 0..1. The editor steps yaw and elevation by 0.5° and charge by 0.01. The shot validator does not snap to those steps, so an imported shot can sit between detents. A player using the sliders cannot.

`originFixed` and `window` are the Back Pocket shape. The window is enforced on the controls and on the shot. A window does not have to sit on the 0.5° grid.

`fixed` is the list of piece ids that Build cannot move. `allowance` counts movable pieces of each kind, not the locked ones. A kind with no allowance cannot be added. The plate button appears only when the allowance names `plate`.

## Goals

| Kind | What it asks | Score |
| --- | --- | --- |
| `none` | Nothing. First ground still ends the line. | Never. |
| `first-ground-zone` | The round's centre at first ground is inside a circle. Radius 0.5–5 m. The circle is stored as the pin and again as the goal, and the two must match. | The clear flag is not a production score. |
| `target-contact` | Any ledger contact with the named target before the line ends. | The hit flag is not a production score. |
| `contact-phrase` | Resonant degrees in order, 2–4 notes. An optional stand-in is a separate hit. | Never. |

First ground ends the line. A later bounce, a rest, or a second landing is not play.

## Specialized mechanisms already on this branch

These are not palette buttons.

- Stand-in. A 1.1 × 2.3 × 0.8 m box, dull-block coefficients. Used by the orc target and by a phrase stand-in. The player cannot place a second one.
- Travelling bell. A lathe hull, height 2.4 m, skirt radius 0.75 m, dull-block coefficients. It shuttles a straight segment of 2–8 m at 0.25–2 m/s. Release phase is not part of the world identity. The bell is the only moving collider on this branch.

## Presets, and what the player can edit

| Preset | Launcher | Geometry the player can change | Goal |
| --- | --- | --- | --- |
| Fixed Shot Workshop | Fixed | Ramp, bank, plate, including voice | None |
| Musical Workshop | Origin, yaw, elevation, power | Ramp, bank, plate, including voice | None |
| Back Pocket | Origin fixed. Yaw −60..60, elevation 8..26, charge 0.30..0.90 | One spare bank | Circle behind the screen |
| Soft Landing | Origin, yaw, elevation, power | One block, one bank | Circle |
| Resonant Run: Free | Fixed | Ramp, bank, plate, including voice | None |
| Resonant Phrase | Fixed | Ramp, bank, plate, including voice | Phrase, plus a fixed stand-in |
| Travelling Bell | Fixed. Release phase is the lever | Nothing. Ramp, bank, and shield are fixed | Contact with the bell |

House Shot and Orc Stand-in are v1 worlds, not foundry files. House Shot locks the rail and the pin. Orc Stand-in locks the rail, the shield, and the stand-in.

## What this vocabulary cannot express

- A vertical shaft, a roof you land on, or a second floor. Pieces have no height field. The ground is one plane.
- A stepped descent. The ramp pitch is frozen at −20°. Timber Courtyard's lumber treads are not in this catalog.
- A long carry like Across the Yard. That landing is near 146 m. Worldcraft z stops at 96 m.
- A second tee, an elevated tee, or a station that faces somewhere other than down the yard. The carriage yaw is 0.
- A moving target that is not the straight bell shuttle. No pendulum. No turntable on this branch.
- Curved walls, wedges other than the one ramp, meshes, scale, or a piece taller than the 7 m bank.
- Play that continues after first ground.
- A solution that lives between the editor's 0.5° aim steps, if the player is meant to find it with the sliders.

Timber Courtyard is authored in code (`lib/courtyard.js`, `lib/courtyard-scene.js`), not in a worldcraft document. One yard holds three challenges, more than one station, a mill, lumber, a gantry, and a skip pad. Those colliders and the unlock record are not available to a foundry file. A foundry world does not need that machinery to have its own name.

## Knife-edge authoring risk

Back Pocket family 2 clears inside about 0.081° of yaw. The editor yaw step is 0.5°. That landing is not a route the controls can sit on. The record is `docs/experiments/range/REPORT.md` and `docs/experiments/range/back-pocket.md`.

On the Travelling Bell solution layout, yaw −0.5°, +1°, and −1° remove the coarse phase windows. The catalog opening misses at every coarse phase. The record is `docs/experiments/range/travelling-bell.md`. A narrow band is a feasibility result. It is a poor default challenge.

## Clockwork turntable, not imported

`lab/wc-range-clockwork-20261025` at `3aede12c35154352b444ec65d41395011b9b8b1b` adds a wooden figure on a horizontal circle. It reuses the bell's kinematic driver. The collider does not spin. The branch was cut from the integrated range, not from this polish tip, and its note is `docs/experiments/range/clockwork-gallery.md` on that branch.

This foundry branch does not import it. A later lane that wants the mechanism would port the motion kind `turntable` (centre, radius, period, direction, collider yaw), the per-step `setTargetTransform`, path clearance, one preset, and the existing clockwork tests. Projectile mass, radius, gravity, charge mapping, restitution, and first-ground termination stay as they are. The catalog opening on that branch misses on all 320 coarse phases. The on-path layout that does hit is a different locked world, and it should not become the default by being copied in silently.
