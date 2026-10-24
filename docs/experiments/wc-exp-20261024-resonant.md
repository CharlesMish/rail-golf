# Resonant pieces (wc-exp-20261024-resonant)

Branch `lab/wc-exp-20261024-resonant`, from `lab/wc-exp-20261020-orc-static`. Route `/lab/worldcraft`. No pull request.

Question: do resonant, tunable pieces make players want to revise a layout so a shot plays a sound sequence, and does a good default tuning make impacts feel more real?

This run does not answer either half with a player. It builds the smallest ringing layout on the existing Orc Stand-in, and it measures which note sequences a fixed rail can actually reach.

## What was added

The ramp and the bank keep their Havok coefficients. Each now has an acoustic voice: a material (`metal` or `timber`) and a scale degree `0–4`. A new free-standing plate uses the bank's friction `0.18` and restitution `0.86`. It is 4 m wide, 4 m tall, and 0.35 m thick, centered 2 m off the ground. The plate requires a voice. The shield stays a dull block and does not ring. House Shot objects have no voice.

Catalog version is `worldcraft-prefabs-v2` because the plate is a new prefab. The physics contract string is still `rail-golf-v02-worldcraft-v1`. Gravity, projectile mass and radius, charge mapping, 120 Hz stepping, substep `1000/120`, and first-ground termination were not edited. `mechanism-range-session.js` was not edited. The contact hook only reads the projectile speed and returns null, so it does not record a switch.

Scale, equal temperament: degree 0 C4 (261.6256 Hz), 1 D4 (293.6648 Hz), 2 E4 (329.6276 Hz), 3 G4 (391.9954 Hz), 4 A4 (440 Hz). Defaults are bank C4 timber, ramp D4 metal, plate E4 metal. Bank, then ramp, then plate is C–D–E.

In Build, a resonant piece shows Metal / Timber and five pitch buttons (C D E G A). The piece list shows the note. Retuning is an ordinary edit. It does not change friction or restitution.

On each projectile contact the runtime synthesizes one impact with WebAudio. Metal is four inharmonic partials (ratios 1, 2.76, 5.404, 8.933) with decays up to 1.85 s. Timber is three low, nearly harmonic partials with decays up to 0.16 s. The orc plays a fixed thunk at 82 Hz, off the scale. Gain is a smoothstep of impact speed over 22 m/s: 0 at rest, 1 at 22 m/s and above. Speed is the projectile speed on the first solver callback of that impact.

Solver callbacks inside 5/120 s of the previous callback on the same body are the same impact. They increment `callbacks` and do not start another sound. A later callback starts a new impact. Ground, tee, and the shield are silent.

Play shows a debug readout per shot: `piece · time · speed · note`, then `N sounds · M solver callbacks · K collapsed`.

## World

Document id `orc-static-v1`, name `Orc Stand-in`. A copy is `docs/examples/worldcraft-resonant.json`. The pre-resonance copy remains `docs/examples/worldcraft-orc-static.json`. The lab still opens on House Shot. Open Orc Stand-in from the goal panel or from Worlds & lines.

Fixed rail, same numbers as before: yaw 0, elevation 18, charge 0.55, origin 0. The player may move one ramp, one bank, and one plate. The shield is locked. The orc is the same static box. Any ledger contact with `worldcraft-target-stand-in-orc` still counts, and first ground still ends the line.

| Piece | Kind | Voice | x | z | yaw |
| --- | --- | --- | --- | --- | --- |
| ramp-yours | ramp | D4 metal | 0 | 42 | 0 |
| bank-yours | bank | C4 timber | 14 | 28 | 0 |
| plate-yours | plate | E4 metal | 0 | 68 | 0 |
| shield (locked) | block | none | -10 | 52 | 0 |
| stand-in-orc | target | thunk | -26 | 58.5 | 0 |

The plate stands on the centerline landing. The default shot hits the ramp and then the plate, stays on x = 0, and misses the orc. Terminal (0, 0.43, 91.884), reason `first-ground-contact`, notes `D4>E4`. The plate is what moved that landing past the old z ≈ 69.8 miss: the ball clips the plate and continues down the middle.

## Sweep

Command: `node scripts/sweep-resonant.mjs`

Raw record: `docs/experiments/wc-exp-20261024-resonant-sweep.json`

