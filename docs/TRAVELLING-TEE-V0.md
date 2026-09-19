# Travelling Tee v0 — stopped origin study

Isolated route: `/lab/travelling-tee`.

Accepted comparison baseline: `354c4084fcf12cfed037ba3d341989edef61d07e`.

## Question

Does wider origin choice produce worthwhile line families while retaining familiar Rail Golf equipment and puzzle pacing?

The new route reuses the actual accepted Mechanism Range builder. Split Bench, Transfer Table, the actuator, all rack/return surfaces, ground extents and physical materials remain the same. The only spatial addition is continuation of the launch apron from its original 14 m width to 46 m, plus a visible track and stopped carriage. Apron wings are ordinary terminal ground, not new rebound claims. Existing scenes/routes do not use this builder.

## Three comparisons

| Mode | Origins | Purpose |
|---|---|---|
| 3 RAILS | −4 / 0 / +4 m | Exact incumbent positional span. |
| 5 STOPS (default) | −20 / −10 / 0 / +10 / +20 m | Wider, discrete, repeatable viewpoints. |
| STOPPED CARRIAGE | −20 through +20 m, half-metre slider steps | Continuous-style positioning within the same track, without release timing. |

Five stops is the default because it makes the extra space easy to compare and recall. Continuous-style means the UI position is adjustable across the track; it is intentionally quantized to 0.5 m, not an infinitely precise new aim axis. Q/E nudges the stopped carriage by 1 m. Moving to another origin never discards yaw/elevation or charge settings.

Repositioning is a setup action. The carriage does not move during the launched projectile's flight. There is no platform velocity in the release equation: the same shared spherical body receives precisely the incumbent launch impulse. The carriage deck and wheels are visual equipment, not a dynamic physics platform.

FAMILIAR framing follows the resolved origin; the muzzle and aim vector come from the same station object. RAIL ROUND remains default. Sphere radius/mass/material, gravity, 1/120 s physics, yaw/elevation limits, MAX and charge authority are reused. No score/target/progression layer was added.

Retry retains the previous origin and the current Transfer state. Reset restores the center of the five-stop track and Transfer A. Recall restores the last launch's exact origin, mode, aim, power and starting Transfer state. The last-attempt evidence contains those values and the resolved station. It is local session evidence, not a persistent saved-lines feature.

## What HEADLESS established

A small exploratory sweep covered five lateral origins across 45 common aim/power combinations (225 real Havok lines). It was a comparison, not a success-rate or balance study.

At one unchanged low/mid-power aim, origins produce a bench-only departure, a bench→table relationship, or a table-only departure. At another unchanged aim, origins produce middle-stack→high-stack, high-stack-only, or Return Wall relationships. These are genuine changes in contacted geometry and qualified departures, not extra points or scripted reflections.

The center stop, center continuous position and center three-rail setup reproduce the accepted default fixture exactly: contacts, qualified evidence, terminal position and time agree. After a cosmetic move from one end of the track to the other, first-step launch velocity agrees exactly with the incumbent full-power fixture. Recall reproduces the recorded trajectory and environment.

Reference coordinates remain in tests, not the playable brief.

## Still unknown

- Wider origins demonstrably change available relationships, but the study does not establish that five stops are more enjoyable than three rails.
- It is not yet established that half-metre carriage placement adds a valuable family beyond the five-stop choices. It may mainly add fine search effort.
- Extreme track endpoints need human framing review. FAMILIAR camera is preserved mathematically, but that does not prove every endpoint composes the scene well.
- A moving-release timing version was deliberately not built. Stopped origin choice is the controlled comparison; inherited platform velocity would test a different sporting input.

## Suggested manual comparison

Try a familiar line from the center, keep the aim/power fixed and change origins. Then compare three rails with five stops before using the carriage slider. Inspect whether changing position suggests a different relationship, rather than just correcting a near miss. Retry and Recall should recover that exact origin without a camera/control-language change.
