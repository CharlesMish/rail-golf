# Crossing House — independent author lane

**Disposition: preserve a small, data-only authored world for owner exploration. It is an existing-vocabulary control, not evidence that Worldcraft needs another engine feature.**

Lane branch: `research/horizons-authored-20261119`. Exact origin and unchanged physics source: `0b151c5c94849b78ccda6c41a1755b66471e3fa2`, neutral `lab/wc-exp-20261114-chime-compare`. No amphitheater dependency. The parent handoff records the lane's resulting commit.

## Owner entry — no numerical solutions

An open court, a low ramp, and a screen you can move. Try sending a line above the screen, around it, or back across the court. Keep a route you would like to change.

1. Load **Crossing House** from Foundry, or the Horizons entry. Survey the ramp, the central screen and the two angled wings. No target or score is required.
2. Change one launch control at a time. Look for a difference in *where the line goes*, not a required number of contacts.
3. Once a line interests you, Keep it. In Build, the highlighted central screen is the one editable piece; move or turn it once, then fire the same setup. Use the actual previous trail as a comparison.
4. Restore the kept line when you want its exact original world and setup. Make a copy if you want to keep a separate layout.

Questions for Charlie: Does the court suggest a next shot after the first interesting line? Are the wing ends understandable surfaces to aim at? Does editing one screen create an idea, or just break a line? A good two-contact route is enough. Stop when there is no next question.

## What was authored

Five stock pieces: one ramp and four banks. Only the screen is movable. Every piece uses its catalog size, friction and restitution; there are no voices, elevated plates, additional targets, force fields, animation, terrain, imported assets or capacity extension. Existing x/z bounds, launcher corridor and overlap validation are unchanged. The preset is valid range v1 data; its optional challenge is `null` and `customCode` is `null`.

The independent design question was whether one small court could support both a ramp-assisted carry across its middle and a lower route back across its width. The first layout put its wings too far apart: the attractive repeated-ramp shot depended on an outbound ramp-edge clip and failed immediate control neighbors. The final layout brings the two wings inward and moves the screen behind them. This gives two credible families without requiring the longer return.

This is not a claim of new physics. A single bank remains a simpler return. The world contributes a choice among spatial relationships plus one bounded construction lever. If rendered play does not make those choices legible, its extra geometry has not earned its place.

## Measured physical relationships

All records use actual Havok through `createWorldcraftRuntime`, the established 120 Hz physics loop and unchanged first-ground termination. Contact ledgers and raw callback normals/velocities are in [crossing-house-evidence.json](crossing-house-evidence.json). Sampled paths are actual past positions, not predictions.

| Family | Physical evidence | Immediate real-control neighbors | Simpler control |
|---|---|---|---|
| Ramp-assisted carry | Ramp top at 0.841667 s, far bank at 3.791667 s; first ground at 3.958333 s. Sampled peak 16.4399 m; at z54.9678, ball center y15.8926 m, safely above the 7 m screen. | All 8 retain ramp → far, including ±0.5° yaw/elevation, ±1% power and ±0.5 m origin. | Remove the ramp: no piece contact; first ground z41.9845 at 1.341667 s. The ramp adds actual useful reach and a high crossing. |
| Across the court | Screen at 1.458333 s → west at 1.841667 s → east at 2.191667 s; first ground at 2.275 s. Contacts fall from y5.6113 to 3.0422 to 0.8109 m. | All 8 retain screen → west; 4 retain east as well. The third contact is optional, not a quota. | Remove screen: no contact, ground z68.2774. Screen alone: one rebound, ground x−9.1300,z41.0593. The wings create a lateral continuation. |
| Second visit, sensitive | East → ramp → west → ramp; first ground at 3.283333 s. | Only 3/8 retain the complete sequence. Both elevation neighbors and both power neighbors shorten it. | Kept as a surprising optional line; unsuitable as a required challenge or the world's opening promise. |
| Short miss | No piece contact; ordinary first ground at 0.791667 s,z18.5615. | Negative reference, not a success. | Confirms the layout does not inevitably catch every shot. |

**Important surface qualification:** the across-court shot meets the *inner end faces* of west/east, not their broad bank fronts. Their first callback normals are approximately (−0.940, 0,−0.342) and (+0.940, 0,−0.342). This is an honest edge-based continuation, not a solution to every previous edge-fragility problem. The second-visit line meets the ramp's rear and side faces; it is not two ramp-top landings. Both facts matter for what a player sees and infers.

