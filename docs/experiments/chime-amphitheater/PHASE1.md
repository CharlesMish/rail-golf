# Chime Amphitheater — phase 1

Lab experiment. Base `lab/wc-exp-20261114-chime-compare` at `0b151c5c94849b78ccda6c41a1755b66471e3fa2`. Physics, restitution, friction, gravity, the projectile, the launch mapping, first-ground termination, and the synthesis engine were not changed. Chime Terraces was not edited. The v1 export hash stays `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

Seed `20261114` is recorded and not applied. Dynamics are face speed. The grid is the Ricochet Loop grid: yaw −24° to 24° step 2° (25), elevation 8, 12, 16, 20, 24, 30, 40, charge 0.35, 0.45, 0.55, 0.65, 0.8. 875 shots, origin x 0, rail 1. A note joins the current audible event when its onset is at most 150 ms after the previous note. A phrase family is the first three distinct sounding pieces after immediate repeats are collapsed. A nudge is yaw ±0.5°, elevation ±0.5°, charge ±0.01. Each world was measured on a fresh Havok runtime.

## Feasibility

The kit, read from `lib/worldcraft-model.js` and checked by rejection:

| Control | Step | Range | Rejection that was fired |
| --- | --- | --- | --- |
| x, z | 0.5 m | x −30..30, z 10..96, whole footprint inside | x 0.25 m; a plate at x 29.5 past the yard; a plate at z 10 in the launcher corridor |
| yaw | 5° | −180..175 | yaw 1° |
| lift | 0.5 m | 0..20, plates only, paired with tilt | lift 0.25 m; lift without tilt; a bank with lift |
| tilt | 5° | −90..90 | tilt −12° |
| pieces | — | 12, or 24 if the document sets `capacity: 24` | 13 without the field; 25 with it |

A plate is 4 × 4 × 0.35 m. Negative tilt leans the top toward −local Z. With yaw equal to the radial bearing, that lean is inward. A standing plate occupies y 0..4. Lift 4 on the same centre as a standing plate is an accepted edge touch. Lift 3.5 overlaps.

A closed semicircle, cz 18, lift 2, tilt −15, first radius the validator accepts:

| Facet step | Plates | First legal radius | Seam gap | Past 12 | Past 24 |
| --- | ---: | ---: | --- | --- | --- |
| 30° | 7 | 9 m | 0.42..0.71 m | no | no |
| 20° | 10 | 13 m | 0.10..0.81 m | no | no |
| 15° | 13 | 17 m | 0.17..0.39 m | yes | no |
| 10° | 19 | 25 m | 0.02..0.43 m | yes | no |
| 5° | 37 | — | — | yes | yes |

The ball diameter is 0.86 m. The uneven seam is the 0.5 m position snap, not the 5° yaw step. A ±90° mouth plate sits outside the yaw ±24° cone at the z where a charge-0.55 ball is still in the air, so those plates were left out of the sketches.

**Recommendation: faceted plates (A).** A segmented-arc helper would only emit the same snapped plates. A finer opt-in grid would even the seams; the shots below do not fail because a seam is 0.3 m rather than 0.1 m. A fused curved body would be one note, and it would not by itself produce a second contact. It was not built.

## Sketches

All metal plates, pentatonic degrees, no ramps, no banks. Presets are in `sketches/`. Only Two Tiers is in the gallery.

| Sketch | Pieces | Layout | Why it was tried |
| --- | ---: | --- | --- |
| Arc Tier | 5 | −40°..40° step 20°, radius 13 m, cz 14, lift 3, tilt −15. Seams 0.33..0.46 m | One arc facing the tee |
| Horseshoe | 7 | −60°..60° step 20°, radius 13 m, cz 16, lift 3, tilt −15. Seams 0.33..0.46 m | Open toward the tee, so a side hit might cross |
| Two Tiers | 10 | Inner standing, −60°..60° step 30°, radius 9 m, cz 16. Outer lift 4, tilt −15, −40°..40° step 20°, radius 13 m, same centre. Outer degrees are offset by 2 | A low arc the default shot clears, and a raised arc it meets |

Rejected after the grid, not gallery worlds:

- Arc Tier. 542 silent, 333 single notes, no second note on any shot. Every plate is reached. The default (yaw 0, elevation 18, charge 0.55) is one E4, then the ground.
- Horseshoe. 569 silent, 282 single notes, 24 raw pairs. Every pair is 0..8 ms, so the audible count of 2 is 0. The pairs are neighbouring plates at a seam. No shot reaches a plate on the other side. The default is one G4.

Two further bowls, same 875 grid, fresh runtime, not kept:

- Tighter, 5 plates, 30°, radius 9 m, lift 3, tilt −15. Two sequential shots, both a cross of the end plates, gap 1.06 s: yaw ±16, elevation 30, charge 0.35. Ten seam chords. Nothing else with two notes.
- Same horseshoe with tilt 0. Two sequential shots, gap 0.78 s: yaw ±24, elevation 16, charge 0.8. Twelve seam chords.

## Grid

Shares are of 875. Descending Resonance here is a fresh runtime. The published comparison ran it after Fan and Garden in one runtime and differs on 11 sequences (10 raw counts, 2 audible counts): published raw 3+ was 166 and audible 3+ was 164. Terraces, run first in that comparison, matches this run on every sequence and every audible count. Terraces all-six “stay 3+” is 0.5424, the published 54.2%.

| | Terraces | Descending, fresh | Arc | Horseshoe | Two Tiers |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pieces | 21 | 12 | 5 | 7 | 10 |
| Audible 0 / 1 / 2 / 3–5 / 6+ | 159 / 170 / 335 / 211 / 0 | 220 / 332 / 158 / 163 / 2 | 542 / 333 / 0 / 0 / 0 | 569 / 306 / 0 / 0 / 0 | 390 / 363 / 110 / 12 / 0 |
| Raw 0 / 1 / 2 / 3–5 / 6+ | 159 / 153 / 268 / 255 / 40 | 220 / 331 / 156 / 165 / 3 | 542 / 333 / 0 / 0 / 0 | 569 / 282 / 24 / 0 / 0 | 390 / 319 / 128 / 38 / 0 |
| Raw 3+ | 295 (33.7%) | 168 (19.2%) | 0 | 0 | 38 (4.3%) |
| Audible 3+ | 211 (24.1%) | 165 (18.9%) | 0 | 0 | 12 (1.4%) |
| Audible 3+ and 3 or more pieces | 134 | 106 | 0 | 0 | 8 |
| Long families | 83 | 42 | 0 | 0 | 16 |
| Raw 3+ that open as a chord | 163 / 295 (55.3%) | 8 / 168 (4.8%) | — | — | 26 / 38 (68.4%) |
| Onset gap median / p90 | 0.233 / 1.058 s | 0.567 / 1.508 s | no pairs | 0 / 0.008 s | 0.192 / 0.308 s |
| Immediate-repeat share of notes | 0.2% | 0.4% | 0 | 0 | 0 |
| Any later repeat share of notes | 20.0% | 10.3% | 0 | 0 | 1.6% |
| Pieces with no note | 0 | 0 | 0 | 0 | 0 |
| Raw 3+, both directions stay 3+, all six | 54.2% | 49.4% | — | — | 0 / 38 |
| Raw 3+, all six keep the family | 26.1% | 33.3% | — | — | 13.2% |

Two Tiers travel. 152 shots sound a standing plate and a raised plate. 145 of those hit the raised arc first. All 38 raw 3+ shots are in that 152, 35 of them raised-then-standing. Six shots sound a west plate and an east plate. All six are elevation 8, charge 0.8, yaw ±18, ±20, or ±22, standing ends `in-0` and `in-4` only, gap 0.49..0.60 s. None of the six has a third note. The raised arc is not crossed.

The longest Two Tiers lines are four notes, two aims and their mirrors: yaw ±4, elevation 24, charge 0.45, raised centre, standing centre, raised neighbour, standing neighbour, gaps 0.20, 0.25, 0.38 s. Elevation 23.5 on the west one drops the raised neighbour and puts the last two notes 33 ms apart. Elevation 24.5 replaces the last pair. All six nudges keep a raw 3+ line on none of the 38.

The default shot is not on the grid (elevation 18). Two Tiers: raised centre A4 at 0.933 s, standing centre E4 at 1.100 s, gap 0.167 s, then first ground at z 29.8. All six nudges keep that pair and that order. Terraces' default is low-2 D4 and low-3 C4 in one event, then out of bounds; a yaw step of 0.5° drops one of the two plates. Arc Tier and Horseshoe defaults are one note, and every nudge of them is still one note.

Bodies, NullEngine, no shadows: Terraces 23, Descending 14, Arc 7, Horseshoe 9, Two Tiers 12. Browser frame time was not measured.

## Voices

What a piece can sound like today, without a collider change:

| Piece | Material in the document | Voice the ear uses | Duration of the body |
| --- | --- | --- | --- |
| Plate, ramp, or bank | metal | `metal`, inharmonic bar, fundamental decay 1.85 s | rings |
| Ramp or plate | timber | `timber`, fundamental decay 0.16 s, plus a short noise | the short knock |
| Bank | timber, and the world sets `presentation.bankVoice` | H, `tuned-even`: `timberTunedLong`, trim 1.36, 12 dB range. Metal banks stay `metal` | the tuned wood |
| Bank | timber, no bank-voice flag | the short `timber` knock | the short knock |
| Block | none | silent | — |

Degrees are C4 D4 E4 G4 A4. H does not apply to a plate or a ramp. Variants C–F would retimbre every timber piece and leave metal alone; they are not a per-world plate assignment. Two Tiers has no banks, so the bank-voice flag would do nothing. The plates stay ordinary metal. The only assignment made here is the existing degree field: the raised arc is offset by two degrees from the standing arc, so the opening pair is A4 then E4 rather than the same pitch twice. That does not change a contact.

## Verdict

A faceted arc of one height does not make a second contact. The ball hits one plate and meets the ground. Neighbouring plates are heard only when the ball catches the seam, and that is one event under 10 ms. A cross of the bowl exists in two or six shots, with a gap of half a second or more, and it does not survive into a three-note line.

Two heights do chain, and the chain is the one Terraces already has: the ball clears or strikes a farther raised plate and comes back to a nearer lower plate. It happens on 152 of 875 shots here, against Terraces' 211 audible 3+ shots, and the third piece is rare (12 audible 3+ shots) and brittle (no raw 3+ shot survives all six nudges). The opening is two notes 167 ms apart, and that pair does survive the six nudges. That is the difference from Terraces' opening chord. It is not a lateral journey around a bowl.

The cause is the contact, not the yard and not the piece cap. The plates face the incoming ball, restitution is 0.86, and first ground ends the line before another facet. The authoring grid can place the facets that were measured. A curved primitive was not required to find this out, and these shots do not show that it would supply the missing contact.

The gallery holds Two Tiers only. After a shot its result view is the existing side orbit already used by Terraces, Fan, and Descending Resonance. A headless browser opened the lab, clicked Play on the card, and replayed the three recorded shots. Each terminal and each note sequence matched the manifest. Reset restored the ten plates and the opening aim. Chime Terraces stayed in the gallery. A phone and a frame-time sample were not taken.

## Reproduce

```
node docs/experiments/chime-amphitheater/geometry.mjs
node docs/experiments/chime-amphitheater/place-sketches.mjs
node docs/experiments/chime-amphitheater/measure.mjs
node docs/experiments/chime-amphitheater/render-audio.mjs
```

Shot rows are `raw/shots-*.json`. Aggregates are `raw/summary.json`. WAVs are not in git.
