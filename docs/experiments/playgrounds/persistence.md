# Guest Stone — a place altered by physical blows

The selected experiment gives the next shot a different starting world. One passive convex stone remains where the previous projectile left it. An open north cradle and an eastern alcove offer two possible deliveries; the west bank lets a shot approach the stone from another side. These are invitations, not scored destinations. The prototype is `/lab/playgrounds-persistence`.

This is a credible persistent physical task, with an important limitation: its useful aiming bands are much smaller than the entire control range. It deserves an owner playtest before a general authoring feature. There is no human enjoyment result yet.

## Authority and scope

- Branch: `research/playgrounds-persistence-20261121`.
- Starting authority: `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb`.
- Initial implementation: `959805aa19aa417d506bf802e8864064a8ff2363`.
- Reviewed and physically measured runtime: `63d49b2b9b6684b68691ba4720cc130d4285964d`.
- Shared audio commits were cherry-picked locally as `34e52a0` and `df1d164`; integration should use the originals `454d3cc` and `e4909a7`, not duplicate them.
- Projectile authority remains `createSpatialSession` / `createMechanismSession`: existing 1.5 kg ball, 0.43 m radius, gravity 12 m/s², charge-to-speed mapping, actual Havok at 120 Hz and original first-ground termination. No shared session, historical lab or production rule was edited.

All physical results below are actual Babylon/Havok with NullEngine. The concise reproducible source is `scripts/playgrounds/measure-persistence.mjs`; raw contacts, normals, velocities, paths and state snapshots are in [persistence-evidence.json](persistence-evidence.json). Tested controls and delivery sequences are separated into [persistence-solutions.md](persistence-solutions.md).

## Cheap comparison and selection

The initial eight-shot comparison used one damped convex stone and one constrained passive angled carriage. It was a mechanism comparison, not a fully authored V-prow. Both used the unchanged ball. The carriage used a real 6DoF constraint, ±10 m travel, no motor; its central moderate-power shot moved 4.998 m and reached the proof's velocity threshold at 5.192 s. The strong shot reached its 10 m stop and took 5.883 s. That large displacement was physically viable, but the delay and end-stop dependence made it the less attractive small experiment.

The same proof's central stone shot moved 0.979 m and reached its threshold at 1.283 s; opposite flank shots moved the stone sideways in opposite directions. The selected garden uses a more conservative settling policy than this cheap proof, so these times should not be mistaken for UI-ready times. The carriage remains an isolated proof script; no weak carriage course was built. This does not establish that a better designed carriage is impossible.

The selected stone is a code-owned preset: an eight-sided convex cylinder, diameter 7 m, height 4 m, mass 12 kg, friction 0.55, restitution 0.1, linear damping 0.5, angular damping 2. Its visible cylinder is its convex collision shape. These are prop coefficients, not changes to the ball; they are not exposed as imported-world controls.

## Ball end and world settling are different events

1. Manual Fire takes the held pre-shot pose, rebuilds the prop as a dynamic body at that exact pose and starts the accepted ball flight. There is no prop impulse or motor.
2. First ground ends and freezes the ball using existing rules. The wrapper then sets both ball collision masks to zero, retiring the ball from further prop interactions while preserving its terminal record and visible position.
3. The stone continues in real Havok. After 60 consecutive ticks at linear speed ≤0.025 m/s and angular speed ≤0.025 rad/s, its measured pose is held static between shots. This explicit rest policy discards those bounded residual speeds; it never moves the stone to a preferred position.
4. If 1,200 post-ball ticks pass without reaching that criterion, Fire remains blocked and Undo/Reset are offered. The 273 sampled shots never reached this limit; their longest post-ball wait was 0.925 s. The bound is not presented as a tested example of a naturally occurring stuck shot.

Records preserve `environment` (held pre-shot pose), `endEnvironment` (pose at ball end), and `settledEnvironment` (held post-settle pose). **The terminal pose excludes the stone's linear/angular velocity and is not a complete dynamic restart state.** Restore is deliberately limited to held before/settled states, which restart at rest. Actual ball and stone paths have exact starting and final samples; sound derives from actual incoming normal contact speed, including ground.

Undo restores the immediately preceding setup and stone. Reset restores home. Keep is voluntary, four slots maximum; a full shelf never overwrites. “Restore before” repeats from the kept initial state; “Use result” continues from the held result. Both require manual Fire. Layout identity is distinct from build identity, dirty build strings remain intact, malformed saved bytes are preserved, and bare/no-stone controls have distinct layout IDs that the owner shelf rejects. This is a dedicated local study, not a new general import format.

## Physical findings and failures

| Relationship | Measured result | Interpretation |
| --- | --- | --- |
| Central blow | Stone advances 0.9764 m; ball ends at 1.000 s; stone ready at 1.633 s | Clear persistent consequence within a short observation cycle |
| Opposite flanks | Opposite lateral motion: approximately +0.275 m and −0.274 m, with different yaw | Side selection changes more than distance |
| West-bank access | Bank → stone → pavement; stone shifts +0.848 m sideways and +1.011 m forward | A distinct approach direction; removing the bank makes this shot miss the stone entirely |
| Far-bank return | Far bank → stone → pavement; stone moves 1.093 m toward the player | A possible way to reverse a delivery, but less forgiving than the direct families |
| North delivery | Eight successive ordinary-detent shots leave the center at z=40.758 m, against the cradle | Persistence creates an extended task; subsequent contact positions shift by more than 12 m |
| East delivery | Eleven successive banked detent shots leave center x=12.768, z=32.610 m, in the alcove mouth | Another destination requires changed access and aim; a subsequent attempted continuation misses |

