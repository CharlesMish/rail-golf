# Exchange Yard refinement — spatial decision

The selected revision keeps **every architectural solid** and the original Forecourt station. It replaces Service Lane in the new version with **Freight dock**, facing back through the district from the dock's existing 3.5 m top. No building, receiving surface, coefficient or world bound was added. The original Forecourt/Service world remains a separate comparison and retains its original memory contract.

Starting authority: PR #84, `8b02b8ceab95f28383f607cc4e891fe7e31dfc7a`. Spatial branch: `research/yard-spatial-20261125`. Measured implementation: `1a097ed478d98fbc41a1adc1dc4cc7d6d618f6b2`; the director publication ledger records the final documentation and published SHAs. [Raw atlas](spatial-atlas.json), [actual histories and lifecycle measurements](spatial-cases.json), [camera audit](spatial-camera.json), and [numerical appendix](spatial-solutions.md) are separate from the [owner invitation](spatial-owner.md).

## Roof correction

The reported defect is confirmed mathematically against Babylon's own vertex normals. Every triangle in each of the three gabled prisms points inward under Babylon's default left-handed convention: both pitched faces, both gable ends and the underside. There are eight triangles per roof, 24 in total. The old front-face/culling relationship therefore exposes the wrong side of the closed solid.

The repair flattens the same historical vertex data, then reverses each triangle's render indices and negates its normals with `flipFaces(true)`. This order is deliberate: the flat vertex buffer and its point ordering remain exactly unchanged for Havok's convex hull. Dimensions, transforms, bounds and coefficients remain unchanged. Back-face culling stays enabled; the roofs still receive shadows and remain shadow casters. A two-sided material is not used to conceal the defect.

All 13 representative original shots produce **exactly equal full records, contact callbacks, pre/post-step velocity brackets and sampled paths** with legacy versus corrected winding. All nine Forecourt examples also have equal physical results in v1 and v2; only the intentionally versioned environment identity differs. Five new focused tests plus the five unchanged historical Exchange Yard tests pass.

WebGL is unavailable in the director's research browser. These tests establish outward mesh orientation, unchanged physical replay and retained lighting/shadow settings. They do **not** certify the final rendered appearance, lighting or shadows. Owner inspection from several viewpoints remains required.

## Why Freight earns a second station

Forecourt remains the low approach to the crossing: pass underneath, intercept the front, arrive on top, or reach architecture beyond it. Freight turns those relationships around. The viaduct can receive a descending shot from a nearby roof and hand it toward the signal house; its back and piers can also turn a low shot back into the loading area. The hall and platform are nearby lateral surfaces rather than distant scenery. The launcher remains below the viaduct top and principal roofs.

This is not primarily a claim of exclusive objects. Forecourt and Freight still share most of the architecture. The difference is **approach direction, height order and what comes after a contact**. A representative Forecourt roof line goes roof → far wall → roof. From Freight, an ordinary neighboring family goes roof → viaduct → street toward the front of the district. A different family goes viaduct top → signal roof → street. Removing the viaduct from that second shot removes both raised contacts; removing only the signal roof substitutes a physical signal-house contact. These are actual causal controls.

The matched grid uses the same 294 ordinary-control setups at every station. It is a diagnostic sample, not estimated human play frequency or a quality score.

| Station/configuration | Shots contacting raised architecture | Bounds exits | Over 15 seconds | Longest result |
| --- | ---: | ---: | ---: | ---: |
| Original Forecourt, retained | 99 | 29 | 0 | 13.333 s |
| Original Service Lane, comparison | 155 | 36 | 2 | 16.675 s |
| Selected reverse Freight | 131 | 38 | 0 | 9.808 s |
| Ground-level eastern forecourt, rejected | 79 | 37 | 1 | 30.458 s |
| Viaduct-level lateral station, rejected | 115 | 65 | 14 | 52.775 s |

Freight is selected despite fewer contacting shots than Service. Service's nearby west retaining wall is first contact in 48 setups and touched in 50; Freight touches it in only two. Freight instead touches the station hall in 45 setups versus Forecourt's two, and the platform in 31 versus Forecourt's zero. The viaduct deck receives 38 Freight shots versus 24 Forecourt shots. The selected pair's sampled union still reaches all 20 raised solids.

Low and medium powers have different uses: at 15/25/40% power, Freight has 18/20/36 contacting setups, compared with Forecourt's 0/4/25. At 5/15/25° elevation Freight has 28/30/22, compared with Forecourt's 9/19/20. Each power column contains 49 shots; each elevation column contains 42. Higher arcs remain possible, but many simply pass into open space. Freight has 163/294 setups without a raised contact. This is a new relationship with the district, not universal coverage.

