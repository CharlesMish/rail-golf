# Rolling Yard — numerical appendix (spoilers)

All setups use ordinary player detents and middle rail (index 1), unless stated otherwise. Power is charge ×100. World coordinate z points away from the launcher. Full actual Havok records are in `rolling-evidence.json`; do not present these numerical solutions in the owner invitation.

| Case | Yaw | Elevation | Power | Result from home |
| --- | ---: | ---: | ---: | --- |
| Central | 0° | 8° | 55% | Sphere +2.744864 m z; ready 4.750 s |
| Left/right flanks | −5° / +5° | 8° | 55% | Opposite ±0.945416 m x; +2.003744 m z |
| Stronger center | 0° | 8° | 75% | Sphere +4.131777 m z; ready 5.067 s |
| North delivery | 0° | 5° | 100% | Four repeated shots reach actual cradle back; fifth continues small movement |
| West-bank access | −50° | 10° | 85% | Bank → prop → pavement; +2.926191 m x, +2.207932 m z |
| Far return | 0° | 20° | 85% | Far bank → prop → pavement; −3.480946 m z |
| Clean miss | +25° | 8° | 55% | Pavement only; unchanged sphere |
| Short miss | 0° | 8° | 15% | Pavement before boulder |
| High negative | 0° | 55° | 75% | Out of bounds without prop contact |

North sphere sequence: four identical north-delivery shots end at z=29.355045, 34.642784, 39.383858 and 40.186752; a fifth leaves 40.495804. First four cycle durations sum 19.067 s, excluding player time. Eight identical shots on the matched stone reach z=40.758072 in 14.283 s. Both hit the real cradle, with different movement and waiting costs.

East sphere sequence: five west-bank-access shots (−50°, 10°, 85%) take the center to x=9.862800, z=30.591669. A sixth unchanged attempt misses; undo that negative. Continue with (−51°, 10°, 100%), then the same again, then (−52°, 10°, 100%). The eighth productive blow leaves x=15.998191, z=32.532475, with actual prop contacts against alcove far/back walls. These adjusted final aims are evidence of an accessible route, not proof that a new player will find it.

Six immediate neighbors were tested per family: yaw ±0.5°, elevation ±0.5°, power ±1%. All retained the central, opposite-flank and west-bank prop contact families; the far-return elevation +0.5° neighbor misses the prop after the bank. All 30 neighboring full records reproduced exactly.

Rejected parameter comparison: sphere angular damping 0.5 yielded 4.508482 m central movement but 7.533 s to ready; damping 1 yielded 3.660154 m and 6.192 s. The playable preset retains Guest's angular damping 2, giving 2.744864 m and 4.750 s, with every other prop coefficient also matched. These explicit proof-only alternatives never change the ordinary projectile or imported-world privileges.

The failure-bound test injects continued angular velocity **only in the test** after ball termination. After ten seconds the new wrapper pauses the still-moving prop, leaves `settledEnvironment` null, refuses another Fire and requires Undo or Reset. It is not a naturally encountered sample or a gameplay mechanism.
