# Resonant Run

Lane D on `lab/wc-range-d-resonant-run`, branched from `lab/wc-range-20261024` at `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a`. Two presets, one fixed shot, contact-record judgements. This is not a rhythm game and not a score.

The shots below were fired by `scripts/range/resonant-search.mjs` while that commit was `HEAD` and the lane code was still uncommitted. `rangeGitSha()` records `git rev-parse HEAD`, so `appendix/resonant-run/search.json` says `gitSha` `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a`. Binding hashes do not include the git SHA. Re-running the search on a later commit changes that provenance field. It does not, by itself, change a shot hash.

Seed `20261024` is provenance only. It is not applied to gravity, mass, radius, charge, or the solver step. The fixed shot is origin 0, yaw 0, elevation 18, charge 0.55. Timestep 120 Hz. Physics contract `rail-golf-v02-worldcraft-v1`. Catalog `worldcraft-prefabs-v2`.

Listening quality of the wavs is unverified. No one has listened to them on a speaker or headphones in this run. Membership of a contact in C4 / D4 / E4 is a scale label on a ledger row. It is not a claim that the result is music.

Mobile device performance was not verified.

## What the presets do

**Resonant Run: Free** (`resonant-run-free`) has goal `none`. The bank, ramp, and plate can move and be retuned. There is no pin, no target, and no phrase.

**Resonant Run: Phrase** (`resonant-run-phrase`) asks for scale degrees `[0, 1, 2]`: C4, then D4, then E4. The lab shows that order. Judgement reads the contact ledger. One resonant ledger row is one note, in ledger order. Ground, dull blocks, and the stand-in are not notes. The stand-in is a separate field (`hit`, `miss`, or `unfinished`). `scored` is always false. An interrupted shot, or a shot with no terminal reason, is `unfinished`.

The stand-in stays at x −26, z 58.5, yaw 0. The player does not move it. Opening voices are bank C4 timber, ramp D4 metal, plate E4 metal.

The opening arrangement is ramp (0, 42, yaw 0), bank (14, 28, yaw 0), plate (0, 68, yaw 0). That shot hears degrees `[1, 2]` (D4 then E4) and misses the stand-in. It does not already satisfy the phrase. The bank is never touched, so retuning the two pieces that do get hit cannot add the missing C4.

Phrase preset hash of that opening document: `1020fb68d725d178185233ddf2630e3dd47bda9bed3f9f798781b0b1d6f95a5a`.

Solutions, with coordinates, are in [appendix/resonant-run/solutions.md](appendix/resonant-run/solutions.md). They are not on the player index.

## Shared code that changed

Kept small, and not a physics change:

- `contact-phrase` is a new goal kind on the world model. v1 worlds still omit `goal`. The v1 export hash checked in `tests/worldcraft-range.test.mjs` is still `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.
- `compilePreset` copies `goal.standIn` onto `rules.target` so the existing stand-in body is the one the phrase judges.
- `renderResonanceWav` takes `mix` in `[0, 1]`, default 1. Live `scheduleImpact` gain is still `impact.gain * 0.42`.
- `scheduleImpact` holds the attack gain one sample before `start`. Without that, Chrome's offline renderer emitted one raw noise sample at unity gain when a noise start landed on a sample boundary. That click was the first sample of the deterministic noise buffer (`-31959` / `32768`, linear `-0.9753185734152794`) and did not follow `impact.gain`. The orc thunk at 4.333333333333338 s and at 6.700000000000123 s both did this. The opening ramp, whose start is not on a sample boundary, did not. After the hold, those peaks follow the impact gain.
- `createResonanceOutput.state()` reports the context state, or `uncreated`.
- `scripts/range/run.mjs` exports `runLayoutShots` for many object layouts on one preset launch.
- The lab shows the phrase, the heard order, and the separate stand-in line. The preset menu is wider. The orc banner stays off phrase worlds, because `worldcraftTargetResult` is still null unless the goal is `target-contact`.

Not changed: `mechanism-range-session.js`, catalog friction and restitution, the committed-shot physics contract, score, progression, Timber Courtyard, Free Play, and the v1 world identity hash above.

## 1. Two contrasting orders, from real shots

Uniform grid and targeted lattices are separate. Rejected cells overlap the stand-in or another body and were not fired. Counts are fired shots. "Same order" in the tolerance section means the same heard degrees and the same stand-in status.

### Uniform product

Ramp x ∈ {−8, 0, 8}, z ∈ {36, 48}, yaw 0 (6). Bank x ∈ {−8, 0, 8}, z ∈ {20, 36}, yaw ∈ {−80, 0, 80} (18). Plate x ∈ {−8, 0, 8}, z ∈ {60, 72}, yaw 0 (6). 648 cells. These coordinates do not include the targeted exemplars.

| | |
| --- | --- |
| Fired | 570 |
| Rejected | 78 |
| Phrase matches | 0 |
| Stand-in hits | 0 |

| Heard order | Shots |
| --- | --- |
| none | 252 |
| 0 (C4 only) | 138 |
| 1 (D4 only) | 132 |
| 0>1 (C4 then D4) | 36 |
| 0>1>0 | 12 |

Attack sum on those 570 shots: resonant callbacks 756, sounds 378, collapsed 378, max callbacks on one impact 2, resonant ledger rows 378, piece sounds 378, thunk sounds 0, row mismatches 0, sounds above callbacks 0. The search's `callbacks` field sums `resonance.resonantCallbacks` (voiced bodies). Ground callbacks are in `resonance.callbacks` on the shot and are not sounds.

The uniform grid did not reach the prescribed phrase and did not hit the stand-in.

### Targeted families

Prior resonant-sweep layouts, without a shield. `late-plate-out` was rejected for overlapping the stand-in and was not fired.

| Id | Fired order | Stand-in | Phrase |
| --- | --- | --- | --- |
| early-plate-clear | 0>1 | hit | miss |
| early-cooccur | 0>1>2 | hit | match |
| late-plate-clear | 1>0 | hit | miss |

3 fired, 1 rejected. Attack sum: resonant callbacks 20, sounds 10, collapsed 10, max callbacks 2, resonant rows 7, piece sounds 7, thunk sounds 3, mismatches 0.

### Targeted late plate

Ramp fixed at (−1, 42, yaw 20). Bank fixed at (−6, 68, yaw 20). Plate x ∈ {−28, −24, −20, −16}, z ∈ {56, 58, 60}, yaw ∈ {0, 90}. 24 cells.

| | |
| --- | --- |
| Fired | 22 |
| Rejected | 2 |
| 1>0, stand-in hit, phrase miss | 19 |
| 1>0>2, stand-in hit, phrase miss | 3 |

Attack sum: resonant callbacks 138, sounds 69, collapsed 69, max callbacks 2, resonant rows 47, piece sounds 47, thunk sounds 22, mismatches 0.

`late-plate-3` is the contrast exemplar: D4, then C4, then E4, stand-in hit. That is a real three-note order. It is not the prescribed phrase.

### Targeted reversal

Ramp (0, z 48 or 56, yaw 0), bank (14, 28, yaw 0), plate x ∈ {0, −4, 4}, z ∈ {18, 24, 30}, yaw ∈ {0, 90}. 36 fired, 0 rejected. 18 heard nothing. 18 heard degree 1 only. No shot heard degree 2 before degree 1. This lattice is a negative result, not a solution.

Attack sum: resonant callbacks 36, sounds 18, collapsed 18, rows 18, mismatches 0.

### Opening reference

1 fired. Order 1>2. Phrase miss. Stand-in miss.

| | |
| --- | --- |
| shotHash | `646ad481e66327446cb14fc7c520e5edade1eb75e2b55d87a471a7df0a93a0ca` |
| bindingHash | `0d93ce3f1d7c1bf3f2f3c37bce9410f691bdbcd7f2b20e90746c3ae7044935e9` |
| pointHash | `872de0f3085f0e342543ca90793c61d0ac6f71f9ffa657fa3e45b7ee515bf574` |
| Terminal | first-ground-contact, 7.216666666666815 s, [0, 0.429999977350235, 91.8843994140625] |

`resonance.callbacks` 5 (ramp, plate, and ground), `resonantCallbacks` 4, sounds 2, collapsed 2, max callbacks 2. The search attack row for this one shot records resonant callbacks 4, which matches. Each resonant row had count 2. The ground row is a contact and a solver callback and not a sound.

### Tolerance

One editor step, one axis at a time: ±0.5 m in x, ±0.5 m in z, ±5° yaw. Not a ball radius. A neighbor counts only when the heard order and the stand-in status both stay the same.

| Layout | Order | Fired | Rejected | Kept |
| --- | --- | --- | --- | --- |
| early-cooccur | 0>1>2, stand-in hit | 16 | 2 | 9 |
| late-plate-3 | 1>0>2, stand-in hit | 18 | 0 | 7 |

early-cooccur kept ramp x± and z−, and every plate step. Bank steps, ramp z+, and ramp yaw± did not. late-plate-3 kept ramp z− and all six plate steps. Bank steps and the other ramp steps did not. The kept names are in `search.json` under `tolerance`.

These two orders are reachable with the real solver. The lattices are small. They are not the whole yard, and they are not a hit rate for a player.

## 2. Retuning does not change Havok coefficients or the trajectory

Bank, ramp, and plate use catalog contact coefficients friction 0.18 and restitution 0.86. Ground, tee, and the stand-in use block coefficients friction 0.8 and restitution 0.1. `PhysicsAggregate.shape.material` is `{friction, restitution}`. Voice is not an input to those numbers.

`tests/worldcraft-range.test.mjs` fires the opening phrase world, then the same layout with every material swapped and every degree moved by +3 mod 5. Every sample `t`, `x`, `y`, and `z` is `Object.is` with the first shot. Terminal positions match. World identity changes, because voice is inside `worldcraftIdentity`. The shape materials stay on the catalog values above.

`search.json` `retune` repeats the early-cooccur layout under six tunings. All six share one point hash and one terminal position. `identicalTrajectories` is true. `materialsIdentical` is true. `materialProbeError` is null.

Shared point hash: `f5dbcc26db415802aa859dedb2f7274a16629df6907a2e9c950725d8d7c4080b`.

Shared terminal: [−24.261465072631836, 0.43000245094299316, 69.77838897705078].

| Tuning | Heard degrees | shotHash |
| --- | --- | --- |
| baseline | 0, 1, 2 | `abe19ab73df0953c2cb2f3cba109b17ffbad44dc793438bd1e47bc96c766992b` |
| all timber | 0, 1, 2 | `67816e229e86c620c85719f7c55ef61050a0c9475e1180c0e8a011f55bc28775` |
| all metal | 0, 1, 2 | `77ddf1302a42c546b4fcfa7c44346665ac25439e83d8d3d4e1a7b1223e05af1f` |
| degrees +2 | 2, 3, 4 | `36726d271d2c01b313882726e683b415b2cb4f1d5beda71e304eab7960eea886` |
| swapped material, degree +3 | 3, 4, 0 | `69ff27af61714f126ef11a39bef3f7b6db4ec430f6fb834d9b69d7bf9c939a87` |
| bank A4 metal, ramp G4 timber, plate C4 timber | 4, 3, 0 | `be7a73984b4bb815de17ff426bcec5db9c034bac92769a724c48a899f94099d5` |

All-timber binding hash `2a4cfb7d425bf635a3df3a66ede93947f337aa593ac171f44ee68248c0e46e1e`. The trajectory hash matches the baseline. The shot hash does not, because the world identity includes the voices. Heard degrees stay `[0, 1, 2]` when only materials change, so that retune still matches the phrase. Changing degrees changes the heard labels and the shot hash, not the points.

Each probed body, on every tuning: ground and tee friction 0.8 restitution 0.1; bank, ramp, and plate 0.18 / 0.86; stand-in 0.8 / 0.1.

## 3. One sound per impact

The ear collapses solver callbacks on the same body inside `WORLDCRAFT_RESONANCE_HOLD` (5/120 s) into one impact. The contact ledger merges consecutive callbacks on the same body. On the shots in this search those two rules agreed.

Across the uniform grid, the targeted families, the late-plate lattice, the reversal lattice, and the opening shot: `pieceSounds === resonantContactRows`, `thunkSounds === stand-in rows`, `rowMismatches` 0, `soundAboveCallback` 0. Every resonant row in the measured exemplars had `count` 2, and `maxCallbacks` on an impact was 2. The extra callback was collapsed. Ground was not a sound.

Opening exemplar: callbacks 5, resonant callbacks 4, sounds 2, collapsed 2. early-cooccur and late-plate-3: callbacks 9, resonant callbacks 8, sounds 4 (three pieces plus the thunk), collapsed 4.

A 24-callback burst on one body is covered by `tests/worldcraft-resonance.test.mjs` (`solver callbacks inside one impact do not retrigger`). That test feeds the ear directly. It is not a Havok contact from this sweep. This sweep did not produce a burst longer than 2 callbacks.

## 4. Browser

Headless Chrome, `http://127.0.0.1:5174/lab/worldcraft?qa=1`, script `scripts/range/resonant-browser.mjs`. WebGL backend in this VM is SwiftShader. A resized window was not used as a phone. Device performance was not verified.