All six adjacent control changes for each of central, left flank, right flank and west-bank access retained their contact family, and every fresh repetition matched exactly. The changes were real UI detents: yaw/elevation ±0.5°, power ±1%. The far-bank return retained contact in five of six neighbors; +0.5° elevation missed and +1% power reduced the movement substantially. Do not advertise that family as equally forgiving.

A broader fixed 273-cell map produced 7 direct-stone, 6 west-bank-stone, 1 far-bank-stone, and **259 no-stone** shots. It samples broad aiming space, not a probability distribution of human play. It still exposes the main weakness: this is an aimed delivery study, not a generally generous playground. Low power lands before the stone; a clean lateral miss leaves the stone essentially unchanged; a high shot exits bounds. These negatives remain in the evidence.

The garden is more than a decorative rebound arrangement because the resulting prop pose becomes the next shot's physical input, and identical controls encounter it at different positions. The banks themselves remain familiar static rebound geometry. The additional architectural cost is justified only if players find pursuing or reversing the delivery interesting; the computer cannot establish that.

## Reproduction, resources and review

A held non-home state reproduced the entire next record exactly in fresh scenes with 30, 60 and 144 Hz render-time partitions and a mixed 7/21/9/32 ms pattern, all using equivalent 120 Hz physics steps. Thirty seconds of idle ticks left the held pose exactly unchanged. Six scene lifecycles, each with four fire/undo/reset cycles, returned owned body/mesh/caster counts to zero after disposal.

The retired ball has two contrary tests: ordinary settling matches removal of its collider, and an explicitly test-only adversarial prop velocity makes the prop cross its terminal position. Masked and removed collider outcomes match exactly; deliberately re-enabling collision produces a dramatically different prop result. The test-only velocity is absent from gameplay and design evidence.

| NullEngine world-only cost | Bare prop proof | Authored garden |
| --- | ---: | ---: |
| Fresh-world ready static / dynamic bodies | 3 / 0 | 11 / 0 |
| Active static / dynamic bodies, including ball | 2 / 2 | 10 / 2 |
| Meshes / submeshes | 22 / 22 | 30 / 30 |
| Shadow casters | 2 | 10 |
| Triangles, excluding line primitives | 92 | 188 |
| Vertices, including lines | 190 | 382 |
| Warm median build, 10 samples | 2.388 ms | 3.977 ms |
| Median Reset rebuild, 11 samples | 0.287 ms | 0.315 ms |
| Median Fire rebuild, 11 samples | 0.971 ms | 0.997 ms |
| Owned bodies / meshes / casters after disposal | 0 / 0 / 0 | 0 / 0 / 0 |

These are shared-host CPU samples, with raw ranges preserved; they are not performance promises. The fresh-world ready count excludes a terminal ball; after a result, its retired static body remains until Next/Undo/Reset. The counts omit launcher/projectile presentation meshes and browser UI, and submeshes are not measured draw calls. GPU draw calls, rendered frame timing, memory residency and physical-phone performance are unmeasured. Browser WebGL was unavailable to the integration team; DOM/control checks cannot establish the garden's visual readability. The phone UI brings the stage into view before the first shot frame, but camera adequacy remains an owner/browser gate.

Lane TypeScript, targeted ESLint, and all 12 lane tests passed. Independent authority review reran all 12 tests at the measured runtime and approved the snapshot/retirement/provenance corrections. Root integration owns the full repository suite, production build and pinned preview.

## Spoiler-free owner protocol

Open Guest Stone and look at the stone, banks and two recesses. Choose a launch rail, aim, elevation and power; Fire starts a new physical shot. Watch the stone as well as the ball. The ball stops on pavement; the stone gets a short settling period.

Try making a useful change, then choose “Next shot” to work with the altered garden. “Undo last blow” lets you compare a different choice from the preceding state. Reset puts the stone home. Keep a blow when either its line or its resulting world matters to you; “Use result” later resumes that world without replaying or auto-firing.

There is no required destination. After a few shots, ask whether the stone suggests a next action of your own, whether an unsuccessful blow teaches you something, and whether preparing a position is satisfying enough to justify the extra waiting and state-management controls. Stop if it feels like repeatedly moving a heavy piece without an interesting decision.

## Recommendation

Retain this as a specialized passive-prop playground. The promising capability is **impact-caused persistent state with an explicit recoverable rest lifecycle**, not unrestricted rigid-body authoring. A future declarative version should begin with one or two approved convex prop presets, finite starting poses, bounded settle policy and held-state snapshots. Do not expose arbitrary mass/friction/joints or declare generic persistence solved from one stone.

An independent author could next make a compact physical delivery workshop with a short route that can be prepared, reversed and approached from two sides. Evidence that would raise its priority: owners voluntarily continue after the first displacement, discover both approach families, and use Keep to preserve useful world states. Evidence that would lower it: repeated resets instead of purposeful adjustment, camera ambiguity about whether a blow moved the object, or waiting that feels longer than the decision it enables.
