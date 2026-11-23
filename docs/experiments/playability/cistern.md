# Gallery Cistern — playability pass

The owner has now established something the original headless work could not: journeys through this room were enjoyable enough to revisit. This pass preserves those journeys and changes how they can be watched and ended. It does not add architecture to compensate for a camera problem.

| Authority | Value |
| --- | --- |
| Lane branch | `research/playability-cistern-20261122` |
| Exact starting PR #81 source | `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054` |
| Runtime implementation commit | `48cdec9422a38e37c1e115b61febb1b449bedf45` |
| Measured source, including final reproducible audit | `46b2ac4ca8cca6ddd529a5aa8ab921e970c20c15` |
| New route | `/lab/playability-cistern` |
| Preserved original | `/lab/playgrounds-architecture` |
| Physical identity | `playgrounds-ringwell-v1`, unchanged |
| Evidence | [cistern-evidence.json](cistern-evidence.json) |

The director records the later report/integration and published commit IDs. Existing PR #81 and its foundation remain unmodified. The new config references exactly the original world builder, station, bounds, materials and physical identity. All ten representative actual Havok records, impact vectors and sampled paths compare exactly with the original route's config. No projectile, gravity, first-ground, material or cadence change was made.

## What the player gets

The new route starts at the familiar launcher view. Survey remains available before and after firing. During the shot, the controls collapse to **Overview / Follow ball** and **Stop shot**, freeing more of the phone canvas. The camera follows the actual ball from a fixed world orientation, roughly three metres west, four metres toward the entry and fourteen metres above it. It is a nearby overhead follower, not the original distant fixed overview and not a close chase camera that spins around each rebound.

If the short camera boom would look through stone, it rises toward the vertical above the ball. The query uses the same box dimensions and yaw transforms as the visible and physical world. Nothing becomes transparent; no collider is inserted or moved. This fallback relies on Cistern having no ceilings and must not be copied blindly to roofed worlds.

Changing Follow/Overview deliberately cuts to the selected view. Returning to Follow reacquires the current ball and clears the previous-position cache, so the camera does not transport itself by all the distance the ball travelled while in Overview. Retry, Reset and Recall return to the launch view. Natural results hold the last shot view until the player chooses a new view or continues.

**Stop** is distinct from Retry. It records an `interrupted` current attempt at its actual physical time, clears the active ball, and presents an explicit interrupted receipt. It is never labelled a ground landing or a natural settled result. The historical shelf does not accept interrupted attempts; Stop therefore has no Keep option. Naturally ended lines retain the original four-entry Keep/Restore contract and storage namespace. No new save schema or migration was introduced. Reloaded records remain readable by the original route and reproduce the same shot after manual firing.

Result language now distinguishes the outer study boundary, the terminal floor/launch pier, the inherited slow-motion settling rule, and deliberate interruption. The colour/height invitation identifies the existing regions without prescribing a route. More authored geometry is deferred until the revised viewing experience has an owner pass.

## Escapes: real paths, understandable limits

The same 270 ordinary-detent shots reproduce **224 first-ground endings, 43 bounds exits and 3 settled endings**, with no safety timeouts. A bounds exit is crossing x ±65 m, z −20…100 m, y below −8 m or above 85 m. These are outer study limits, not the walls of the room. The visible terminal ground reaches those x/z edges; it is not an invisible collider placed at the architectural boundary.

Forty-one sampled escapes pass over or graze the tops of the main/chamber walls. Two return shots pass over the lower entry wall and eventually cross the negative-z study boundary. The recorded exterior-crossing classifications are fifteen far-wall, thirteen east-wall, ten west-wall, three side-chamber far-wall and two lower-entry-wall cases. A top-grazing contact is retained as a contact, not described as a collision miss.

The high reference escape has no structural contacts, clears the far wall, and crosses z=100 at 3.408 s while its centre is still y=36.967 m. A representative lower-entry return has already hit the far wall and west gallery; it crosses the entry-wall region around y=20 m, above the 18 m wall, then reaches z=−20 at 5.042 s. See the numerical appendix for setups.

No segment between successive 120 Hz projectile-centre samples penetrated any solid shrunk inward by 5 cm in the 270-shot grid. Visible box extents match their actual Havok shapes. These observations do not prove tunnelling impossible for every launch, but they provide no evidence for closing a gap or adding a hidden wall. The real side-chamber opening remains open. Better following and specific boundary receipts address the demonstrated communication problem.

## The long shots are mostly slow top travel

The worst fixture again lasts **40.625 s**. After early west-gallery and chamber bounces, it spends a long tail travelling on the flat receiving tops. At 20.008 s it is near y=10.465 m with horizontal speed about 1.004 m/s. At 25.008 s its centre is y=10.430 m and horizontal speed about 0.866 m/s. It crosses the joined top seam around 25.95–26.14 s, then continues across the west gallery. At 40.008 s it still moves at about 0.560 m/s.

