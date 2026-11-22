# Vesper Saddle proof — numerical appendix

These fixtures are evidence for an unpromoted proof, not owner-facing invitations.
All use the exact shape in `lib/playgrounds-saddle.js`, nominal 1.5 m grid,
station `{x:0,y:9,z:0,yaw:0}`, unchanged charge mapping and actual 120 Hz Havok.

| Fixture | Rail index / x | Yaw | Elevation | Charge | Purpose |
|---|---:|---:|---:|---:|---|
| East carry | 1 / 0 m | 5° | 16° | .30 | Long near-face travel then east departure |
| West route | 0 / −4 m | 5° | 16° | .30 | Same aim changes side under ridge vs flat |
| Higher rebound | 1 / 0 m | 5° | 30° | .55 | Negative: separated ordinary rebound |
| Front edge | 1 / 0 m | 5° | 10° | .55 | Negative: edge kick, not broad-top carry |

Immediate sensitivity changes yaw ±.5°, elevation ±.5°, charge ±.01, and the
separate larger rail-stop changes −4/+4 m. The coarse sample is the Cartesian
product yaw `[-10,-5,0,5,10]`, elevation `[12,16,20,24,28]`, charge
`[.25,.30,.35,.40,.45]` from the center rail: 125 shots per geometry. It is not
uniform over all player intentions or a user success probability.

`ridge` is curved in x and slopes in z; `flat` removes only the x curvature;
`box` supplies the same top plane and footprint with a BOX collider. All use
identical accepted bank coefficients. Tessellation checks change only grid
spacing to .75 or 3 m. Exact returned positions/times, callback normals,
bracketing velocities and histories are in `wildcard-evidence.json`.

Callback times follow the existing session convention before the step's elapsed
time increment. Bracketing incoming/outgoing velocities describe that fixed
step, and an episode's final outgoing velocity can differ from its first
callback's outgoing velocity. Babylon callback normals are retained as returned,
without claiming a normalized outward orientation for every body ordering.
