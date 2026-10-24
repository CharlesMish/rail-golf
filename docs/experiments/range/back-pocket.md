# Back Pocket

Lane B on `lab/wc-range-b-back-pocket`. The runs below were taken with `HEAD` at `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a` and a dirty worktree. The preset hashes are the binding between those runs and the documents in this commit. Seed `20261024` is recorded on every provenance line and is not applied to gravity, mass, radius, charge mapping, or the solver.

The corrected review (`docs/WORLDCRAFT-REPORT-REVIEW.md`) reports a near wall and a far angled wall at 136 / 58 hits per 48,348 sampled setups, and a median landing shift of 3.0 m (maximum 3.3 m) when a bank is rotated in 5° steps. The original `space-2-back-pocket.json` is not in this checkout. This preset is a new arrangement in that spirit, not a replay of that file. Those 136 / 58 counts are not remeasured here.

## Preset

`Back Pocket` is in the range selector. The goal is `first-ground-zone`, drawn and judged. There is no score.

The screen is three locked timber banks, edge to edge, centres (−18, 46), (−6, 46) and (6, 46), yaw 0. The solid is x −24..12, z 45.5..46.5, y 0..7. The right side of the yard stays open. The pocket is the gold circle at (−8, 54), radius 4 m, so it sits behind the left and middle of the screen (circle z 50..58).

The carriage origin is fixed at 0. Aim stays inside yaw −60..60, elevation 8..26, charge 0.30..0.90. That window is enforced on the sliders and in `validateWorldcraftShot`. The opening aim is yaw 0, elevation 18, charge 0.55. The spare bank starts at (−22, 20), yaw 0. That arrangement is not a solution. Moving the carriage is not permitted, so this lane does not report an origin region.

Elevation stops at 26° because a 7 m bank does not hide a pocket a few metres behind it if the aim can lob at 55–85°. The cap is what makes the shadow below.

Solutions are not in the selector. They are `docs/experiments/range/appendix/back-pocket/family-1.json` and `family-2.json`. Importing one of those files is how the solved shot was fired in the browser.

## 1. Direct fire does not reach the pocket

### Geometry

Unobstructed point mass. Gravity 12. Speed `6 + 37·charge`. Centre lands when y = 0.43. The screen is an axis-aligned box; a shot is occluded when the centre comes within 0.43 m of that box. Lattice: yaw −60..60 step 0.5°, elevation 8..26 step 0.25°, charge 0.30..0.90 step 0.01. 1,073,173 aims.

| | |
| --- | --- |
| Aims whose landing would lie in the pocket if the screen were absent | 7,054 |
| Of those, occluded by the screen | 7,054 |
| Unoccluded landings inside the pocket | 0 |
| Nearest unoccluded landing | 8.177 m, yaw −8.5°, elevation 25.75°, charge 0.60, at (−9.28, 62.08) |
| Nearest landing that clears the screen with x inside the pocket’s x-span | z 61.715, still behind the circle (circle ends at z 58) |

A straight shot from the carriage into the circle has to cross the screen’s footprint. Clearing the top face pushes the first landing past the circle. Shots that miss the screen to the right land outside the circle. Raw numbers: `runs/back-pocket/geometry.json`.

### Havok

Wall only (the three locked banks, no spare bank), same window, real Havok through `createRangeHarness` in `scripts/range/run.mjs`.

| Sweep | Shots | Clears | Nearest first ground |
| --- | --- | --- | --- |
| Yaw step 2°, elevation step 1°, charge step 0.05 | 15,067 | 0 | 8.699 m at yaw −8°, elevation 26°, charge 0.60, landing (−8.81, 62.66), ground only |
| Local patch on the 25 nearest coarse cells (yaw ±1° step 0.5, elevation ±0.5° step 0.5, charge ±0.02 step 0.01) | 1,750 | 0 | 7.491 m. This one hits `screen-b` and lands at (−14.16, 49.74), beside the circle |
| Open intervals between coarse neighbours whose landings fall on opposite sides of z 50 and z 58 | 1,512 | 0 | 8.563 m, yaw −4°, elevation 26°, charge 0.59, ground only, at (−4.32, 61.73) |

