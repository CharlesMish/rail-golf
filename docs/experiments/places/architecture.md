# Exchange Yard — architectural authorship

Exchange Yard is a new code-owned place, independently composed from PR82. It combines low launch stations with a crossing railway, genuine underpasses, a station hall with a solid pitched roof, a freight dock, a loading gallery, a store and a signal house. This is not an expansion of Cistern and does not require the musical lane.

Base: `ddeed5b688ae8c15166c42a0302bf768bb11be70`, branch `research/places-architecture-20261123`. Runtime and measurement SHAs are recorded below; final published commits and preview live in the director handoff. No production physics, scoring, historical geometry, Foundry schemas or existing world identities change. Physical identity is `playgrounds-exchange-yard-v1`.

The authoring hypothesis is that **one architectural crossing can give low passage, front interception and upper landing distinct meanings**, while a second low station exposes a lateral service court. Broad roof slopes can then carry a shot between recognizable regions. Extra size is useful only where it creates a reachable relationship.

## What was authored

The 20 raised solids and one terminal street are driven from the same dimensions as their visible meshes. Gabled roofs are actual solid triangular prisms with convex Havok colliders. Walls and decks use the existing stock bank material; the street keeps the existing ground material and first-ground termination. There are no hidden impulses, one-way faces, arbitrary coefficients or dynamic mechanisms.

Surface paint gives the district its railway and building detail: embedded track alignments, window outlines, brick courses, a clock and loading-edge marks. These are explicitly paint, batched into three line meshes, with no collision or shadow cost. The prominent structures themselves are all physical. [Exact plan and sections](architecture-plan.svg).

Two freely selected stations are stored through the already permitted `carriageMode` field. A small optional `stationChoices` UI adds the selector; the old setup validator and independent physical station record prevent a saved line from silently moving stations. Changing stations clears the displayed old line; stored lines retain their original provenance. Restore/refire is verified against actual records from both stations.

## What the evidence can establish

The [raw packet](architecture-evidence.json) uses the existing actual-Havok outcome atlas with a fixed, explicit 294-shot grid for Cistern and each of the two stations. It spans seven yaw positions, seven elevations and six powers. This is a diagnostic sample of controls, not human play frequency or a quality score. Exact settings and tested histories are separated in [the technical appendix](architecture-solutions.md).

The important comparison is differentiated consequences, not contact accumulation. Cistern still has more sampled any-contact shots than either new station individually. Short low-power shots and extreme yaw remain large dead areas. Some regions are untouched from one station in this grid, while the union of the two stations reaches every raised solid.

The service court was a real design correction: its first wall blocked much of the proposed lateral access. Moving the beginning of that retaining wall and the loading gallery opened an honest gap. Any-contact count fell while visits to the hall, roof, platform and freight area rose. The [rejected arrangement](architecture-evidence-rejected.json) is preserved rather than retold as a successful first design.

The narrow future-authoring opportunity is **a few matching solid roof/slab/building presets with tested stations**, not unrestricted mesh editing. This world remains code-owned; it does not establish safe generic architectural imports.

## Verification and limits

The five new focused tests cover collision/visible agreement, actual under/front/top behavior and ablations, neighboring player detents, two-station Keep/Restore provenance, interruption and repeated cleanup. Existing shelf tests remain unchanged. A latent trusted-live Keep bug was found: rejected recognition events can contain absent optional values that JSON normally omits. The narrow save-boundary repair omits only those known absent fields; strict import validation still rejects malformed values, including non-finite numbers and undefined array entries.

The camera audit uses actual flight paths with geometric visibility, frustum and camera-segment checks. These are useful engineering evidence, not a rendered comfort claim. Browser results and integrated TypeScript/lint/build/Foundry/full-suite gates belong to the director packet.

Owner evidence remains decisive: ordinary exploratory shots need to make the architecture feel like somewhere to visit, rather than a map of technical specimens. A broad sampled grid cannot establish that.

## Design failures kept in the record

A shallow store-roof overhang originally formed a pocket above the loading gallery. One actual line bounced between its underside and the gallery for a 24.4-second settled result. The first underside contact also forced a large camera reframe: 8.24 m at 60 Hz, 9.03 m at 30 Hz. This was an architectural problem as well as a camera problem. Narrowing that roof to the width of its supporting wall removes this particular side pocket; the same launch now reaches the terminal street in 13.333 seconds. Roof height, materials and projectile rules are unchanged. The earlier raw contacts and camera audit remain in [the rejected overhang control](architecture-evidence-overhang.json). This does not prove there is no possible slow pocket elsewhere.

A discrete camera search also proved too abrupt under the viaduct. The selected view lowers before the crossing, moves gradually toward a side view beyond it, and interpolates toward a clear camera boom. It handles a roofed passage explicitly; Cistern's always-upward camera escape was unsuitable. No visibility correction changes the ball or collision geometry. Overview and Stop remain available.

## Selected result and cost

Final runtime and measurement source: `319ef3e60701cecc394d1275024730c9f555bf73`. Source branches/commits remain recoverable; the final director handoff records publication and preview pins.

| Measured property | Exchange Yard | Cistern control |
|---|---|---|
| Coarse-grid raised-contact shots | Forecourt 99/294; Service 155/294 | 164/294 |
| Coarse-grid bounds exits | 29;36 | 58 |
| Coarse-grid >15-second shots | 0;2 | 20 |
| Static physics bodies | 21 | 15 |
| Active dynamic bodies | 1 projectile | 1 projectile |
| World meshes / submeshes | 24 /24 | 15 /15 |
| Solid triangles | 240 | 180 |
| Shadow casters | 20 | 13 |
| Warm build median,6 build cycles | 5.628ms | 2.647ms |

These timings are shared-host NullEngine CPU measurements. Submesh counts do not certify rendered draw calls, and no phone frame-rate or GPU-memory claim follows. The extra three meshes are batched surface paint. Repeated load/fire/reset/switch tests preserve baseline resource counts, and all owned bodies, meshes, geometries, materials, textures and casters return to zero after disposal. Full heap reclamation is not established by ownership counts.

The final camera packet covers 9 actual trajectories at 1440×900/60 Hz, 390×844/60 Hz, 844×390/30 Hz and 522 launch views. All sampled projectile-to-camera rays are clear, all sampled cameras lie outside the solids, and none of the sampled camera segments cross them; the ball remains in the frustum. Maximum post-first-half-second camera step is 1.23 m at 60 Hz and 2.00 m at 30 Hz; minimum camera-to-ball distance is 7.54 m. These geometric checks do not establish visual comfort on a rendered browser. [Raw camera audit](architecture-camera.json).

Six selected physical relationships survive all six tested neighboring control detents: underpass delivery, viaduct top, station-roof return, service hall/platform, service gallery/dock, and service roof. The sampled union reaches all 20 raised solids. Short shots, extreme yaw and many high arcs remain unproductive; this is not universal accessibility. Removing the shallow eave also removes a fragile roof-to-gallery relationship. That loss was accepted to remove a waiting pocket and its abrupt camera recovery.
