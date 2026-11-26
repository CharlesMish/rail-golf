# Exchange Yard: the maintenance canopy

The selected addition is one coherent receiving region, not a new district. It occupies x14…36 m, z4…24 m, opposite the signal house centered x−24 m,z16 m. Its roof has a flat soffit at5 m and a visibly faceted barrel crown at9 m. Four stout piers leave an open passage underneath. There is no new station, world bound, force or projectile rule.

Base: PR86 `21f18bec3286c6c63d094cb1a8ea2135081bdef6`. Architectural branch: `research/architectural-forms-20261126`. First implementation: `9afffe9ae6badc8950e1138099170781f367a796`; camera/tests: `0f07d74`. Roof presentation dependencies were integrated as `61c5726` and `b2ab7df`. Measured source: `b2ab7df9023a8875c79b18910b91383c97cf1760`; exact source hashes are in the evidence packet. Final published endpoint belongs in the director ledger/PR.

## Physical purpose and form

Freight already offers roof→viaduct journeys. Two named versions formerly fell to the street beyond the crossing; the canopy now receives them. A direct carry and a crossing→canopy route provide other approaches. This is primarily the benefit of adding a receiver in the right place: a flat canopy supports several of the same Freight contact sequences.

The barrel crown earns its extra geometry through Forecourt departures. A shot reaching its inclined western flank lifts and steers toward the station hall. The same launch against a same-footprint flat roof, with the same5 m soffit and9 m crown, instead returns to the street. This hall continuation survives all six neighboring half-degree/one-percentage-point adjustments. A shorter canopy→viaduct relationship survives four of six. The curve changes a continuation, rather than merely decorating a rectangular collider.

The roof is **one convex prism**, with ten planar strips sampling a circular-segment cross-section, extruded20 m. Havok builds a convex hull from the exact rendered vertices. There is no flat box beneath a smooth visual roof, no inter-body roof seam and no curved underside. The solid roof volume between the flat soffit and curved crown is intentional; this is not a hollow masonry arch. The four piers use ordinary matching boxes. No railing, invisible receiver or misleading nonphysical architecture was added.

Forty roof triangles cost28 more than the simpler flat roof. Normals, closed topology and convex supporting planes were checked mathematically. Actual Havok canopy contacts and incoming/outgoing velocities establish collisions on those facets. These checks do not establish its rendered appearance; that still needs WebGL inspection alongside the roof diagnostic candidate.

## Matched accessibility comparison

Every row below uses the same 294 center-rail setups per station: seven yaw values, seven elevations and six ordinary power bands. These sampled outcomes are not player frequency or discoverability rates.

| World / station | Raised-contact shots | New-region shots | New region first | Bounds exits | Over15 s / settled |
|---|---:|---:|---:|---:|---:|
| v2 Forecourt |99|0|0|29|0 /0|
| Canopy Forecourt |120|32|26|32|0 /0|
| Flat control Forecourt |122|36|30|29|0 /0|
| v2 Freight |131|0|0|38|0 /0|
| Canopy Freight |137|13|6|41|0 /0|
| Flat control Freight |138|14|7|42|0 /0|

The flat control touches more sampled settings. Maximum contact coverage is not the reason to choose the barrel crown. The curved departure to the hall, the broad receiving region and its distinct silhouette are the reasons to retain this candidate for owner play. The additional Freight region remains a modest extension, not a claim that every launch-control area has become productive.

All nine retained Forecourt physical records, callback brackets and sampled paths remain exact. Eight of ten Freight controls also remain exact. The two changed roof/crossing examples keep their prior contacts and then encounter the new canopy. They are changed outcomes, not identical replays. Other previously unsampled lines can also change; the new layout has its own identity and the complete v2 control remains selectable.

Five of seven selected positive cases retain their relationship in 6/6 nearby settings. Forecourt canopy→crossing is 4/6. The longer Freight roof transfer is only 1/6 and is preserved as a fragile discovery, not an ordinary starting recommendation. Wide rail changes are meaningfully different launches; their outcomes are recorded separately. High-power canopy strikes can escape the open bounds. The low-power miss reaches terminal street without touching the new region.

## Facets, edges and camera

A61-shot half-degree yaw sweep at one fixed Freight elevation/power reaches the canopy in45 shots. The92 raw canopy callbacks include 90 matching a planar face normal to>.999 absolute alignment. Two callbacks from one eave strike have edge normals between the roof's supporting faces; minimum face alignment is.7985. This is an actual convex-edge interaction, not evidence of a smooth normal field. The largest callback count per shot is 3; maximum duration is 5.7667 s. No shot in this sweep settles. Raw timestamps, points, normals and whole-step incoming/outgoing velocity brackets are retained. They are not isolated per-contact impulses.

The v3 camera clips against the expanded solids and the same barrel supporting planes. The new Forecourt canopy→hall line exposed a 4.046 m frame jump at30 Hz as the camera approached the station eave. A v3-only desired boom stays slightly forward and lower near that facade; measured jump becomes 1.232 m (0.739 m at60 Hz). Original/refined cameras are unchanged.

The final geometric audit covers 21 actual Havok paths, 25,072 sampled frames at five effective canvas shapes and 870 launch views. No sampled line-of-sight obstruction, inside-solid camera, camera-segment penetration or frustum escape remains. Largest post-start step across the audit is1.967 m at30 Hz; minimum ball/camera distance3.180 m. The inherited-boom comparison is separately reproducible. These are geometric checks, not a rendered camera-comfort claim.

## Cost, cleanup and verification

| Ready-world ownership | v2 | Canopy | Flat control |
|---|---:|---:|---:|
| Static bodies |21|26|26|
| Active projectile when fired |1|1|1|
| World meshes / submeshes |24|29|29|
| Shadow casters |20|25|25|
| Solid render triangles |240|328|300|
| Materials including harness/session |17|17|17|

Seven load/fire/retry/fire/reset/dispose cycles per variant preserve the ready counts and leave zero counted bodies, meshes, materials, geometries and casters. Warm scene-build medians in this run are 6.62 ms v2, 6.44 ms canopy and 8.10 ms flat. This noisy NullEngine CPU result is not evidence that the larger world is faster. Rendered draw calls, PCF cost, GPU memory, frame timing and physical-phone performance remain unmeasured. The roof candidate's filtered-shadow cost needs rendered evaluation.

Fourteen focused/new/historical tests pass, including three new architectural-form tests. TypeScript and targeted lint pass. Existing tests were preserved. The root packet records full repository checks and browser observations.

## Reproduction and owner decision

- `node scripts/forms/architecture-measure.mjs` regenerates the matched atlas, named cases, neighbor and rail variants, old controls, flat control, edge sweep and resource cycles.
- `node scripts/forms/architecture-camera.mjs` audits the new camera. Add `--inherited-follow` for the prior desired boom under expanded geometry clipping.
- `architecture-evidence.json`, `architecture-camera.json` and `architecture-camera-inherited.json` preserve concise raw results.
- `architecture-solutions.md` contains numerical recipes; the invitation is in `architecture-owner.md`.

Choose **Canopy** for the v3 candidate, **Refined** for the previous Forecourt/Freight physical world, or **Original** for Forecourt/Service. Each has separate validated memory. None silently restores an old record into new geometry. The ordinary firing controls and qualified redirect rings are retained.

Pursue this addition if the canopy becomes a place the owner deliberately revisits from either station. Archive it if it mostly feels like an extra compulsory bounce after the roof transfer. Do not infer a generic curved-world authoring schema or a need for additional districts from this one code-owned prism.
