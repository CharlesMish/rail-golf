# Stone Circle — technical appendix

## Scope and provenance

Stone Circle is an isolated Worldcraft experiment based on `lab/wc-exp-20261115-amphi-stage` at `262323c1b694f2b4e15e9328f4d6d7320e1e8d37`. Centre Stage and the other historical Foundry worlds remain available; this is a separate world and a different physical representation. Its contact paths are not expected to be identical to Centre Stage. The comparisons below combine the earlier Phase 3 report with new, explicitly identified Havok probes on the experimental working tree.

The described real amphitheater photograph was not available in the supplied attachments. The architectural assessment uses the written brief and the existing world; it is not a visual comparison against that photo.

## Architectural and physical judgment

A visual surface, its collision representation, and its musical identity are separate decisions. An annular horseshoe is concave: one convex hull would fill the central space and be incorrect. A static triangle mesh or a compound collider may reduce bodies, but neither is automatically cheaper or equivalent; contact behavior, event identity, seams, and disposal need their own verification.

Stone Circle instead uses three broad, solid, concentric courses with eight 24° convex facets each. Each course is 4 m deep, with top heights 0.75, 1.5, and 2.25 m, a 216° span and a 24° opening. Each visible stone course is a single combined rendered mesh made from the same facet geometry as the underlying colliders. The physics still consists of 24 distinct hulls, not three collision bodies. Each course has one existing timber voice; no scripted tune or new instrument is introduced. The faceted approximation is visible and physical, rather than a smooth visual curve backed by a mismatched hidden collider.

This is a genuine physics change: at radius 20 m, a 24° chord has approximately 0.437 m of sagitta, about the 0.43 m projectile radius. The 12° baseline deviates less. The coarser curvature changes normals and contact locations and deserves owner judgment and more seam testing. The launcher remains at the central station, facing the seating. In this opt-in environment the old apron tee is removed physically as well as visually, and the presentation track is disabled; the ordinary ground remains the first-ground surface.

The earlier 875-shot Centre Stage grid found no two sound events separated by its 150 ms grouping threshold. Fifty shots hit two tiers, but those contacts were inside that threshold. The first-ground rule did not terminate shots at a terrace: the issue in the sampled geometry was how the launch and contacts continued. This does not establish that a cascade is impossible, and it does not mean a return needs to become a cascade. The more modest question here is whether a stage launch can meet the courses and travel meaningfully inward, with occasional physical sound sequences as a bonus.

## Physical probes

These probes use Babylon/Havok at 120 Hz. A contact time is elapsed time from launch. Onsets within 150 ms are grouped for this analysis; grouping is not a substitute for listening. Return distances below measure a reduction in distance to the terrace centre after the outward leg, not necessarily a landing inside the central stage. A ground contact ends the shot.

| World and setup (yaw / elevation / charge) | Contact sequence and outcome |
| --- | --- |
| Centre Stage, −24° / 8° / 0.35 | Step 3 at 0.442 s, then ground within the stage radius at 2.933 s; inward movement 13.41 m. |
| Centre Stage, −24° / 8° / 0.65 | Step 5 at 0.408 s and step 4 at 0.458 s: 50 ms apart, one onset group by the 150 ms convention. |
| Centre Stage, −24° / 8° / 0.36 | Steps 3 → 2 → 4 → 0 at 0.442, 2.850, 4.858 and 6.500 s, then ground at 7.342 s; recorded gains were 0.460, 0.433, 0.284 and 0.186. An elevation increase of 0.5° changes this sequence. Charge 0.36 was not part of the earlier 0.35/0.45/0.55/0.65/0.8 grid; the earlier zero result is not a proof that separated sequences cannot occur. |
| Stone Circle, −24° / 8° / 0.35 | Steps 1 → 2 → 1 → 0 at 0.542, 0.550, 0.958 and 1.533 s; ground at 2.367 s. Corresponding recorded gains were 0.040, 0.611, 0.016 and 0.058. These form three onset groups by the 150 ms convention, though low-gain events may be difficult to hear. |
| Stone Circle, 0° / 8° / 0.45 | Step 2 at 0.458 s, then ground at about 2.96 s; the path moved 15.38 m inward. This is the preset opening; the measured terminal is outside the 8 m stage radius, so this is an inward return, not a stage landing. |
| Stone Circle, +0.5° / 8° / 0.45 | Step 2 at 0.458 s → step 1 at 2.900 s → ground at 5.175 s, with gains 0.702 and 0.513. This sequence was repeated twice in the probe. |

