# Gallery Cistern — numerical research appendix

Spoilers: this appendix contains the measured settings and contact sequences. Use [the owner invitation](architecture-owner.md) for unprompted exploration.

Measured source: `8bc8ed707788a17b1f388f97aad4f546a434f453`. Foundation: `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb`. The raw JSON is authoritative for unrounded values; the following tables round only for readability.

## Reproduction contract

All values are actual Havok outputs, fixed 1/120 s stepping through unchanged `createSpatialSession`. Position and linear velocity vectors use world (x,y,z), metres and metres/second. Launcher station is (0,20,15), facing +z; railIndex 1 is the middle of three ordinary positions. Power is displayed as percent. Collision callback normals use Havok collider ordering, so the observed top contact normal is usually (0,-1,0); top qualification also checks downward incoming velocity and the actual surface y.

Callbacks can span multiple steps. First/last columns below identify the contact episode, and gap means current first minus preceding last callback, not an inferred continuous contact sensor. Only `redirect` rows are qualified separated departures; rejected rows preserve candidate vectors where available and must not be promoted to qualified events. Qualified separated outgoing velocities come from the existing redirect recorder; they need not equal a raw post-step velocity during restitution resolution. Its `freeSeconds` is the short qualification interval, not the full flight until the next contact.

## Exact representative setups

| Fixture | Rail | Yaw° | Elevation° | Power% | Terminal reason | Time s | Terminal ball centre |
| --- | --- | --- | --- | --- | --- | --- | --- |
| opening | 1 | 0 | 18 | 40 | first-ground-contact | 5.258 | (0.000, 0.430, 28.985) |
| low-return | 1 | 0 | 15 | 40 | first-ground-contact | 5.075 | (0.000, 0.430, 30.275) |
| west-reception | 1 | -15 | 15 | 40 | first-ground-contact | 6.925 | (-26.356, 0.430, 17.074) |
| cross-galleries | 1 | 60 | 35 | 40 | first-ground-contact | 8.767 | (-13.624, 0.430, 65.908) |
| high-circuit | 1 | 45 | 5 | 50 | first-ground-contact | 7.242 | (8.584, 0.430, 35.430) |
| ear-return | 1 | -45 | 15 | 40 | first-ground-contact | 8.692 | (4.567, 0.430, 47.704) |
| short-miss | 1 | 0 | 5 | 20 | first-ground-contact | 2.000 | (0.000, 0.430, 46.910) |
| high-escape | 1 | 0 | 45 | 75 | out-of-bounds | 3.408 | (0.000, 36.967, 100.161) |
| slow-pocket | 1 | -45 | 45 | 20 | settled | 40.625 | (-17.167, 10.430, 39.758) |
| side-not-top | 1 | 60 | 25 | 40 | first-ground-contact | 4.975 | (-8.419, 0.430, 52.013) |

## Contact timelines

These timeline tables contain all contact episodes in each named main fixture. Other cases, all neighboring settings, raw per-step impacts and 10 Hz actual-path samples are retained in `architecture-evidence.json`.

### low-return

| Body | First s | Last s | Gap from prior callback s | Raw first normal |
| --- | --- | --- | --- | --- |
| rw-low-landing | 2.208 | 2.217 | 2.208 | (0.000, -1.000, 0.000) |
| rw-far-wall | 2.392 | 2.400 | 0.175 | (0.000, 0.000, 1.000) |
| rw-ground | 5.067 | 5.067 | 2.667 | (0.000, -1.000, 0.000) |

| Recorder event / body | Contact point | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- |
| redirect: rw-low-landing | (0.000, 5.000, 64.626) | (0.000, -21.106, 20.130) | (0.000, 18.043, 16.298) |
| redirect: rw-far-wall | (0.000, 8.552, 68.000) | (0.000, 16.043, 16.298) | (0.000, 12.899, -13.942) |

### high-circuit

