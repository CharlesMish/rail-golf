# Orc Loop — Worldcraft lab experiment C

Date of the sweep: 2026-10-21. Branch `lab/wc-exp-20261020-orc-loop`, cut from `candidate/worldcraft-loop-20261015`.

Research question: what kind of goal makes a player want to revise a multi-piece layout?

Hypothesis: a slowly moving opponent adds a timing layer on top of placement. Risk: the result becomes luck, so revision stops meaning anything.

This file records one authored challenge and one headless Havok sweep. It does not measure enjoyment.

## What was added

House Shot is unchanged. `/lab/worldcraft` still opens it. Orc Loop sits beside it.

Open it from the fixed-goal panel (**Open Orc Loop**) or from Worlds & lines (**Orc Loop**). **Reset Orc Loop** restores the supplied pieces and a launch delay of 0. The authored document is `docs/examples/worldcraft-orc-loop.json` (`id` `orc-loop-v1`).

The rail is the House Shot rail: origin 0 m, yaw 0°, elevation 18°, charge 0.55. The player gets the existing ramp and bank, with the existing 0.5 m and 5° controls. A launch delay, in 0.5 s steps from 0 to 10 s, is the timing lever. It is part of the world, so a kept line remembers it. Changing it commits a world edit. Every fire restarts the stand-in at the pose for that delay. Time spent looking at the yard does not move it.

The stand-in is a placeholder cylinder. It is not a character. Diameter 1.4 m, height 8 m, center height 4.02 m, restitution 0.3, friction 0.45. Olive `StandardMaterial`, no shared palette and no art pass. A line circle shows the path and is not a collider. The body is a Havok cylinder, motion type ANIMATED. The projectile aggregate, impulse, mass, radius, and materials are the existing shot.

Motion, with `t` = launch delay + flight seconds:

```
theta = phase + (speed / radius) * t
position = (x + radius * cos theta, 4.02, z + radius * sin theta)
yaw = -theta
```

Authored circle: center `(4, 70.5)`, radius 2 m, speed 1.5 m/s, phase 0. Period `2π * 2 / 1.5` ≈ 8.378 s. One delay step moves the stand-in 0.75 m along the circle. The pin field remains in the document because the format requires it; it is hidden while a target exists and is not the goal.

Win condition: the projectile contacts the body named `worldcraft-target-orc`. The receipt and the result notice say **ORC BONKED**, and the receipt lists every contact. A finished flight with no orc contact is a miss. An interrupted flight is unfinished. House Shot still clears only on the first-ground pin circle.

Supplied pieces: ramp `(0, 42, yaw 0)`, bank `(16, 56, yaw 0)`, delay 0. That bank is parked off the default landing.

## Sweep

Command, from the repo root, with the installed `@babylonjs/havok` wasm. No RNG and no seed.

```
node scripts/wc-exp-orc-loop-sweep.mjs docs/experiments/wc-exp-20261020-orc-loop-sweep.json
```

One `NullEngine` runtime. Gravity and the 1/120 s step are the Worldcraft session's. Each trial rebuilds the world, fires the fixed rail, and steps until the shot ends or 1400 steps (11.67 s). The run that wrote the JSON took 108.3 s.

Grids, deduplicated before the delay loop:

| Slice | Pieces | Count before overlap rejection |
| --- | --- | --- |
| Ramp, bank parked at `(16, 56, yaw 0)` | ramp x ∈ {−4,−2,0,2,4}, z ∈ {38,40,42,44,46}, yaw ∈ {−20,−15,−10,−5,0,5,10,15} | 200 |
| Bank, ramp fixed at `(0, 42, yaw 0)` | bank x ∈ {−10,−6,−2,2,8,16}, z ∈ {56,62,66,70}, yaw ∈ {−40,−25,0,25} | 96 |
| Cross | ramp yaw −10 and −5 at `(0, 42)`, bank x ∈ {−6,16}, z ∈ {66,56}, yaw ∈ {−25,0} | 16 |

309 candidate layouts. `validateWorld` rejected 16 before any shot (footprint overlap with a piece, the launcher corridor, the sampled orc path, or the yard). 293 layouts × 21 delays = 6153 simulated grid trials.

`counts.shots` is 12383. That is the 6153 grid trials plus the fragility perturbations below (1796 + 3592 + 842). The determinism fires and the hit refire call the same shooter and are not included in that counter.

