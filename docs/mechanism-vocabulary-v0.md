# Fan & Paddle Works — isolated mechanism vocabulary v0

Route: `/lab/mechanism-vocabulary`. Baseline: accepted Mechanism Range v0.3, `354c4084fcf12cfed037ba3d341989edef61d07e`.

This is a feasibility yard, not a new Mechanism Range version, score economy, or course. The accepted scene is not edited. Two working bays sit side by side: bounded crossflow to the left and one slowly swinging timber reflector to the right. A conventional timber return beyond the fan bay gives the local force somewhere useful to lead. The center remains open; neither bay encloses the yard or seeks a destination.

## Common sporting equipment

The new experimental shell delegates to the accepted shot session. Sphere radius/mass, launch impulse, gravity, timestep, drag/rail/yaw/elevation/charge/MAX, familiar launcher-relative camera, round visual, generic redirect gates, raw contacts, recovery and ordered receipt remain the existing authorities. No score modules or production records are involved.

The primary Fan Apron starts on the middle of three incumbent rails, facing forward at 25° elevation. FAMILIAR is the only launcher framing. The opening projection includes both bay centers at desktop and mobile sizes; this is a mathematical sightline check, not rendered visual approval.

## Local crossflow

One authored rectangular volume occupies x −26…−2, y 1…25, z 24…66. Four corner masts, a floor outline, three fan housings, and three rows of directional vanes indicate its extent and direction. The vanes have tapered ends and become short, hanging grey pieces in OFF. All vanes and masts are visual; fan housings/feet are honest physical solids.

Shot Tools provides OFF / LEFT / RIGHT. Inside the volume only, each 1/120-second step applies `mass × acceleration × dt` as an impulse, with acceleration −6 or +6 m/s² along world x. OFF and points outside the volume receive zero force. There is no random term, target query, position-dependent aim correction, lift, gravity change, or global weather. This box-shaped force boundary is deliberately simple, rather than a fluid simulation.

Wind-entry/exit events, positions and elapsed times remain raw evidence. Exposure is not automatically a rebound. The launch record includes the starting wind choice. Retry preserves it; Reset restores OFF; Recall restores the prior launch's choice. The setup control is disabled during a live shot.

## Physical moving reflector

The timber paddle is 17 × 14 × 1.4 m, centered at (20, 8, 49), pivoting around its vertical central axis. Its yaw is `28° × sin(2πt / 9 s)`. It uses a real Havok `ANIMATED` BOX, with ordinary restitution 0.86 and friction 0.18. Each fixed step uses Babylon `setTargetTransform`; Havok derives body velocity and solves projectile contact. There is no scripted projectile reflection or destination-aware impulse.

The paddle begins phase zero at each launch. Time of flight changes the paddle angle a shot encounters, but idle waiting cannot secretly alter a recalled attempt. After resolution its linear/angular velocity is explicitly stopped. Retry/Reset/Recall reconstruct only this paddle body at the authored starting transform, preventing a swept reset impulse. The ready paddle stays still. This is a deterministic moving-collision proof, not a real-time release-timing mode.

Its face uses the ordinary generic redirect tracker. A real qualified departure captions `PADDLE REBOUND`; callback chatter does not. The return face beyond the fan volume similarly uses `FAN BAY RETURN`. Neither has a score.

## Established evidence

- Same fan-bay shot in OFF / LEFT / RIGHT lands approximately 4.9 m to either side of the calm result; the forward coordinate is unchanged. Same setup/state produces an exactly matching record on repeated attempts in the headless authority.
- MAX shots completely outside the volume match across all three wind choices.
- Twelve real launcher approaches, spanning four nominal launch speeds from 30.05 through 43 m/s and three headings, contact the moving paddle, qualify one departure, and return toward the apron. Repeats produce identical records. No tunnelling or sustained chatter appeared in that tested envelope.
- Browser-equivalent Scene physics-observable stepping matches direct fixed-step stepping for both the wind path and a moving-body rebound.
- The visual paddle transform tracks its real animated body. Two seconds of idle physics after RESULT and after recovery do not move the paddle.
- Existing launch muzzle, mass, and actual Havok launch velocity match the accepted Mechanism Range authority exactly.
- Eleven focused regressions cover force bounds, repeatability, environment lifecycle, animated contact, idle recovery, normal-speed contact, browser stepping, common launch authority, camera projection, and the baseline far-frame audit.

Reference setups live only in tests. The player page has no hidden winning coordinates.

## Far-frame audit of accepted Mechanism Range

The prominent far loft is **not** a non-colliding backdrop. Both posts and the crossbeam already have static BOX bodies. They use structural material authority (restitution 0.1, friction 0.8) and intentionally lack `lineFeature` metadata. A reproduced launch physically contacts the crossbeam near z107 and returns to ground near z88, with raw contact evidence but no named redirect. Other post approaches also physically return into the yard.

Thus the confirmed gap is physical-versus-recognized vocabulary, combined with a relatively dead structural material, rather than missing collision authority. This pass leaves that accepted baseline unchanged. It does not promote every beam to a trick. A later authored decision could mark one useful structural relationship or change the visual material language, but should preserve the difference between contact and qualified departure.

## Limits and next manual questions

No claim is made about arbitrary high angular speed, paper-thin fast rotors, every corner/edge contact, or cross-device bit-exact replay. The tested slow/thick paddle is reliable under the current engine and fixed timestep. The current cloud browser lacks WebGL, so headless transform/projection evidence is not a substitute for Charlie's visual pass.

First, compare one chosen launch under the three fan states: are the visible vanes sufficient to predict roughly where the local push acts? Next, vary a paddle approach's power or loft: does encountering a different physical angle suggest another attempt, or merely feel arbitrary? Finally, try a fan-assisted return toward the other bay. That cross-bay relationship is a hypothesis, not an established authored route.

The primary uncertainty is player readability and agency: whether setting wind before launch and varying arrival time at a deterministic paddle create interesting reasoning, rather than merely a new way to miss. No automatic promotion is proposed.
