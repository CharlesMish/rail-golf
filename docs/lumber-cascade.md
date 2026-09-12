# Lumber Walk — second courtyard station

The third courtyard card, Lumber Cascade, launches from Lumber Walk at (22,154),
facing back into the same yard. The mill is now on the player's right, and the
existing gallery wall can participate in the end of a new line. Three local rails
remain four metres apart. Station transforms supply the visible launcher, muzzle,
shot direction, follow camera and immediate retry position. Miss directions are
also relative to the station, so 'short' still means short while shooting backward.

A normal Across the Yard clear opens BOTH Switchback Gallery and Lumber Cascade.
The gallery stamp is not a gate. Select card 03 to visit Lumber Walk; the station
buttons in Shot tools also return to the most recently visited card at that station.
In-session shot recall remains keyed by card, which has one fixed station. The
existing persistent Delivery Route Book and its four-route achievement are unchanged.

## The new toy

Three supported lumber stacks have lively, banded top faces and dull side faces.
The tops use passive Havok reflection, restitution .86 and friction .18, matching
the existing bank faces. The projectile is unchanged. There are no launch kicks,
magnetic aiming, widened contact volumes or changes to existing bank/roof materials.

| Tread | Centre x,z | Width × depth | Top height |
|---|---|---|---|
| 1 | 22,122 | 12 × 12 | 8 |
| 2 | 22,100 | 12 × 16 | 5 |
| 3 | 22,73 | 12 × 16 | 2.5 |

The lime Receiving Bay is a ground-level disk at (22,46), radius 9. The beacon is
14 m high so the destination is identifiable over the stacks. The disk itself is
partly screened by them from the opening address; Survey hole exposes the layout.
Landing-surface authority stays at the original first-kiss plane. This slice uses
height in the journey, not elevated destination scoring.

Any target landing clears. Tread 1 → 2 → 3 followed by the landing earns the trick
stamp; extra rebounds are allowed. Tread evidence comes from actual Havok collision
callbacks and a contact-point check on the tread top. Side/underside collisions do
not earn tread tags. Repeated callbacks on one tread cannot stand in for three
separate treads. Contact numbers, sound and the growing contact sequence provide
feedback during the shot, including unsuccessful attempts.

## Verified routes

These are regression references, not a predicted arc or automatic player solution.
Rail indices are zero-based.

| Route | Rail | Yaw | Elevation | Charge |
|---|---|---|---|---|
| Three treads | 0,1,2 | −1°,0°,1° | 30° | .025,.05,.075 |
| Direct carry | 0,1,2 | 0° | 40° | .55,.60,.65 |

All 27 combinations of the first row land with actual contacts on all three tops.
Five also rebound from the existing bank B afterward. All nine direct combinations
clear without solid contact. The broader exploratory carry sweep found 43 direct
clears among 60 tested angle/power/rail combinations; that is authoring evidence,
not a completion-rate prediction for players.

Existing Delivery/Mill/Sky/Skip and gallery Havok fixtures remain regression gates.
Projection/occlusion checks preserve the old destination tests and verify the new
beacon from all three rails at 844×390, including obstruction by the lumber stacks.
They do not establish touch usability, camera feel, frame rate or rendered label
legibility. The local browser preview remains unavailable; device playtesting is
still needed before merging.

Next: play the direct/cascade contrast, inspect the backward-facing camera and
receiving bay, then consider extra route-book entries. No further stations,
elevated landings, wind zones or moving machinery are included in this slice.
