# Lane B — Swing Gate

A slow moving face gives this world two different reasons to fire: pass the opening, or deliberately borrow the face. The same launcher setup reaches distinct places at different release phases. This is a credible small playable study, not evidence that a timer makes a good level.

Route: `/lab/horizons-gate`. Branch: `research/horizons-mechanism-20261119`. Neutral origin: `0b151c5c94849b78ccda6c41a1755b66471e3fa2` (`lab/wc-exp-20261114-chime-compare`), descended from production `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`. Physical implementation measured at `08169bfeb0233a5bcea69ffc291fe2933522ef68`. This lane does not depend on the amphitheater branch.

## Why this mechanism

The historical Fan & Paddle Works already establishes a real 120 Hz ANIMATED Havok reflector, LIVE release capture and held Recall. Travelling Bell and Clockwork Gallery establish fixed-phase target motion, but their published opening layouts have no hits in their respective coarse phase sweeps, and the bell's compound solution is highly yaw-sensitive. Reusing their whole courses would reproduce a discoverability problem.

Swing Gate reuses the paddle's body construction, target-transform motion, reset boundary and stop operations through `createPeriodicReflector`. All 17 historical paddle/wind tests still pass, including exact repeat records. The new world has one wide face, an honest portal and an honest far wall. It introduces no new moving-body physics, no projectile redirect, no generic schema and no target score.

The 14 × 12 × 1.4 m gate oscillates about its vertical centre at (0, 7, 32), amplitude 78°, period 12 seconds. Maximum angular speed is about 0.713 rad/s, and the outer edge is about 5.0 m/s. Material remains the historical timber reflector's restitution 0.86 / friction 0.18. Six static bodies form ground, tee, two portal posts, portal beam and far wall; the gate is the seventh, ANIMATED body. The projectile adds one dynamic body during flight. Every visibly substantial structure has a matching physical box. Small colour stripes and the ground sweep outline are visual cues, not alternate surfaces.

The far wall is useful because a clean passage can later become a return through a gate that has continued turning. It is not required for the basic phase effect; the absence control establishes clean passage as the ordinary ballistic trajectory.

## Evidence and failures

All results below use actual Havok in Babylon NullEngine at 120 Hz. The numerical launch setups and exact saved terminals are isolated in [gate-solutions.md](gate-solutions.md) and [gate-evidence.json](gate-evidence.json).

- The same opening setup passes cleanly at one phase and physically returns at other phases. The passage path matches the no-gate control sample for sample, not just at the endpoint.
- Three representative gate encounters return left, almost directly back, or farther back. Each has two solver contact callbacks in its short face episode and a qualified physical departure. The raw callback normals, pre/post-step velocities, contact timestamps and sampled actual paths are preserved.
- Nearly broadside encounters while the face moves in opposite directions have outgoing forward-axis speeds of about −16.20 and −26.81 m/s. This is Havok's moving-surface response, not a script applying an extra impulse. The fixed-pose control gives a different outgoing direction and terminal.
- The two useful base outcomes, clean passage and near return, survive all 42 tested combinations of ±0.5° yaw, ±0.5° elevation, ±1 percentage point power and ±0.05 s release phase (one-variable aim changes combined with three phase samples). Every record, callback vector and sampled path repeats exactly in the same authority.
- A bounded 48-phase survey of the default setup has 18 clear-passage samples and 30 samples touching the gate. Two gate samples also touch a real portal post. This is not a success rate, a player distribution or exhaustive certification of the phase boundaries.
- A longer shot passes the gate, contacts the far wall at 1.525 s, then contacts the gate from behind at 2.542 s; the free flight between the wall's last callback and the gate's first is about 1.008 s. Its far-wall departure reverses z velocity from +40.49 to −34.66 m/s, and its second gate departure sends z velocity back to +29.23 m/s. The line then ends on first ground.
- That compound return survives ±0.5° yaw, −0.5° elevation and −1 percentage point power. **+0.5° elevation hits the far wall's upper edge and leaves the yard high.** This is an honest fragile secondary relationship, not the opening design's justification. No geometry or restitution was retuned to remove the negative.
- Another release phase intercepts that same longer setup outbound and sends it far to the right instead of reaching the far wall. Timing is not a guaranteed delayed solution.

The phase survey's largest callback-adjacent speed is 30.49 m/s for the default setup. No pass-through of the thick face, prolonged contact or invalid physics was observed in these cases. The test envelope does not certify thin blades, arbitrary speeds, every edge approach or cross-device bit equality.

