# Worldcraft Horizons — bounded director audit

Authority checked on 19 November 2026. Production `main` is
`4a2be20984da4e50d7f87f37e59d7d61ff384e2c`. General lanes start from
`lab/wc-exp-20261114-chime-compare` at `0b151c5c94849b78ccda6c41a1755b66471e3fa2`.
The return-feasibility lane alone starts from `experiment/amphitheater-place`
at `6ebb2f2b370656c7e70b108ad04d0369b78cf89c`. Main is an ancestor of neutral;
neutral is the merge base with amphitheater. No foundation is changed.

## What is actually available

“Ordinary” below means the Foundry authoring kit, not production main. The
September handoffs are historical. Runtime validators take precedence over
the older kit prose, which has not kept up with experimental extensions.

| Capability | Ordinary author | Experimental / older lab authority | Director assessment |
|---|---|---|---|
| Height | Fixed-height bank, ramp, block and plate | Neutral: plate lift 0–20 m in 0.5 m steps and tilt ±90° in 5° steps; 3D overlap validation. Vertical Yard: elevated tee, broad decks and separated upper returns in code. | Prove upper/lower relationships before adding another height control. |
| Terrain / surfaces | Flat terminating ground; actual fixed catalog boxes | Amphitheater: matching convex terrace colliders and curved visual courses. Vertical Yard: physical broad solids and supports. | A bounded architectural deck may matter; arbitrary terrain does not yet have a demonstrated need. |
| Scale | Pieces contained inside x±30, z10–96; 12 parts | Neutral opt-in 24 parts; Vertical Yard extends to z152 and x±60. | Useful separation matters more than extent. Do not widen bounds for empty flight. |
| Launcher | Stationary x carriage ±10 m; origin/aim/power windows | Amphitheater z/yaw; Vertical Yard elevated tee; Travelling Tee wider stops and captured moving origin with no inherited velocity. | Station placement supports a place. Avoid exposing every station variable by default. |
| Moving bodies | No generic mechanism palette | Neutral straight bell; clockwork circular translating figure; main Fan & Paddle Works yawing ANIMATED reflector. | Reuse 120 Hz capture and held Recall. Broad, slow passage-versus-contact is the useful test. |
| Environmental forces | None | Main Fan & Paddle Works: bounded ±6 m/s² crossflow, visible cues, zero-force OFF, captured state. | Technically established; needs a readable route choice before authoring promotion. |
| Sound | Optional bank/ramp voice, required plate voice; fixed scales | Contact ledger and acoustic speed mappings; old musical studies | Feedback is useful, but musical sequencing should not define all new worlds. |
| Challenge | None, ground circle, target contact or contact phrase; fixed/allowed parts and launch controls | Separate manifest challenge identity | Keep free worlds first class. The current world hash still includes rules: identity separation is incomplete. |
| Camera/edit/save | Survey, aim view, snapped editing, undo/redo, bounded import/export, voluntary Keep/Restore and actual historical trails | Specialized lab camera and environment recovery; phase-aware range-shot export | Presentation can invalidate a sound physical idea. Generic Keep currently omits moving-bell phase; do not inherit that gap. |

## Candidates before implementation

| Candidate | Gameplay value to test | Cost | Engineering risk | Interaction burden / decision |
|---|---|---|---|---|
| Raised crossing / receiving architecture | Same place offers under, over, return, or onward routes | Low using plate poses; moderate for a new bounded deck | Thin edges, seams, false visual support, settling, camera occlusion | Low if authored and mostly locked. Try existing vocabulary first. |
| Slow broad gate / reflector | Waiting changes passage or destination; deliberate impact is another intention | Moderate specialized adapter | Phase provenance, idle velocity, reset/disposal, frame-versus-tick confusion | Moderate. Separate set power from release timing; restore must hold phase. |
| Bounded wind corridor | Choose how much of a visible volume to traverse | Low reuse, moderate generic integration | Force applied at wrong cadence or omitted saved state | Can multiply aiming uncertainty. Assess with OFF control; defer unless it creates a clear relationship. |
| Larger bounds | Long carries and meaningful separated interactions | Low data edit, moderate camera/bounds validation | Out-of-bounds mismatch, hidden destinations, longer waiting | Defer until a particular world needs it. |
| Station z/yaw/height | Different approaches to a place | Moderate compatibility and camera work | Muzzle clearance, launch provenance, world transforms | Support a demonstrated world; do not broaden generic controls tonight. |

Do not pursue arbitrary scaling, remote meshes, scripts, per-world physics
coefficients, random weather, thin fast blades, a terrain editor, or a schema
rewrite. These enlarge implementation and search space without supplying a
new understandable reason to fire.

## Lane decisions

- A tests a raised crossing using current physical parts, against simpler geometry.
- B tests one broad periodic gate, with passage and deliberate deflection, in an isolated lab.
- C reproduces the older bounded-force control and remains an assessment unless it earns more work.
- D independently authors a nonmusical world using the neutral contract; no prescribed geometry.
- E tests the proposed three-piece radial return on the separate station branch, including no-wall and Stone Circle controls. A clean return with a deliberate skip is useful; a long contact chain is not required.

An independent reviewer will challenge route novelty, actual slider neighbours,
negative examples, phase Restore, resource accounting and the next action offered
to a player. Technical, authorable, discoverable, expressive and enjoyable remain
separate judgments. Headless fixtures cannot establish enjoyment.

## Verification boundaries known at the audit

The untouched neutral baseline passes TypeScript, lint (five existing warnings),
production build, all 555 tests and all 16 Foundry directories. The current cloud
browser reports WebGL unavailable. No rendered geometry, draw-call, frame-time,
audio-listening or physical-phone claim follows from its DOM or NullEngine.

Actual scene mesh counts must include height guides. Actual body counts must
include separately owned animated aggregates; the old `staticBodies` diagnostic
does not. Headless timing under concurrent work is comparative instrumentation,
not a hardware performance certificate.
