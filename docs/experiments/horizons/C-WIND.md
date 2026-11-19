# Lane C — Bounded wind reassessment

Wind remains a research asset, not a new playable prototype in this commission. The historical model is already small, deterministic and physically honest. The missing evidence is an authored use that feels like a readable choice rather than compensation for a nuisance.

Authority: neutral Foundry `0b151c5c94849b78ccda6c41a1755b66471e3fa2`; production ancestor `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`. Reproduced alongside gate physical implementation `08169bfeb0233a5bcea69ffc291fe2933522ef68`. Actual files inspected: `lib/mechanism-vocabulary.js`, `lib/mechanism-vocabulary-scene.js`, `tests/mechanism-vocabulary.test.mjs`, historical v0/v1 documents and the clockwork/bell motion studies.

## What already works

The authored volume is x −26…−2, y 1…25, z 24…66 m. OFF applies no force. LEFT/RIGHT apply ∓6 m/s² along x only while inside the box, using an impulse of `mass × acceleration × 1/120` each fixed step. No random term, target query, lift, gravity edit or feedback correction exists. Nine moving arrow streamers, four corner masts, a footprint and fan rotors show the direction/extent; no predicted shot path is drawn.

The new run reproduces the same launcher setup in all three states:

| State | First-ground terminal x (m) | z (m) | Time (s) |
|---|---:|---:|---:|
| OFF | −15.3092737198 | 53.3897972107 | 2.125 |
| LEFT | −20.2212657928 | 53.3897972107 | 2.125 |
| RIGHT | −10.3972415924 | 53.3897972107 | 2.125 |

The displacement is about ±4.912 m with unchanged forward coordinate/time. Each state repeats exactly. Wind entry is 0.850 s; exit is 2.0833 s as the projectile falls below the volume. The historical tests independently retain the outside-volume invariant, including MAX shots. Exposure remains an explicit raw event and does not become a scored or qualified rebound.

The launch environment stores wind choice. Retry preserves it; Recall restores it; reset returns to historical LEFT/SYNC. The saved phase model can reproduce wind/paddle combinations. Existing physical coefficients remain unchanged.

## Gameplay judgment

A local visible volume is preferable to global random wind because a player can choose whether and how long to enter it. The promising authored question is two geometrically visible routes with different exposure: a direct low corridor versus an upper or outside crossing, for example. The important lever is route selection, not an extra wind slider beside an already difficult aiming problem.

However, the current evidence establishes a lateral displacement, not that relationship. There is no owner evidence that this force creates a more interesting next shot than an angled physical face or a different origin. A full new wind course would consume time without resolving that design gap. The moving gate and spatial studies test more immediate physical alternatives, so this lane stops at the reproduced assessment.

The force calculation itself adds no bodies or meshes. The current historical two-bay scene totals 14 static bodies, one ANIMATED body, 62 world meshes and 46 casters; those are the whole Fan & Paddle control, not the incremental price of wind. Six housings/stands plus four bay feet are physical cue geometry; the streamers are visual. Direct force evaluation is one bounds test and at most one impulse per physics tick. No frame-time or physical-phone cost is established here.

## Smallest future extension and gate

If an independent author has a compelling route question that needs crossflow, a single validated box with code-owned magnitude, OFF/LEFT/RIGHT orientation and required visible bounds would be sufficient. Keep environmental state in every line, allow a true OFF comparison, and reject unbounded coefficients, random weather and remote scripts. Avoid shipping a generic force editor merely because the old lab works.

Evidence that would change the priority: a small world in which players intentionally choose different exposure paths, can explain the direction before firing, and revise a route instead of repeatedly correcting an unexplained miss. A direct OFF control should show that the force creates a distinct physical family. Until then, retain wind as a specialized lab dependency.
