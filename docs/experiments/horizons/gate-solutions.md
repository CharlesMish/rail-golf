# Swing Gate — numerical evidence appendix

Spoilers. These are physical regression probes, not instructions on the playable card. Measurements at `08169bfeb0233a5bcea69ffc291fe2933522ef68`, actual Havok + NullEngine, fixed 120 Hz. Phase tick is release seconds × 120. The sampled path is actual history; no analytical or decorative path is presented as a shot.

Common setup unless stated otherwise: rail index 2 (right-hand rail x=4 m), yaw 0°, elevation 18°, power 55%. Ordinary player controls can enter every value.

| Case | Release phase | Contact order | First-ground x / z (m) | Terminal time |
|---|---:|---|---|---:|
| Left return | 0 s | gate → ground | −14.4024 / 18.5809 | 1.65833 s |
| Passage | 2 s | ground | 4 / 46.14755 | 1.64167 s |
| Near return | 5 s | gate → ground | 4.71553 / 20.18849 | 1.70833 s |
| Faster return | 11 s | gate → ground | 3.25417 / 12.67202 | 1.70833 s |
| No-gate control | 2 s | ground | 4 / 46.14755 | 1.64167 s |
| Fixed-pose gate control | 5 s | gate → ground | −12.44537 / 24.14554 | 1.65833 s |
| Far face, power 75% | 2 s | far wall → ground | 4 / 65.26358 | 1.99167 s |
| Returning to gate, elevation 20°, power 100% | 3 s | far wall → gate → ground | 8.18667 / 38.66720 | 2.78333 s |
| Same longer setup, outbound interception | 7 s | gate → ground | 47.50406 / 83.00976 | 2.60000 s |

The far-face→gate route at 3 s remains that family at yaw −0.5°, +0.5°, elevation 19.5° and power 99%. Elevation 20.5° contacts the far-wall top edge and ends out of bounds at (4, 40.75192, 95.04362), rather than making the descending return. Preserve that negative.

The JSON contains full-precision terminals, solver callback normals, incoming/outgoing velocity per physics step, qualified-departure velocities and free-flight evidence. Callback timestamps are the session elapsed time before the colliding step; terminal time is after that step. Raw normals are reported in the Havok callback's orientation, without pretending every normal is the surface's outward normal.

For the near return, callback episode starts 1.03333 s and ends 1.04167 s. The last normal is (−0.0296935, 0, 0.9995590). Qualified incoming velocity is (0, −4.24144, 25.10928) m/s; qualified outgoing velocity is (1.06984, −3.13659, −16.19547) m/s. The later free-flight requirement is 0.10833 s, with separation 2.22822 m.

For the compound route, far-wall contact starts 1.525 s and ends 1.53333 s; the rear gate contact begins 2.54167 s, ends 2.55000 s. There is 1.00833 s of free flight between the contact episodes. The last gate normal is approximately (−0.312480, 0, −0.949924), and exact callback values remain in JSON.

Reproduce: `node scripts/horizons/measure-gate.mjs`. The script writes [gate-evidence.json](gate-evidence.json), including all 42 nearby basic-route rows, six compound-route neighbours, 48 quarter-second phase samples, resources, reset times and the separate wind comparison. Sweep counts describe these probes only.
