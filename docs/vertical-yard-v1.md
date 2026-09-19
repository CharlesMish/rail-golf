# Vertical Yard v1 — return ladder

Route: `/lab/vertical-yard`. Exact v0 experiment control: `ca1cc8fa101dba04520b7930f8c0eae8e918cf04`.

## Question

Can a shot compose upward and downward travel through separated timber faces, while still being able to bypass them? This adds three wall/cheek faces to the existing elevated-apron yard. It does not replace the established terraces, gallery, gantry or far receiver, and it does not create a staircase, chute, target or score sequence.

## Geometry

All coordinates are scene geometry, not shot solutions. Width/height/depth and pitch/yaw are shared by the visible mesh and its ordinary static Havok box.

| Added face | Centre x/y/z (m) | Width/height/depth (m) | Pitch / yaw | Spatial role |
|---|---|---|---|---|
| Low cheek | −10 / 17 / 43 | 14 / 10 / 1.4 | +20° / −65° | Oblique upward/cross-yard departure toward upper or opposite regions. |
| Middle cheek | +12 / 28 / 64 | 14 / 10 / 1.4 | −12° / +28° | A higher, opposite-side face; return down across the void or approach from below. |
| Rear cheek | −12 / 29 / 95 | 15 / 10 / 1.4 | −18° / −20° | A separated return near the gantry/far receiver; an opportunity to redirect a descending high return. |

The rear face is deliberately a return at the upper-gallery level, not a mandatory next higher step. The established gantry and far receiver still supply the highest regions. Centres are more than 20 m apart, faces do not overlap, and the centre, sides and upper void remain open. Thin rear stanchions support each face, have honest static collision bodies, and use the same generic departure authority as other timber/steel structure. They are not hidden catchers. Pale inset timber faces use the existing receiver material; shared sporting equipment and framing are unchanged.

The nine v0 broad solids, ground, apron, original support posts, bounds and launch station are unchanged. `VERTICAL_V0_SOLIDS` remains an explicit source control. The original high-return neighborhood is tested without the additive ladder, while the v1 tests check its new descending continuation.

## Bounded search and selection

The low face was compared at −25°, −50° and −65° yaw using the same coarse 504-launch grid. The shallower faces chiefly rejected shots back toward the apron. −65° provided onward cross-yard departures, including access to upper terraces and the opposite middle cheek, so it was retained.

A short rear-face placement comparison checked a high face around 39 m versus lower placements around the gantry/far return. The final 29 m / z95 placement catches a real descending return rather than merely intercepting the initial upper approach. This sacrifices a fourth altitude band in favor of a useful return relationship; it is not an optimized single chain.

The final scan includes all visible stanchions and the same browser session/Havok authority. Reproduce with `node scripts/scan-vertical-yard-v1.mjs`. Its coarse shots are feasibility probes, not a player exploration distribution. Coordinates for regression shots stay in tests, never in the playable brief.

Across that final 504-launch grid, 52 launches qualified an added broad face across 20 ordered families. Another 11 qualified only an added stanchion; 441 had no qualified ladder/stanchion departure. There were 87 OOB endings. These counts establish alternatives and remaining escape routes, not tuned difficulty or human discoverability.

## Established physical families

- An ascending low-cheek departure crosses more than 20 m laterally and reaches the opposite cheek more than 8 m higher.
- With the same origin and aim, three distinct powers produce low cheek → middle terrace → lower ramp, low cheek → upper terrace, or low cheek → higher opposite cheek. Contact is not an inevitable chain.
- An opposite approach can visit the middle cheek and then the low cheek while descending, reversing the vertical order.
- An existing gantry → far-receiver line now reaches the rear cheek while descending from above 35 m to below 28 m; the ordinary second reflection creates another forward leg before ground.
- Existing low-cheek/ramp/terrace/gallery/cross-space controls can still bypass every added face. A faster low-cheek departure still goes OOB.

No added surface changes gravity, projectile mass/radius, impulse, restitution authority, generic redirect predicates or first-ground-contact termination. Timber faces retain restitution .86 and friction .18; there is no destination-aware force. Qualified departure captions remain non-scoring.

## Verification and unknowns

Fourteen focused tests pass, including six new v1 tests: actual static transforms/materials/supports, non-overlap, ascent and descent, alternative physical families, bypass/OOB, exact Recall/repeated trajectory, incumbent muzzle/speed/camera framing, and the recoverable v0 high-return control. The shared session and accepted production routes are not edited by this lane.

Rendered visual success is **not established** by NullEngine/Havok tests. Charlie should judge whether the pale faces and their support posts read as industrial returns rather than floating objectives; whether both sides of the void remain understandable from the familiar launch frame; and whether a return through a second altitude feels deliberately playable rather than accidental. No score, progression, added mechanism or second station should be introduced to compensate for a poor answer.