The screen itself offers a real edit: one 5° turn in one direction changes the across-court example to screen only, and one turn in the other direction yields screen → west. Either 0.5 m lateral slide retains the three-piece route with a changed terminal. More contacts is not automatically the better outcome; the relevant question is whether the player can choose a new destination.

All five selected setup/contact/terminal/sampled-path records repeat exactly after the load/fire/reset/switch audit in this process. The Foundry validator separately reproduces all five manifest records. This establishes repeatability for the measured runtime, not cross-device bit identity.

## Cost and cleanup

These are **NullEngine runtime/layout** measurements, not rendered page or physical-phone performance. Full forest decoration, launcher presentation and React UI are outside these counts. Shadow numbers are caster registrations, not rendered shadow draws.

| Cost | Crossing House | Return Address control |
|---|---:|---:|
| Authored pieces | 5 | 2 |
| Static physics bodies, including ground/tee | 7 | 4 |
| Dynamic projectile during a shot | 1 | 1 |
| Layout meshes | 7 | 4 |
| Materials / textures | 7 / 0 | 7 / 0 |
| Shadow-caster registrations | 6 | 3 |
| Warm rebuild median, 20 samples | 1.479 ms | 1.513 ms |
| Warm rebuild p95 | 1.793 ms | 140.386 ms |
| One construction sample | 19.259 ms | 269.513 ms |

Shared-host timing outliers dominate the control's p95 and construction sample; these timings cannot establish that five pieces are faster than two. The useful cost comparison is three more static bodies/meshes/casters. Recorded shot-step medians range 0.0107–0.0119 ms; these are headless physics/recording measurements, not frame times or a browser budget.

Twenty repeated load → fire → reset → switch cycles return to the same 7 bodies, 7 meshes, 7 materials, 0 textures and 6 caster registrations every time. Runtime disposal leaves 0 bodies, meshes, materials, textures and caster registrations. Raw heap samples fluctuate with V8/Havok allocations and collection; retained-resource stability is demonstrated, a general heap leak proof is not.

Rendered meshes/draw calls, GPU memory, browser frame timing and phone comfort remain unmeasured because WebGL is unavailable in this session. A separate projection audit found the world corners/muzzle inside tested desktop and phone-shaped camera bounds; that is not a rendered or occlusion inspection.

## Verification and reproduction

```sh
node scripts/horizons/crossing-house.mjs
node scripts/foundry/validate.mjs worlds/foundry/crossing-house
node --test tests/worldcraft-crossing-house.test.mjs tests/worldcraft-foundry.test.mjs
```

The five focused/existing Foundry checks pass, including all new physical-family, negative-control, neighbor, repeated-replay and resource-cleanup checks. Targeted ESLint passes. The director runs the aggregate TypeScript/lint/build/full-suite checks after integration. Existing v1 export bytes are checked by the unchanged Foundry compatibility assertion. The only edit to its expected card list is this new registered card.

`sourceBuild` remains the exact neutral origin because no physics changed. Evidence `measuredCheckout` is the checkout HEAD at measurement time; uncommitted additions were world data and instrumentation only. The reproduction script stores the full input preset and actual trajectories. Raw normals are the plugin's original orientation; `callbackVelocity` is sampled inside that callback and `postStepVelocity` after the physical step, neither mislabeled as a later, fully separated departure velocity.

## Numerical appendix — spoilers

All use center origin, rail index 1. These are regression setups, not instructions displayed on the Foundry card.

| Record | Yaw | Elevation | Power | Result |
|---|---:|---:|---:|---|
| opening | 0° | 13° | 45% | Ramp, then ground before screen |
| over-screen | 0° | 13° | 60% | Ramp → far |
| across-court | 4° | 18° | 75% | Screen → west → east |
| second-visit-sensitive | 7.5° | 18° | 75% | East → ramp rear → west → ramp side |
| short-miss | 0° | 8° | 30% | No piece contact |

Do not promote the sensitive record to a solved course. Preserve this world as an invitation for owner exploration, and archive it if the court fails to suggest understandable revisions. Its strongest lesson may be that future authors need better invitation, camera and physical-surface reading, rather than more controls.
