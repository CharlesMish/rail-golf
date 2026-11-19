# Lane E — radial return feasibility

The exact proposed geometry works without modification. The originally proposed shot gives a robust **wall → middle top → skip inner** return. A second setup on the ordinary control detents gives **wall → middle top → inner top**. The latter is more sensitive, and its immediate alternatives include an inner-edge hit, a longer wall/shelf detour, and a clean skip. This establishes a small useful physical relationship; it does not establish a full amphitheater design or human enjoyment.

## Authority and scope

- Branch: `research/horizons-return-20261119`.
- Start and physical engine authority: `6ebb2f2b370656c7e70b108ad04d0369b78cf89c`, the exact reviewed Stone Circle candidate. Its ancestor is neutral Foundry `0b151c5c94849b78ccda6c41a1755b66471e3fa2`.
- This branch adds data, registration, evidence and tests. It does not change the engine, coefficients, gravity (12 m/s²), ball mass (1.5 kg), ball radius (0.43 m), charge curve, 120 Hz cadence, first-ground semantics, existing world data, scoring or progression.
- The study uses the existing station extension, existing stock bank and plate lift/tilt. It needs no curved terrace or new collider. It remains on the separate amphitheater dependency branch, rather than promoting that branch into general Horizons research.
- The physical document and any future challenge identifier remain separate; the current world identity still includes existing rule state. No claim of a full identity-schema split is made.

The new Foundry pair is `worlds/foundry/radial-return/{preset,manifest}.json`. The gallery invitation contains no solution. There is no challenge. All geometry is fixed in the study; the launcher remains free. Existing Make a copy, Keep and Restore behavior is reused.

## Geometry

| Element | Placement | Actual physical surface |
| --- | --- | --- |
| Launch station | x0, z32, facing +z | Existing stopped station, unchanged muzzle and speed mapping |
| Stock bank | x0, z52, yaw0 | 12 × 7 × 1 m box, top y7 |
| Middle plate | x0, z48, lift3, tilt90 | 4 × 4 × 0.35 m box, top y3.35, spans z46–50 |
| Inner plate | x0, z42, lift1, tilt90 | Same box, top y1.35, spans z40–44 |

These are exactly the requested coordinates. Lift denotes the lowest point of the rotated box, not its centre. The visible meshes and Havok boxes share these transforms. Height guides are non-colliding lines. No surface is relabeled ground or given a special redirect. This is a plain physical study, not architectural terrain.

## Measured interactions — numerical spoilers

All measurements use the production session authority through Worldcraft and actual Havok in Node/Babylon NullEngine. A callback's elapsed time precedes the end of its solver step by 1/120 s. Velocities below bracket the contiguous callback episode; they are measured solver state, not an analytic reconstruction. Normals are raw Havok event normals; on these top contacts they point down into the other body.

| Shot, origin0/yaw0 | Physical episode | Time (s) | Point y,z (m) | Normal x,y,z | Incoming vy,vz → outgoing vy,vz (m/s) |
| --- | --- | ---: | --- | --- | --- |
| Original 30° / 25% | Bank front | 1.1000 | 5.270, 51.472 | 0,0,1 | −5.560,+13.233 → −3.371,−11.298 |
| Original | Middle top | 1.3917 | 3.374, 47.869 | 0,−1,0 | −6.671,−11.298 → +5.660,−10.075 |
| Top descent 32° / 22% | Bank front | 1.2167 | 4.533, 51.441 | 0,0,1 | −7.092,+12.015 → −5.122,−10.273 |
| Top descent | Middle top | 1.3417 | 3.367, 49.871 | 0,−1,0 | −6.422,−10.273 → +5.444,−9.095 |
| Top descent | Inner top | 2.5417 | 1.421, 40.127 | 0,−1,0 | −8.756,−8.093 → +7.460,−7.892 |

Original: 0.2833 s of free flight from the last bank callback to the first middle callback, then 1.3583 s from the final middle callback to first ground. It lands at `(0, 0.430001, 35.411930)` at 2.7667 s. It clears the inner plate rather than touching it.

