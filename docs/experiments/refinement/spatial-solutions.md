# Exchange Yard refinement — numerical appendix

This file contains tested numerical settings. The owner invitation is separate. Actual Havok at 120 Hz; projectile mass 1.5 kg, radius 0.43 m, gravity 12 m/s², speed 6–43 m/s and first-ground termination are unchanged.

Measured source: `1a097ed478d98fbc41a1adc1dc4cc7d6d618f6b2`. Freight is x−2m, y3.5m, z67m, facing180°. All cases below use center rail1 and relative yaw.

| Case | Yaw | Elevation | Power | Terminal time | Nearby relationship | Other rails0/2 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| platform-hall | -60° | 5° | 15% | 3.008333s | 5/5 | retains / changes |
| pier-gallery | 20° | 15° | 70% | 1.950000s | 6/6 | changes / changes |
| bridge-signal | 20° | 35° | 40% | 5.091667s | 6/6 | changes / retains |
| roof-bridge | -40° | 35° | 40% | 5.241667s | 6/6 | retains / changes |
| roof-bridge-long | -60° | 45° | 40% | 8.491667s | 6/6 | changes / retains |
| bridge-top | 0° | 35° | 40% | 3.558333s | 6/6 | retains / retains |
| bridge-edge-sensitive | 0° | 15° | 70% | 1.008333s | 5/6 | retains / retains |
| empty-carry | 0° | 25° | 70% | 2.675000s | 6/6 | retains / retains |
| short-ground | 0° | 5° | 15% | 1.008333s | 5/5 | retains / retains |
| high-open-arc | 0° | 75° | 85% | 6.300000s | 6/6 | retains / retains |

Neighbors are ±0.5° yaw, ±0.5° elevation and ±1 percentage point power, excluding values below the minimum elevation. Full-rail origin changes are 6 m, not fine detents. Negative cases retain their lack of raised contact; that column is not a success score.

## Contact evidence

Times below are the pre-step timestamps of the first and last raw callbacks on each named surface. Normal components are unmodified Havok event normals. Velocity brackets cover the whole solver step; they are not per-contact impulses. Both first and final brackets are preserved in raw JSON.

### bridge-signal

| Surface | First/last callback seconds | Last point x/y/z | Last normal | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- | --- | --- |
| exchange-viaduct-deck | 1.575000 / 1.583333 | -12.696, 11.500, 37.613 | 0.000, -1.000, 0.000 | -5.839, 0.000, -16.042 | -5.403, 5.903, -14.845 |
| exchange-signal-roof | 2.983333 / 2.991667 | -19.972, 8.151, 18.126 | -0.504, -0.864, -0.000 | 0.988, -0.576, -13.826 | 5.688, 8.396, -11.728 |
| exchange-street | 5.083333 / 5.083333 | -8.674, 0.062, -2.697 | 0.000, -1.000, -0.000 | 5.295, -16.375, -9.942 | 5.295, 0.000, -9.942 |
### roof-bridge

| Surface | First/last callback seconds | Last point x/y/z | Last normal | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- | --- | --- |
| exchange-station-roof | 1.200000 / 1.208333 | 14.166, 13.348, 47.947 | 0.463, -0.887, 0.000 | 7.581, 3.955, -13.078 | 4.055, 9.049, -11.968 |
| exchange-viaduct-deck | 2.858333 / 2.866667 | 19.800, 11.500, 29.654 | 0.000, -1.000, 0.000 | 3.513, -3.445, -11.023 | 3.297, 9.302, -9.668 |
| exchange-street | 5.233333 / 5.233333 | 27.605, 0.115, 6.768 | -0.000, -1.000, 0.000 | 3.297, -18.998, -9.668 | 3.297, 0.000, -9.668 |
### pier-gallery

| Surface | First/last callback seconds | Last point x/y/z | Last normal | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- | --- | --- |
| exchange-west-pier | 0.700000 / 0.708333 | -11.191, 9.231, 41.500 | 0.000, 0.000, -1.000 | -10.559, -0.227, 0.000 | -6.807, -0.214, 24.949 |
| exchange-west-loading-gallery | 1.350000 / 1.358333 | -16.000, 6.614, 58.147 | -1.000, 0.000, -0.000 | -0.000, -7.914, 24.949 | 5.768, -7.520, 23.822 |
| exchange-street | 1.941667 / 1.941667 | -12.205, 0.048, 71.502 | 0.000, -1.000, -0.000 | 5.768, -13.996, 22.870 | 5.768, -0.000, 22.870 |
### platform-hall

| Surface | First/last callback seconds | Last point x/y/z | Last normal | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- | --- | --- |
| exchange-station-platform | 0.675000 / 1.758333 | 10.997, 3.000, 55.643 | -0.000, -1.000, 0.000 | -7.521, -0.000, -3.711 | -6.495, 5.012, -3.350 |
| exchange-station-hall | 1.275000 / 1.283333 | 15.000, 4.929, 57.410 | 1.000, 0.000, 0.000 | 0.000, -1.089, -5.115 | -7.521, -0.421, -3.711 |
| exchange-street | 3.000000 / 3.000000 | 4.001, 0.082, 51.860 | 0.000, -1.000, 0.000 | -5.624, -9.787, -3.043 | -5.624, -9.706, -3.043 |

Bridge→signal has 1.400 s between the final viaduct callback and first signal-roof callback. Roof→bridge has 1.650 s between those surfaces. These are separated physical flights, not simultaneous callbacks counted as a journey.

## Causal controls and failures

- without-bridge: exchange-street; first-ground-contact at2.500000s.
- without-signal-roof: exchange-viaduct-deck → exchange-signal-house → exchange-street; first-ground-contact at5.316667s.

The bridge-edge-sensitive setup loses its contact at 14.5° elevation. The empty carry and high open arc each retain no raised contact in all six nearby changes. The long roof route retains the broad roof→bridge relationship in all six neighbors, but a half-degree yaw change adds a parapet/roof detour. The result is related, not a promise of identical contacts.

## Atlas domain and alternatives

Every 294-shot grid uses rail1, yaw−60/−40/−20/0/20/40/60°, elevation5/15/25/35/45/60/75°, power15/25/40/55/70/85%, phase0. The shipped control ranges are not reduced to this diagnostic grid.

Rejected east-court station: x42m,y0,z17m,yaw−90°. Rejected high crossing: x−18m,y11.5,z35m,yaw90°. Their exact sampled rows, first-contact distributions, output-direction bins, duration and terminals remain in `spatial-atlas.json`; the configurations remain in `scripts/refinement/spatial-study.mjs`. No legacy saved record is registered against these temporary probe configurations.
