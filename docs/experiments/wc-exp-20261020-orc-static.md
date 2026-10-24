# Orc Stand-in (wc-exp-20261020-orc-static)

This file records the sweep from before resonant pieces. On `lab/wc-exp-20261024-resonant`, `createOrcStaticWorld` adds a material and a pitch to the ramp and the bank, plus a plate. `docs/examples/worldcraft-orc-static.json` is still the pre-resonance copy. The resonant world is `docs/examples/worldcraft-resonant.json`. See [wc-exp-20261024-resonant.md](wc-exp-20261024-resonant.md).

Smallest working Worldcraft challenge for experiment B. House Shot is unchanged.

Research question: what kind of goal makes a player revise a multi-piece layout? Hypothesis: a physical opponent payoff (a stand-in orc) is more motivating than a gold circle. This document does not measure players. It records a level where the default misses and two distinct layout families both bonk the same stand-in, so that question can be asked later.

## Win

Any recorded projectile contact with the body `worldcraft-target-stand-in-orc` counts. The orc does not have to be the first body. First ground still ends the line. An out-of-bounds ending still counts when the orc contact is already in the incumbent ledger. A contact Havok would report only after that ledger has closed does not count.

The play notice and the receipt both say `ORC BONKED` on a hit. The receipt lists every ledger contact, and the orc row is marked.

## World

Document id `orc-static-v1`, name `Orc Stand-in`. A copy is `docs/examples/worldcraft-orc-static.json`. Route `/lab/worldcraft`. Open it from Worlds & lines → Orc Stand-in, or from the House Shot goal panel → Open Orc Stand-in. Reset is the same control once this world is loaded. The lab still opens on House Shot.

Fixed rail, same numbers as House Shot: yaw 0, elevation 18, charge 0.55. Launcher origin 0. The player may move one ramp (`ramp-yours`) and one bank (`bank-yours`). The shield block is locked.

| Piece | Kind | x | z | yaw |
| --- | --- | --- | --- | --- |
| ramp-yours (default) | ramp | 0 | 42 | 0 |
| bank-yours (default) | bank | 14 | 28 | 0 |
| shield (locked) | block | -10 | 52 | 0 |
| stand-in-orc | target | -26 | 58.5 | 0 |

The stand-in is a placeholder box, not a new prefab and not a capsule. Size 1.1 × 2.3 × 0.8 m, center 1.15 m off the ground. Friction 0.8 and restitution 0.1, copied from the dull block. Three face boxes (two eyes, a mouth) sit on the local −Z face and have no collider. The body is a static Havok box named `worldcraft-target-stand-in-orc`. It is not pickable.

The shield sits between the centerline and the orc. In this sweep, no hitting shot recorded a shield contact.

Shot physics is the incumbent Worldcraft runtime: gravity 12, projectile mass 1.5, radius 0.43, 120 Hz Havok, substep 1000/120, first-ground termination. Those constants were not edited.

## Sweep

Command: `node scripts/sweep-orc-static.mjs`

Raw record: `docs/experiments/wc-exp-20261020-orc-static-sweep.json`

- Havok wasm: `node_modules/@babylonjs/havok`
- Seed: `20261020` (`mulberry32`), used only for the 180 joint draws
- Each layout is one unique ramp pose plus one unique bank pose. Overlaps and footprints outside the yard were not fired.
- Linkage, fixed before this run: same contact signature, and both pieces within Δx ≤ 4 m, Δz ≤ 4 m, Δyaw ≤ 15°. A cluster needs at least 3 hits.
- Nudge set, applied to each cluster medoid: one piece at a time, yaw ±5° or x/z ±0.5 m (12). Invalid placements are counted apart from misses.

Slices that were actually fired:

| Slice | Fired | Hits |
| --- | ---: | ---: |
| default | 1 | 0 |
| clear (ramp parked at (−22, 86, yaw 0), bank parked at (22, 86, yaw 90)) | 1 | 0 |
| early exemplar, ramp (−8, 40, yaw 0), bank (0, 16, yaw 80) | 1 | 1 |
| late exemplar, ramp (−1, 42, yaw 20), bank (−6, 68, yaw 20) | 1 | 1 |
| centerline ramp at (0, 42), yaw −40/−20/20/40, default bank | 4 | 0 |
| early ramp lattice, bank fixed at (0, 16, yaw 80) | 62 | 14 |
| early bank lattice, ramp fixed at (−8, 40, yaw 0) | 14 | 1 |
| late ramp lattice, bank fixed at (−6, 68, yaw 20) | 53 | 6 |
| late bank lattice, ramp fixed at (−1, 42, yaw 20) | 26 | 0 |
| joint draws | 180 | 0 |
| **Total** | **343** | **23** |

