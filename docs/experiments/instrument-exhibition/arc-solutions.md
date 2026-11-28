# Antiphonal Arc — technical shot appendix

Contains numerical spoilers. These are actual Havok results at the unchanged original geometry and acoustic profile. All setups use rail index 1. Powers are percentages of charge. Original event times are not quantized; decimals below are display rounding only. Full precision, trajectories, contact normals and hashes are in [raw evidence](arc-independent-evidence.json).

## Original submitted probes and opening

| Case | Origin m | Yaw ° | Elevation ° | Power % | Actual voiced pieces | Notes | Onsets s | Terminal / elapsed s |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| antiphonal-west-to-east | 0 | -22 | 16 | 64 | west-near | D4 | 0.833333 | first ground; 1.683333 |
| antiphonal-east-to-west | 0 | 22 | 16 | 64 | east-near | G4 | 0.833333 | first ground; 1.683333 |
| wide-origin-triple | -9 | 34 | 14 | 72 | east-near | G4 | 0.916667 | first ground; 1.650000 |
| west-ramp-arc-reply | -7 | 0 | 8 | 56 | ramp-w → canopy-w2 | C4 → E4 | 0.408333, 1.191667 | first ground; 2.250000 |
| east-ramp-arc-reply | 7 | 0 | 8 | 56 | ramp-e → canopy-e2 | D4 → E4 | 0.408333, 1.191667 | first ground; 2.250000 |
| canopy-drop-reply | 0 | -20 | 26 | 64 | canopy-w2 → ramp-w | E4 → C4 | 0.966667, 1.408333 | first ground; 2.083333 |
| throat-solo-bell | 0 | 0 | 14 | 60 | silent | — | — | first ground; 1.416667 |
| miss-high-carry | 0 | 0 | 68 | 85 | silent | — | — | first ground; 5.966667 |
| miss-wide-outside | 0 | -65 | 8 | 25 | silent | — | — | first ground; 0.758333 |
| original-opening | 0 | 0 | 18 | 55 | throat-bell | C4 | 1.416667 | first ground; 1.600000 |

The original curated opening is the first row; the separately preserved original opening is the last. Do not replace the failed curated crossing with a successful setting and then describe it as the submitted result.

Ordinary neighbors vary exactly one of origin ±0.5 m, yaw ±0.5°, elevation ±0.5°, charge ±0.01. See the authoritative validator for every neighbor, including negative outcomes. The two ramp families preserve their first two contacts across all eight neighbors; continuation beyond those contacts can differ.

## Independently found playable material

| Family | Origin m | Yaw ° | Elevation ° | Power % | Voiced pieces | Onsets s | Voiced gains | Relationship retention |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| actual-lateral | -8 | -15 | 15 | 75 | west-near → east-near | 0.508333, 1.475000 | 0.798484, 0.867073 | 8/8 valid neighbors |
| canopy-and-lower | -8 | 0 | 5 | 75 | ramp-w → canopy-w2 | 0.291667, 0.900000 | 0.382855, 0.821273 | 7/7 valid neighbors |
| short-throat | 0 | 0 | 15 | 75 | throat-bell | 1.075000 | 0.997912 | 8/8 valid neighbors |
| middle-canopy | 0 | 0 | 30 | 55 | canopy-c | 1.258333 | 0.707553 | 8/8 valid neighbors |

For the ramp/canopy setting at elevation 5°, the downward elevation neighbor is 4.5° and is rejected by the real control validator. It is not silently clamped. The original 8° ramp fixtures provide a separate eight-valid-neighbor result.

Voiced gains above are the captured `normal-speed` / `tuned-even` interpretation, not merely the raw collision ledger gain. Raw impact and voiced histories remain separately recoverable. A gain threshold of 0.01 and a 150 ms onset grouping are descriptive diagnostics only; neither filters notes nor changes recorded timing.

## Accessibility and ablation domains

