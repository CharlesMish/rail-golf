# Rolling Yard — a larger consequence is not automatically a better tool

The owner enjoyed Guest Stone's physical work. Rolling Yard therefore compares a genuinely round prop with that working control, in the same physical garden. The round prop is a useful alternative, not an upgrade established by this experiment: it moves and turns farther, but takes appreciably longer to become ready for another shot. The original Guest Stone route and records are unchanged.

## Authority and playable result

- Start: `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054`, verified PR #81.
- Lane: `research/playability-rolling-20261122`.
- Initial playable implementation: `8b895024252e93e27718077bfebfaa7dc50e8922`.
- Measured runtime, including bounded failure recovery and phone control return: `8ebc55996d56127cb8bf2f59c0666f0f4212027f`.
- Route: `/lab/playability-rolling`. The integration handoff records the final documentation/published commit.
- Actual physics: accepted `createSpatialSession` / `createMechanismSession`, Babylon/Havok at 120 Hz, original projectile mass 1.5 kg, radius 0.43 m, launch mapping, gravity 12 m/s² and first-ground authority.

The sphere has an analytic radius-3.5 m collider and a rendered diameter-7 m sphere with 24 segments. Two painted, nonphysical rings rotate with the actual quaternion. The visible surface approximates that analytic sphere with its usual inscribed triangles; it is not a hidden box or a low-poly convex substitute. The stone control keeps the original eight-sided cylinder, including its exact dimensions, orientation, friction, restitution and damping. A test reproduces the untouched Guest's entire central projectile path, stone path and final pose exactly.

Both props use mass 12 kg, friction 0.55, restitution 0.1, linear damping 0.5 and angular damping 2. Their center heights differ necessarily: sphere 3.5 m, stone 2 m, so both start on the same pavement. The comparison changes shape, height and inertia together; it does not isolate a single abstract “roundness” variable. No prop coefficients are player/import controls.

The yard retains the validated north cradle, east alcove and west/far banks. This controls for architecture and provides two physical intentions immediately. One can also move the prop out of an earlier line or approach it from a different side. No new scored task, puzzle progression, arbitrary rigid-body editor or unverified slope was needed.

## Measured physical differences

Numerical launch setups are in [rolling-solutions.md](rolling-solutions.md), separate from the [owner invitation](rolling-owner.md). [rolling-evidence.json](rolling-evidence.json) contains actual projectile records, incoming/outgoing collision-step velocities, contact normals/times, prop quaternion paths, sampled prop velocities, prop-to-receiver contacts and negative controls. Reproduce with `node scripts/playability/measure-rolling.mjs`.

| Same launch relationship | Sphere | Original stone control |
| --- | --- | --- |
| Central moderate blow | 2.744864 m forward; ball ends 0.775 s; ready 4.750 s | 0.976385 m forward; ball ends 1.000 s; ready 1.633 s |
| Stronger central blow | 4.131777 m forward; ready 5.067 s | 1.546389 m forward; ready 1.650 s |
| Opposite flanks | Approximately ±0.945416 m sideways and 2.003744 m forward | Approximately ±0.274792 m sideways and 0.345340 m forward |
| West-bank access | +2.926191 m sideways, +2.207932 m forward; ready 5.392 s | +0.848054 m sideways, +1.011412 m forward; ready 2.100 s |
| Far-bank return | 3.480946 m toward the launcher; ready 6.608 s | 1.092607 m toward launcher; ready 3.217 s |

The central sphere's net quaternion change is approximately 0.587509 rad, with maximum measured angular speed 0.578533 rad/s. Distance/radius is 0.784247 rad, so this is **rolling plus sliding**, not a claim of ideal no-slip rolling. The raw per-step orientation integral is 0.628561 rad, including small changes of direction; net and accumulated rotation are different quantities. A uniformly colored sphere would hide much of this difference, hence the painted rings. Browser rendering of the rings remains an owner check.

All six adjacent yaw/elevation/power detents retained each central, left-flank, right-flank and west-bank contact family (24/24). Each of the 30 neighboring runs, including the six return neighbors, reproduced its record exactly in a fresh reset. The far return retained prop contact in 5/6 neighbors; the higher-elevation neighbor hit the far bank and missed the boulder. This remains the less forgiving route. These are local sensitivity tests, not a human discoverability percentage.

A clean lateral miss and a short low-power shot leave the sphere exactly at home. A high flight exits the configured bounds without touching it. Removing the west bank makes the bank-access launch miss the prop and exit bounds. Those negatives are preserved, rather than hidden by additional colliders.

## Purpose and repetition

Four identical strong low-elevation shots take the sphere from z=24 to z=40.186752, contacting the real north cradle back. A fifth small continuation leaves z=40.495804. The first four complete cycles total 19.067 simulated seconds. The unchanged stone takes eight blows to reach z=40.758072, totaling **14.283 seconds**. Fewer launches did not make the round prop a faster delivery tool.

A different approach uses the west bank to drive the sphere toward the east alcove. Five repeated banked launches progressively move it to x=9.862800, z=30.591669. The sixth identical launch misses: the preceding physical work changed where an identical ball can meet it. Adjusting ordinary aim and power then reaches x=15.998191, z=32.532475 in three further blows. Actual prop collision callbacks include both the alcove's far and back walls. The eight productive cycles total 38.017 simulated seconds. The result is a stable resting position, not a scripted snap to a destination.

