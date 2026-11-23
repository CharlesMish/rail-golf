# Recorded-contact numerical appendix — spoilers

The listening entry deliberately does not reveal these shot setups.

Both use origin x=0, yaw=0°, elevation=18°, power=55%, railIndex=1 in the existing
Musical Workshop preset, through the actual Worldcraft runtime at 120 Hz.

| Source | Authored geometry x/z/yaw | Measured notes and time | Projectile ending |
|---|---|---|---|
| A / early plate | Ramp −8/40/0°; bank 0/16/80°; plate −24/58/0° | C4 .225000 s; D4 1.433333 s; E4 4.241667 s | First ground 5.566667 s |
| B / late catch | Ramp −1/42/20°; bank −6/68/20°; plate −28/58/0° | D4 1.416667 s; C4 4.141667 s; E4 6.800000 s | First ground 6.833333 s |

Both arrangements use the same unchanged timber C4 bank and metal D4/E4 pieces.
The immutable fixture includes all other source geometry/rules, exact float
values, world identity, source SHA, launch and recorded path.

Normal-speed dynamics were selected explicitly for capture. Source A measured
face speeds 4.360184, 16.413653 and 15.192507 m/s; B 16.378158, 16.783917 and
3.577119 m/s. Recorded gains are respectively .050638/.519386/.462181 and
.517723/.536717/.034694. Every attack aggregates two callbacks.

The immediate controls are yaw ±0.5°, elevation ±0.5°, and power ±1 percentage
point. A retains three notes in five neighbors; +1 power retains only C4/D4.
B loses E4 in all neighbors, retains D4/C4 in five, and +1 power retains D4 only.
No imported or simulated result is presented as a discoverability probability.
Removing all physical pieces yields zero resonant notes for both launches.

The common audio cycle is **7.5 s**. Original A gaps are 1.208333 and 2.808333 s;
B gaps are 2.725000 and 2.658333 s. Aligning starts places their D4 attacks only
0.016667 s apart, which is effectively a near-simultaneous double strike. The
next A/B pair is 0.100000 s apart. Delaying B by **3.75 s** produces a different
steady-state interleave without modifying either source's internal intervals.

The finite listener schedules 48 attacks in eight passes; B's delayed last E4
occurs at 63.050000 s relative to playback start, after the common eight-cycle
60 s span. Its tail is deliberately retained. The first source capture's scene
construction was 19.268 ms cold; the second 3.446 ms warm (NullEngine only).
Those source-scene timings are context, not an audio-page performance claim.
