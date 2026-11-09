# The Carry — solutions

Not for the gallery. The invitation does not use these numbers.

Kit SHA `1ad3166d0839ea042379f5a861ed7523cb46d47e`. Seed `20261109`, recorded, not applied to the solver. Physics contract unchanged. Circle `(0, 53)`, radius `2.5` m. Locked shot: origin `0`, yaw `0`, elevation `18`, charge `0.45`.

## Opening

Ramp `(0, 18, yaw 0)`. The ball does not touch it.

| | |
| --- | --- |
| Reason | `first-ground-contact` |
| Elapsed | `1.4749999999999972` |
| Position | `(0, 0.43000006675720215, 36.76214599609375)` |
| Distance | `16.238` m, miss |

The same terminal is the empty yard. Moving the ramp to `z 18.5` on the sweep line still misses the ramp and keeps that landing. Yaw `0.5°` and charge `0.46` are rejected: "This rail is fixed. Revise the piece, then fire the same shot."

## Why the circle is here

A coarse grid at elevation `18`, charge `0.55` (735 legal poses) threw ramp landings to about `z 70`, which sits far past the survey look point at `z 43`. A short launch probe kept the same elevation and used charge `0.45`. The open flight then ends near `z 37`, and a ramp on the line carries it to about `z 53`. Both sit around the look point. That is the shipped shot. It is not a claim that `0.55` cannot carry.

## Ramp family

Grid: ramp `x −6..6` step `0.5` m, `z 16..46` step `0.5` m, yaw `−25..25` step `5°`. Planned `16775`. Illegal footprints `100`. Fired `16675`.

Inside radius `2.5`, the largest 6-connected component on that grid has `2378` poses. Every one of them touches the ramp. Poses that miss the ramp do not clear. `x` in the component runs `−5..5` (`21` values). `z` runs `20..40.5` (`42` values). Yaw values present: `−20, −15, −10, −5, 0, 5, 10, 15, 20`.

One-axis runs, ramp otherwise at the named pose, radius `2.5`. A bracket is the next sample and it misses. None of these runs is censored.

| Pose held | Axis | Clear run | Width | Brackets |
| --- | --- | --- | --- | --- |
| `(0, 36, yaw 0)` | x, `0.5` m | `−4.5..4.5` | `9` m | `−5`, `5` |
| `(0, 36, yaw 0)` | z, `0.5` m | `21..40` | `19` m | `20.5`, `40.5` |
| `(0, 36, yaw 0)` | yaw, `5°` | `−5..5` | `10°` | `−10`, `10` |
| `(0, 24, yaw 0)` | x | `−5..5` | `10` m | `−5.5`, `5.5` |
| `(0, 24, yaw 0)` | yaw | `−5..5` | `10°` | `−10`, `10` |
| `(0, 40, yaw 0)` | x | `−4.5..4.5` | `9` m | `−5`, `5` |
| `(0, 40, yaw 0)` | yaw | `−5..5` | `10°` | `−10`, `10` |

The `z 24` and `z 40` slices are the same shape as the middle. The relationship is not one pose.

### Fired examples

All of these use the locked shot. Distance is from `(0, 53)`.

| Label | Ramp | Elapsed | Landing | Distance | Result |
| --- | --- | --- | --- | --- | --- |
| Near band | `(0, 24, 0)` | `3.7249999999999894` | `(0, 0.4300025701522827, 53.70397186279297)` | `0.704` m | clear |
| Middle | `(0, 32, 0)` | `4.049999999999991` | `(0, 0.430001437664032, 53.19816970825195)` | `0.198` m | clear |
| Far band | `(0, 40, 0)` | `4.316666666666671` | `(0, 0.4300011694431305, 52.25428771972656)` | `0.746` m | clear |
| Offset | `(4, 32, 0)` | `4.049999999999991` | `(0, 0.4299972653388977, 53.198158264160156)` | `0.198` m | clear |
| Turned | `(0, 32, 5)` | `4.041666666666657` | `(−1.9301469326019287, 0.4300014078617096, 53.302127838134766)` | `1.954` m | clear |
| Turned out | `(0, 32, 10)` | `4.02499999999999` | `(−3.8067069053649902, 0.43000322580337524, 53.67164993286133)` | `3.866` m | miss |
| x edge | `(4.5, 32, 0)` | `4.049999999999991` | `(0, 0.4299972653388977, 53.198158264160156)` | `0.198` m | clear |
| x miss | `(5, 32, 0)` | `4.041666666666657` | `(−2.625554323196411, 0.430000364780426, 53.188236236572266)` | `2.632` m | miss |