| Body | First s | Last s | Gap from prior callback s | Raw first normal |
| --- | --- | --- | --- | --- |
| rw-east-gallery | 0.967 | 0.975 | 0.967 | (0.000, -1.000, 0.000) |
| rw-east-wall | 1.350 | 1.358 | 0.375 | (1.000, 0.000, 0.000) |
| rw-east-gallery | 2.292 | 2.300 | 0.933 | (-0.000, -1.000, -0.000) |
| rw-far-wall | 3.392 | 3.400 | 1.092 | (0.000, 0.000, 1.000) |
| rw-west-gallery | 4.525 | 4.533 | 1.125 | (-1.000, 0.000, 0.000) |
| rw-low-landing | 4.542 | 4.550 | 0.008 | (-0.000, -1.000, -0.000) |
| rw-ground | 7.233 | 7.233 | 2.683 | (0.000, -1.000, -0.000) |

| Recorder event / body | Contact point | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- |
| redirect: rw-east-gallery | (20.508, 18.000, 35.508) | (17.292, -9.460, 17.292) | (16.071, 8.061, 16.071) |
| redirect: rw-east-wall | (27.000, 20.672, 41.673) | (16.071, 3.661, 16.071) | (-13.726, 3.159, 13.183) |
| rejected: rw-east-gallery | (13.759, 18.047, 53.986) | (-13.726, -7.941, 13.183) | — (not qualified) |
| redirect: rw-far-wall | (-0.166, 18.709, 68.000) | (-12.552, -6.234, 12.328) | (-10.993, -4.843, -10.543) |
| rejected: rw-west-gallery | (-13.000, 5.608, 55.621) | (-10.993, -18.243, -10.543) | (9.356, -16.531, -10.006) |
| redirect: rw-low-landing | (-12.414, 5.000, 55.453) | (9.356, -16.531, -10.006) | (7.799, 14.158, -7.436) |

### ear-return

| Body | First s | Last s | Gap from prior callback s | Raw first normal |
| --- | --- | --- | --- | --- |
| rw-ear-floor | 1.950 | 1.958 | 1.950 | (0.000, -1.000, 0.000) |
| rw-ear-far | 2.042 | 2.050 | 0.083 | (0.000, -0.000, 1.000) |
| rw-ear-near | 3.008 | 3.017 | 0.958 | (0.000, -0.000, -1.000) |
| rw-ear-end | 3.167 | 3.175 | 0.150 | (-0.966, -0.000, 0.259) |
| rw-ear-floor | 4.300 | 4.308 | 1.125 | (-0.000, -1.000, -0.000) |
| rw-west-gallery | 6.283 | 6.292 | 1.975 | (0.000, -1.000, 0.000) |
| rw-ground | 8.683 | 8.683 | 2.392 | (0.000, -1.000, 0.000) |

| Recorder event / body | Contact point | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- |
| rejected: rw-ear-floor | (-31.414, 10.000, 46.414) | (-14.234, -18.006, 14.234) | (-13.561, 15.453, 13.561) |
| redirect: rw-ear-far | (-32.659, 11.804, 48.000) | (-13.561, 14.553, 13.561) | (-11.815, 12.632, -11.568) |
| redirect: rw-ear-near | (-44.085, 18.498, 36.000) | (-11.815, 1.232, -11.568) | (-9.819, 0.410, 9.895) |
| redirect: rw-ear-end | (-46.011, 18.429, 38.094) | (-9.819, -1.290, 9.895) | (11.256, -0.574, 2.204) |
| redirect: rw-ear-floor | (-32.949, 10.000, 40.070) | (11.157, -13.755, 1.833) | (9.733, 11.784, 1.810) |
| redirect: rw-west-gallery | (-13.641, 10.000, 43.659) | (9.733, -11.816, 1.810) | (7.584, 10.111, 1.685) |

The first chamber-floor contact is real but classified `interrupted-before-free-flight`: the far chamber wall arrives after only 0.083 s. It is not promoted to an independently qualified redirect. Later chamber-floor and west-gallery departures qualify.

### cross-galleries