Audio state before any gesture, including after entering Resonant Run: Free, was `uncreated`. The first gesture was a real click on **Fire line** at viewport (1260.5, 372.78125). After that shot the context state was `running`. The free opening shot started 10 voice nodes (2 metal impacts, 4 partials plus noise each), finished 10, and had 0 active by the result snapshot. `cleaned` stayed 0: the nodes ended on their own. Metal decay is 1.85 s and the last contact is about 4.46 s into a shot that lasts about 7.22 s, so the nodes are done before the result poll.

Twelve more fires, each `ready()` then `fire()`, kept one static body count (5), one physics body count (6), and one value each for live bodies, meshes, materials, and textures. After those 12, the ledger was started 130, finished 130, cleaned 0, active 0. 13 shots × 10 nodes = 130.

The phrase panel text was: "Phrase C4 → D4 → E4" and "This is not a score and not a rhythm." The opening play shot missed, heard degrees `[1, 2]`, stand-in miss, `scored` false, binding hash `0d93ce3f1d7c1bf3f2f3c37bce9410f691bdbcd7f2b20e90746c3ae7044935e9`. That is the same binding hash as the headless opening record.

Reset preset, while the opening phrase was still the baseline, restored the bank to (14, 28, yaw 0). Voices stayed active 0 (started 140, finished 140, cleaned 0). The miss shot had added 10 nodes.

