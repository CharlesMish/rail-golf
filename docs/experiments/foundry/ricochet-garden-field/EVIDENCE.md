# Ricochet Garden — Field

Arrangement A, branching field. World `ricochet-garden-field`. Measured on commit `960b9e933a9e1d084a94ebdccb8c8a7c8f0b33d7` with headless Havok, seed `20261109`. The seed is recorded provenance. It is not applied to the solver.

The numbers below are uniform grid counts. They are not human success probabilities.

## Definitions

Contact order is the ledger of piece bodies and the tee, ground omitted, repeats kept.

An edge contact is within 0.55 m of a piece's width end, in that piece's local frame, or within 0.55 m of the piece's top.

A rebound is a horizontal turn of at least 25° between the chord into a contact and the chord out of it. This is a geometric proxy. It is not the qualified redirect tracker.

A return is a later piece contact at least 1 m closer to the tee than the previous piece contact, or a terminal at least 2 m closer than the last piece contact.

A chaotic pile-up, for this record, is a shot with 6 or more piece contacts. None occurred.

## Setups

Launcher origin stays at 0. The carriage is free. The timber bank `bank-trunk` is the one movable piece. Every plate is fixed. Goal is none. Voices do not affect the flight.

The kept layout, sketch A1:

| Id | Kind | Voice | x | z | Yaw |
| --- | --- | --- | --- | --- | --- |
| bank-trunk | bank | timber C4 | 2 | 26 | 60 |
| plate-short | plate | metal D4 | -5 | 31 | 50 |
| plate-long | plate | timber E4 | -13 | 37 | 55 |
| plate-high | plate | metal G4 | -9 | 34 | 70 |
| plate-right | plate | metal A4 | 11 | 30 | -60 |
| plate-right-2 | plate | timber A4 | 15 | 38 | -50 |
| plate-left | plate | timber A4 | -12 | 28 | 40 |
| plate-deep | plate | timber D4 | 2 | 48 | 60 |
| plate-deep-l | plate | metal E4 | -6 | 50 | 45 |
| plate-return | plate | metal G4 | -16 | 34 | 20 |

Sketch A2 used two banks at (-7, 24, yaw 60) and (7, 24, yaw -60), with plates at (-14, 32, 55), (-10, 38, 40), (14, 32, -55), (10, 38, -40), (0, 44, 65), (-8, 50, 50), (8, 50, -50), and (8, 16, 25).

Sketch A3 used plates at (-6, 20, 55), (1, 22, -60), and (8, 20, -55), a bank at (0, 36, 55), and plates at (-10, 44, 50), (12, 42, -60), (-4, 52, 65), (8, 54, -50), (-14, 30, 30), and (6, 16, 20).

The one revision, R1, kept the A1 trunk and moved the downstream plates to (-7, 30, 35), (-15, 40, 50), (11, 18, -70), (16, 32, -50), (-14, 28, 45), (0, 50, 65), (10, 54, -55), and (-16, 20, 20). It was discarded.

## Sweep

Same grid for every sketch, for Open Contacts, and for the four-piece comparison: yaw -22° to 22° by 1°, elevation 8° to 24° by 2°, charge 0.35 to 0.70 by 0.05, origin 0. 3240 shots. Coarse-neighbour stability steps one grid cell (1° of yaw, 2° of elevation, 0.05 of charge), which is coarser than the sliders.

Slider-step checks, fired separately, step yaw and elevation by 0.5° and charge by 0.01. A width in slider steps is the length of the contiguous run through the tested shot on that one axis, with the other two axes held.

| Sketch | Distinct orders | Shots with 2+ contacts | Edge share | Rebound share | Return share | Shots with 6+ contacts |
| --- | --- | --- | --- | --- | --- | --- |
| A1, kept | 43 | 368 | 0.311 | 0.474 | 0.150 | 0 |
| A2 | 39 | 266 | 0.352 | 0.445 | 0.236 | 0 |
| A3 | 25 | 148 | 0.264 | 0.387 | 0.156 | 0 |
| R1, discarded | 18 | 274 | 0.227 | 0.416 | 0.114 | 0 |
| Open Contacts | 23 | 268 | 0.215 | 0.411 | 0.363 | 0 |

A1 contact-count histogram: 0 contacts 1606, 1 contact 1266, 2 contacts 311, 3 contacts 57.

A2's second-contact orders were mostly a single 1° yaw column. A3's near plates were missed by the higher shots, and the plate in front of the tee collected returns. R1 did not widen the second-contact runs and lost multi-contact shots relative to A1, so A1 stayed.

## Families on the kept field

Orders with at least 8 shots on the coarse grid. `coarseExact` is the share of existing coarse-grid neighbours with the same order.

| Order | Shots | Widest coarse yaw run, in slider steps | coarseExact | Edge | Rebound | Return |
| --- | --- | --- | --- | --- | --- | --- |
| bank-trunk | 846 | 36 | 0.862 | 0.459 | 0.988 | 0.255 |
| bank-trunk > plate-short | 97 | 6 | 0.608 | 0.649 | 1 | 0.216 |
| plate-short | 90 | 8 | 0.548 | 0.578 | 0.922 | 0 |
| plate-right | 86 | 4 | 0.682 | 0.756 | 0.640 | 0.442 |
| plate-left | 64 | 2 | 0.755 | 1 | 0.953 | 0.625 |
| plate-high | 50 | 4 | 0.369 | 0.860 | 0.440 | 0.200 |
| plate-long | 48 | 4 | 0.566 | 0.667 | 0.792 | 0.292 |
| bank-trunk > plate-left | 47 | 4 | 0.529 | 0.766 | 1 | 0.277 |
| plate-deep-l | 39 | 6 | 0.579 | 0.590 | 0.949 | 0 |
| bank-trunk > plate-high | 36 | 6 | 0.385 | 0.861 | 1 | 0.139 |