Top descent: 0.1167 s from bank to middle and 1.1917 s from middle to inner. It lands at `(0, 0.430005, 28.812784)` at 3.9750 s, past the station in the inward direction. Both receiving contacts have vertical normals, downward incoming velocity and upward departure. The inner point is near its inward edge; this explains some sensitivity.

The contact ledger merges consecutive callbacks on one body even across repeated bounces. The measurement harness therefore records separate contiguous contact episodes. A ledger `wall → middle → inner` alone is not accepted as proof of exactly three contacts.

## Sensitivity, controls and failures

The primary original shot retains its clean **wall → middle top** sequence in all six aim/power neighbors (yaw ±0.5°, elevation ±0.5°, power ±1 percentage point), and both origin ±0.5 m neighbors: **8/8**. All remain first-ground endings. The return is not confined between slider detents.

The clean all-three setup retains the same top-to-top sequence for yaw ±0.5°, elevation −0.5°, and origin ±0.5 m: **5/8** neighbors. Elevation +0.5° hits the inner edge (ny≈−0.668), power −1% makes a wall/middle detour before inner, and power +1% cleanly skips inner. Therefore the longer route is a real accessible option, but it should not be presented as uniformly forgiving.

| Control | Original setup result | Top-descent setup result |
| --- | --- | --- |
| Three-piece study | Wall → middle; ground2.7667 s, z35.412 | Wall → middle → inner; ground3.9750 s, z28.813 |
| Same layout without bank | No piece contact; ground1.6500 s, z58.320 | No piece contact; ground1.6417 s, z56.117 |
| Bank alone, both shelves removed | Wall; ground1.7750 s, z43.538 | Wall; ground1.7333 s, z45.848 |
| Stone Circle, same relative launcher controls | No course contact | No course contact |
| Stone Circle, derived station facing +z, identical global launch | No course contact; ground1.6500 s, z58.320 | No course contact; ground1.6417 s, z56.117 |

Stone Circle retains its original −120° station facing. Its matched-controls rows are contextual comparisons, not coordinate-identical experiments. Its own opening 0°/8°/45% still strikes step2 and returns inward, ending at 2.9667 s at `(10.476,0.430,38.890)`. This does not establish that the curved world can never produce a longer descent. The no-wall and wall-only rows are the causal geometry controls.

The supplemental `heading-control.mjs` also creates a non-registered Stone Circle copy facing +z, with every course unchanged. It asserts that the full launch record (station, rail, muzzle, direction and speed) equals Radial Return's. Both shots then reach ground without a course contact at exactly the same terminal as the no-wall control. This is a coordinate-matched negative, not a favorable setup for Stone Circle or an assessment of its other available lines. The native preset is unchanged; complete rows are in `heading-control.json`.

The shelves do more than decorate a rebound: they create a fresh upward departure after inward reflection, extend the journey, and allow an optional second receiving top. Removing the bank eliminates the returns; removing the shelves shortens the same reflected lines to a single return and ground.

A preserved failed interpretation is 0°/34°/21%: bank → middle edge → middle top → inner top, ending6.25 s. Its first middle normal is `(0,−0.924,−0.383)` and the edge slows horizontal travel sharply. It is interesting physics but not evidence for a clean three-contact descent. Another negative, 0°/30°/39%, clears every piece and lands at z72.236 after2.0167 s.

Search stayed bounded: a 70-shot coarse grid, then147 shots around the original elevation/power neighborhood. No geometry or physics coefficient was optimized. Counts are search provenance, not player discoverability or enjoyment evidence.

## Cost and lifecycle

Same Node process, actual Havok, NullEngine. Times are noisy shared-host measurements, not rendering budgets. Initial construction includes validation and session creation; rebuild includes replacement and old resource disposal. The six rebuild observations are stored individually in `evidence.json`.