For the Stone Circle −24° / 8° / 0.35 example, all six adjacent control changes (yaw ±0.5°, elevation ±0.5°, charge ±0.01) produced at least 7.59 m of inward movement; two of six retained at least two onset groups. Around the preset opening, five of six returned at least 8.1 m inward, while elevation +0.5° returned only 0.12 m. Around +0.5° yaw, three of six nudges retained at least two onset groups. These are local examples, not population-wide rates or guarantees of an audible melody.

The default shot strikes at a facet seam, with two simultaneous facet normals. Yaw 0° and ±0.5° all struck step 2 and returned inward, though their subsequent paths differed. This probes one seam impact; it does not establish that a projectile rolls across or traverses facet seams without snagging. The earlier Phase 2 probe likewise did not demonstrate sliding across a seam. No human listening was performed.

## Resource and performance comparison

New measurements below use separate fresh Node/Babylon NullEngine/Havok processes, with no rendered browser frames or shadow generator. Initial scene compile is a single measurement in each process, not a distribution. The six reloads time validation, compilation and disposal together; those reload times should not be directly compared to the initial-compile timer. Materials and meshes are counts in this harness, not draw calls.

| Measure | Centre Stage | Stone Circle |
| --- | ---: | ---: |
| Static bodies | 110 | 25 |
| World-scene meshes | 110 visible | 28: 24 hidden physics meshes, 3 visible course meshes, ground |
| World shadow-caster registrations, mock | 109 | 3 |
| Materials | 7 | 8 |
| Initial scene compile, one fresh process | 129.19 ms | 42.58 ms |
| Six reloads, median | 230.78 ms | 16.83 ms |
| Physics bodies after runtime disposal | 0 | 0 |

Baseline reloads in milliseconds: 235.54, 727.56, 226.17, 230.09, 231.47, 191.70. Candidate reloads: 32.78, 44.50, 17.05, 16.24, 16.62, 14.67. Body, mesh and material counts stayed constant on all six reloads. A separate run used a recording shadow-caster mock: it registered the world casters above, and all registrations were removed on disposal. These counts exclude launcher, projectile, and presentation objects and are not browser-wide counts.

For context, the earlier Phase 3 report measured Centre Stage at 140 ms browser rebuild, 236 draws and median/max idle frame periods of 31.4/35.9 ms in a 1280×800 headless Chrome SwiftShader run. It reported 110 static bodies and zero bodies after disposal. That previous software-rendered observation is not a candidate measurement and is not a proxy for a phone or a player's GPU. Candidate browser draw calls, shadow casters, cold/warm browser build, frame timing, and camera visibility could not be verified in this environment. The earlier camera report sampled six frames for one shot and three for another; it did not prove full-flight visibility.

## Compatibility and verification status

The new `amphitheater-place-v1` environment and explicit `facetDegrees: 24` are opt-in. Existing terraces omit the field and retain 12° facets. Stone Circle's world document retains its environment, station, facet width and identity through the tested export/import and remix paths. Its invisible collider meshes carry the same geometry as the visible courses; visual-only meshes are excluded from muzzle-clearance collision checks. The new environment removes the old tee rather than merely hiding a live collider. Ground still ends a shot; the terrace is not ground. Projectile mass and radius, gravity, charge and elevation mapping, resonant contact properties, committed shot behavior, and audio synthesis were not intentionally changed.

An independent live-runtime swap from Stone Circle to Centre Stage and back restored the old tee and body counts (25 → 110 → 25); disposal returned the body count to zero. The visual track switch still needs browser verification. The candidate-specific automated tests exercise document round-trip and identity, 24 facets and 25 static bodies, the tee's absence, a real Havok launch and inward movement followed by first ground, three repeated loads, and disposal to zero bodies. The full `npm test` run passed 566 tests and its production build; `npm run typecheck` also passed. Historical bowl-byte and v1 export-hash regressions passed. Browser verification remains unavailable in this environment. These regressions support the unchanged-world contract; they do not reproduce every possible historical shot.

No phone, player GPU, speaker listening, full-flight camera trace, or owner play was tested. These are necessary to judge presentation, audibility and whether the place is compelling to revisit.
