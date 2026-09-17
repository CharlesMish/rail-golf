# Mechanism Range v0.3 — transfer ergonomics and terminal recovery

Baseline: `57a0f4644111a08b6aa1342bb8df368e3770b7fc`.
No layout, physical surface, impulse, recognition, score or mechanism changes.

## OOB report: NOT REPRODUCED in the hosted browser

The available hosted browser reports WebGL unavailable, so it cannot fire the
reported line. Source inspection found no terminal-reason-specific guard that
blocks Retry/Reset. That is not proof that Charlie's browser interaction worked.

Two concrete weaknesses are addressed without claiming them as the established
root cause: old recovery published READY before cleanup/camera restoration was
complete, and did not clear drag/held-key/pointer capture. Recovery now uses one
ordered transaction for console buttons, result buttons and shortcuts:

cancel held input → session action/body disposal/environment restore → clear
presentation → publish setup → launch camera snap → READY.

The result itself has prominent Retry Shot and Reset Card buttons (sticky within
long receipts), so recovery no longer depends on finding controls elsewhere.
An explicit Ready notice confirms the transition. R remains available when a
button/summary has focus, while typing in exact inputs still suppresses hotkeys.
Recall continues to restore starting environment and exact power, clearing MAX.
Retry preserves MAX/current Transfer state; Reset restores A and authored aim.

## Ergonomic audit

Numeric aim parity did not provide visual control parity. Incumbent `/lab/lines`
uses rail position + current horizontal yaw for the address camera, 15 m behind
at y=7.8, looking 34 m ahead at y=3.6. Mechanism Range v0.2 was fixed at
(0,10,-21), looking at (0,5,40), with only 40% of rail x translation and no yaw
tracking. Both cameras ignore elevation for their address frame.

| Property | RANGE (v0.2) | FAMILIAR (incumbent address math) |
| --- | --- | --- |
| Vertical FOV | 0.86 rad / 49.27° | 0.69 rad / 39.53° |
| Horizontal FOV | 1.25 rad / 71.62° | 0.92 rad / 52.71° |
| Horizontal FOV threshold | aspect < 1.3 | portrait, width < height |
| Downward pitch | 4.69° | 4.90° |
| Camera yaw | fixed yard-forward | follows launcher yaw |
| Rail translation | 0.4× | 1× |
| Position easing | exp(-4 dt) | incumbent exp(-ln(1000) dt) |

NullEngine projection at 844×390, retained rail 2 / -17° yaw / 22° elevation,
with the camera settled (pixels from top left):

| Measure | RANGE | FAMILIAR |
| --- | --- | --- |
| Muzzle | (397.2,266.8) | (422.0,265.3) |
| +5° yaw: muzzle | (404.4,266.4) | (422.0,265.3) |
| +5° yaw: bench center x | unchanged 285.9 | 345.0 → 310.1 |
| +5° elevation: muzzle y | 260.9 | 255.3 |
| Adjacent-rail muzzle spacing, camera held at rail 2 | 70.7 px | 118.6 px |

Thus RANGE turns the barrel across a fixed picture. FAMILIAR keeps the barrel
centered while the yard moves around it. The closer/narrower view also gives near
geometry more screen area. This is the material motor-calibration difference.

## Framing A/B and remaining tradeoff

Shot Tools has FAMILIAR / RANGE; FAMILIAR is default. Only camera position, target,
FOV/mode and interpolation change. Camera selection does not touch setup, muzzle,
launch vector, physical bodies, environment, power or recorded trajectories.
RANGE preserves the v0.2 address composition. Survey retains the overview and
returns to the selected framing. Selecting a framing also returns to launch view,
including from RESULT or Survey. Retry/Reset/Recall snap to that framing and reset
FOV, including after a very wide flight view. Flight uses the selected base FOV
with the unchanged follow-camera algorithm.

Opening aim remains rail 2 / -17° / 22° (Gate is 0°/42°, Walk 0°/30°). Keeping it
constant isolates framing. FAMILIAR centers a visible muzzle at desktop, landscape
phone and portrait aspect ratios. It emphasizes the aimed-at bench, not all three
zones simultaneously: at that leftward opening yaw the actuator is near the right
edge on wide landscape and outside the narrower desktop frame. Turning right or
Survey reveals it. This is an explicit composition tradeoff, not verified human
visual approval. RANGE remains available for the broad overview comparison.

## Verification scope

Real Havok, through the Scene physics-observable stepping used by the browser,
exercises 48 repeated OOB/ground → Retry/Reset → READY → actual moving-projectile
cycles across both framings. An additional real Split Bench → Transfer Table → OOB
fixture verifies both recoveries and receipt evidence in each framing. Timeout and
settled lifecycle edges are controlled fixtures, not claims of naturally found
shots. Recovery tests include actual projectile-display disposal, not just enabled
buttons. Recall/environment/exact-power, repeated READY/RESULT Survey round trips,
full A/B record identity, muzzle/direction invariance and the frozen 14 physical
reference records remain tested. No winning coordinates are added to player copy.

The hosted WebGL recovery reproduction and experienced-player framing preference
remain for manual verification. Cold-start eight-shot discovery rates should not
be read as pure mechanism legibility; the next study should include experienced
transfer with camera mode recorded. No mechanism tuning follows from those rates.