This is enough context for purposeful work, with a useful failure: a formerly useful launch can stop working. It does not prove that waiting through a sequence is more enjoyable than choosing each blow manually. The repeater lane evaluates that separately.

## Continuation and history

Fire → watch the ball and prop → wait for the held state → Fire is the ordinary path. There is no required Next Shot button. Controls unlock only when the real prop completes the rest criterion; the last completed record stays available for voluntary Keep and Undo until the next Fire. A phone-only “Shot controls” button returns from the stage to the controls without forcing a scroll when the prop settles.

Each record retains the held starting `environment`, real projectile events/path, `endEnvironment` (pose at projectile end), and held `settledEnvironment`. The prop's linear/angular velocities are not in the ball-end pose: that snapshot is explicitly **not** a complete dynamic restart state. Only held before/result states can be restored. Keep is four slots per shape with distinct layout IDs and local-storage keys, original build identity, no automatic overwrite and preserved malformed bytes. The old Guest shelf is neither read nor rewritten.

The accepted projectile ends at its genuine first ground or other existing terminal. Its collider is retired by zero collision masks while the prop continues. After 60 consecutive quiet 120 Hz ticks (linear and angular speed each ≤0.025), the measured pose is held static at rest between launches. The bounded residual velocity is discarded explicitly, matching Guest's rest policy; the pose is not relocated.

If ten post-projectile seconds pass without rest, the new prototype pauses the body **at its measured pose** and marks the attempt blocked. This failure pause does not populate `settledEnvironment`, cannot be kept as a completed blow and is never offered as a restart state. Undo or Reset is required. An adversarial test-only continued spin reaches the limit, stays fixed while blocked, then successfully performs Undo → idle → manual Fire. No gameplay impulse creates that test failure. Ordinary measured cases did not reach the limit. The original Guest's implementation is preserved.

Fresh restoration of a non-home sphere position and quaternion reproduces the complete next record exactly under 30, 60 and 144 Hz render partitions and mixed 7/21/9/32 ms partitions feeding equivalent 120 Hz steps. Thirty idle seconds leave its held state unchanged. Sphere states below y=3.4 are rejected rather than accepting a half-buried sphere; foreign shape states and malformed quaternion records are rejected before mutation.

## Resource cost and checks

World-only counts exclude launcher/projectile presentation and browser UI. Active body counts include the actual ball.

| Cost | Round boulder | Stone control |
| --- | ---: | ---: |
| Ready static bodies / active static + dynamic | 11 / 10 + 2 | 11 / 10 + 2 |
| Meshes / submeshes | 32 / 32 | 30 / 30 |
| Shadow casters | 10 | 10 |
| Triangles excluding painted/paving lines | 2,860 | 188 |
| Warm build median, ten samples | 3.274 ms | 1.845 ms |
| Median prop Reset rebuild | 0.071 ms | 0.159 ms |
| Median Fire rebuild including ball | 0.458 ms | 0.519 ms |
| Owned bodies / meshes / casters after disposal | 0 / 0 / 0 | 0 / 0 / 0 |

These are NullEngine CPU samples on a shared host, not GPU draw calls or phone performance. Warm build ranges were 2.085–6.035 ms (sphere) and 1.553–2.111 ms (stone). The analytic sphere reduces prop rebuild work while the rendered sphere has more triangles; “low polygon” and “cheap collision shape” are different claims. Three independent scene lifecycles per shape, each with three fire/restore/reset cycles, released all owned meshes/bodies/casters. This is resource ownership evidence, not a heap-residency measurement.

Lane validation: TypeScript, targeted ESLint and 8/8 focused tests pass, independently rerun by review. Root verified desktop and 390 px control/fallback layouts without horizontal overflow. WebGL is unavailable in that browser, so no actual rendered rolling, painted-ring visibility, camera, sound listening, frame-time or physical-phone certification is claimed. Root owns the full build, test suite and final hosted pin.

## Director recommendation

Keep both specialized presets for owner comparison, with **Guest Stone still the stronger established positioning tool**. Its shorter cycle and smaller displacement support controlled work, and it has actual positive owner evidence. The round boulder offers a different visual/physical consequence and fewer larger blows, with more time watching it settle. That is a promising alternative, not proof of a better activity.

The isolated proof required one approved sphere collider/presentation and matched controls. A playable comparison additionally needed truthful rest/failure states, direct continuation, per-shape history validation, rotation markings and phone recovery. Generic authoring would add a separate burden: validated starting-pose clearance, support/escape rules for new terrain, restart-state contracts and bounded lifecycle behavior for every approved prop. This commission does not solve or authorize that platform work.

The capability worth retaining is a small set of approved passive props with explicit held-state persistence. Do not expose arbitrary coefficients or general dynamic-body imports. Evidence that would favor the sphere: the owner deliberately uses rolling or longer displacement, chooses different routes because of it, and returns to the altered yard without finding the wait intrusive. Evidence against: frequently resetting to the faster stone, or repeating shots merely to compensate for the boulder's long decay.