| Body | First s | Last s | Gap from prior callback s | Raw first normal |
| --- | --- | --- | --- | --- |
| rw-east-wall | 1.542 | 1.550 | 1.542 | (1.000, 0.000, 0.000) |
| rw-east-gallery | 2.467 | 2.475 | 0.917 | (-0.000, -1.000, -0.000) |
| rw-west-gallery | 5.317 | 5.325 | 2.842 | (0.000, -1.000, 0.000) |
| rw-west-far-wall | 6.875 | 6.883 | 1.550 | (-1.000, 0.000, 0.000) |
| rw-ground | 8.758 | 8.758 | 1.875 | (-0.000, -1.000, -0.000) |

| Recorder event / body | Contact point | Incoming velocity | Outgoing velocity |
| --- | --- | --- | --- |
| redirect: rw-east-wall | (27.000, 28.615, 30.352) | (14.784, -6.546, 8.536) | (-12.647, -5.640, 7.126) |
| redirect: rw-east-gallery | (14.871, 18.000, 36.948) | (-12.647, -16.540, 7.126) | (-10.118, 14.158, 5.499) |
| redirect: rw-west-gallery | (-13.971, 10.000, 52.625) | (-10.118, -19.842, 5.499) | (-8.104, 16.963, 4.288) |
| redirect: rw-west-far-wall | (-27.000, 22.430, 59.309) | (-8.104, -1.537, 4.288) | (6.874, -0.501, 3.502) |

## Nearby settings

Each row changes one real control from its fixture. These are physical-family checks, not claims of identical full paths or equal enjoyment.

| Family | Control delta | Family retained | Time s | End |
| --- | --- | --- | --- | --- |
| low-return | yaw -0.5 | yes | 5.075 | first-ground-contact |
| low-return | yaw +0.5 | yes | 5.075 | first-ground-contact |
| low-return | elevation -0.5 | yes | 5.058 | first-ground-contact |
| low-return | elevation +0.5 | yes | 5.033 | first-ground-contact |
| low-return | charge -0.01 | yes | 5.083 | first-ground-contact |
| low-return | charge +0.01 | yes | 5.067 | first-ground-contact |
| low-return | railIndex -1 | yes | 5.075 | first-ground-contact |
| low-return | railIndex +1 | yes | 5.075 | first-ground-contact |
| west-reception | yaw -0.5 | no | 2.592 | first-ground-contact |
| west-reception | yaw +0.5 | yes | 6.908 | first-ground-contact |
| west-reception | elevation -0.5 | yes | 6.967 | first-ground-contact |
| west-reception | elevation +0.5 | yes | 7.242 | first-ground-contact |
| west-reception | charge -0.01 | yes | 6.950 | first-ground-contact |
| west-reception | charge +0.01 | yes | 6.517 | first-ground-contact |
| west-reception | railIndex -1 | yes | 6.933 | first-ground-contact |
| west-reception | railIndex +1 | yes | 6.925 | first-ground-contact |
| cross-galleries | yaw -0.5 | yes | 8.850 | first-ground-contact |
| cross-galleries | yaw +0.5 | yes | 8.758 | first-ground-contact |
| cross-galleries | elevation -0.5 | yes | 8.700 | first-ground-contact |
| cross-galleries | elevation +0.5 | yes | 21.150 | first-ground-contact |
| cross-galleries | charge -0.01 | no | 5.750 | first-ground-contact |
| cross-galleries | charge +0.01 | yes | 19.825 | first-ground-contact |
| cross-galleries | railIndex -1 | no | 5.717 | first-ground-contact |
| cross-galleries | railIndex +1 | no | 3.308 | first-ground-contact |
| high-circuit | yaw -0.5 | yes | 7.292 | first-ground-contact |
| high-circuit | yaw +0.5 | yes | 7.250 | first-ground-contact |
| high-circuit | elevation +0.5 | yes | 7.475 | first-ground-contact |
| high-circuit | charge -0.01 | yes | 7.192 | first-ground-contact |
| high-circuit | charge +0.01 | yes | 7.233 | first-ground-contact |
| high-circuit | railIndex -1 | yes | 7.350 | first-ground-contact |
| high-circuit | railIndex +1 | yes | 15.750 | first-ground-contact |
| ear-return | yaw -0.5 | yes | 8.758 | first-ground-contact |
| ear-return | yaw +0.5 | yes | 8.675 | first-ground-contact |
| ear-return | elevation -0.5 | yes | 8.808 | first-ground-contact |
| ear-return | elevation +0.5 | yes | 8.992 | first-ground-contact |
| ear-return | charge -0.01 | yes | 8.867 | first-ground-contact |
| ear-return | charge +0.01 | yes | 8.825 | first-ground-contact |
| ear-return | railIndex -1 | yes | 39.225 | first-ground-contact |
| ear-return | railIndex +1 | yes | 8.575 | first-ground-contact |

