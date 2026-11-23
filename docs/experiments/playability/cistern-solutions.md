# Cistern numerical appendix — spoilers

Use [the owner invitation](cistern-owner.md) for an unprompted visit. Actual measured source: `46b2ac4ca8cca6ddd529a5aa8ab921e970c20c15`; original PR #81 foundation: `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054`.

All rows use the middle rail (railIndex 1), station (0,20,15), and inherited 120 Hz Havok authority. Power is percent. There are no new numerical solutions caused by this pass: all ten fixtures match the original physics exactly.

| Case | Yaw° | Elevation° | Power% | Actual result |
| --- | --- | --- | --- | --- |
| Low return | 0 | 15 | 40 | Low top → far wall → terminal floor, 5.075 s |
| High circuit | 45 | 5 | 50 | East top → enclosing stone → terminal floor, 7.242 s |
| Side chamber | −45 | 15 | 40 | Chamber visit and return → terminal floor, 8.692 s |
| Opposite galleries | 60 | 35 | 40 | East wall → east top → west top → west wall → terminal floor, 8.767 s |
| Short miss | 0 | 5 | 20 | Terminal floor only, 2.000 s |
| High escape | 0 | 45 | 75 | No structure; centre (0,36.967,100.161), out of bounds at 3.408 s |
| Entry escape | −15 | 15 | 75 | Far wall and west gallery, then over low entry wall; centre (−30.182,10.847,−20.124), out of bounds at 5.042 s |
| Long slow top | −45 | 45 | 20 | Early chamber contacts, then extended slow top travel; `settled` at 40.625 s |
| Lower side instead of top | 60 | 25 | 40 | West gallery side contact, terminal floor at 4.975 s |

The opening setup is yaw 0°, elevation 18°, power 40%, first-ground ending at 5.258 s. Low/chamber/main-circuit neighbourhood counts, exact callback normals and incoming/outgoing velocities, full recorded contact episodes, sampled actual paths, all 43 escapes and resource cycles are in [cistern-evidence.json](cistern-evidence.json). Callback velocities are pre/post-step brackets, not isolated impulse decomposition. `path10Hz` values are `[time,x,y,z,vx,vy,vz]` from actual simulation steps.

The longest fixture's important checkpoints are y≈10.43 m after roughly 20 seconds, horizontal speed≈0.866 m/s at25.008 s, the joined floor crossing around26 s, and speed≈0.560 m/s at40.008 s. The inherited settling rule ends after three seconds below0.6 m/s; it does not mean a fully motionless ball. The merged-floor comparison still lasts40.808 s.

Deliberate Stop was reproduced at5,20 and30 seconds of the long fixture. Each yields `interrupted`, preserves the exact committed setup/current history, clears the active projectile and leaves the physical layout unchanged. Those interrupted histories are current-result evidence, not shelf-compatible Kept lines.
