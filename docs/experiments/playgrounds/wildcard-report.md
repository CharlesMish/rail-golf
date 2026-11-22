# Wildcard — Vesper Saddle: qualified physical proof, no playable world

Base: `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb`.
Branch: `research/playgrounds-wildcard-20261121`.
Implementation/evidence tip is recorded in the director handoff; this lane does
not change a foundation branch or publish a route.

**Decision:** preserve a reproducible carrying/routing proof. Do not present this
two-body fixture as the promised hillside, and do not expose arbitrary mesh
terrain to imported worlds. The unusually useful finding is that the accepted
physics already supports sustained travel close to a non-terminal surface.
Curvature changes a route; it does not supply a new shot-end rule.

## Concept and bounded construction

Grok's Vesper Saddle asks the player to choose a basin through landing position
and speed, then watch the ball follow a carrying face. The proposed bowl,
kinked throat, north shelf and eventual resting choices are not implemented.
Only their dependency is tested: can an ordinary ball be received by a broad
surface and travel along it while its transverse contour changes its route?

The proof is one closed static Havok MESH, 36 m across and 60 m long, with a
shallow longitudinal descent and a convex transverse ridge. It has a genuine
1.5 m thick underside and side faces. Rendering and collision use the same
vertices; no hidden receiving volume is present. Ground is the other body and
retains first-contact termination. The existing elevated station code starts the
launcher at 9 m. There is no new station or projectile implementation.

The surface uses the existing bank material (.86 restitution, .18 friction).
Sphere mass 1.5 kg, radius .43 m, sphere material .38/.28, gravity 12 m/s²,
charge mapping and 120 Hz authority are unchanged. A surface need not be marked
as terminal ground: existing non-terminal obstacles can already support travel
and settling. The original concept overstates the need for a new collision rule.
What is new here is the bespoke contiguous geometry, unavailable in Foundry data.

Three controls distinguish curvature from simple carrying:

- **Ridge mesh:** curved transverse section, gentle downhill slope.
- **Flat mesh:** same longitudinal slope, extents, thickness, material and grid,
  but no transverse curvature.
- **Flat BOX:** the same top plane and footprint represented by one ordinary
  box. Its lower corners differ slightly from the vertically thick mesh; the
  reported carrying contacts are on the matched top, not the underside.

## What Havok established

| Observed relationship | Ridge | Flat mesh | Flat BOX |
|---|---:|---:|---:|
| Representative eastward line: longest near-face run | 3.7667 s | 3.7917 s | 3.8667 s |
| Same line: terminal x / z | 19.8163 / 77.2046 m | 6.0884 / 88.5497 m | 6.8887 / 88.4041 m |
| Same left-rail launch: terminal x / z | −7.8406 / 87.3281 m | +2.9010 / 88.4223 m | +2.8887 / 88.4041 m |
| Coarse 125-shot sample: touches face | 125 | 125 | 125 |
| Coarse sample: near-face run at least .5 s | 25 | 32 | 30 |

The left-rail comparison is the clearest qualitative result. An identical launch
has a small positive x velocity. On the flat plane it continues to the right;
on the ridge it ultimately leaves to the left. Curvature has supplied a
physical routing choice. It has not been shown to improve total carry frequency.

The representative ridge line first contacts at callback time .7167 s, with
incoming velocity `[1.4354, -3.8774, 16.4070]` m/s. Contact normal and both sides
of every saved contact episode are in the evidence. First contact begins at
approximately x1.47, z16.68, with a predominantly vertical contact normal. The
ball reaches real ground at 5.0250 s. Six nearby changes—yaw ±.5°, elevation
±.5°, power ±1 percentage point—each retain a near-face run longer than 3.1 s.
Moving between the three real rail stops is a larger change, not a claimed .5 m
origin control: the west stop selects the opposite side; the east stop has a
much shorter .5083 s run in the nominal mesh.

“Near-face” is an explicit geometric diagnostic: after an actual face contact,
the sphere-to-facet-plane gap is between −.1 and +.15 m, excluding the perimeter.
It is **not** a claim of uninterrupted collision contact, pure rolling or a new
force. Short rebounds remain present. The metric uses the actual linear facet
plane and its slope, not just vertical distance from the intended smooth curve.
All paths and contact callbacks originate in the shared Havok session.

Fresh scenes repeated the selected setup three times with exactly equal records,
paths and callback data on this tested engine build. This is not a cross-version
or cross-device bitwise guarantee.

## Negative findings and why the lane stops here

1. A higher arrival remains a conventional rebound: the longest near-face run is
   only .025 s. The same surface does not silently convert a high impact into a
   smooth hillside ride. No damping or restitution override was added to force it.
2. A front-edge arrival turns a nearly horizontal incoming flight into a strong
   upward departure. At the first callback its vertical velocity changes from
   +.1846 to +8.7672 m/s; the full episode reaches about +15.60 m/s. This is an
   actual edge interaction, not the broad top reception to advertise.
