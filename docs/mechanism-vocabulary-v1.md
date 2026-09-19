# Fan & Paddle Works v1 — visible state and captured phase

Route: `/lab/mechanism-vocabulary`. The exact v0 experiment control is commit `ca1cc8fa101dba04520b7930f8c0eae8e918cf04`. Accepted Mechanism Range, Timber Courtyard, score/recognition rules and progression are not changed.

## What was wrong with the rendered v0 experiment

The v0 source agrees with Charlie's observation. Wind intentionally defaulted OFF; selecting it was inside Shot Tools. Its arrows were static even when enabled. The paddle intentionally stayed still in READY and only started after launch. Those are presentation/state choices, not an observed failure of Havok's moving body. Existing fixtures still produce physical wind displacement and paddle returns. Without WebGL here we cannot exclude a separate device-specific rendering problem, but the reported opening scene follows directly from that code.

## Primary controls and visible cues

WIND OFF / LEFT / RIGHT and PADDLE SYNC / LIVE are primary controls, with explicit current-state readouts. First entry and Reset now select LEFT / SYNC, so the opening scene contains active flow. The force itself remains exactly the v0 bounded ±6 m/s² crossflow, using the same 1/120-second mass × acceleration × dt impulse inside the same authored box. OFF means zero force.

Nine arrow-ended streamers travel across the actual volume and gently flutter; the fan rotors turn in the corresponding direction. OFF collapses the strips into short hanging grey markers, hides arrowheads and stops rotor motion. These are environmental cues, never a predicted projectile trajectory. They have no added bodies. The physically unchanged paddle receives an amber center stripe, edge stripes on both sides and visible pivot collars. Its actual Havok body cycles while the player is READY, so waiting at the tee demonstrates a real moving reflector.

All common launcher, Rail Round and physics authority remains shared. World materials use the shared lab/incumbent palette. The two bays retain their existing silhouettes and physical dimensions; this is not an art or geometry redesign.

## SYNC and LIVE authority

The paddle remains a 17 × 14 × 1.4 m Havok ANIMATED box, centered at (20, 8, 49), with 0.86 restitution and 0.18 friction. Its yaw is 28° × sin(2πt / 9 seconds). Movement during a shot uses `setTargetTransform`; Havok owns contact velocity and the resulting projectile rebound. No projectile redirect is scripted.

**SYNC is the default.** READY previews the real cycle, but firing reconstructs the paddle at the original phase zero before the launch environment is recorded. This is stated next to the controls. Waiting in READY therefore cannot change a SYNC line. The reset is deliberate; it does not sweep the paddle across a live projectile.

**LIVE** uses the same physical cycle, but firing captures the currently visible phase. Phase is an integer tick at 120 Hz, wrapped into 0…1079. Starting evidence now contains `wind`, `paddleMode` and `paddleTick`. The capture happens after setup validity is checked and before the accepted session snapshots the environment. The launch reconstructs the body at that exact pose to eliminate inherited idle solver velocity; its subsequent target poses follow the saved phase and normal fixed time. This produces reproducible moving-body contacts from a release-time choice.

The reflector freezes after resolution. Retry preserves wind/mode and resumes the cycle. Reset selects LEFT/SYNC and phase zero. Recall restores the saved wind/mode/phase. A recalled LIVE phase stays held during READY, with **RECALLED PHASE HELD** visible, so the next exact-power launch actually replays it. Pressing LIVE again explicitly resumes timing. Changing wind does not silently release the held phase. Shot Tools exposes the physical phase tick/time, held status and whether force was applied on the last/current shot.

## Focused evidence

Seventeen mechanism-vocabulary tests pass. The six additions plus revised lifecycle checks establish:

- READY animation is the actual animated body; RESULT has no residual angular drift.
- Three different idle waits in SYNC yield the same phase-zero setup and complete recorded physical line as immediate firing.
- LIVE captures its visible phase; Recall remains held through four seconds of idle physics and exactly reproduces the recorded result. Retry, Reset, reselect-LIVE and wind changes obey the stated contract.
- Eighteen LIVE combinations across six phases and three launch speeds (30.05, 37.45 and 43 m/s) all physically contact the paddle, qualify one departure and repeat exactly. No tunnelling or long contact episode was observed in this envelope.
- The original twelve SYNC approaches still physically return, with the existing redirect gates.
- Browser-equivalent Scene physics-observable stepping and direct Havok stepping produce identical LIVE records at the same executed phase. A render-frame count is not mistaken for a physics-tick count.
- Active wind changes visual cue transforms before launch, OFF visibly collapses/stops them, and all new accents remain non-colliding.
- Malformed mode/phase payloads fail without partially changing the environment.
- Existing bounded-force, outside-volume invariance, mass/speed/gravity, camera projection and accepted far-frame audit controls still pass.

The v0 far-frame finding stands: Mechanism Range's distant loft frame has real static colliders, relatively dead structural material and no named feature tags. It is not altered here.

## Charlie's remaining rendered judgment

The cloud browser cannot render WebGL, so this is not a visual-success certification. Please look for ten seconds before firing: are the crossflow's direction and extent obvious; is the paddle's slow pivot unmistakable; and is SYNC's deliberate launch reset understandable? Then compare LIVE against SYNC. The test evidence supports these slow/thick moving collisions, not every high-speed/thin rotor or cross-device bit-identical replay. No new score, target, bonus or automatic promotion was introduced.