The coarse nearest lob matches the geometric shadow: no piece contact, landing behind the circle. The 7.491 m sample is a screen bounce, still 3.5 m outside the radius. The gap fill is the wall-top transition, where a coarse pair jumps from a short landing to a long one and the straight segment between those landings can cross the circle. The ball does not. Those intervals stay outside.

Neighbour landings elsewhere in the window can jump by tens of metres (the largest coarse pair is 88 m, both far from the pocket). That global jump is not a Lipschitz bound. The claim is the three Havok sweeps above plus the geometric count, not a theorem that every real between the coarse samples was visited. Files: `direct.jsonl`, `gap.jsonl`.

The shipped preset, bank parked at (−22, 20) yaw 0, uses the same 15,067 aims. Clears: 0. Nearest first ground: the same 8.699 m lob, and that shot does not touch the parked bank. The bank is touched on 1,331 other aims. Opening aim (0°, 18°, 0.55) lands at (0.09, 43.99), 12.866 m from the centre, wall-only and parked alike. File: `default.jsonl`.

## 2. Two families from one uniform grid

The grid is not a neighbourhood of a known shot. Poses, back band: x −24..12 step 4, z 56..80 step 2, yaw −45..45 step 15. Side band: x 16..24 step 4, z 28..52 step 4, yaw 45..90 step 15. Aim: yaw −60..60 step 6, elevation 8..26 step 2, charge 0.30..0.90 step 0.05. 994 poses, all legal. 2,713,620 pairs.

A pair is simulated only when unobstructed samples every 0.25 m bring the centre within 0.75 m of the bank box. That dropped 2,671,924 pairs. 41,696 shots were fired. The filter kept both of the review-style probes that sit on this lattice (bank (−8, 62) yaw 0 with aim −6° / 24° / 0.65, and bank (−4, 70) yaw 15 with aim 0° / 24° / 0.75). Those probes were not the search.

Clears: 708. Connected components, adjacent when every lattice index differs by at most one step: 15 components, 8 of them with at least two clears, 7 singletons.

| Component | Clears | What it is |
| --- | --- | --- |
| family-1 | 644 | One back-band island. Bank x −24..12, z 56..76, yaw −45..45. Median bank z 64, median yaw 0, median charge 0.75. 497 clears touch the spare bank and not the screen; 147 touch both. |
| family-2 | 28 | Separate. Bank x is only 4, yaw is only −45, z 64..76. Every clear touches the spare bank and not the screen. Aim yaw on the lattice is only 0. |
| family-3 .. family-8 | 14, 6, 3, 2, 2, 2 | Smaller back-band islands. Not scanned axis by axis. Their grid boxes are in `grid-summary.json`. |
| Side band | 4 clears, all singletons | No adjacent clear. Not a family. |

Reading the same 708 clears again, joining poses that score for any aim: 213 pose cells, one island of 189, and a second island of 11 cells that is exactly x = 4, yaw −45, z 56..76. The near-wall probe and the far angled probe (yaw 15) both sit in the big island. This grid does not separate them. The separated family is the right-hand bank faced at −45°.

Representatives are the minimum-distance clear of each component, not a later hand tune.

**Family 1.** Bank (−4, 58) yaw 15. Aim yaw 0, elevation 20, charge 0.75. First ground (−7.807, 53.979), 0.194 m from the centre, at 2.333 s. Contacts: spare bank at 1.600 s, `screen-b` at 1.983 s, ground at 2.325 s. The return kisses the screen and drops into the circle. Preset hash `6ef7255566e13cd8245ccfe96f3b8b028b7a6216b4a1aa564bf7587ab9f09a9e`.