- Common grid: origin `[-8, 0, 8]`; yaw `[-30, -15, 0, 15, 30]`; elevation `[5, 15, 30, 50]`; charge `[0.35, 0.55, 0.75]`: 180 settings per geometry.
- Targeted inner-canopy fan: origin `0`; yaw `[-7.5, 7.5]`; elevation `[24, 26, 28, 30, 32, 34]`; charge `[0.50, 0.60, 0.70]`: 36 separate settings. Each corresponding inner plate is reached in 11/18 side-specific cases.
- Example inner western plate: origin `0`, yaw `-7.5`, elevation `24`, charge `0.70`; G4 at `0.95 s`. The mirror reaches the eastern inner plate. These targeted samples are not folded into the common-grid coverage.
- Review-only controls `arc-review-no-canopy-v1` and `arc-review-no-wings-v1` remove the named piece sets. They preserve all remaining transforms, material physics and launch settings. They are not proposed instrument revisions.

## Canopy-gap construction-history counterexamples

History sequence is explicit: fresh Arc scene and shot, versus a shared scene loaded with Hairpin, fired at its authored opening (`origin 0, yaw 0°, elevation 5°, charge 0.50`), loaded with Chime Terraces, fired at its opening (`origin 0, yaw 0°, elevation 8°, charge 0.55`), then loaded with Arc and fired at the same setup. Repeat that prior-world sequence for each fan setting. The raw evidence preserves the fresh and switched records, callbacks and hashes.

Fan: origin `0`; yaw `[-5,-4.5,-4,-3.5,-3,3,3.5,4,4.5,5]`; elevation `[28,32]`; charge `0.60`. Four of twenty complete physical hashes differ:

| Yaw ° | Elevation ° | Voiced sequence | Onsets s | Fresh / switched elapsed s | Fresh / switched redirects | Terminal displacement m |
| ---: | ---: | --- | --- | --- | --- | ---: |
| -3.5 | 28 | canopy-c → canopy-w1 | 1.150000, 1.166667 | 1.916667 / 1.916667 | 1 / 1 | 0.378639155 |
| 3.5 | 28 | canopy-c → canopy-e1 | 1.150000, 1.166667 | 1.916667 / 1.916667 | 1 / 1 | 0.378639155 |
| 3.5 | 32 | canopy-c → canopy-e1 | 1.166667, 1.175000 | 2.066667 / 2.075000 | 1 / 0 | 0.618129712 |
| 4 | 28 | canopy-e1 → west-far → west-near → west-far → west-near | 1.116667, 1.808333, 1.908333, 1.983333, 2.066667 | 2.091667 / 2.091667 | 1 / 1 | 0.000677022 |

All four preserve exact voiced pitches, onset times and gains, and all end at first ground. The third is not merely a numerical ULP difference: terminal position, lifetime and sport redirect recognition change. The fourth is much smaller. This distinction matters because successful musical playback does not prove complete physical reproducibility.

The targeted traces establish same-step contacts with two neighboring canopy bodies. All box pairs are nonpenetrating, with minimum positive supporting-axis gap `0.503924378574836 m`; this supporting-axis measure is not exact Euclidean clearance. Ball diameter is `0.86 m`. Do not use nonpenetration alone as a seam-stability guarantee.

For comparison, 35/35 selected-family history checks remain exact: the submitted western wing, both ramp arches, canopy drop and separate original opening after each reference, Exchange and Hairpin, plus three catalog cycles. Those checks and the gap counterexamples must be read together.

## Acoustic and interpretation limits

The common grid peaks at four voiced attacks in a 2.4-second window, with original-world shot duration no greater than 4.508333 s in that grid. This does not bound every possible shot or an arrangement of three sources. Dense targeted examples and captures are supplied to the separate ensemble review, which owns combined attack-budget and scheduling findings. No headless trace establishes perceived loudness, musical enjoyment or rendered-phone comfort.