Yaw 0 of the centerline ramp is the default row, so it is not repeated in the centerline slice. The early-ramp and late-ramp slices omit the exemplar pose already fired. The late-bank slice includes the late exemplar's bank pose only as that earlier shot.

The 343 shots took 1.43 s. The 24 medoid nudges ran in the same process after that timer.

## Results

Hit fraction: **23 / 343 = 0.06705539358600583**.

Two clusters, different contact order:

1. `bank>ramp>orc`, 16 layouts. Medoid ramp (−10, 40, yaw 0), bank (0, 16, yaw 80). Orc contact at t = 4.333333333333338 s, point (−25.418365478515625, 2.4268908500671387, 58.104557037353516). 11 of these 16 ended on first ground, 5 out of bounds after the bonk. The ramp x values run from −14 to −4, with the bank held at yaw 80 except one neighbor at bank z = 17.
2. `ramp>bank>orc`, 7 layouts. Medoid ramp (−1, 42.5, yaw 20), bank (−6, 68, yaw 20). Orc contact at t = 6.8083333333334615 s, point (−26.267274856567383, 1.4810549020767212, 58.90208053588867). 3 ended on first ground, 4 out of bounds after the bonk. These seven keep the bank at (−6, 68, yaw 20) and move the ramp around yaw 20.

Default misses. Terminal (0, 0.43, 69.766), reason `first-ground-contact`, contacts `worldcraft-object-ramp-yours` then `worldcraft-ground`. No orc contact. The parked clear layout also misses: terminal (0, 0.43, 46.148), ground only. The four other centerline ramp yaws miss as well, with terminals (15.001, 0.43, 77.14), (9.69, 0.43, 72.24), (−9.69, 0.43, 72.24), and (−15.001, 0.43, 77.14). None of the 180 joint draws hit.

Fragility of the medoids:

- Early medoid, 12 nudges, 10 valid, **6 still hit** (0.6). Ramp x ±0.5 m and ramp z ±0.5 m still hit. Bank x +0.5 m and bank z +0.5 m still hit. Ramp yaw ±5° misses (`bank>ramp`). Bank yaw −5° misses (`bank>ramp`). Bank x −0.5 m misses (`bank` only). Bank yaw +5° and bank z −0.5 m are invalid placements.
- Late medoid, 12 nudges, 12 valid, **2 still hit** (0.16666666666666666). Only ramp z ±0.5 m still hits. Ramp yaw ±5°, ramp x ±0.5 m, and every bank nudge miss. Those misses still touch ramp then bank.

The early family tolerates half-metre slides of the ramp and some slides of the bank. Both families lose the bonk when the hitting piece's yaw changes by 5°. The late family is the thin one: aside from sliding that ramp half a metre along the yard, the ±5° / ±0.5 m set misses.

## What this does not answer

No player sat this level. The motivation hypothesis is not measured here. The sweep shows that a stationary stand-in can be unreachable from the authored default and still reachable by two layout families whose contact orders differ (`bank>ramp>orc` and `ramp>bank>orc`).

Not verified in this run:

- A player session, a comparison against House Shot's gold circle, or any claim that the orc makes people revise more.
- Phone layout. A Cloudflare preview was not posted for this branch.
- The late family in the browser. The UI check fired only the early layout (ramp −8, 40, yaw 0 and bank 0, 16, yaw 80). The receipt showed `ORC BONKED` and a contact on `worldcraft-target-stand-in-orc` at about (−25.42, 2.43, 58.10), first 4.333 s. The late family is headless-only in this run.
- Whether a third family exists outside these lattices. The joint sample of 180 was empty of hits, which is not a proof that the rest of the yard is empty.
- Art. The stand-in is the placeholder box described above. Screenshots of the rendered lab are in the run artifacts: the default world, the Worlds & lines dialog, a closer view of the face, and the early-layout bonk.