**Family 2.** Bank (4, 70) yaw −45. Aim yaw 0, elevation 26, charge 0.70. First ground (−7.916, 53.925), 0.113 m from the centre, at 2.692 s. Contacts: spare bank at 2.100 s, ground at 2.683 s. No screen. A longer placement off the angled face. Preset hash `745f1052bfe33d12c08f33560588a194afbefa5bc7a9444dbd724bd7db606068`.

File: `grid.jsonl`.

## 3. Local tolerance

These scans hold the representative fixed and move one axis. They are not part of the discovery grid. Origin was not scanned.

**Family 1**

| Axis | Step | Contiguous clears around the representative | Just outside |
| --- | --- | --- | --- |
| Aim yaw | 0.5° from −8 to 8, after a 2° pass | −3° .. 1.5° (10 samples) | −3.5° misses by 4.240 m. 2° misses by 25.925 m |
| Elevation | 0.5° | 19.5° .. 20.5° (3) | 19° misses by 38.492 m. 21° is out of bounds |
| Charge | 0.01 | 0.72 .. 0.76 (5) | 0.77 misses by 4.820 m. 0.71 is out of bounds |
| Bank x | 0.5 m | −5.5 .. 4.5 (21) | 5 m misses by 4.420 m. −6 m misses by 24.546 m |
| Bank z | 0.5 m | 55.5 .. 59.5 (9). A second run at this same aim, 64.5 .. 66.5 (5), best 3.093 m | 60 m misses by 4.056 m. 64 m misses by 4.264 m. 67 m misses by 4.685 m |
| Bank yaw | 5° | 10° .. 20° (3). The half-turn −170° .. −160° also clears (best 0.262 m); a centred bank repeats under a 180° turn | 25° and −155° miss by 5.043 m. 5° and −175° miss by 5.837 m |

Bank z × charge on a ±2 m by ±0.04 rectangle, step 0.5 m and 0.01: 39 of 81 clear, scored z 56..60, scored charge 0.72..0.78.

**Family 2**

| Axis | Step | Contiguous clears | Just outside |
| --- | --- | --- | --- |
| Aim yaw | 0.5°, then 0.1° beside 0 | 0° only | −0.1° misses by 8.496 m. 0.1° misses by 8.789 m. −2° and 2° miss by about 24.7 m |
| Elevation | 0.5° | 23.5° .. 26° (6) | 23° misses by 5.073 m |
| Charge | 0.01 | 0.68 .. 0.70 (3) | 0.67 misses by 4.693 m. 0.71 is out of bounds |
| Bank x | 0.5 m | 4 m only | 3.5 m misses by 22.919 m. 4.5 m misses by 11.206 m |
| Bank z | 0.5 m | 69.5 .. 72 (6) | 69 m misses by 31.495 m. 72.5 m misses by 4.137 m |
| Bank yaw | 5° | −45° only, and the half-turn 135° once (distance 0.113 m, the same slab) | −40° misses by 21.654 m. −50° misses by 8.489 m |

Bank z × charge on the same kind of rectangle: 27 of 81 clear, scored z 68..72, scored charge 0.66..0.71.

Family 1 is a wide placement with a narrow aim. Family 2 is a farther angled face with a few metres of z, a short elevation band, and a power band two hundredths wide. Its aim yaw, its x, and its 5° rotation are cliffs. The review’s ~3 m shift per 5° is the right scale for those cliffs: leaving family 1’s yaw interval by one editor step misses by about 5–6 m, and family 2 does not survive a 5° turn at all. Files: `tolerance.jsonl`, `yaw-fine.jsonl`.

## 4. Export, import, refire

For each representative, `exportRangePreset` was parsed back with `parseRangePreset`. The second export matched the file bytes. The opening setup of the imported document was fired on a fresh Havok plugin. Terminal position, reason, scored flag, and contact list matched the export-side shot.

