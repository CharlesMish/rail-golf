# Timber Courtyard — environmental authorship

Starting main: `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.
Branch: `feature/timber-courtyard-world`. Draft only; no main merge or production deployment.

## Director review

The starting tree is identical to the accepted PR #50 presentation. Its readable
tread tops, bounded callouts and stronger Lumber address are the foundation.
The remaining absence is geographical: both stations overlook a yard slab
surrounded by the same dark clear colour, and Survey exposes the abrupt edge.
The far clip is 280 m and linear fog runs from 105 to 230 m; distant ordinary
meshes would disappear before providing a setting.

## Selected direction: a forest-edge mill at last light

The working mill occupies the west edge. A service siding and modest kiln/dispatch
buildings continue that industrial edge beyond the fence. The opposite edge
remains wooded, with a continuous low ridge instead of a city skyline. A dusk
gradient joins those layers and continues through very high shots. The aim is a
recognizable freight mill clearing, with the existing mill and playable timber
remaining the visually strongest architecture.

Near-field character comes from three material systems: dry milled timber with
cut ends; compacted ground with broad transport wear and local sawdust; dark
scuffed machinery. Variation is deterministic and shared. The grain stays broad
enough to read at phone scale. Tread top/support contrast and the colored
mechanism vocabulary remain distinct.

A wet reflective yard and a dense town skyline were considered and rejected.
They would change the visual story, compete with mechanism accents, and demand
more rendering work. No extra lights, shadows, smoke particles, decorative
collectibles, animated trains or new contact surfaces are part of this pass.

## Authority and performance contract

The new environment is public-courtyard-only, scene-owned and independent of
per-card course rebuilds. Its meshes carry no collision or recognition authority.
Physical-looking scenery is beyond the existing yard boundaries; low terrain
sits below the playable slab. Background meshes are excluded from glow and
shadows. The existing gameplay fog, exposure and lighting remain unchanged.
Distant color is authored separately so the far landscape survives that fog.

Surface changes may replace appearance and UV coordinates, but never vertex
positions, indices, normals, dimensions, physical materials, masks or recognition
metadata. No storage, Route Book, scoring, shot impulse, first-kiss, camera-follow
or laboratory authority changes are authorized.

The initial budgets are approximately 8–12 additional environment draws and
3.6 MiB of mipmapped surface texture data. These are design budgets, not measured
performance claims. The final evidence packet reports actual draw counts, asset
allocation, paired software timings and the real-device limitations.

## Optional portrait refinement

The existing Survey button can sit beside the station/challenge heading inside
the existing brief, with a 44 px touch target. This is a separate public-only
portrait CSS change. Its acceptance depends on the 320/390/700 px and short
landscape comparisons; handlers, accessible state and input authority are retained.

## Future direction, not implementation

A later environment could make material flow through the mill visible, from
rail delivery to sawing and storage. Moving freight or a working saw would need
a separate affordance/performance review, especially if players expected contact.
This pass establishes the place without adding that system.

## Evidence

Matched views, source provenance, authority checks and performance findings are
recorded in the companion visual report. Headless Chrome / ANGLE SwiftShader
is not a physical-phone or real-GPU test. Owner play remains necessary to judge
comfort, attention and the world’s sense of place.
