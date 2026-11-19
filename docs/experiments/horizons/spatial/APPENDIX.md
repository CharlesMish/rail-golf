# Overpass — numerical reference appendix

Spoilers. These are ordinary player-control detents, not hidden between-step solutions. Every setup uses rail index 1, origin x −2 m and yaw 0°.

| Reference | Elevation | Power | Observed relationship |
| --- | ---: | ---: | --- |
| upper-carry / opening | 35° | 44% | Descending roof-top contact, then forward carry over the wall. |
| lower-return | 14° | 83% | Under the roof, return from the wall, under the roof again. |
| beyond-deck | 35° | 47% | Overshoots the roof, then falls into the wall and returns below. |
| short | 14° | 40% | First ground before the structure. |
| ceiling | 13° | 100% | Real underside contact, then wall return; fragile, not the recommended route. |
| ceiling-lip | 13.5° | 100% | One elevation step sends the ball into the front edge and sharply down. |
| high-bypass | 40° | 65% | Clears all pieces, first ground beyond. |

`evidence.json` contains exact contact times, raw normals, incoming/outgoing velocities, terminals, recorded trails for the two primary routes and controls, neighbours and lifecycle resources. `preset.json` contains every physical placement. `manifest.json` is replayed by the standard Foundry validator.

The evidence seed 20261119 is provenance only. It is not applied to Havok. The environment remains the existing `forest-clearing-v1`, seed 1.