`runRange` then bound the same setups with points omitted. Terminal position, reason, and scored flag matched the harness for the direct nearest, the parked nearest, both representatives, and both imports. `verify.json`, `reproduce.json`.

## 5. Failures

| Shot | Result |
| --- | --- |
| Opening aim, parked bank or wall only | Miss, 12.866 m, landing (0.09, 43.99) |
| Direct nearest, yaw −8°, elevation 26°, charge 0.60 | Miss, 8.699 m, no piece contact, landing behind the circle |
| Straight into the screen, yaw −8°, elevation 8°, charge 0.90 | Miss, 14.763 m, landing (z 39.27) in front of the screen |
| Family 1 charge 0.77 | Miss, 4.820 m |
| Family 1 bank yaw 25° | Miss, 5.043 m |
| Family 2 charge 0.71 | Out of bounds, no clear |
| Family 2 bank yaw −40° | Miss, 21.654 m |
| Family 2 aim yaw ±0.1° | Misses, 8.496 m and 8.789 m |
| Four side-band clears | Each is a lattice singleton. They are not a third family |

`failures.json` is the `runRange` binding of those shots, plus one mis-aimed probe: `family-1-aimYaw-above` is yaw 0.5°, which sits inside the half-degree region and clears (0.927 m). It is not an edge. The ±0.1° yaw pair is in `yaw-fine.jsonl`. The side singletons are in `grid.jsonl`.

## Shared contract, for the director

Kept local, and called out because other lanes compile presets and fire shots.

- A v1 world may carry `rules.originFixed: true` and `rules.aimWindow`. Worlds that omit them are unchanged. The v1 export hash `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389` is still the range test’s constant. Mass, radius, gravity, charge mapping, and first-kiss / first-ground are untouched.
- A preset launcher with `fixed: false` must say `originFixed` and must carry a window. Open Workshop stays `fixed: true`. Its canonical bytes are unchanged.
- `rangeOpeningSetup` is the shot a preset opens on. `retargetRangeOpening` writes the fired aim back as that opening and does not change the window. The lab export uses it, so a saved file refires the shot that was aimed.
- `createRangeHarness` and `rangeProvenance` are exported from `scripts/range/run.mjs`. `runRange` is still one preset. This lane’s grid moves the bank, so it reuses the harness and writes the same provenance fields, with `campaign` set. CLI additions: `--preset-file`, `--omit-points`, `--campaign`.
- The lab clamps yaw, elevation, and power to the window, locks the carriage when `originFixed` is set, and the Back Pocket goal note does not print solution coordinates.

Hashes of the documents these runs used:

| Document | SHA-256 |
| --- | --- |
| Shipped Back Pocket | `b0adeacb1a80147066e36d526781c5ed209a1e5ebcfed2e71fe6fdd8a95bc891` |
| Wall only | `6958660154688ac9c062ffd7a809816debd9669881fe709adf74adbae293d769` |
| Appendix family 1 | `6ef7255566e13cd8245ccfe96f3b8b028b7a6216b4a1aa564bf7587ab9f09a9e` |
| Appendix family 2 | `745f1052bfe33d12c08f33560588a194afbefa5bc7a9444dbd724bd7db606068` |

## Not established

- No player fired these shots. The clear counts are lattice counts, not a chance a person hits.
- Family 2’s aim yaw has no measured width at 0.1°. Calling that a usable aim region would be wrong.
- The 644-cell component was not filled in at editor resolution (0.5 m, 5°, 0.5°). Connectivity is on the discovery lattice. The one-axis scans are only around the two representatives.
- The six smaller components were not given one-axis scans.
- Origin tolerance does not exist as a player control here, and it was not measured.
- The side singletons were not given a neighbourhood below the lattice step. They are isolated on the lattice only.
- Phone, fun, and whether a person can see which family they are playing were not measured. The browser check is SwiftShader, not a handset.
- The original 136 / 58 figure was not reproduced. That geometry is not in the tree.
- Nothing here is a production rule, a Free Play change, or a merge.