The accepted session ends this as `settled` after speed stays below 0.6 m/s for three seconds; it is not literal zero velocity. The revised receipt says slow motion ended under the settling rule. This is neither a trapped seam nor forty seconds of varied discovery.

A matched broad merged-floor control removes the seam and one body but still lasts **40.808 s**. That control also extends the receiving footprint, so it is not a claim of exact geometric equivalence. The late flat-top travel already establishes why seam repair alone cannot solve the tail. The original report's sloped-floor experiment was not revived. We retain the physical relationships the owner enjoyed and provide Stop rather than quietly changing damping, restitution, ground semantics or time limits.

Fourteen grid shots exceed fifteen seconds; six exceed twenty-five. One neighbouring side-chamber shot still lasts 39.225 s. These negative results remain intact. Stop is a player choice, not proof that the duration problem is solved.

## Sensitivity and camera evidence

All neighbours are available controls: yaw/elevation ±0.5°, power ±1 percentage point, or adjacent rail. Low return retains its family in 8/8 neighbours, high circuit 7/7 legal neighbours, side-chamber return 8/8, and opposite gallery tops 5/8. The final family is still a secondary discovery with sensitivity. These counts establish local physical expression, not a discoverability rate or enjoyment score.

The camera audit uses recorded full-cadence physical paths and independent Babylon mesh-ray intersections. Ten fixtures, including failures and the longest tail, were evaluated at 1440×900 and 390×844 at 60 Hz, and 844×390 at 30 Hz: **13,930 viewing samples, zero blocked ball sight lines, zero ball-frustum/near-plane failures, and zero camera motion segments passing through stone expanded by 0.1 m**. The camera boom itself uses 0.2 m box padding. Another 261 launch-view cases span all three rails, yaw −70°…70° at 5° increments and those three viewports; all keep the muzzle visible and in frame.

The following camera remains about 12.6–20.0 m from the measured ball. Its largest 60 Hz position change is 2.51 m during launch reacquisition; after the first half-second the maximum is 1.78 m. At 30 Hz the corresponding post-entry maximum is 2.00 m. These include actual ball motion. A close turning chase rig had an abrupt wall-avoidance correction; the steadier world-oriented follower was selected instead.

**These are geometric checks, not a rendered usability certification.** The available browser reports WebGL unavailable. Lighting, perceived scale, wall/ball contrast, camera-motion comfort and phone legibility require the owner's WebGL-capable browser. Explicit view cuts and automatic elevation near stone should be judged in that playtest. The director separately records DOM/browser checks.

## Resource and lifecycle costs

No geometry, mesh, body, material, shadow caster or texture was added by the new view. The world remains 15 static bodies, 15 meshes/geometries/submeshes, 8 materials, 180 triangles and 13 caster registrations, with zero textures. Firing adds the same one dynamic projectile. Camera obstruction queries test at most fifteen code-owned boxes per candidate; they do not call the solver or rebuild the scene.

In this NullEngine run, seven warm builds after one initial build had median construction times **1.929 ms revised / 1.922 ms original**. Their builder is the same function, so the small timing difference is measurement noise, not an optimization. Eight construct/fire/reset/dispose cycles per variant returned to the same idle resource counts and then zero owned physics bodies, meshes, geometries, materials and caster registrations. Stop at five, twenty and thirty seconds cleared the active ball while retaining the unchanged world; Recall and manual firing restored the exact setup.

Rendered draw calls, GPU/heap allocation, frame timings, audible feedback quality and physical-phone performance remain unmeasured. NullEngine submesh counts are not GPU draw-call measurements. Existing familiar audio remains opt-in and unchanged; Stop intentionally avoids a natural-terminal sound.

## Engineering judgment

| Level | Cost and judgment |
| --- | --- |
| Prove in isolation | Small: pure box visibility queries, actual-path framing audits, escape/long-tail reproductions. |
| Playable prototype | Moderate: state transitions, explicit view cuts, compact flight controls, truthful terminal receipts and historical shelf compatibility. Implemented. |
| Generic authorable capability | Larger and not justified here: occlusion policy needs roofs, arbitrary bounds, per-world framing and UI validation. Keep this camera policy code-owned. |

The owner evidence supports further architectural development, **after** the corrected viewing pass is judged. The promising authoring ingredient remains broad elevated receivers and connected physical regions. This lane does not justify more editor variables, a wind fix, new collision coefficients, or automatic interruption of interesting shots.

Four new focused tests and four original architecture tests pass, as do TypeScript and focused lint. The independent reviewer reran the new tests and original shelf tests. The director owns the integrated full test/build/validator result.

Reproduce: `node --test tests/playability-cistern.test.mjs tests/playgrounds-architecture.test.mjs`, then `node scripts/playability/cistern-measure.mjs`. The latter emits compact actual evidence to the adjacent JSON. Long-tail raw contact callbacks are sampled explicitly in that file; counts and original contact episodes are retained, and the reproducible harness can recover every 120 Hz callback.