| Runtime-only measure | Wall only | Radial Return | Stone Circle |
| --- | ---: | ---: | ---: |
| Static bodies (ground and old apron tee included where present) | 3 | 5 | 25 |
| Live projectile while firing | 1 | 1 | 1 |
| Total scene meshes in harness | 3 | 7 | 28 |
| Visible meshes | 3 | 7 | 4 |
| Materials | 7 | 9 | 8 |
| Textures | 0 | 0 | 0 |
| Shadow-caster registrations, mock | 2 | 4 | 3 |
| Initial runtime construction, one observation | 1.35 ms | 4.58 ms | 75.08 ms |
| Rebuild median, six observations | 0.90 ms | 4.35 ms | 44.07 ms |

Radial Return has five body meshes plus two non-colliding height guides. Stone Circle has24 hidden facet collider meshes, three visible stone meshes and ground. The counts exclude the app's scenery, launcher, UI and camera. They are not draw calls. Six load/fire/reset cycles per world retained stable body/mesh/material/texture/caster counts. Twelve interleaved Stone Circle/Radial Return/no-wall switches also retained their expected counts. Disposal left **zero bodies, meshes, materials, textures and registered casters**. Repeating the original shot produced identical recorded contacts, measured episodes, trajectory samples and terminal in this process.

Browser WebGL was unavailable in the root session. No rendered desktop or phone inspection, draw-call count, browser frame timing, GPU memory measurement, speaker listening or physical-phone claim is made. Resource disposal counts support cleanup; they do not measure JS heap reclamation. Existing station camera code is reused and still needs real rendered review, especially on the inward leg.

The authored physical candidate is `24fd7c7561e6a4a9da896b292bf43c98c530d383`. Its subsequent presentation repair adds a safe `?foundry=radial-return` entry link and changes only this registered world's entry and **Center Survey** home to `{angle:0.55,elevation:0.38,radius:46,x:0,z:46}`. It does not fire a shot or alter imported data, saved memory, physical geometry, Address, or any historical station's frame.

An independent geometric projection audit used the observed390×260 phone canvas. The original home placed the wall at y41–78 px and middle shelf65–76 px, overlapping the vertical band of the phone Survey controls at y43–87 px. The selected view moves the wall to77–133 px, middle shelf106–119 px and inner shelf129–147 px; the full launcher remains inside the canvas at x110–159/y125–181 px. The launcher and all three structures also fit the desktop view. These are projection bounds, not rendered verification: the wall's upper strip can still share the controls' vertical band, and no occlusion, final readability or full-flight camera comfort is certified without WebGL.

## Decision

Preserve this prototype and stop the lane here. It answers the bounded physical question without another amphitheater redesign. If it is pleasant to play, future amphitheater architecture should protect the **upper reflecting face, separated lower receiving tops, and bypass space** as independent relationships. Do not infer that concentric step count, curvature or a large seating bowl supplies those relationships automatically.

The strongest evidence is the robust two-surface return with an optional longer descent. The next evidence should be whether an owner can see and intentionally alter that return, including whether the inner shelf offers a meaningful choice. No new generic authoring field is justified by this lane: the selected experimental baseline already expresses it. Ordinary authors would need validated plate pose and launch-station support promoted deliberately, rather than the whole Stone Circle dependency.

## Reproduction

```sh
node docs/experiments/horizons/return/reproduce.mjs --scan
node docs/experiments/horizons/return/heading-control.mjs
node scripts/foundry/validate.mjs worlds/foundry/radial-return
node --test tests/worldcraft-radial-return.test.mjs tests/worldcraft-elevation.test.mjs
npm run typecheck
npm run lint
npm test
```

`evidence.json` records complete representative contact episodes, two actual sampled trajectories, nearby terminal results, controls, timing and cleanup. The manifest pins four replayed cases including edge detour and overflight. Numerical setups remain in this appendix, tests and raw evidence, not the gallery invitation or owner protocol.

Recorded checks on the physical candidate: TypeScript passed; production build passed; lint passed with pre-existing repository warnings (the new evidence scripts have no warnings); all **569 repository tests passed** after adding the new world's explicit gallery and rules-copy expectations. The Foundry validator replayed all four manifest cases successfully. The focused radial/elevation suite passed10/10 and the gallery/panel suite8/8. The subsequent Survey/link presentation repair passed TypeScript, a fresh production build and all10 existing station/panel camera-source checks. No existing test was removed or relaxed.
