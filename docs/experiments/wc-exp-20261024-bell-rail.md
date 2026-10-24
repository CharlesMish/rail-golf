# Bell Rail (wc-exp-20261024-bell-rail)

Branch `lab/wc-exp-20261024-bell-rail`, cut from `lab/wc-exp-20261020-orc-static`. No pull request.

Research question: does a bell-shaped target moving back and forth on a fixed rail, with a learnable constant-speed rhythm, make a player want to revise a multi-piece layout? Compared with the stationary orc on this same branch, and with the earlier circular orc (`lab/wc-exp-20261020-orc-loop`), which collapsed to ramp steering plus a launch delay.

This file does not measure players. It records one level and one headless Havok sweep.

## What was added

House Shot is unchanged. The Orc Stand-in world is unchanged. `/lab/worldcraft` still opens on House Shot.

Bell Rail is a third fixed world, `bell-rail-v1`, name `Bell Rail`. A copy is `docs/examples/worldcraft-bell-rail.json`. Open it from the House Shot or Orc Stand-in goal panel (**Open Bell Rail**), or from Worlds & lines (**Bell Rail**). **Reset Bell Rail** restores the supplied pieces and a launch delay of 0.

The launch rail is the House Shot rail: origin 0 m, yaw 0°, elevation 18°, charge 0.55. The player gets the same ramp and bank as the stand-in, on the same 0.5 m and 5° controls. The shield block stays locked. A launch delay, in 0.5 s steps from 0 to 10 s, is the timing lever. It is part of the world, so a kept line remembers it. Changing it commits a world edit. Every fire restarts the bell at the pose for that delay. Time spent looking at the yard does not move it.

The target is a bell, not a person and not a new placeable prefab. A lathe (crown, waist, flared skirt) is the visible body and the Havok convex hull. Height 2.4 m, skirt radius 0.75 m, center 1.5 m off the ground. Friction 0.8 and restitution 0.1, copied from the dull block. A small crown knob and a clapper are parented meshes with no collider. There is no face. The body is named `worldcraft-target-bell`, motion type ANIMATED. The projectile aggregate, impulse, mass, radius, gravity, and step are the existing shot.

The rail is a short dark bar with two end stops. Those meshes have no collider. The bar runs from (−28, 58) to (−24, 58), 4 m, at the top of the bell. Speed is 1 m/s. One delay step moves the bell 0.5 m. The round trip is 8 s.

Position, with `t` = launch delay + flight seconds:

```
length = 4
period = 8
u = t mod period
along = u <= 4 ? u : 8 - u
position = (-28 + along, 1.5, 58)
```

`t = 0` is the west endpoint (−28, 58). `t = 4` is the east endpoint (−24, 58). Speed is constant except for the instant reversal at each end. The same `t` is the same pose. Idle time is not added.

The shield stays at (−10, 52), between the centerline and this rail. The supplied ramp is (0, 42, yaw 0) and the supplied bank is (14, 28, yaw 0), off the line the default shot actually flies.

Win condition: any recorded projectile contact with `worldcraft-target-bell` before the incumbent ledger closes. First ground still ends the line. An interrupted shot counts only when that contact is already in the ledger. The play notice and the receipt say **BELL BONGED** on a hit. The receipt lists every ledger contact, and the bell row is marked.

On that contact the page plays a synthesized bong: five inharmonic sine partials from 415 Hz, exponential decay, master envelope 1.15 s, no sample and no network. It is scheduled once per shot, on the first ledger contact with the bell. A blocked audio device does not change the shot.

## Sweep

Command, from the repo root, with the installed `@babylonjs/havok` wasm:

```
node scripts/sweep-bell-rail.mjs
```

Raw record: `docs/experiments/wc-exp-20261024-bell-rail-sweep.json`

One `NullEngine` runtime. Gravity and the 1/120 s step are the Worldcraft session's. A layout is compiled once; the 21 delays then call `setLaunchDelay` instead of rebuilding the convex hull. Piece-yaw nudges and aim probes compile again. The run took 96.071651426 s and fired 11890 shots. That count is the 10059 grid trials, plus 1155 piece-yaw shots (1400 sides minus 245 invalid placements that were not fired), plus 662 delay shots, plus 8 aim shots, plus 6 determinism refires.

Seed `20261024` (`mulberry32`) was used only to draw the joint layouts. The lattices are enumerated. Joint draws took 136 attempts to accept 100 layouts that `validateWorld` allowed and that were not already in a lattice.

