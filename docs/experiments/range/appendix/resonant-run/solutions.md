# Resonant Run solutions

These layouts are not on the player index. The phrase shown in the lab is C4, then D4, then E4 (scale degrees 0, 1, 2). The stand-in hit is a separate judgement. Neither is a score.

The fixed shot is origin 0, yaw 0, elevation 18, charge 0.55. The stand-in stays at x −26, z 58.5, yaw 0. Default voices are bank C4 timber, ramp D4 metal, plate E4 metal.

The opening arrangement (ramp 0, 42, yaw 0; bank 14, 28, yaw 0; plate 0, 68, yaw 0) hears D4 then E4 and misses the stand-in. It does not already satisfy the phrase. Retuning that arrangement cannot add the missing bank contact.

## Phrase match — early co-occur

Order heard: C4, D4, E4. Stand-in: hit. Phrase status: match. `scored` is false.

| Piece | x | z | yaw | Voice |
| --- | --- | --- | --- | --- |
| ramp-yours | −8 | 40 | 0 | metal, degree 1 (D4) |
| bank-yours | 0 | 16 | 80 | timber, degree 0 (C4) |
| plate-yours | −24 | 64 | 0 | metal, degree 2 (E4) |

Shot record `docs/experiments/range/audio/records/early-cooccur.json`.

| | |
| --- | --- |
| shotHash | `abe19ab73df0953c2cb2f3cba109b17ffbad44dc793438bd1e47bc96c766992b` |
| bindingHash | `cc5b314167d10fc0d5f14fe4d9e65942dad88217c9cc97f9c60b907ccc95d0c0` |
| pointHash | `f5dbcc26db415802aa859dedb2f7274a16629df6907a2e9c950725d8d7c4080b` |
| Terminal | first-ground-contact at 6.591666666666784 s, position [−24.261465072631836, 0.43000245094299316, 69.77838897705078] |

Contact order: bank, ramp, stand-in, plate, ground. Each resonant row and the stand-in row had 2 solver callbacks and 1 sound.

One editor step (±0.5 m or ±5°, one axis at a time) kept this order and the stand-in hit for 9 of 16 fired neighbors. Bank steps did not. This is a neighbor count, not a radius.

## Contrast — late plate

Order heard: D4, C4, E4. Stand-in: hit. Phrase status: miss, because the prescribed order is C4 then D4 then E4.

| Piece | x | z | yaw | Voice |
| --- | --- | --- | --- | --- |
| ramp-yours | −1 | 42 | 20 | metal, degree 1 (D4) |
| bank-yours | −6 | 68 | 20 | timber, degree 0 (C4) |
| plate-yours | −28 | 58 | 90 | metal, degree 2 (E4) |

Shot record `docs/experiments/range/audio/records/late-plate-3.json`.

| | |
| --- | --- |
| shotHash | `7826c3a7a5ae534ea91e9f3f692e231e71c71785b0f84e0dc81b5c60c8517813` |
| bindingHash | `dba71f350cd3ab225a33800bfbcca11d4f3d82a37bcb00058e886f60004c7c04` |
| pointHash | `29071c42ae526f46eec408dbebf1ce32ffa2fcd76fc1637373ccc73bf265abcc` |
| Terminal | first-ground-contact at 8.383333333333498 s, position [−24.053525924682617, 0.4300035536289215, 60.346858978271484] |

One editor step kept this order and the stand-in hit for 7 of 18 fired neighbors (ramp z− and all six plate steps). Bank steps did not.

## Not a solution

A separate reversal lattice put the plate on the near side of the ramp (ramp z 48 or 56, plate z 18, 24, or 30). It did not produce E4 before D4. 18 of 36 shots heard only D4. 18 heard no resonant note. See `search.json` key `reversal`.
