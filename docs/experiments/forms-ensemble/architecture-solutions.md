# Architectural forms — numerical appendix

Actual Havok120 Hz, unchanged projectile and first-ground authority. All named setups use center rail1. The owner invitation contains no numerical recipes.

| Case | Station | Yaw | Elevation | Power | Seconds | Retained neighbors | Sequence |
|---|---|---:|---:|---:|---:|---:|---|
|forecourt-curve-crossing|forecourt|45°|20°|40%|3.925000|4/6|maintenance-canopy → viaduct-deck → maintenance-canopy → street|
|forecourt-curve-hall|forecourt|45°|20°|55%|3.608333|6/6|maintenance-canopy → station-hall → east-abutment → station-hall → street|
|forecourt-short-arc|forecourt|60°|50°|25%|3.975000|6/6|maintenance-canopy → street|
|freight-direct-canopy|freight|-30°|40°|55%|5.066667|6/6|maintenance-canopy → street|
|freight-crossing-canopy|freight|-30°|50°|40%|6.900000|6/6|viaduct-deck → maintenance-canopy → street|
|freight-roof-crossing-canopy|freight|-40°|35°|40%|7.000000|6/6|station-roof → viaduct-deck → maintenance-canopy → street|
|freight-long-transfer|freight|-60°|45°|40%|9.575000|1/6|station-roof → viaduct-deck → maintenance-canopy → street|
|canopy-open-exit|forecourt|60°|20°|70%|3.058333|5/6|maintenance-canopy|
|miss-low-ground|forecourt|45°|5°|15%|0.608333|5/5|street|

Neighbors are ±0.5° yaw/elevation and ±1 percentage point power, bounded by the ordinary controls. Other rail positions are recorded separately. Long-transfer1/6, crossing4/6, the bounds exit and low-power miss are explicit limitations.

## Actual canopy contact brackets

Normal signs are Havok event convention. Incoming/outgoing velocities bracket an entire solver step, not an isolated contact impulse.

### forecourt-curve-hall

| Callback | Time | Point | Normal | Incoming velocity | Outgoing velocity |
|---|---:|---|---|---|---|
|first|0.691667|15.8249, 6.3382, 16.5757|0.5799, -0.8147, 0.0000|17.5428, 0.7299, 17.5428|11.9413, 8.4996, 17.5428|
|last|0.700000|15.9429, 6.3833, 16.7219|0.5799, -0.8147, 0.0000|11.9413, 8.4996, 17.5428|6.2497, 14.4685, 16.2025|

Flat-control sequence: maintenance-canopy → street. Terminal: first-ground-contact.

### freight-direct-canopy

| Callback | Time | Point | Normal | Incoming velocity | Outgoing velocity |
|---|---:|---|---|---|---|
|first|2.775000|27.9627, 8.8128, 14.9591|-0.1933, -0.9811, 0.0000|10.1123, -16.3295, -17.5151|11.5173, -9.2997, -17.5151|
|last|2.783333|28.0499, 8.6911, 14.8132|-0.1933, -0.9811, 0.0000|11.5173, -9.2997, -17.5151|14.4174, 9.3876, -16.4637|

Flat-control sequence: maintenance-canopy. Terminal: out-of-bounds.

### freight-crossing-canopy

| Callback | Time | Point | Normal | Incoming velocity | Outgoing velocity |
|---|---:|---|---|---|---|
|first|4.616667|27.8604, 8.8326, 15.1364|-0.1933, -0.9811, 0.0000|5.4665, -14.1319, -9.4682|5.9333, -11.8628, -9.4682|
|last|4.625000|27.9069, 8.7192, 15.0575|-0.1933, -0.9811, 0.0000|5.9333, -11.8628, -9.4682|9.8049, 9.2488, -9.1538|

Flat-control sequence: viaduct-deck → maintenance-canopy → street. Terminal: first-ground-contact.

### freight-roof-crossing-canopy

| Callback | Time | Point | Normal | Incoming velocity | Outgoing velocity |
|---|---:|---|---|---|---|
|first|4.666667|25.7086, 8.9619, 12.2463|-0.0643, -0.9979, 0.0000|3.2973, -12.1980, -9.6684|4.0732, -0.2626, -9.6684|
|last|4.675000|25.7421, 8.9525, 12.1657|-0.0643, -0.9979, -0.0000|4.0732, -0.2626, -9.6684|4.0110, 9.9927, -7.6155|

Flat-control sequence: station-roof → viaduct-deck → maintenance-canopy → street. Terminal: first-ground-contact.

## Edge scan

Freight yaw−40…−10° in half-degree steps, elevation 40°,power 55%,center rail. Forty-five of61 setups touch the canopy. Yaw−14° touches the western eave with edge normals rather than a face-interior normal; the two raw callbacks are preserved. This is not recommended as a robust phrase.

## Matched atlas

Yaw−60/−40/−20/0/20/40/60°, elevation5/15/25/35/45/60/75°, power15/25/40/55/70/85%,center rail. Same294 shots for each station and each of originalv2, canopyv3 and same-bounds flatroof. Raw outcomes retain position, contacts, terminal and timing.