The raw first-impact outgoing direction bins are predominantly forward/north from Forecourt and reverse/south from Freight. They are whole-step solver brackets and are retained as diagnostics, not isolated collision impulses. More useful than the bins are the explicit receiving-top points, free-flight intervals and subsequent destinations in the appendix.

## Nearby variation and rejected alternatives

The bridge-to-signal, roof-to-bridge, longer roof-to-bridge, simple bridge-top and pier-to-gallery relationships all survive six of six neighboring yaw/elevation/power detents. The low platform-to-hall family survives five of five legal neighbors at minimum elevation. These predicates require a particular spatial relationship; they do not demand an identical count of solver callbacks. Moving the origin a full rail width often changes the family, as expected; those negative origin results are retained.

A near-edge viaduct shot loses its raised contact after a half-degree elevation reduction. Centered empty carries and high arcs remain negative examples. They are not presented as accessible solutions. The longer roof route takes about 8.5 seconds but travels between recognizable structures, unlike a low-energy pocket.

The eastern ground alternative largely re-exposes the near abutment and has fewer useful receiving routes in this sample. The high viaduct alternative creates some long transfers, but sits above many useful surfaces: 65 exits, 11 settled endings and a 52.775-second tail repeat the elevated-origin risk identified in Cistern. Both code-owned configurations and all their sampled records remain in the study script/packet. Neither is added as another player-facing station. No southeastern structure was needed to make Freight credible.

## Camera and station presentation

A new camera relationship needed a specific correction. The inherited launch boom entered the hall at two extreme Freight aim settings on one rail. The Freight-only launch boom is shortened from 15 to 10 m, retaining its height and aiming target. The inherited westward follow offset also produced a 5.857 m single-frame change during the pier/gallery route. Freight now eases its horizontal offset toward the central open court; Forecourt keeps its previous camera calculation. The same route's maximum post-launch step falls to 0.788 m at 60 Hz and 1.396 m at 30 Hz. No camera rule changes physics or predicts a future trajectory.

The final audit uses the refined interface's actual canvas sizes: 1100×900, 940×600, 739×480, 390×379.8 and 559×390. Twelve actual trajectories provide 12,513 sampled camera positions; 870 sampled launch views cover both stations, three rails and the yaw range. No sampled camera lies in a solid, no sampled camera segment or sightline crosses one, and the projectile remains in the frustum. Across these cases the largest post-half-second step is 1.967 m at 30 Hz; minimum camera-to-ball distance is 3.180 m. The original failed follow audit is preserved in `spatial-camera-original-follow.json`. Geometric clearance is not rendered comfort certification.

Freight's painted station bracket lies on the dock top, rather than inside its solid. All three selectable rails lie on that top. Other tracks, masonry, clock and window marks remain surface paint; no false open passage or uncollided protruding fixture is introduced. Broader visual polish was deliberately deferred: the roof repair and readable controls address demonstrated defects without changing the place the owner enjoyed.

## Identity, resource cost and lifecycle

The new launch-station definition receives `playgrounds-exchange-yard-v2`; original `playgrounds-exchange-yard-v1` remains valid only in its original configuration. Each version validates its own station and environment. Old lines cannot silently restore into the new yard. Loading a stored record restores setup/environment silently; it never fires. The render-only roof fix does not change v1's physical identity.

Both versions have 21 static bodies, no animated bodies, one active projectile, 24 world meshes/submeshes (21 solid meshes plus three batched paint meshes), 240 solid triangles and 20 shadow casters. No extra geometry or physics body is required by the new station. Seven repeated build/fire/retry/reset/dispose cycles per version leave all counted bodies, meshes, materials, textures, geometries and casters at zero after disposal. Warm build medians were 4.965 ms original and 4.616 ms refined on the same NullEngine host; that small difference is noise, not a claimed speed improvement. Ownership counts do not prove full heap reclamation. Submesh counts do not establish rendered draw calls, GPU memory, frame timing or physical-phone performance.

## Reproduce

```sh
node --test tests/exchange-refinement.test.mjs tests/places-architecture.test.mjs
node scripts/refinement/spatial-study.mjs
node scripts/refinement/spatial-cases.mjs
node scripts/refinement/spatial-camera.mjs
node scripts/refinement/spatial-camera.mjs --original-follow
```

The atlas script retains compact rows for every sampled shot and writes optional full raw atlases under `/tmp/exchange-refinement-*.json`. Selected cases preserve raw contacts and paths in the committed packet. The source SHA and hashes identify the measurement implementation. Integrated TypeScript/lint/build/Foundry/full-suite and browser interface results are recorded by the director.
