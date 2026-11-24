# Technical appendix — direct repeater setups

Spoilers below. These are exact ordinary player controls for reproducing the evidence, not an owner invitation.

All are five **total** shots from the original reset Guest Stone garden, middle rail (`railIndex:1`). The prop begins at x=0, y=2, z=24. Each program preserves the evolving settled state. The existing fixed-step pause is 90 ticks / 0.75 s between shots.

| Evidence ID | Yaw | Elevation | Power |
| --- | ---: | ---: | ---: |
| steady | 0° | 8° | 55% |
| reachExceeded | 0° | 8° | 40% |
| strong | 0° | 5° | 100% |
| banked | −50° | 10° | 85% |
| reverse | 0° | 20° | 85% |

For steady, reachExceeded and banked, the script independently resets and repeats six neighboring programs: yaw ±0.5°, elevation ±0.5°, and power ±1%. The reachExceeded program's fifth miss becomes a fifth hit at elevation8.5° or power41%; the other four neighbors retain the miss.

`node scripts/places/measure-repeater.mjs` writes all sampled contact body names, collision point, first/last time and count, before/settled poses, individual terminal/ready times, and SHA-256 for each complete physical record. Each complete record is compared byte-for-byte with the same sequence fired manually. Full physical constants and the original recorder are unchanged.
