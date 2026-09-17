# Mechanism Range v0.1 — normalization, not a spatial revision

Baseline: d95c5330920e9f26517907ba3cd6161f0a4e6af0. Route: `/lab/mechanism-range`.
The three zones, launcher location, actuator, table transforms, materials and physical
fixtures remain the v0 study. No score, target, station, progression or recognition changes.

## Survey repair

The old Return action cleared the survey boolean while the renderer's
`phase !== 'result' || survey` branch then refused to move the result camera.
A stable camera-mode store now supplies both React's label and the render loop:
launch / survey / flight / impact. Return explicitly selects launch, including in
RESULT. Survey is available in READY and RESULT; Retry, Reset and Recall return
to launch. No React state change recreates the engine.

## Control continuity

The adapter directly uses current Rail Golf rail/clamp, station/muzzle, charge,
launch-speed and MAX authority. It preserves aim on rail changes. Mouse drag is
0.075 degrees/pixel, touch 0.11; keyboard aim steps 0.7 degrees, fine buttons 0.5.
Q/E rails, arrows/WASD aim, Space charge/fire, X MAX, R Retry, L Recall, V Survey.
The orange control supports timed hold, exact Set Power and immediate MAX.
Retry preserves environment and MAX; Reset restores default aim and state A;
Recall restores last starting environment, aim and exact power and clears MAX.

The launcher/round mesh recipe is mirrored from MannersGame in an isolated
presentation module; the frozen production component is not refactored.

Shared physical envelope: rails -4/0/+4 m, yaw ±70 degrees, elevation 5–85 degrees,
nominal launch speed 6–43 m/s, mass 1.5, sphere radius 0.43, restitution 0.38,
friction 0.28, gravity 12, Havok 1/120 s steps. Timed charge reaches 80% in two
seconds and 100% in three. Validation bounds now reference the existing shared
constants instead of identical literals; no impulse/collision math changes.

Intentional retained differences: v0 opening aim is rail 2, yaw -17, elevation 22,
with a 45% exact-power seed. The preserved address camera is at (0,10,-21),
looking at (0,5,40), rather than the Courtyard's aim-relative setup framing.
Only the last attempt is held in memory; this sketch has no production archive,
share import, scoring or audio subsystem. Those are outside this normalization.

## Projectile presentation

RAIL ROUND is the default: incumbent elongated shell, orange nose, cyan band,
oriented along velocity. BALL is an optional Shot Tools display selection.
Both use the same hidden spherical body; neither display mesh owns physics.
Switching presentation changes no launch, collision, mass, transform or impulse.

## Blind-study text

Initial brief: “Explore the range. No target or score. First ground contact ends
the line.” No initial state badge or instructions naming the actuator relationship.
Only a real switch contact reveals discovery. Thereafter `TRANSFER B · RAISED`
(or `TRANSFER A · LEVEL`) confirms state; lifecycle help becomes available in
Shot Tools. Retry/Reset do not erase acquired knowledge during this page visit.
Fresh entry is undiscovered. No QA coordinates appear in the page.

## Verification and manual follow-up

NullEngine/real-Havok tests exercise repeated READY and RESULT camera round trips,
Survey followed by Retry/Reset/Recall, shared launch limits and applied impulse,
rail aim preservation, exact-power/MAX authority and blind-copy gating.
Switch hits in both directions and table rebounds in both states are compared
step for step with no presentation, RAIL ROUND, BALL and alternating displays.
The original zone, sightline, cross-zone, mechanism and lifecycle tests remain.

Hosted WebGL availability is reported separately at handoff. Automated camera
convergence and physical equivalence do not substitute for Charlie's manual
check of framing, mobile controls and rebound readability. Do not revise the
High Return Rack or other geometry before that next study.
