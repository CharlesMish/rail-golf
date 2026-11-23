# Shot Repeater — numerical appendix

These setups reveal the measured lines. Use the separate [owner invitation](repeater-owner.md) for an unspoiled visit.

All use the middle launch rail. From Reset, fire one manual trial, wait for settled rest, then Start five additional shots without changing the setup. The same configuration operates on each preceding result.

| Case | Yaw | Elevation | Power | Trial + five repeats |
|---|---:|---:|---:|---|
| Steady | 0° | 8° | 55% | Six stone contacts |
| Reach exceeded | 0° | 8° | 40% | Four stone contacts, then two pavement-only misses |
| Strong | 0° | 5° | 100% | Six stone contacts, final center z=38.588383 m |
| Banked | −50° | 10° | 85% | Six west-bank → stone contacts |
| Reverse | 0° | 20° | 85% | Six far-bank → stone contacts |

The short-flight sequence's settled z positions are 24.604406, 25.189814, 25.792055, 26.374439, 26.374439, 26.374439 m. The misses are real first-ground results, not a synthetic sequence condition. The slight residual x/y settling variation after misses is preserved in the raw records.

Steady and banked cases retain stone contact across all six adjacent yaw/elevation ±0.5° and power ±1% runs. In the short-flight case, +0.5° elevation or +1% power produces a fifth useful contact before the final miss; the other four neighbors retain four useful contacts.

`node scripts/playability/measure-repeater.mjs` regenerates the raw evidence, including exact callback rows, full individual records, control equality, adjacent setups and resource samples. `node --test tests/playability-repeater.test.mjs` checks finite limits, settlement gating, cancellation, partial failure, restoration, frame partition equivalence and cleanup.
