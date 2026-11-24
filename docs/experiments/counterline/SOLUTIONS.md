# Counterline numerical evidence — spoilers

This appendix is separate from the owner invitation. All results are actual
120 Hz Havok on the unchanged physical contract; see `evidence.json` for exact
binary-floating-point timestamps, contact points, incoming normal speeds, gains,
endpoints and the complete sampled grid.

Both original studies use opening origin 0 m, yaw 0°, elevation 18°, power 55%.

| Existing arrangement | Notes at elapsed physical times | Ending |
| --- | --- | --- |
| Early plate / Contact Loops example A | C4 .225 s, D4 1.433333 s, E4 4.241667 s | First ground, 5.566667 s |
| Original Musical Workshop | D4 1.425 s, E4 4.458333 s | First ground, 7.216667 s |

Early plate: yaw ±.5°, elevation ±.5°, power −1%, origin −.5 m preserve three
notes. Power +1% loses E4, leaving C4 D4. Origin +.5 m produces C4 only and an
out-of-bounds return at 1.066667 s. Elevation +.5° and origin −.5 m preserve the
phrase but end out of bounds after the third contact. The last E4 gain changes
substantially across neighbors; note count alone hides audible differences.

Original Musical Workshop: yaw ±.5°, elevation ±.5°, power −1%, origin ±.5 m
preserve D4 E4. Power +1% loses E4. At power −1%, E4 is a much softer grazing
contact and the line ends at 4.65 s rather than the 7.216667 s baseline.

Removing all three authored pieces produces zero notes and first ground at
1.641667 s in either arrangement. Ground never manufactures a musical attack.

The coarse grid is yaw −20, −10, 0, 10, 20° × elevation 10, 18, 26, 40, 60° ×
power 20, 35, 55, 75%, all from origin 0 m. Early plate has 70 silent outcomes,
26 one-note, 3 two-note and 1 three-note outcome. Original has 90 silent, 9
one-note and 1 two-note outcome. Neither grid is a model of human play frequency.

Source example B is retained only as existing recorded material. Its original
D4 C4 E4 history has a fragile last catch, as PR #82 documented; Counterline does
not improve that source geometry or claim its live reproduction is forgiving.

Reproduce:

```sh
node scripts/counterline/measure.mjs
node --test tests/counterline.test.mjs
```

Counterline's paired physical tests schedule example B as historical sound while
actually firing example A. The live contact ledger, trajectory, acoustic record
and terminal stay byte-equivalent to Solo under the tested frame partitions.