- Havok wasm: `node_modules/@babylonjs/havok`
- Seed: `20261024` (`mulberry32`), used only for the 220 joint draws
- Setup, every shot: `{railIndex:1, originX:0, yaw:0, elevation:18, charge:0.55}`
- Invalid footprints were not fired. Early plate (−26, 60, yaw 90) overlaps the orc. Late plates (−28, 58, yaw 0) and (−24, 58, yaw 0) overlap the orc.
- The co-occur row is the early family with the plate moved to (−24, 64, yaw 0). The pitch row is that same placement with the ramp degree changed. Degree 1 is the co-occur row, so it is not fired again.

| Slice | Fired | 2+ resonant pieces | Orc | Both |
| --- | ---: | ---: | ---: | ---: |
| default | 1 | 1 | 0 | 0 |
| early exemplar, ramp (−8, 40, yaw 0), bank (0, 16, yaw 80), plate left at (0, 68, yaw 0) | 1 | 1 | 1 | 1 |
| late exemplar, ramp (−1, 42, yaw 20), bank (−6, 68, yaw 20), plate left at (0, 68, yaw 0) | 1 | 1 | 1 | 1 |
| co-occur, early family, plate (−24, 64, yaw 0) | 1 | 1 | 1 | 1 |
| early plate lattice, ramp and bank fixed, plate x −26/−24/−22/−20, z 60/62/64/66, yaw 0/90 | 30 | 30 | 30 | 30 |
| landing plate lattice, default ramp and bank, plate x −4/−2/0/2/4, z 66/68/70, yaw 0/90 | 29 | 8 | 0 | 0 |
| late plate lattice, late ramp and bank, plate x −28/−24/−20/−16, z 56/58/60, yaw 0/90 | 22 | 22 | 22 | 22 |
| pitch, co-occur placement, ramp degree 0/2/3/4 | 4 | 4 | 4 | 4 |
| joint draws | 220 | 5 | 0 | 0 |
| **Total** | **309** | **73** | **59** | **59** |

The early lattice has 32 poses. One is the co-occur pose already fired, and one overlaps the orc, leaving 30. The landing lattice has 30 poses. One is the default plate already fired, leaving 29. The late lattice has 24 poses. Two overlap the orc, leaving 22. The 220 joint draws are the valid unique picks from 362 candidates. The 309 shots took 1.48 s.

"2+ resonant pieces" counts distinct tuned pieces. The orc thunk is not one of them. "Both" is that set and an orc hit in the same shot.

## Results

Shots that hit 2 or more resonant pieces: **73 / 309 = 0.23624595469255663**.

Shots that do that and also bonk the orc: **59 / 309 = 0.19093851132686085**. Every orc hit in this sweep was also a multi-piece shot (59 / 59). Of the multi-piece shots, **59 / 73 = 0.8082191780821918** also hit the orc. The other 14 are sequences with no bonk, mostly the centerline `D4>E4`.

Sounding note sequences, default tuning unless the pitch slice says otherwise:

| Sequence | Shots | Orc |
| --- | ---: | ---: |
| `D4` | 121 | no |
| `C4` | 63 | no |
| (no resonant contact) | 52 | no |
| `C4>D4>thunk` | 22 | yes |
| `D4>C4>thunk` | 20 | yes |
| `D4>E4` | 13 | no |
| `C4>D4>thunk>E4` | 10 | yes |
| `D4>C4>thunk>E4` | 3 | yes |
| `C4>D4` | 1 | no |
| `C4>C4>thunk>E4` | 1 | yes, ramp retuned to C4 |
| `C4>E4>thunk>E4` | 1 | yes, ramp retuned to E4 |
| `C4>G4>thunk>E4` | 1 | yes, ramp retuned to G4 |
| `C4>A4>thunk>E4` | 1 | yes, ramp retuned to A4 |

That is 13 distinct logs, 12 of them sounding, 10 with two or more tuned pieces, and 8 that also bonk the orc.

The joint sample is thin: 5 of 220 shots hit two pieces, and none hit the orc. The sequences that include the orc sit on the early and late families from the previous experiment, plus a plate moved onto the low part of those arcs. Random poses in this grid do not find the orc.

Default tuning in the orders this rail actually plays:

- Default landing, plate left where it is: `D4>E4`. Two metal notes a major second apart. No timber, no orc.
- Early family, plate not in the way: `C4>D4>thunk`. Timber then metal, then the bonk.
- Early family, plate at (−24, 64, yaw 0): `C4>D4>thunk>E4`. The plate rings after the orc, at t = 5.125 s, not before it. The ball is still high when it passes the plate's height on the way to the orc, and it meets the plate on the way down.
- Late family, plate not in the way: `D4>C4>thunk`. The same two notes, reversed.
- Late family with the plate on the way out: `D4>C4>thunk>E4` on 3 of those 22 shots.

Moving only the ramp's degree on the co-occur placement changes the second note and not the terminal. Degrees 0, 2, 3, and 4, and the degree-1 co-occur row, all end at (−24.261, 0.43, 69.778). The sequences are `C4>C4>thunk>E4`, `C4>D4>thunk>E4`, `C4>E4>thunk>E4`, `C4>G4>thunk>E4`, and `C4>A4>thunk>E4`.

Co-occur contacts, the row rendered to audio:

| Piece | Time (s) | Speed (m/s) | Note | Callbacks |
| --- | ---: | ---: | --- | ---: |
| bank-yours | 0.225 | 25.302 | C4 timber | 2 |
| ramp-yours | 1.433 | 19.324 | D4 metal | 2 |
| stand-in-orc | 4.333 | 12.447 | thunk | 2 |
| plate-yours | 5.125 | 6.528 | E4 metal | 2 |

Gains from those speeds are 1, 0.959, 0.598, and 0.212.

## One sound per impact

Across 309 shots the resonant bodies produced **815** solver callbacks and **406** sounds. **409** callbacks were collapsed into an impact that had already started. **0** shots emitted more sounds than callbacks.

Of the 406 impacts, 403 had 2 callbacks and 3 had 3. None had 1. The largest burst on one impact was 3. 257 shots had at least one repeated callback. 52 shots had no resonant contact. The hold is 5/120 s. These repeats are the solver reporting the same touch on successive steps, not a second bounce.

The default shot is the same shape: 4 resonant callbacks, 2 sounds (`D4`, `E4`), both impacts with 2 callbacks. The early orc bonk in the unit test is one thunk whose callback count equals the ledger count for that body, and that count is greater than 1.

## Browser

Headed Chrome on the lab route, after Open Orc Stand-in. Build lists `ramp · D4`, `bank · C4`, `plate · E4`, and `block · fixed`. The plate inspector shows Metal pressed and pitch E pressed, with C D E G A available. The bank shows Timber and C. The ramp shows Metal and D. Switching the plate to Timber and back to Metal left the fired voice on metal.

Play shows the fixed rail: 0 m origin, 0° yaw, 18° elevation, 55% power. Fire line on that default layout ended `miss`. The readout was:

`2 sounds · 4 solver callbacks · 2 collapsed`

- ramp-yours · 1.425 s · 20.50 m/s · D4 metal (2 callbacks)
- plate-yours · 4.458 s · 8.87 m/s · E4 metal (2 callbacks)

The receipt also listed the ramp, the plate, and one ground contact. No second sound on either piece. The mesh paint in the lab reuses the existing steel material for metal and the bank material for timber, so the scene stays on the same material budget. Headless tests allocate the brighter metal and the timber colors directly.

## Audio file

`docs/experiments/wc-exp-20261024-resonant.wav`

Command: `node scripts/render-resonant-wav.mjs`

Chrome headless loaded `lib/worldcraft-resonance.js` and called `renderResonanceWav` on an `OfflineAudioContext`. The buffer is the co-occur row above, scheduled at the logged times. 44100 Hz, mono, 16-bit, 7.175 s, 632880 bytes, peak sample 0.975. The same bytes came back on a second run.

## What this does not answer

No player sat this level. Nothing here measures whether the notes make someone want to revise, or whether the impacts feel more real.

Not verified in this run:

- How any of it sounds to a human. The wav is a rendered buffer. I did not play it through speakers or headphones, and I did not judge brightness, warmth, or whether C–D–E is pleasant.
- A comparison against a silent shot, or against a mistuned degree, by a listener.
- Phone layout. No Cloudflare preview was posted.
- The late plate family and the joint misses in the browser. The headed check fired only the default layout.
- How the WebAudio graph sounds in that Chrome session. The page did construct and play the impacts. I did not listen.
- Whether more families exist outside these lattices. The joint sample of 220 was empty of orc hits. That is not a proof that the rest of the yard is empty.
- A plate tall enough to ring on the high part of the arc. This plate is 4 m. After the ramp the ball is often above that, so the third note shows up on the way down, often after the thunk.