Importing the early-cooccur layout and firing matched: heard `[0, 1, 2]`, stand-in hit, `scored` false, sounds 4, resonant callbacks 8, binding hash `cc5b314167d10fc0d5f14fe4d9e65942dad88217c9cc97f9c60b907ccc95d0c0`. Same binding hash as the headless solution shot.

Screenshots: `docs/experiments/range/screenshots/resonant-free-build.png`, `resonant-phrase-panel.png`, `resonant-phrase-miss.png`, `resonant-phrase-match.png`. Copies and `browser-report.json` are under `/opt/cursor/artifacts/resonant-run/`.

## 5. Offline renders

`scripts/range/render-resonant-run.mjs` loads `lib/worldcraft-resonance.js` in headless Chrome and calls `renderResonanceWav`. Node has no Web Audio. Each wav's record file is `JSON.stringify(shot)` with no trailing newline, and that file's sha256 is the shot hash.

A first pass renders at mix 1. The saved mix is 1 when the loudest unscaled peak is already at or under −3 dBFS (`10^(-3/20)` = 0.7079457843841379). Otherwise the saved mix is `(ceiling * 0.98) / maxUnscaledPeak`. This run's loudest unscaled peak was 0.536865234375, so the saved mix is 1. Live playback gain was not changed.

No file clipped (`abs(int16) >= 32767` did not occur). Sound-off is the prescribed impacts at mix 0. Its duration matches the prescribed wav. Its peak is 0.

Listening quality is unverified. The scale names in the labels are ledger labels, not a musicality claim.

| File | shotHash | Mix | Peak linear | Peak dBFS | Seconds | wav sha256 |
| --- | --- | --- | --- | --- | --- | --- |
| `audio/opening-de.wav` | `646ad481e66327446cb14fc7c520e5edade1eb75e2b55d87a471a7df0a93a0ca` | 1 | 0.442169189453125 | −7.088230450735118 | 6.508344671201814 | `3f4204f8f05b13af20b161232a6b94bf90985e2cda466a060a909609a08da96b` |
| `audio/early-cooccur-cde.wav` | `abe19ab73df0953c2cb2f3cba109b17ffbad44dc793438bd1e47bc96c766992b` | 1 | 0.536865234375 | −5.402694372139679 | 7.17501133786848 | `d6592514511d43111c9c4bb3c496d66035c56da8ff8e5c9f80b38c37468ac24e` |
| `audio/late-plate-dce.wav` | `7826c3a7a5ae534ea91e9f3f692e231e71c71785b0f84e0dc81b5c60c8517813` | 1 | 0.466461181640625 | −6.623689837952206 | 9.02501133786848 | `86336249eaf9aac0aef8b913a9b3e0cc6ed9bee9a805dda7123624985ac0eebb` |
| `audio/early-cooccur-all-timber.wav` | `67816e229e86c620c85719f7c55ef61050a0c9475e1180c0e8a011f55bc28775` | 1 | 0.536865234375 | −5.402694372139679 | 7.17501133786848 | `aa8462dccc19d957f2d8b97a96232f7792aa0e84dbd4406c3e0eae49ca10e619` |
| `audio/early-cooccur-sound-off.wav` | `abe19ab73df0953c2cb2f3cba109b17ffbad44dc793438bd1e47bc96c766992b` | 0 | 0 | silent | 7.17501133786848 | `21d17d04e7b74c305c45109f0d93b051a3b71a942a39b312fd2e583dea685000` |

The all-timber file uses the same contact times and speeds as early-cooccur, with ramp and plate retuned to timber. Its peak matches the prescribed file because the loudest hit is the bank, which was already timber at gain 1. The bytes are not the same file: the later notes differ. The sound-off file is the dry comparison. Copies of the wavs and `manifest.json` are under `/opt/cursor/artifacts/resonant-run/`.

## What this does not establish

No players were measured. The lattices are not a difficulty rating. The reversal lattice did not find E4 before D4; that does not prove the order is unreachable under some other placement. Tolerance is a one-step neighbor count. Listening quality is unverified. Scale labels are not musicality. Mobile performance was not verified. `scored: false` means these judgements are not production score or progression.