| Slice | Candidates | Invalid | Layouts fired | Trials | Hits |
| --- | ---: | ---: | ---: | ---: | ---: |
| default | 1 | 0 | 1 | 21 | 0 |
| clear (ramp (−22, 86, yaw 0), bank (22, 86, yaw 90)) | 1 | 0 | 1 | 21 | 0 |
| ramp lattice, bank parked at (14, 28, yaw 0). ramp x ∈ {−8,−4,−2,0,2,4,8}, z ∈ {36,40,44,48}, yaw ∈ {−60,−40,−20,−10,0,10,20,40,60} | 252 | 32 | 220 | 4620 | 0 |
| early ramp lattice, bank fixed at (0, 16, yaw 80). ramp x ∈ {−14,−12,−10,−8,−6,−4,−2}, z ∈ {38,40,42}, yaw ∈ {−5,0,5} | 63 | 0 | 63 | 1323 | 245 |
| early bank lattice, ramp fixed at (−8, 40, yaw 0). bank x ∈ {−1,0,1}, z ∈ {15,16,17}, yaw ∈ {75,80,85} | 27 | 12 | 14 | 294 | 9 |
| late ramp lattice, bank fixed at (−6, 68, yaw 20). ramp x ∈ {−2,−1,0}, z ∈ {40.5,41,41.5,42,42.5,43}, yaw ∈ {15,20,25} | 54 | 0 | 54 | 1134 | 96 |
| late bank lattice, ramp fixed at (−1, 42, yaw 20). bank x ∈ {−7,−6,−5}, z ∈ {67,68,69}, yaw ∈ {15,20,25} | 27 | 0 | 26 | 546 | 0 |
| joint draws | 100 | 0 | 100 | 2100 | 0 |
| **Grid total** | | | **479** | **10059** | **350** |

A layout that appears in two slices is fired once, under the earlier slice. The default pose is not repeated inside the ramp lattice.

## Results

Hit fraction: **350 / 10059 = 0.03479471120389701**.

Every one of those 350 hits touched both the ramp and the bank before the bell. Ramp-only hits: 0. Bank-only hits: 0. Other: 0. Distinct layouts that hit: 46, all of them both-piece. No hitting shot recorded a shield contact.

Two contact orders, each one pose cluster (linkage fixed before the run: same signature, both pieces within Δx ≤ 4 m, Δz ≤ 4 m, Δyaw ≤ 15°; a cluster is kept at size ≥ 3). Delays are not part of the linkage. A layout that hits at several delays stays one layout.

1. `bank>ramp>bell`, 254 trials, 37 layouts. Medoid ramp (−10, 40, yaw 0), bank (0, 16, yaw 80), delay 5.5 s. Bell contact at t = 4.366666666666673 s, point (−25.837810516357422, 2.147751808166504, 58.131683349609375). This family's trials cover all 21 delay steps. 245 came from the early-ramp lattice and 9 from the early-bank lattice.
2. `ramp>bank>bell`, 96 trials, 9 layouts. Medoid ramp (−1, 42.5, yaw 20), bank (−6, 68, yaw 20), delay 2.5 s. Bell contact at t = 6.858333333333464 s, point (−26.639320373535156, 0.44833439588546753, 58.752716064453125). All 96 came from the late-ramp lattice. The late-bank lattice, which moves that bank and keeps the ramp, hit nothing. This family has a gap: no hits at delays 4, 4.5, 5, 5.5, 6, or 6.5 s.

Default misses at all 21 delays. Terminal is (0, 0.43, 69.766) every time, reason `first-ground-contact`, contacts `worldcraft-object-ramp-yours` then `worldcraft-ground`. Closest approach of the ball centre to the bell centre, sampled every step, is 26.122425041027995 m at delay 7.5 s. The farthest of those 21 minima is 29.563 m at delay 3.5 s. Delay alone does not solve the supplied layout. The parked clear layout also misses.

### Nudges

Piece yaw, one movable piece at a time, ±5°, same delay. An invalid placement counts as applicable and not survived. All 350 hits were nudged.

| Nudge | Survived / applicable | Fraction | Invalid | Still the same contact class |
| --- | ---: | ---: | ---: | ---: |
| Piece yaw ±5° | 24 / 1400 | 0.017142857142857144 | 245 | 24 |
| Delay ±0.5 s | 488 / 662 | 0.7371601208459214 | 0 | 488 |