### Default

The supplied layout misses at all 21 delays. First ground contact is `(0, 0.430006, 69.765877)` every time. Contacts are the ramp, then the ground. Closest approach of a recorded sample to the stand-in's center at that instant:

| Delay (s) | Closest (m) | Delay (s) | Closest (m) |
| --- | --- | --- | --- |
| 0 | 2.722140 | 5.5 | 6.049861 |
| 0.5 | 2.657550 | 6 | 5.555321 |
| 1 | 2.982851 | 6.5 | 4.951783 |
| 1.5 | 3.605114 | 7 | 4.275809 |
| 2 | 4.334520 | 7.5 | 3.603734 |
| 2.5 | 5.067681 | 8 | 3.012552 |
| 3 | 5.701425 | 8.5 | 2.662829 |
| 3.5 | 6.184363 | 9 | 2.702697 |
| 4 | 6.468030 | 9.5 | 3.115948 |
| 4.5 | 6.534042 | 10 | 3.776985 |
| 5 | 6.383065 | | |

Nearest miss is 2.657550 m at delay 0.5. Delay alone does not solve the supplied layout.

### Hits and families

449 grid trials contacted the orc. Hit fraction `449 / 6153` = 0.072973.

A family is the ordered list of piece ids touched before the first orc contact.

| Family | Hits | Distinct layouts | Meaning |
| --- | --- | --- | --- |
| `ramp-yours` | 444 | 74 | Ramp, then orc, then ground. The bank is not in the contact list. |
| `ramp-yours>bank-yours` | 5 | 2 | Ramp, then bank, then orc, then ground. |

Ramp-steer yaw on those 74 layouts: −5° on 32, −10° on 32, −15° on 10. None of the positive yaws in the grid hit. 60 of the 74 leave the bank parked at `(16, 56, yaw 0)`. The other 14 are cross-grid banks the ball does not touch; they are the same contact family, not a third solution.

Bank-redirect, both with the ramp still at `(0, 42, yaw 0)`:

| Bank | Delays that hit (s) | First orc contact (s) on the representative |
| --- | --- | --- |
| `(−6, 66, yaw −25)` | 0, 8.5 | 4.683333 at delay 0 |
| `(−6, 70, yaw 25)` | 0, 0.5, 8.5 | |

The parked-bank default misses, and these hits touch the bank before the orc, so the bank is doing the redirect. The ramp-steer representative in the JSON is ramp `(−4, 38, yaw −15)`, bank parked, delay 3.5 s, first orc contact at 4.266667 s.

Ramp-steer hits are bunched in delay, with a gap through the middle of the period. Layouts hitting each delay (ramp family only): 0→32, 0.5→32, 1→32, 1.5→22, 2→32, 2.5→32, 3→34, 3.5→36, 4→34, 4.5→2, then nothing at 5, 5.5, 6, 6.5, or 7, then 7.5→6, 8→32, 8.5→32, 9→32, 9.5→32, 10→22.

### Fragility

Every hit was perturbed one control at a time. A neighbor that `validateWorld` rejected counts as applicable and not survived. None were rejected (invalid = 0). A delay outside 0–10 s is not applicable. Hits at delay 0 (34) and delay 10 (22) account for all 56 excluded delay sides (`449 * 2 − 842 = 56`).

| Perturbation | Survived / applicable | Fraction | Ramp family | Bank family |
| --- | --- | --- | --- | --- |
| ±5° on one piece | 921 / 1796 | 0.512806 | 914 / 1776 | 7 / 20 |
| ±0.5 m on one axis of one piece | 3525 / 3592 | 0.981347 | 3500 / 3552 | 25 / 40 |
| ±1 delay step (0.5 s) | 632 / 842 | 0.750594 | 630 / 834 | 2 / 8 |

Half-metre placement is usually still a hit. Five degrees is a real cut, especially for the bank family. One delay step keeps about three quarters of ramp-steer hits and only 2 of 8 bank-redirect hits. Timing is a lever. It is not a coin flip on this grid: the hit fraction is 7.3%, and the supplied world misses at every delay.

### Determinism

Phase check, taken at the terminal step of each determinism fire. Mesh position versus the formula above. Error is metres.

