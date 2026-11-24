# Exchange Yard — numerical evidence appendix

This appendix contains tested settings and spoilers. The owner invitation is separate.

All results below use actual Babylon/Havok through `createSpatialSession` at 120 Hz. Projectile mass 1.5 kg, radius 0.43 m, gravity 12 m/s² and speed 6–43 m/s are unchanged. Stations are code-owned; rail 1 is the center rail. Yaw/elevation neighbors use ±0.5°, power ±1 percentage point. The grid contains yaw −60/−40/−20/0/20/40/60°, elevation 5/15/25/35/45/60/75°, power 15/25/40/55/70/85%, phase 0.

Base: `ddeed5b688ae8c15166c42a0302bf768bb11be70`. Runtime, sampler and camera source: `319ef3e60701cecc394d1275024730c9f555bf73`. All tracked measurement sources were clean. Reports retain their source hashes. Earlier rejected side-wall design is `808208169a2e2fa3dab395123e78c9cca654ae78`; open service court was `60f3e07`, rejected store overhang / camera checkpoint `c621cfc33f399343cb7bdfacf59bccbc45a5c09c`.

## Representative physical histories

| Case | Station | Yaw / elevation / power | Actual terminal | Selected relationship retained by neighboring detents |
|---|---|---|---|---|
| underpass-short | forecourt | 0° / 25° / 40% | first-ground-contact, 1.7833s | 6/6 |
| underpass-delivery | forecourt | 0° / 15° / 85% | first-ground-contact, 1.8833s | 6/6 |
| viaduct-face | forecourt | 0° / 35° / 40% | first-ground-contact, 2.3750s | 5/6 |
| viaduct-top | forecourt | 0° / 45° / 40% | first-ground-contact, 3.8667s | 6/6 |
| roof-return | forecourt | 20° / 35° / 70% | first-ground-contact, 6.2417s | 6/6 |
| roof-to-gallery | forecourt | -20° / 35° / 70% | first-ground-contact, 3.6750s | 0/6 |
| service-platform | service | 0° / 15° / 70% | first-ground-contact, 1.6417s | 4/6 |
| service-hall | service | 0° / 15° / 85% | first-ground-contact, 3.1667s | 6/6 |
| service-gallery | service | -20° / 35° / 40% | first-ground-contact, 7.2417s | 6/6 |
| service-roof | service | 0° / 45° / 70% | first-ground-contact, 9.4250s | 6/6 |
| short-ground | forecourt | 0° / 5° / 15% | first-ground-contact, 0.6083s | 5/5 |
| open-sky-exit | forecourt | 20° / 45° / 70% | out-of-bounds, 5.9833s | 5/6 |
| slow-gallery | forecourt | -20° / 75° / 70% | first-ground-contact, 13.3333s | 0/6 |

The same 40% power at 25°, 35°, 45° produces passage below the deck, interception by its front, and a top landing. The below-deck shot at that power lands on street without a nonterminal contact; a stronger low drive reaches the freight dock. This is architectural clearance plus a receiving route, not a claim that empty passage adds an impulse. Removing the viaduct leaves the successful underpass delivery identical while changing the front/top examples to simpler ground flights.

The roof-return contains real station-roof→far-wall→station-roof contacts. Removing that roof changes it into a hall-top departure and an out-of-bounds result. The Service gallery route contacts the actual gallery top and then the freight dock. Raw callback points, normals, pre/post-step velocities and timings are in `architecture-evidence.json`; these are whole-step brackets, not isolated contact impulses. `projectileIsCollider` preserves Havok's normal convention.

`roof-to-gallery` and `slow-gallery` retain historical case names deliberately. The flush store roof removes the fragile former transfer (old 2/6 neighbors, current 0/6) as well as the underside trap (24.4s settled→13.333s first ground). Rebuilding only the old width reproduces both prior outcomes. This is a real design tradeoff, not a renamed success.

## Matched coarse launch atlas

| Config | Any raised contact | No raised contact | First ground | Bounds | Settled | >15s | Maximum |
|---|---|---|---|---|---|---|---|
| forecourt | 99/294 | 195/294 | 265 | 29 | 0 | 0 | 13.333s |
| service | 155/294 | 139/294 | 258 | 36 | 0 | 2 | 16.675s |
| cistern-control | 164/294 | 130/294 | 227 | 58 | 9 | 20 | 42.108s |

Every raised solid is touched by at least one sampled setup across the two new stations. This is not proof of easy discovery. Forecourt leaves the station platform, loading crate and west retaining wall untouched in this grid; Service reaches those regions. High-angle and low-power dead areas remain. The new world's any-contact counts do not exceed Cistern's; its claim is differentiated relationships and fewer sampled long tails.

Each elevation row below contains 42 shots. Entries count only shots with a raised contact, not note count, quality or play frequency.

| Elevation | Forecourt | Service | Cistern |
|---|---|---|---|
| 5° | 9 | 19 | 35 |
| 15° | 19 | 29 | 38 |
| 25° | 20 | 31 | 27 |
| 35° | 17 | 23 | 20 |
| 45° | 13 | 19 | 18 |
| 60° | 11 | 18 | 15 |
| 75° | 10 | 16 | 11 |

Each power row contains 49 shots, spanning all seven yaws and elevations.

| Power | Forecourt | Service | Cistern |
|---|---|---|---|
| 15% | 0 | 5 | 16 |
| 25% | 4 | 22 | 34 |
| 40% | 25 | 35 | 44 |
| 55% | 25 | 38 | 34 |
| 70% | 27 | 31 | 22 |
| 85% | 18 | 24 | 14 |

Both Exchange grids have zero raw collision callback truncation. Seventeen Cistern rows exceed the atlas's 256-callback cap; their accepted episode ledgers and terminal results remain present, and coverage is explicitly marked incomplete. Untouched is not unreachable.

## Reproduce

```sh
node scripts/places/architecture-measure.mjs
node scripts/places/architecture-measure.mjs --full-dir /tmp/exchange-full-atlas
node scripts/places/architecture-camera.mjs
node scripts/places/architecture-plan.mjs
node --test tests/places-architecture.test.mjs tests/playgrounds-shelf.test.mjs
```

The committed packet retains all 882 sampled setups, exact stations, episode ledgers and terminals. Selected cases retain actual paths, callbacks, normals and velocity brackets. Full raw atlas paths regenerate on request; they are not used as a predicted trajectory in play.