38 delay sides were not applicable because the hit was already at 0 s or 10 s (350 × 2 − 662 = 38). Every survivor stayed `both`. Half a second of delay usually keeps a hit. Five degrees of piece yaw usually does not.

Launch aim was probed only on the two kept medoids, because the player cannot change it on this rail. Yaw ±5° and elevation (pitch) ±5° from (0°, 18°), same pieces and the medoid's delay. All 8 shots missed.

| Medoid | yaw +5° | yaw −5° | pitch +5° (elevation 23°) | pitch −5° (elevation 13°) |
| --- | --- | --- | --- | --- |
| `bank>ramp>bell`, delay 5.5 | miss, bank only, out of bounds | miss, bank>ramp | miss, bank>ramp | miss, bank only |
| `ramp>bank>bell`, delay 2.5 | miss, ramp | miss, ramp | miss, ramp | miss, ramp |

### Determinism

Each check was compiled and fired twice. Outcome equality is status, terminal reason, landing rounded to 0.1 mm, and each contact's body, count, and first/last time rounded to 0.1 ms.

| Check | Match |
| --- | --- |
| Default, delay 0 | yes |
| First `bank>ramp>bell` hit in the file | yes |
| First `ramp>bank>bell` hit in the file | yes |

A separate two-second step of the default shot, same process, put the bell mesh 3.552713678800501e-15 m from the formula above.

The in-session check in `tests/worldcraft-bell-rail.test.mjs` refires the early layout (ramp −8, 40, yaw 0; bank 0, 16, yaw 80; delay 1 s) without rebuilding and matches contact bodies and first-contact times within 1e-6 s. `setLaunchDelay(1.5)` on that same layout is also a hit, order `bank>ramp>bell`. The late layout (ramp −1, 42, yaw 20; bank −6, 68, yaw 20; delay 0) hits with order `ramp>bank>bell`. The default misses at all 21 delays in that test as well.

## What this says about the question

On this grid the moving bell does not collapse to ramp-only plus timing. The circular orc did: 444 of 449 hits were ramp-then-orc, with the bank uninvolved. Here 350 of 350 hits are both-piece, in the same two contact orders the stationary orc already had (`bank>ramp` and `ramp>bank`). The delay is a real second control. A neighbor one step away still hits about three quarters of the time, and the early family has hits on every delay step, which is the shuttle coming back. It is not a substitute for the bank. The ramp lattice, bank left where the supplied world parks it, was 0 hits in 4620 shots.

The shield was not touched. It sits between the centerline and the rail, and the bank is what carries the ball into that pocket. This sweep does not show a bounce off the shield.

Nothing here measures whether a person wants to revise, or whether the shuttle feels learnable in the hand. The hit rate is not comparable to the stationary orc or the loop as a percentage: the grids are different. The comparable fact is the mix of families.

## Checks

- `npx tsc --noEmit --pretty false` passed.
- `npm test` (`npm run build`, then `node --test tests/*.test.mjs`) passed: 483 tests, 0 failed.

Rendered page, Chrome at `http://localhost:5173/lab/worldcraft`, survey view. Opened Bell Rail and set the early layout: ramp (−8, 40, yaw 0), bank (0, 16, yaw 80), delay 1.0 s. Fired the fixed rail. The receipt read **BELL BONGED**. Ledger: `worldcraft-object-bank-yours` first 0.225 s, `worldcraft-object-ramp-yours` first 1.433 s, `worldcraft-target-bell` first 4.308 s at (−25.22, 2.84, 57.97), `worldcraft-ground` first 5.758 s. The cyan trail shows that same bank-then-ramp path into the bell. That is the early family, not the late one.

## Not verified

- Whether anyone wants to revise a layout, or whether the rhythm feels fair rather than lucky.
- A second browser, phone layout, and touch dragging.
- That the bong is audible. The scheduler is unit-tested against a fake `AudioContext`. This browser run did not play the tone out loud; the machine's audio device was not checked.
- The late family in the browser. The click-through above is only the early layout. Headless Havok already cleared `ramp>bank>bell`.
- Whether a ramp-only hit exists outside this lattice and the 100 joint draws. Those draws were empty, which is not a proof that the rest of the yard is empty.
- Railyard, Timber Courtyard, its art, Free Play, and the shot-physics constants. They were not edited. No deploy and no pull request.