3. The ridge does not have stable destinations or a catch bowl. A left/right
   exit alone is insufficient context for the complete world vision.
4. **Tessellation is consequential.** With 0.75/1.5/3 m grids, the nominal east
   line finishes at z79.9632/77.2046/77.4305 m. The left-rail line finishes at
   x−6.7199/−7.8406/−3.6711 m. The maximum smooth-curve height approximation error
   is only .00253/.01013/.04050 m respectively. The flat mesh, whose top is the
   same exact plane under these tessellations, also differs from the BOX.
   This is evidence to freeze and identify collider topology; it does not prove
   which contact seam or solver detail causes every difference.
5. The broad sample is an author diagnostic, not a discovery rate or enjoyment
   measure. Its range deliberately includes low-energy and higher-bounce arrivals.

The next worthwhile proof would add one shallow receiving basin and one open
exit to the **same** frozen surface, then check arrival bands, stable rest and
useful departures. That may deserve a later world. It does not justify adding
an unrestricted surface/material editor now.

## Cost and cleanup

NullEngine measurements, world-only; no rendered draw-call or browser frame-time
claim. All variants have 2 static bodies, no animated bodies, and one extra
dynamic projectile while a shot is active. They have 2 meshes and one registered
shadow caster. The fixture intentionally uses one shared test material.

| Surface | Surface triangles / vertices | Warm build median, six cycles |
|---|---:|---:|
| Ridge, 1.5 m grid | 4,096 / 2,050 | 9.34 ms |
| Flat mesh, 1.5 m grid | 4,096 / 2,050 | 7.90 ms |
| Matched flat BOX | 12 / 24 | .426 ms |

The ground adds 12 triangles to each total. A .75 m grid raises the surface to
15,872 triangles and 7,938 vertices; a 3 m grid lowers it to 1,088 triangles and
546 vertices. “One body” therefore does not establish the cost of an arbitrary
mesh. These are noisy shared-host build times, not hardware performance targets.

Six load/fire/retry/reset/dispose cycles per main variant, four shots per cycle,
returned owned bodies, meshes, materials, geometries and caster registrations to
zero each time. Heap deltas are retained as observations, not GC/leak proof.
No actual rendered scene, GPU memory, phone behavior or audio was tested because
this is an unpromoted headless physics fixture, not an owner-facing UI.

## Reproduction and evidence

- Geometry and constants: `lib/playgrounds-saddle.js`.
- Shared-session harness: `scripts/playgrounds/saddle-harness.mjs`.
- Run `node scripts/playgrounds/measure-saddle.mjs` to regenerate
  `wildcard-evidence.json`.
- Run `node --test tests/playgrounds-saddle.test.mjs`: 4 tests passed.
- Scoped ESLint on these new files passed. Director runs integrated TypeScript,
  build, Foundry validation and historical suite after integrating lanes.
- Exact launch recipes are in [wildcard-solutions.md](wildcard-solutions.md).
- [wildcard-evidence.json](wildcard-evidence.json) contains exact geometry,
  representative fixed-step paths sampled at 30 Hz, all contact-episode
  summaries, first/last callback samples, coarse results, nearby variations,
  tessellation controls, fresh-scene equality and resource records. The harness
  retains full 120 Hz history in memory and regenerates all records.

## Other wildcard commitments deliberately not made

**Low Water remains promising and separate.** Use three locked levels, one real
terminal BOX plane per selected level, a derived launcher height, a lower rock
route and a high receiving ledge. Allow changing level only while ready. Save
layout revision, selected level and station with the shot; the post-state is the
same level. Restore must recreate that exact starting state and require manual
fire. A later level change is a new experiment with the same control settings,
not an exact replay. Raising a floating tee changes the global initial position,
so the phrase “the same shot continues past its old splash” needs qualification.
A diagnostic that holds the global muzzle fixed while varying terminal level
can isolate the terminal-surface effect, but that is a separate control from the
player's floating-tee experience. Test a real high-water reach advantage as well
as low-water surface access. If low water simply adds every useful route, the
tradeoff is absent. Do not add skipping, buoyancy or a changing level in flight.

**Assay Hall:** one bounded hinge with measured ball-to-beam response is the right
minimum; a free generic hinge editor is not. Return torque, angle limits,
reset phase, post-shot settling and whether slow/fast arrivals select distinct
routes remain unmeasured in this commission. Multiple beams would multiply
those questions, not answer them.

**Salt-Crust Cenote:** removing a body after its collision callback does not
establish punch-through. A separate pre-solve/filtering proof must first avoid
an already-applied bounce and record intact/broken state. Cosmetic fragments
would not repair that failure. No breakable-material system was implemented.

**Drift-Ice Caldera / Skipping Cloister:** buoyancy, a water response law and
floating-body state are distinct commitments. A low-friction rigid surface
alone would not validate the promised floating/sliding/skipping world. They
remain creative proposals with no new physical evidence here.