## Player controls and recorded authority

The prototype defaults to set power, so choosing the release time does not require simultaneously charging. LIVE advances the actual body while ready. PAUSED holds a chosen release phase while the player aims; **the gate always moves after firing**. This is stated next to the controls. Phase is an integer 120 Hz tick in 0…1439, captured with the launch environment and resolved with flight time. Result stops the reflector; Retry resumes, Reset returns to the authored cycle, and Recall holds the saved phase.

Four opt-in local Keep slots preserve a chosen resolved line's exact setup, station, layout contract, build, launch/end environments, contact ledger, terminal and sampled actual trajectory. Restore validates the layout, clears the previous visible trail, restores the exact setup and holds its phase; firing remains manual. The stored path is available in Download and is never fed into Havok. Old-build provenance is shown. Foreign/malformed saves are rejected, original malformed shelf bytes are preserved, and a full shelf never overwrites another line. Other historical SpatialLab routes retain their original controls and in-memory Recall behavior.

Tests load a Keep into a fresh runtime, wait four seconds of idle simulation, manually fire it, and obtain the same physical record. The same release phase also produces identical contact/terminal records under simulated 30, 60 and 144 Hz render partitions and a mixed partition sequence. These are the Scene physics accumulator path, not just direct calls to the solver. Actual rendered-device timing and clock responsiveness remain browser/owner evidence, not a headless claim.

## Cost and cleanup

This comparison uses the same fixture materials and excludes shared launcher/UI, engine startup and shader compilation. Timings are CPU NullEngine scene construction, not frame timing. Twelve warm builds follow one initial sample.

| Cost | Swing Gate | Historical Fan & Paddle control |
|---|---:|---:|
| Static bodies | 6 | 14 |
| ANIMATED bodies | 1 | 1 |
| Dynamic bodies while ready | 0 | 0 |
| World meshes / submeshes | 18 / 18 | 62 / 62 |
| World shadow casters | 6 | 46 |
| Triangle primitives | 204 | 996 |
| Line segments | 48 | 4 |
| Warm build median | 1.61 ms | 3.19 ms |
| Warm build range | 1.18–3.40 ms | 2.36–5.08 ms |
| Bodies / meshes after world + root disposal | 0 / 0 | 0 / 0 |

A phase reset rebuilds one body, not the entire world: median 0.022 ms, maximum 0.213 ms across 100 measured resets. Eight load/dispose cycles with five fire/reset cycles each retain seven ready bodies and 18 world meshes, then release every body, mesh and shadow registration. No new texture assets, effects system or per-shot persistent meshes are introduced. Retained shelf state is bounded to four entries, 200 kB each, and at most 602 path samples per line. This bounds saved evidence, not a measured browser heap budget.

Actual rendered draw calls, frame timings, GPU memory and phone comfort must be reported separately from the director's browser pass. A count of 18 submeshes is not a draw-call measurement.

## Checks and reproduction

- `node --test tests/horizons-swing-gate.test.mjs tests/mechanism-vocabulary.test.mjs`: 26/26 pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass, five inherited warnings, no new warnings.
- `node scripts/horizons/measure-gate.mjs`: writes the concise raw evidence JSON.
- The director runs production build, full test suite and combined preview QA after integration.

The prototype is custom-coded and deliberately absent from the Foundry registry. Generic imports cannot execute the mechanism code or set physical coefficients. Existing world v1 schema and identity code are untouched. No production score, progression, first-ground termination, projectile coefficients or foundation branch is changed.

## Owner entry, without solutions

Look at the gate for one cycle. Keep one launcher setup and vary only when you release; then try deliberately using the face. PAUSED lets you inspect a starting phase without rushing. After one interesting result, Keep it, take a different shot, and Restore the Keep. The held phase should make a manual refire unsurprising. Later, see whether the distant wall gives you another reason to revisit the opening.

The useful question is whether you start choosing **how** to meet the moving face, rather than merely waiting for a permission window. Stop prioritizing this capability if LIVE mostly adds waiting, or if PAUSED plus an ordinary static reflector provides the same satisfaction. Promote a bounded code-owned motion vocabulary only after owner play shows that release choice itself invites another shot. A future generic version would need swept-volume placement validation, code-owned speed/thickness limits and phase-aware saved-line identity before it belongs in ordinary imported worlds.
