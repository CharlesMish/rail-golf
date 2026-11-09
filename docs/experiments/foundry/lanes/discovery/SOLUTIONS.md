# Right Angle — measured shots

This file is the solution appendix. The gallery invitation does not include these aims.

Preset `worlds/foundry/right-angle/preset.json`. Banks fixed. Launcher free. Goal none.

| Piece | Kind | x | z | Yaw | Voice |
| --- | --- | --- | --- | --- | --- |
| `back-face` | bank | 16 | 28.5 | 0° | timber, degree 0 |
| `side-face` | bank | 22.5 | 22 | 90° | metal, degree 2 |

The back face runs across the yard. The side face runs toward the carriage along its right end. They meet at a right angle. From the carriage, that corner sits up and to the right.

Seed 20261109. Havok, 120 Hz, substep 1000/120. The seed is not applied to the solver. Physics files were not edited.

## Opening

Origin 0, yaw 0°, elevation 18°, charge 0.55. No bank contact. First ground at 1.6416666666666633 s, position `[0, 0.43000003695487976, 46.14754867553711]`. Outcome `none` / `none`.

Yaw 0.5° and yaw −0.5°, same elevation and charge, also miss both banks and land near 46.1 m. Yaw −1°, 1°, and 5° miss as well.

## A two-face return

Origin 0, yaw 38.5°, elevation 14.5°, charge 0.86.

Contacts, in order: `side-face` at 0.800 s (z 26.89), `back-face` at 0.817 s (z 27.80), then ground. First ground at 1.8083333333333294 s, position `[4.2935285568237305, 0.43000006675720215, 4.310322284698486]`. About 6.1 m from the origin. The ball has come back toward the carriage after striking both faces.

One slider step, same other controls, still strikes both faces and still lands back toward the carriage:

| Change | Landing distance from the origin |
| --- | --- |
| Yaw 38.0° | about 4.1 m |
| Yaw 39.0° | about 9.0 m |
| Elevation 14.0° | about 9.6 m |
| Elevation 15.0° | about 5.9 m |
| Charge 0.85 | about 7.0 m |
| Charge 0.87 | about 10.2 m |

Carriage shifts at that same aim, from origin x −2 m to +2 m in 0.5 m and 1 m steps, still strike both faces and land back toward the carriage (about 7.6 m to 14.6 m out).

## Family

Player steps in the corner map: yaw 20° to 60° by 0.5°, elevation 10° to 30° by 1°, charge 0.45 to 0.95 by 0.02. 42525 shots.

- 3686 shots struck both banks and landed at least 5 m closer than the earlier bank contact. Yaw 28° to 50°, elevation 10° to 30°, charge 0.45 to 0.93.
- 1327 of those landed within 16 m of the origin. Yaw 28.5° to 50°. 1126 of the 1327 still did so at both neighbouring yaw steps (0.5° either way).
- A tighter window, yaw 32° to 46° by 0.5°, elevation 12° to 24° by 0.5°, charge 0.60 to 0.90 by 0.01, was 21750 shots. 4263 were a clean two-contact return landing inside 14 m. 2650 of those kept every one of the 26 neighbouring slider steps (yaw ±0.5°, elevation ±0.5°, charge ±0.01) on a two-face return landing inside 16 m.

The recorded return sits in that interior. It is not a single hidden angle.

## What is not the corner

On a separate sample (yaw 28° to 60° by 0.5°, elevation 10° to 28° by 2°, charge 0.50 to 0.90 by 0.05, 5850 shots), a one-face landing inside 16 m occurred only at yaw 54° (38 cells). The half-degree yaw neighbours were not in that set. That aim meets the near end of the side bank, which faces the carriage, rather than both long faces. It is a narrow specialist path. The study's route is the two-face family.

Earlier layouts whose bisector did not point near the carriage produced easy one-face returns off a single angled wall. Those were rejected. The axis-aligned corner above is the one that keeps the wide return on two faces.

## Why there is no circle

A first-ground circle near the return landing sits in open ground. A short direct shot can land there without touching either bank. The manifest records that as a limitation. No circle was added.

## Counts

Coarse layout search: 4320 shots, 18 legal layouts. Family map: 31590 shots across three layouts. Bisector search: the layouts in `sweep-bisector.json`. Corner map: 42525. Neighbour grid: 21750, plus the recorded opening and return replayed by `node scripts/foundry/validate.mjs worlds/foundry/right-angle`.