Another 27 orders have fewer than 8 shots. The repeated order bank-trunk > plate-short > bank-trunk has 20 shots and is one yaw column. It is a rattle, not a starter.

Sixteen orders have at least 8 shots. The ones used as starters were rechecked on the real slider step.

## Starter shots

Each line is an interior shot of a family, not a boundary. All six orthogonal slider neighbours kept the same order: yaw ±0.5°, elevation ±0.5°, charge ±0.01.

| Id | Yaw | Elevation | Charge | Order | Yaw run | Elevation run | Charge run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| opening | 4 | 16 | 0.50 | bank-trunk | 17 | 16 | 20 |
| fork-short | -1 | 14 | 0.65 | bank-trunk > plate-short | 7 | 9 | 13 |
| fork-left | 7 | 14 | 0.60 | bank-trunk > plate-left | 5 | 10 | 10 |
| right-entry | 20 | 16 | 0.55 | plate-right | 5 | 11 | 14 |
| deep-carry | -7 | 18 | 0.65 | plate-deep-l | 6 | neighbours only | neighbours only |
| direct-short | -9 | 8 | 0.60 | plate-short | 8 | neighbours only | neighbours only |

`deep-carry` and `direct-short` have a measured yaw run and a 6/6 neighbour check. Their elevation and charge runs were not swept as full lines. The six orthogonal neighbours still matched.

Moving the bank from x 2 to x 0, same z 26 and yaw 60, turns the opening aim into bank-trunk > plate-left. That layout's six slider neighbours stay on that order. It is the tested shot `bank-shifted`.

Turning the bank to yaw 50 sends the fork-short aim to plate-left instead of plate-short, with 5 of 6 neighbours on that order. Turning it to yaw 70 sends the fork-left aim to plate-high, with 4 of 6. Moving the bank to z 24 produces a tee return near yaw 14, and both yaw neighbours lose the tee. That return is a narrow yaw ridge. It is not a starter.

A reduced movable grid of 54 aims per pose is in `sweep-summary.json`. It is a sample of poses, not the 3240-shot grid.

## Against Open Contacts

Same 3240-shot grid, default pose, bank unmoved.

Open Contacts histogram: 0 contacts 1847, 1 contact 1125, 2 contacts 204, 3 contacts 56, 4 contacts 8. Distinct orders 23. Multi-contact shots 268. Edge 0.215, rebound 0.411, return 0.363. No shot had 6 or more piece contacts.

Its wide orders are the timber bank alone (414 shots, coarse yaw run 40 slider steps), each return plate alone (348 and 348, yaw run 20), and bank then one return plate (88 and 88, yaw run 12, coarseExact 0.52). The three-contact rattle has 19 shots on each side and coarseExact 0.268.

The field has more multi-contact shots (368 against 268), a higher edge share (0.311 against 0.215), and a lower return share (0.150 against 0.363). Returns are present and are not the main result. The field's second-contact families are real on the slider step, and they are narrower in yaw than Open Contacts' bank-then-plate families. The field's single-contact bank family is wider than those second-contact families and is the opening.

## Simpler arrangement

The same 3240-shot grid on only `bank-trunk`, `plate-short`, `plate-left`, and `plate-right`:

Distinct orders 14. Histogram 0: 1839, 1: 1192, 2: 185, 3: 24. Multi-contact shots 209. Edge 0.240, rebound 0.415, return 0.118. No shot had 6 or more piece contacts.

The main forks remain at similar counts: bank then plate-short 98 against 97, bank then plate-left 53 against 47, plate-right 87 against 86. The deep carry and most of the narrow side chains go away with the other six plates. A four-piece layout keeps the core forks. It does not keep the deep carry or the spread of direct hits across the yard. The ten-piece field is the shipped arrangement.

## What failed

R1's cross plate did not make the second-contact families wider. A2 chained poorly off its banks. A3 spent many shots on a front plate that sent the ball back. High charge can graze the top of the trunk and leave the yard. The three-contact rattle back onto the trunk is one yaw column. The tee return that appears when the bank is moved closer is the same kind of narrow yaw ridge.

## Screenshots

Headless Chrome, SwiftShader, against the local dev server at `/lab/worldcraft?qa=1`. The opening frames are the survey before a shot. The family frames are after Fire, with the note timeline in view. Each family matched the contact order from the headless Havok runs on all three viewports.

- `screenshots/opening-desktop-1280x800.png`
- `screenshots/opening-portrait-390x844.png`
- `screenshots/opening-landscape-844x390.png`
- `screenshots/fork-left-desktop-1280x800.png` — bank then plate-left, C4 then A4
- `screenshots/fork-left-portrait-390x844.png`
- `screenshots/fork-left-landscape-844x390.png`
- `screenshots/fork-short-desktop-1280x800.png` — bank then plate-short, C4 then D4
- `screenshots/fork-short-portrait-390x844.png`
- `screenshots/fork-short-landscape-844x390.png`
- `screenshots/right-entry-desktop-1280x800.png` — plate-right, A4
- `screenshots/right-entry-portrait-390x844.png`
- `screenshots/right-entry-landscape-844x390.png`

The Foundry dialog shows a Ricochet garden row and the card "Ricochet Garden — Field", with the invitation above, Workshop, launcher editable, geometry editable.

## Not run

Whether the field is fun to improvise with. Speaker playback of the H voice. Real touch on a phone. The screenshots are software-rendered.