## Actual top positions and edge margins

Margins below are from the separated redirect contact point to the nearest horizontal edge of the relevant unrotated top. They are not ball-centre margins or a guarantee that every nearby shot has the same margin.

| Fixture | Body | Contact y / physical top y | Nearest edge m |
| --- | --- | --- | --- |
| west-reception | rw-low-landing | 5.000312 / 5 | 0.156 |
| west-reception | rw-west-gallery | 10.000313 / 10 | 6.911 |
| cross-galleries | rw-east-gallery | 18.000322 / 18 | 1.871 |
| cross-galleries | rw-west-gallery | 10.000322 / 10 | 0.971 |
| ear-return | rw-ear-floor | 10.000313 / 10 | 1.586 |
| ear-return | rw-ear-floor | 10.000322 / 10 | 4.070 |
| ear-return | rw-west-gallery | 10.000321 / 10 | 0.641 |

## Roof transfer proof

The station is (0,12,0). First roof centre (0,6,27), dimensions 24×1.4×20 m; second roof centre (8,2,54), dimensions 30×1.4×20 m. The first roof uses the indicated pitch or roll. Input is centre rail, yaw 0°, elevation 15°, power 30%. No ground or projectile rule changes. Roof orientation sign refers to the actual Babylon x/z rotation, not a generic terrain-angle convention.

| First roof | Separated outgoing velocity | Next contact after first roof | Callback gap s | Next contact-point separation m | Terminal centre | Adjacent aim/power shots reaching second |
| --- | --- | --- | --- | --- | --- | --- |
| flat | (0.000, 12.215, 13.954) | rw-second-roof | 2.333 | 32.954 | (0.000, 0.430, 90.636) | 4/6 |
| downhill | (0.000, 4.106, 19.836) | rw-second-roof | 1.133 | 21.109 | (0.000, 0.430, 80.635) | 6/6 |
| uphill | (0.000, 16.799, 5.089) | rw-ground | 3.108 | 11.358 | (0.000, 0.430, 38.475) | 1/6 |
| crosswise | (-6.137, 10.568, 14.104) | rw-ground | 2.283 | 31.276 | (-13.035, 0.430, 58.485) | 0/6 |

Downhill is pitch +15°, uphill pitch −15°, crosswise roll +15°. “Next contact-point separation” is the straight displacement between first callback points, not travelled arc length. Removing the first roof yields ground only, at 1.967 s and centre (0,0.430,37.551), before the second roof. Flat reaches the second roof for 4/6 nearby aim/power changes, downhill 6/6, uphill 1/6 and crosswise 0/6. Thus the cheap proof supports roof transfer as a legitimate ingredient, while rejecting the assumption that any roof tilt automatically produces a useful forward handoff.

## Negative fixture and bounded adjustment

`slow-pocket` is centre rail/yaw −45°/elevation 45°/power 20%. It ends `settled` at 40.625 s, on a receiving top rather than the terminal floor. Its repeated contacts are preserved in full JSON. This is a poor long tail, not an expressive long route.

| Variant on the same 270-shot grid | Settled | >15 s | >25 s | Longest s | Chamber-end reach |
| --- | --- | --- | --- | --- | --- |
| Original joined flat floors | 3 | 14 | 6 | 40.625 | 36 |
| Single merged flat floor | 3 | 14 | 6 | 40.808 | 36 |
| Merged floor, roll −3° | 0 | 21 | 4 | 29.042 | 24 |

The bounded floor comparison was measured from the same geometry source before the camera-only commit. It deliberately did not change the shipped layout. For exact variant transforms and all long cases, see `architecture-floor-comparison.json` and `architecture-floor-compare.mjs`.