An offset ramp still drops the ball on the centre line. A `5°` turn stays inside. A `10°` turn does not, at this pose.

### Narrow centre-line pocket

Ramp `(0, 20, 0)` clears: landing `(0, 0.4300009310245514, 51.46717834472656)`, distance `1.533` m, elapsed `2.341666666666661`. The next centre-line step, `(0, 20.5, 0)`, hits the ramp and misses: landing `z 58.996`, distance `5.996` m. The durable centre-line run starts at `z 21`. The 3D component still lists every `z` from `20` to `40.5`, so other `x` or yaw values fill that centre-line hole. The pocket at exactly `(0, 20, 0)` is real and thin. It is not the family.

## Direct aims, which skip the ramp

These need a free launcher. The shipped preset does not have one.

At origin `0` and yaw `0`, elevation `14..34` step `0.5°` and charge `0.50..0.78` step `0.01`: `1189` shots, `144` inside the circle.

Nearest: yaw `0`, elevation `19`, charge `0.60`. Landing `(0, 0.4300000071525574, 52.986053466796875)`, distance `0.014` m, elapsed `1.799999999999996`. No piece contact.

One-axis widths around that aim, other axes held:

| Axis | Step | Clear run | Width | Brackets |
| --- | --- | --- | --- | --- |
| Yaw | `0.5°` | `−2.5..2.5` | `5°` | `−3`, `3` |
| Elevation | `0.5°` | `18..20.5` | `2.5°` | `17.5`, `21` |
| Charge | `0.01` | `0.58..0.62` | `0.04` | `0.57`, `0.63` |

Those steps are the editor's aim steps. This is a player route if the rail is unlocked. On the shipped preset, `validateWorldcraftShot` rejects yaw `0.5`, elevation `18.5`, charge `0.46`, and this direct aim. The play controls for a fixed rail do not show aim or power.

A coarser free-launcher sweep against a `5` m circle (not the shipped radius) found `120` coarse clears and `10276` fine clears in their neighbourhood, yaw about `−5..5`, elevation about `7..42`, charge about `0.43..0.94`. That count is not the `2.5` m family. It is evidence the direct route is not a single cell.

Origin was not swept. The claim is origin `0`.

## Pieces that are not the ramp

The allowance is one ramp. A block or a bank cannot be added. They were fired anyway.

Block, fixed shot, `x −3..3` step `0.5`, `z 24..36` step `0.5`, yaw `−15..15` step `5°`: `2275` shots, `0` clears. Nearest landing is `(0, 0.43000075221061707, 50.34867477416992)`, distance `2.651` m, from block `(-1, 28, yaw 0)`. That is `0.15` m outside the radius. An earlier block lattice (`400` shots, `z` out to `50`) had the same nearest distance and `0` clears of this circle. It did clear a `5` m circle. The shipped radius is what keeps that block out. This is not every legal block in the yard.

Bank, `x −4..4` step `2`, `z 18..40` step `2`, yaw `−45..45` step `15°`: `420` shots, `362` contacts, `0` clears. Nearest contact, bank `(-2, 40, yaw 45)`, lands at distance `16.277` m. An earlier `315`-shot bank lattice also scored `0` against a `5` m circle. On these lattices a bank does not bring the ball closer to the circle than the open flight.

Steep ramp yaws (`±30` and beyond) on a `2` m lattice scored `24` times inside a `5` m circle. The nearest of those is `3.328` m from the centre, outside `2.5` m. The connected family above already includes some poses at yaw `±15` and `±20` inside `2.5` m. The mid-pose one-axis run does not: `±10°` misses there.

## Not established

- No person played it. Lattice counts are not a chance of finding the band.
- Enjoyment, and whether the opening reads as a problem, were not measured.
- The panel still says aim is free and that a block and a bank can move. The controls do not match that sentence. It was left as it is.
- Phone hardware was not used.
- Direct aims were not swept across origin.
- Block poses outside the two lattices were not fired. The nearest measured block is close.
- The `z 20` pocket was not given its own neighbourhood below the centre line.
