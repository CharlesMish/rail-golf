# Lane A — Overpass

Read [OWNER-PROTOCOL.md](OWNER-PROTOCOL.md) before the technical material if you want to explore without shot solutions. Exact setups are isolated in [APPENDIX.md](APPENDIX.md) and the machine evidence.

## Director finding

Keep one small playable study. Existing lifted/tilted plates can describe **two physical routes through the same occupied footprint**: a low through-and-back route and a roof-top carry that clears the same wall. This is a useful static-authoring result, not a new physics law, a large-world demonstration, or evidence of enjoyment.

The raised geometry does more than decorate a wall rebound. With the roof removed, the upper-carry setup hits the wall and ends near z 41.94 m; with the roof present it bounces from the actual top, clears that wall, and ends near z 70.45 m. The lower route is exactly unchanged by removing the roof. The extra surface therefore opens a forward family while retaining an independent return family below it.

This does **not** establish a substantial multilevel environment. The study is an 11-piece bridge-like structure, not terrain sculpting, a second launcher, or a new floor/ground rule. The two primary routes are already possible inside the existing bounds. Expanding the world to 200 m would not help this physical question.

## Authority and implementation

- Branch: `research/horizons-spatial-20261119`.
- Start and physics authority: `0b151c5c94849b78ccda6c41a1755b66471e3fa2`, neutral Foundry/chime-comparison baseline. Production ancestor: `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.
- Measured implementation: `a054ad898ec838ee0af8c558a7a86b1f805add5c`; the subsequent handoff commit records that rerun and does not change physics or layout.
- Reviewed actual `vertical-yard` runtime and Havok tests, `worldcraft-model.js`, `worldcraft-scene.js`, `worldcraft-runtime.js`, range harness, Foundry contract, Descending Resonance evidence, and capacity measurement code before design.
- Playable data: `worlds/foundry/overpass/{preset,manifest}.json`. Registered as a short study, `customCode: null`, no optional challenge, no completion or score.
- Eight horizontal stock plates make a 16 × 8 m roof. Its underside is y 7 m and top is y 7.35 m. Two stock banks support its edges, with actual matching box colliders. A third stock bank stands beyond it.
- All objects are fixed in this study. Origin, yaw, elevation and power remain normal player controls. The roof plates share one timber voice; this is a spatial study and the note timeline is hidden. Plate sound remains the ordinary contact feedback, not a musical objective.
- No new schema, piece kind, scale field, terrain field, physics coefficient, launcher origin system, motion driver or capacity extension. The 12-piece default is sufficient.
- No changes to ball mass/radius, gravity, charge mapping, 120 Hz Havok cadence, ground/tee termination, recognition, production score/progress, world identity, import/export or Keep/Restore authority.
- One world-specific side result frame is added. It is presentation only and requires rendered owner judgment.

## Actual physical evidence

All numbers below are actual Havok from the shared Worldcraft runtime in NullEngine. The sparse trails in `evidence.json` are recorded positions, not predicted curves. Raw callback normals and before/after velocities are retained separately from the qualified-departure tracker. Callback normals use Havok's reported body orientation; they are not relabelled as outward surface normals.

| Study | Contacts and consequence | Terminal |
| --- | --- | --- |
| Upper carry | Roof top at 1.8333 s, contact y 7.3764 m; qualified top point y 7.3503 m. Incoming velocity (0, −9.1956, 18.2864) m/s becomes (0, 7.8451, 16.6069) m/s. Actual centre passes the far wall at y 10.09–10.32 m. | First ground at 3.8000 s, z 70.4476 m. |
| Lower return | Passes beneath the roof outbound, then contacts the wall at 1.1167 s, y 5.2440 m. Qualified outgoing z velocity is −30.5602 m/s. Returns through the same lower passage. | First ground at 1.7917 s, z 24.6966 m. |
| No-deck control, upper setup | Meets the same wall at 2.2250 s, y 3.2792 m. No roof-top rebound exists. | First ground at 2.4333 s, z 41.9363 m. |
| No-deck control, lower setup | Contact ledger, qualified evidence and terminal are exactly equal to the raised-world lower route. | Same first ground and coordinates, bit for bit in this environment. |

The lower route's centre stays at y 5.7631–6.0912 m while outbound underneath z 32–40 m. Including the 0.43 m ball radius leaves at least **0.4788 m clearance** below the roof. On its return the centre is y 2.7446–4.4989 m in that interval. These are genuinely separate volumes, not an unexplained pass through a decorative surface.

Both primary routes retain their family for all eight immediate axial neighbours: yaw ±0.5°, elevation ±0.5°, power ±0.01, and origin ±0.5 m. This is local sensitivity, not a claim that all combinations of those changes work or that a new player will find the families. Repeated exact shots and Scene-observable stepping reproduce the same terminal, contact ledger and qualified evidence.

## Negative results worth keeping

- Three power detents above the upper-carry reference overshoot the roof and fall into the wall. The result ends underneath the structure near z 37.27 m. More power does not monotonically carry farther.
- A low, short shot lands before reaching any structure. A high bypass clears every piece. The architecture is optional rather than a mandatory funnel.
- The underside is a real collision surface: one recorded line contacts it while rising, then returns from the wall. But the next elevation detent strikes the roof's front edge and sends the ball sharply down. Treat this as an honest failure/edge relationship, **not** a promoted third route or a fair precision challenge.
- Early coarse exploration found rare wall-to-roof capture/settling and hard edge kicks. Those were rejected as primary exemplars because the robust over/under pair is easier to explain and verify. No geometry or coefficients were changed to make those rare chains work.
- The roof costs eight tiles. A single tile's top bounce already follows the same physics; the broad deck buys a usable lateral area and a recognizable over/under relationship. Eight pieces are not eight new mechanics.

## Resources and lifecycle

These are **Worldcraft runtime-only NullEngine counts**, excluding the browser's shared forest, cannon, camera and UI presentation. Shadow counts are the real builder's caster registrations observed through a list collector; no shadow pass or rendered draw calls occurred.

| Resource | Overpass | Same structure with roof removed |
| --- | ---: | ---: |
| Authored pieces | 11 | 3 |
| Static physics bodies, including ground and tee | 13 | 5 |
| Animated bodies | 0 | 0 |
| Dynamic bodies while firing | 1 | 1 |
| Actual scene meshes | 21 | 5 |
| Included noncolliding height guides | 8 | 0 |
| Materials | 15 | 7 |
| Geometries | 21 | 5 |
| Textures | 0 | 0 |
| Shadow-caster registrations | 12 | 4 |

Recorded run: initial runtime construction 54.95 ms; eight raised-world replacements median 3.72 ms (2.79–7.18 ms), and resets median 4.87 ms (3.80–7.25 ms). No-deck replacements median 1.41 ms (1.03–2.60 ms), resets median 1.39 ms (0.91–2.27 ms). These are noisy one-process headless build costs on a shared research machine, **not frame times** or device benchmarks.

Eight load → fire → reset → switch cycles retain exactly the same resources for each world. Runtime disposal returns bodies, scene meshes, geometries, transform nodes, materials, textures and caster registrations to zero. Process heap samples are recorded as context; no precise heap-leak or GPU-memory claim follows from them.

The root session found WebGL unavailable in its supported browser. Rendered meshes/draw calls, desktop/phone framing and frame timing remain unverified. NullEngine success is not physical-phone performance evidence.

## Reproduce and review

```sh
node scripts/horizons/spatial-measure.mjs
node scripts/foundry/validate.mjs worlds/foundry/overpass
node --test tests/horizons-spatial.test.mjs tests/worldcraft-foundry.test.mjs
```

The exploratory script is optional and writes its full coarse trajectories to a caller-selected scratch output; only concise selected evidence belongs in Git. Four focused new tests verify physical surfaces, controls, no-deck ablation, exact stepping and cleanup. The existing Foundry suite also replays prior worlds and checks the original v1 export hash.

Recommendation: pursue bounded elevated surfaces and height-aware author preview. Do not add scale, larger bounds or terrain editing on this result. A bounded contiguous slab might become worthwhile if further independently authored structures repeatedly require tiled decks; this one study does not justify it by itself.
