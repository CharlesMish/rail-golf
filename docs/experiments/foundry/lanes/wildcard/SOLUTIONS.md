# The Other Way — solutions

This file is the spoiler appendix. The gallery invitation and [NOTES.md](NOTES.md) do not use these aims.

Preset: `worlds/foundry/the-other-way/preset.json`.

Blocks, all fixed, yaw 0, z 36: `left-stop` at x −14, `middle-stop` at x 0, `right-stop` at x 14. Each block is the catalog 6 × 4 × 5 m dull block. Goal: none. Launcher: free. Opening: origin 0, yaw 0, elevation 16, charge 0.55.

A **clear** line has no block contact and its first ground is past the back face (z > 39). A **stop** meets a block and first ground stays in front of that face. Seed 20261109. 1153 shots, 0 rejected. Script: `sweep.mjs`.

## Tested lines

All four are on the 0.5° / 0.01 / 0.5 m controls. The validator replays them.

| Id | Origin | Yaw | Elevation | Charge | What happens | First ground |
| --- | --- | --- | --- | --- | --- | --- |
| opening | 0 | 0 | 16 | 0.55 | Meets the middle block and stops | z 28.58 |
| left | 0 | −10.5 | 16 | 0.55 | No block contact, passes on the left | x −7.84, z 42.33 |
| right | 0 | 10.5 | 16 | 0.55 | Mirror of left | x 7.84, z 42.33 |
| carry | 0 | 0 | 24 | 0.55 | No block contact, over the middle | x 0, z 54.38 |

## One-step neighbours

Fired, not replayed by the validator.

- Opening: yaw ±0.5, elevation ±0.5, charge ±0.01, origin ±0.5 m. All eight still meet the middle and stop short.
- Left and right examples: the same eight neighbours. All sixteen stay clear of every block.
- Carry: the same eight neighbours. All eight stay a clean carry.

The opening is not a lip. The examples are not lips.

## Families at the opening elevation and charge

Yaw from −70 to 70, step 0.5, elevation 16, charge 0.55 (281 shots).

| Kind | Yaw window | Steps of 0.5° |
| --- | --- | --- |
| Meets middle, stops | −5.5 to 5.5 | 23 |
| Clear left | −15 to −6 | 19 |
| Clear right | 6 to 15 | 19 |
| Meets left block | −27.5 to −18 | 20 |
| Meets right block | 18 to 27.5 | 20 |
| Clips left block and still gets past | −17.5 to −15.5 | 5 |
| Clips right block and still gets past | 15.5 to 17.5 | 5 |
| Out of the yard before first ground | ≤ −48.5 and ≥ 48.5 | 44 each side |

The boundary between “meets the middle” and “clear right” is one slider step: yaw 5.5 stops, yaw 6 clears. Both interiors are wide. The same is true on the left.

Origin, still yaw 0, elevation 16, charge 0.55, step 0.5 m:

| Kind | Origin | Steps |
| --- | --- | --- |
| Clear left | −10 to −3.5 | 14 |
| Meets middle | −3 to 3 | 13 |
| Clear right | 3.5 to 10 | 14 |

Standing off to one side, still looking straight, is a family. It is not a hidden angle. Origin ±0.5 m from 0 stays on the middle stop.

At yaw −10.5, elevation 14 through 40 (53 steps of 0.5°) stays clear left. The right example matches.

## Straight shot, yaw 0

Elevation 5 to 85, step 0.5, charge 0.55:

| Kind | Elevation | Steps |
| --- | --- | --- |
| Stops short, no block | 5 to 9.5, and 74.5 to 85 | 10 and 22 |
| Meets middle and stops | 10.5 to 17 | 14 |
| Clips the middle and lands past it | 17.5 to 19.5 | 5 |
| Clean carry, no block | 20 to 70.5 | 102 |

Charge 0.20 to 1.00, step 0.01, elevation 16, yaw 0:

| Kind | Charge | Steps of 0.01 |
| --- | --- | --- |
| Short of the wall | 0.20 to 0.42 | 23 |
| Meets middle and stops | 0.44 to 0.58 | 15 |
| Clips the middle and lands past it | 0.59 to 0.64 | 6 |
| Clean carry | 0.65 to 1.00 | 36 |

The opening charge 0.55 sits inside the 15-step stop, not on its edge.

At elevation 24 the carry is continuous across aim, not a slot: yaw −36 to −3.5 clear left (66 steps), −3 to 3 clean over the middle (13 steps), 3.5 to 36 clear right (66 steps). Block contact is gone across that band.

## Ridge and other specialist results

The clip that still gets past is real, and it is the thin result.

- In elevation, at yaw 0 and charge 0.55, it is only 17.5 to 19.5 (5 steps). Elevation 17 stops. Elevation 20 is a clean carry. A player can sit on 18, and ±0.5° of elevation stays on the clip, but one more step leaves it.
- In yaw, at elevation 18 and charge 0.55, that clip holds from −5 to 5 (21 steps). It does not die under a 0.5° yaw change. This is not the travelling-bell failure, where ±0.5° removed the phase window.
- It is still the narrowest family here. It is not the opening, and it is not what the invitation asks for.

Single-step leftovers, not routes:

- Elevation 10, yaw 0, charge 0.55 lands on the face plane with no block contact.
- Elevation 74 meets the middle again. 71 to 73.5 clip it. 74.5 and above fall short.
- Charge 0.43, elevation 16, yaw 0 lands on the face plane with no block contact.

## What was looked for as a bypass

There is no scored goal, so nothing is a direct solution around a pin. The straight carry was the candidate for “you can ignore the gaps.” It is wide on both elevation and charge, so it is kept as one of the ways. The blocks cannot be made taller without a height field. That limit is recorded on the manifest and was not built.

The player cannot move or delete a block. All three ids are fixed, and the allowance is empty. Make a copy keeps those locks.

Wide aim at the opening elevation leaves the yard before first ground. That is an end, not a way past.
