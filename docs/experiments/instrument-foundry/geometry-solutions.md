# Across the crown — numerical technical appendix

This file contains measured shot settings. The owner invitation is separate.
All rows use the center rail and yaw 0°. Yaw/elevation neighbor steps are 0.5°;
power neighbor steps are one percentage point. These are real player detents.

| Case | Elevation | Power | Actual central sequence | Seconds to terminal |
| --- | ---: | ---: | --- | ---: |
| Repeated crown | 15° | 40% | Crown .950, crown 3.467 | 5.725 |
| Near return | 22° | 23% | Crown 1.242, near deck 3.383 | 5.283 |
| Low carry | 8° | 58% | Crown .667, far deck 4.033 | 7.017 |
| High carry | 60° | 40% | Crown 3.100, far deck 5.400 | 7.625 |
| Delayed carry | 35° | 30% | Crown 1.692, crown 3.833, far deck 4.725 | 4.850 |
| Fragile return | 25° | 20% | Crown 1.333, near deck 3.317 | 3.850 |
| Long receiver repetition | 10° | 39% | Crown then 22 near-deck onsets | 20.217 |
| Crown miss / near-edge clip | 5° | 5% | Near deck .558, then ground | .575 |
| Silent open-sky exit | 30° | 100% | No sounding surface | 2.675 |

The first four positive families retain their broad relationship in 6/6 nearby
shots, while delayed and fragile families retain it in 5/6. Extra later contacts
are allowed by those family definitions, not hidden as identical trajectories.
The last three rows are negative evidence. No bounds, gravity, restitution or
collision rule was tuned to convert them into successes.

The flat control does not reproduce the repeated-crown or low-carry central
relationship. Near return and high carry remain possible with the flat form;
their contact timing differs. Full control histories and ordinary-neighbor
results are in `geometry-evidence.json`, with exact source hashes.