| Setup | Repeat outcome | Fresh-runtime outcome | Landing delta (m) | Orc point delta, repeat (m) | Orc point delta, fresh (m) | Pose error, three fires (m) |
| --- | --- | --- | --- | --- | --- | --- |
| Default, delay 0 | identical miss | identical miss | 0 | 0 (no orc contact) | 0 | 0, 0, 0 |
| Ramp-steer representative, delay 3.5 | identical clear | identical clear | 0.000008 | 0.043088 | 0 | 0.000001 each |
| Bank `(−6, 66, yaw −25)`, delay 0 | identical clear | identical clear | 0 | 0.049837 | 0.049837 | 0.000001 each |

"Outcome" is status, terminal reason, landing rounded to 0.1 mm, and each contact's body, count, and first/last time rounded to 0.1 ms. The orc manifold point is not part of that comparison.

Every grid hit was then rebuilt and fired twice more (`hitRefire` in the JSON):

| Check | Result |
| --- | --- |
| Hits refired | 449 |
| Status mismatches (including any that stopped being clear) | 0 |
| Contact-sequence mismatches | 0 |
| Outcome-string mismatches | 12 |
| Orc manifold point mismatches | 449 |
| Largest orc-point separation | 0.133592 m |
| Largest landing separation | 0.000016 m |

A second pass of that same refire, used only to split the outcome string, found 11 mismatches, all of them the landing after rounding to 0.1 mm, and 0 mismatches of contact time or terminal reason. The 12-versus-11 difference is that rounding boundary. Clear versus miss did not change on either pass.

The in-session check (same compiled body, fire twice, no world rebuild) is `tests/worldcraft-physics.test.mjs`. It passed for the default miss, for ramp yaw −10° at delay 3 s, and for bank `(−6, 66, yaw −25)` at delay 0. Signatures there include the contact point rounded to 1e-6, and the second fire matched the first. A fresh runtime matched the default miss. The bank contact's first time was before the orc's.

So a given layout repeats its result. Rebuilding the kinematic body can move the stored contact coordinate on the cylinder by up to 13.4 cm. It did not turn a hit into a miss or move the landing by more than 0.016 mm in this sweep.

## What this does and does not say

The moving stand-in gives two different ways to revise the layout, and the delay is a third control that the bank solutions barely tolerate. The supplied world is not already solved. That is the mechanical half of the hypothesis.

Nothing here measures whether a person wants to revise, or whether the timing feels like luck in the hand. The 8 m cylinder is tall enough for the descending ball to reach; a person-height stand-in was not used because the ball is still high until the last metres. That is a lab stand-in, not a character.

## Checks

On this working tree, after the sweep:

- `npm run typecheck` (`tsc --noEmit`) passed.
- `npm test` passed. That command is `npm run build` (bounded `vinext build`) and then `node --test tests/*.test.mjs`. Result: 481 tests, 0 failures. The suite includes the House Shot identity assertion, the Orc Loop schema, and the kinematic repeat test.

## Browser

Chrome on the local dev server, `http://127.0.0.1:5173/lab/worldcraft`, after Havok loaded (Babylon.js v9.23.0, WebGL2):

- The page opens on House Shot, 1/12 pieces, goal "First kiss inside the gold circle".
- Open Orc Loop shows Orc Loop, 2/12 pieces, launch delay 0.0 s, the ramp, the bank, and the stand-in.
- Fire on that layout: notice "Missed the orc. Revise the ramp, the bank, or the launch delay." Receipt "Orc not contacted", contacts `worldcraft-object-ramp-yours` 1.42–1.43 s and `worldcraft-ground` 4.68–4.68 s.
- Ramp yaw −10° and delay 3.0 s, same rail: notice "ORC BONKED". Receipt "ORC BONKED", then ramp 1.42–1.43 s, `ORC BONKED · worldcraft-target-orc` 4.43–4.43 s, ground 4.68–4.68 s, and "RAMP REBOUND → ORC STAND-IN".
- Open House Shot returns the gold-pin goal and 1/12 pieces.

The bank-redirect layout was not clicked through in the browser. Headless Havok already cleared it.

## Not verified

- Whether the timing layer is fun, or feels like luck to a player.
- Phone layout, touch dragging, and a second browser.
- Railyard, Timber Courtyard, and Free Play. They were not part of this change.
- A Cloudflare preview URL, unless one is posted for this branch after push. No pull request was opened.
