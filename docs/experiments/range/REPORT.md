# Director research packet — Worldcraft experimental range

Integrated branch `lab/wc-range-integrated-20261024`. No pull request. Not merged to `main`. Not deployed to `rail-golf.cmish.dev`.

Non-production preview alias for `lab/wc-range-integrated-20261024`: [https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft).

Chrome on 24 Oct 2026 opened the alias and the version URL for `02fb40695c9a3dc2d8ae1e5bf811f4d7fa1e2ce1`, [https://8862bf60-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://8862bf60-rail-golf.charlesmish.workers.dev/lab/worldcraft) (Workers build `602eb3dd-e6a4-4f32-9b47-20ca7bb8aa0d`). Both reached phase `ready`. The Range select listed Presets, Open Workshop, Back Pocket, Soft Landing, Resonant Run: Free, Resonant Run: Phrase, and Travelling Bell. The footer read `BUILD 02fb406`. The alias was serving that same build. This is not `rail-golf.cmish.dev`. The earlier version URL for `0b2daa3` is [https://cffd3e7d-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://cffd3e7d-rail-golf.charlesmish.workers.dev/lab/worldcraft). The `8862bf60` URL stays pinned to `02fb406`. The alias follows later commits on the branch.

Listening quality of the wavs under [audio/](audio/) is unverified. No one listened to them on a speaker or headphones in this integration. A contact labelled C4, D4, or E4 is a scale degree on a ledger row. It is not a claim that the result is music.

## Branches and SHAs

| | |
| --- | --- |
| Foundation | `lab/wc-range-20261024` @ `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a` |
| Back Pocket | `lab/wc-range-b-back-pocket` @ `480ae1e02271ae6bfc28c8ce8b838395bb66fd78` (not modified) |
| Soft Landing | `lab/wc-range-c-soft-landing` @ `43932f1f6f7c4a91024c9c5139a250fe3cd689cf` (not modified) |
| Resonant Run | `lab/wc-range-d-resonant-run` @ `78deb200ae126e79f2fb5929b71d4fd353f6964c` (not modified) |
| Travelling Bell | `lab/wc-range-e-travelling-bell` @ `0a5d01ac980d517c1631f3d936429b11c313becf` (not modified) |
| Merge B | `5edddd8` |
| Merge C | `b8804b2` |
| Merge D | `a856456` |
| Merge E | `2e16c13f07a591b35690f76d79ba0292a74b333f` |
| Opening revision | `0db31fbcce7bb33dfdc25ee9c42a2094a5714cb1` |
| Sweep gitSha recorded in `windows.json` | `0db31fb` (the revision commit the sweep process read) |

v1 world-export hash of house, orc, starter, and empty is still `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

## Merge conflicts and resolutions

B merged with no conflicts.

C conflicted in `app/lab/worldcraft/worldcraft.tsx`, `docs/experiments/range/INDEX.md`, `lib/worldcraft-range.d.ts`, `lib/worldcraft-range.js`, `scripts/range/run.mjs`, and `tests/worldcraft-range.test.mjs`. A free launcher is windowed only when it carries `window` or `originFixed` (Back Pocket). `fixed: false` with neither is Soft Landing's adjustable launcher, and it compiles to `rail: null`. `retargetRangeOpening` writes `launcher.x` from the shot when the origin is not fixed, so a moved carriage round-trips. `runRange` keeps Back Pocket's `label`, `omitPoints`, and `campaign`, and Soft Landing's `documentAt` and `labels`. The Soft Landing goal panel does not also render for Back Pocket. `listRangePresets()` is the ordered union of every lane, which is the assertion each lane had made about its own presets.

D conflicted in the same UI, index, range types, range module, runner, and range tests, plus `lib/worldcraft-model.d.ts`. `lib/worldcraft-model.js` auto-merged. Contact-phrase stays a goal kind beside the aim window. `runLayoutShots` calls `createRangeHarness`. The phrase receipt is separate from the orc receipt. Open Workshop and Resonant Run share the resonant trio.

E conflicted in the UI, index, model types, model goal check, range types, range module, runner, and the range test's preset list. A `target-contact` goal is either the stationary stand-in or the bell motion, and it must match that target. Contact-phrase remains. Launch phase is stored and bound only for a bell world. The runner rejects a phase on any other world. Reset returns the bell phase to 0. The selector lists all six presets.

## Travelling Bell revision

The lane catalog opening (ramp −8, 40, yaw 0; bank 0, 16, yaw 80; shield −10, 52, yaw 0) met the bell on 143 of 320 release phases. That document is now [appendix/travelling-bell/solution-preset.json](appendix/travelling-bell/solution-preset.json). Bell motion, collider, and hit rule are unchanged: segment-shuttle, speed 1 m/s, endpoints (−28, 58) and (−24, 58), phase reference `endpoint-0`, hit `any-contact-before-ledger-close`.

The catalog opening is the prior-art supplied placement: ramp (0, 42, yaw 0), bank (14, 28, yaw 0), shield (−10, 52, yaw 0). Real Havok, coarse phases `k * 0.025` s for `k = 0..319`:

| Layout | Coarse hits | World identity sha256 |
| --- | ---: | --- |
| Catalog opening | 0 / 320 | `ffbff70d06f8c26ad97b091d5c0db894265689091c18597aacdcec8c0adc5208` |
| Appendix solution (former opening) | 143 / 320 = 0.446875 | `2b698a8e4762a81684845e756410ce29a9ba5c3bdd5b9c439b12a9b279ad96e2` |
| Late arrangement | 175 / 320 = 0.546875 | `b324544f499dd3a3084080f68a466c70e81602e78eafa5fa623e58506b18a3a2` |

Catalog preset hash `7b3c95341d131c8d6bc2e16a5a444a2b2f4411ce883be6cef9f8c2589372345e`. Solution preset hash `ab39b2d6ea0e07ea509b1d62ba3d5ef42ed0b96782bdbcc46e56252aaa3bb293`. Opening misses are all `first-ground-contact`, order ramp then ground. The solution's two windows, contact orders (129 ground endings, 14 out-of-bounds), and aim-offset table match the lane sweep. Those aim rows are on the solution layout, not the catalog opening. Phase-1 solution binding hash `88c126b099f13f6270ea200b9067ae58ad902eb84939751736136ede4ea5e7b9`. Sweep wall time on `0db31fb`: 30.205972468 s.

A fresh `runRange` of that phase-1 solution matches the binding hash, the contact times (bell first 4.308333333333337 s), the reason, and the elapsed time 5.766666666666743 s. The terminal position is not bitwise identical to `hit-shot.json`: fresh `[−29.180707931518555, 0.4299999177455902, 67.4616470336914]`, stored `[−29.180723190307617, 0.4300020635128021, 67.46179962158203]`. The same fresh position repeats. The stored position is what the long sweep session wrote. The difference is about 1.5e-5 m, 2.1e-6 m, and 1.5e-4 m.

## Per experiment

Lane notes stay the measurement record: [back-pocket.md](back-pocket.md), [soft-landing.md](soft-landing.md), [resonant-run.md](resonant-run.md), [travelling-bell.md](travelling-bell.md). This section keeps uniform grid, targeted neighbourhood, and player-like walk distinct. None of them is a person playing.

### Open Workshop

Hypothesis: with no pin and no target, a committed shot still shows whether a piece change changed the line, because the previous trail is the recorded one. Setup: fixed rail, origin 0, yaw 0, elevation 18, charge 0.55, resonant ramp, bank, and plate. Result: headless terminal `first-ground-contact` at `(0, 0.429999977350235, 91.8843994140625)`, outcome `none`, `scored` false. Binding hash on this integration, from `scripts/range/run.mjs`: `1f6e39f3f35fcb4e300bb3d8c2c6116f4ad3b50144d4b72802c1b7ef94b691e5`. The lane appendix did not store a binding hash; it stored that terminal. Negative: there is no goal to clear. Not established: whether a person treats the trail comparison as a reason to continue.

### Back Pocket

Hypothesis: the pocket behind the screen is reachable inside the aim window by moving the spare bank, and not by aiming alone. Setup: origin fixed at 0, yaw −60..60, elevation 8..26, charge 0.30..0.90, screen locked, goal circle (−8, 54) radius 4.

Uniform grid (not a neighbourhood of a known shot): 994 legal poses, 41,696 fired pairs after a proximity filter, 708 clears. Family 1 is 644 clears. Family 2 is 28 clears and is a knife-edge: aim yaw clears only at exactly 0. ±0.1° misses by 8.496 m and 8.789 m. Bank x clears only at 4 m. Bank yaw clears only at −45° (and the half-turn 135° once, the same slab).

Direct Havok, no spare bank and with the bank parked, is a separate sweep: 15,067 aims, 0 clears, nearest 8.699 m. The geometric occlusion count (1,073,173 aims, 0 unoccluded landings in the pocket) is not that Havok grid.

Player-like: not run. The browser check on the lane was SwiftShader, not a person.

Integrated `run.mjs` replay: every `failures.json` row matches terminal and binding hash, including the family 2 aim-yaw 0.5° miss. The ±0.1° misses (8.496 m and 8.789 m) are in `yaw-fine.jsonl`, not in that failure file. Appendix family-1 and family-2 terminals match `reproduce.json` (those files store the terminal, not a binding hash). Family 2's reproduced clear is aim yaw exactly 0, elevation 26, charge 0.70, first ground about 0.113 m from the centre.

Negative: aim alone does not reach the pocket on the sweeps that were fired. Family 2 is not an aim region. Not established: that a person can find either family, or tell them apart.

### Soft Landing

Hypothesis: a backstop or a redirect makes a landing tolerant of small aim and power differences. Setup: adjustable launcher, goal circle (0, 64) radius 2.5, one bank and one block, nothing locked. Opening aim misses by 17.85245132446289 m.

Three procedures, kept apart:

| Procedure | What it is | Result that is not the other two |
| --- | --- | --- |
| Uniform grid | 240 pre-specified cells. The representatives are not on it. | Opening pieces 1/240. Forgiving block 3/240. Lattice counts, not widths. |
| Targeted neighbourhood | Dense runs around one representative. | Forgiving charge width 0.082 against fragile 0.034. Elevation width 6.5° against 3.5°. Yaw width 4° on both. Origin width 4 m on both. A block 2 m deeper splits the charge run into two islands. |
| Player-like walk | Random legal detents, mulberry32 of `seed + trial`. Not a person. | From the opening, 30×40 steps, 0 trials cleared. From charge 0.59, 20×12 steps: fragile 9 trials cleared, forgiving 6. Those counts are these seeds, not a rate, and the walks share the low charge edge. |

Integrated replay of the four reproduction shots matches terminal and binding hash: opening miss `7b4615551262a8d1b135f22f631c89299fd72f9e17c2193c11b818114ef9f69b`, fragile clear `cd4b42896456d549cbd17745dfe908cb56d210d453bd231774d45590c952263f`, forgiving clear `9ba3a89bf917f3bd774b63d5084a9f1230d946ab2b7d44bfcee87086dfb2c73a`, forgiving aim on fragile pieces miss `7d74abffb785683a9187f3f1acfa7664d8839f6cd3fa72fd8d1700e721756afa`.

Negative: the backstop did not widen yaw or origin on these representatives. The player-like walk from the opening did not clear. Not established: that a person finds the forgiving placement, or that the 9 and 6 counts would repeat under other seeds.

### Resonant Run

Hypothesis: one fixed shot can be made to ring C4 then D4 then E4 by moving the three resonant pieces, and retuning a voice does not change the Havok trajectory. Free has goal `none`. Phrase judges ledger order. `scored` is always false. The stand-in is not a note.

| Procedure | Fired | Phrase matches | What it is |
| --- | ---: | ---: | --- |
| Uniform product | 570 (78 rejected) | 0 | Coarse pose product. Stand-in hits 0. Not the targeted exemplars. |
| Targeted early family | 3 (1 rejected) | 1 (`early-cooccur`, order 0>1>2, stand-in hit) | Prior layouts, not the uniform product. |
| Targeted late plate | 22 (2 rejected) | 0 | 3 shots heard 1>0>2, which is not the prescribed order. |
| Targeted reversal | 36 | 0 | No shot heard E4 before D4. |
| Opening | 1 | 0 | Heard 1>2. Stand-in miss. |

Integrated replay matches terminal and binding hash for `opening.json` (`0d93ce3f1d7c1bf3f2f3c37bce9410f691bdbcd7f2b20e90746c3ae7044935e9`), `early-cooccur.json` (`cc5b314167d10fc0d5f14fe4d9e65942dad88217c9cc97f9c60b907ccc95d0c0`), `late-plate-3.json` (`dba71f350cd3ab225a33800bfbcca11d4f3d82a37bcb00058e886f60004c7c04`), and `early-cooccur-all-timber.json` (`2a4cfb7d425bf635a3df3a66ede93947f337aa593ac171f44ee68248c0e46e1e`). The timber retune keeps the early-cooccur terminal position and changes the binding hash, which is the voice-in-identity result.

Negative: the uniform grid did not spell the phrase. Retuning the opening cannot add the bank note, because the opening never touches the bank. Not established: listening quality, that a person can find `early-cooccur`, or that the order is heard as a phrase.

### Travelling Bell

Hypothesis: a player can time a committed shot to a slow bell by choosing a release phase, on a fixed layout. The lane opening made that timing available on 143/320 phases, so the default was already a solution. After the revision, phase is still the only lever, and the catalog layout misses on every coarse phase. The timing windows exist on the appendix solution, which the selector does not open.

Negative: release phase does not solve the catalog opening. A fraction of a degree of yaw on the solution layout removes the coarse windows (yaw −0.5°, +1°, and −1° are 0/320). Not established: that a person can hit the solution windows, or that they would move the pieces onto that layout. The slider is 0.05 s. The measured edges are 1/120 s.

## Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --pretty false` | exit 0 |
| `npm run lint` | exit 0. Three warnings, all outside this work: `app/manners-game.tsx` (two `react-hooks/exhaustive-deps`) and `scripts/sweep-orc-static.mjs` (`details` unused). |
| `npm test` | build, then 503 tests, 503 pass, 0 fail. Test runtime about 21.2 s. |
| v1 export hash | unchanged, asserted inside the range and bell tests |
| Headless replay | `runRange` from `scripts/range/run.mjs`, seed 20261024, on the integration. Table below. |

Chrome 156, headless, SwiftShader (`--use-gl=angle --use-angle=swiftshader-webgl`), local dev server `http://127.0.0.1:5174/lab/worldcraft?qa=1`. Twenty cycles, each cycle entering and resetting all six presets. Export then import of the unmodified preset kept world identity (a later reset matched the identity captured on enter). Rules on cycle 0: Open Workshop, Resonant Run Free, Resonant Run Phrase, and Travelling Bell ignored a play-mode yaw of 9°. Back Pocket clamped yaw 90° to 60°, charge 0.99 to 0.9, and held origin at 0. Soft Landing accepted origin 2 m, yaw 4°, elevation 20°, charge 0.4. Phrase allowed the ramp to yaw 15°, and reset put it back. Bell phase set to 1 s returned to 0 on reset.

Bodies on cycle 0 and cycle 19 matched for every preset.

| Preset | Static bodies | Physics bodies | Meshes |
| --- | ---: | ---: | ---: |
| Open Workshop | 5 | 5 | 5 |
| Back Pocket | 6 | 6 | 6 |
| Soft Landing | 4 | 4 | 4 |
| Resonant Run: Free | 5 | 5 | 5 |
| Resonant Run: Phrase | 6 | 6 | 9 |
| Travelling Bell | 5 | 6 | 18 |

House Shot, before any preset: static 3, physics 3, live 0. Voices started 0, cleaned 0, finished 0, active 0. Audio context `uncreated`. Heap used 43647973, total 59534745.

After 20 cycles, ending on Travelling Bell reset: static 5, physics 6, live 0, meshes 18, rebuild count 248. Voices still 0, 0, 0, 0. Audio still `uncreated` (no shot was fired). Heap used 72599495, total 125774475. Per-preset body counts did not grow. Heap did. This is SwiftShader on a dev server, not a phone and not the preview host.

## Verification table

`terminal` is reason, elapsed, and position unless noted. `binding` is the sha256 of world identity, setup, and launch phase when the shot has one.

| Record | Terminal | Binding hash |
| --- | --- | --- |
| Open Workshop opening | matches the appendix position and `first-ground-contact`; `scored` false. No prior binding file. Hash now `1f6e39f3f35fcb4e300bb3d8c2c6116f4ad3b50144d4b72802c1b7ef94b691e5`. | not previously stored |
| Back Pocket `failures.json` (11 rows, including both family edges) | match | match |
| Back Pocket appendix family-1 and family-2 | match `reproduce.json` | not stored there |
| Soft Landing four reproduction shots | match | match |
| Resonant opening, early-cooccur, late-plate-3, early-cooccur-all-timber | match | match |
| Travelling Bell solution, phase 1 s | reason and elapsed match; contact times match; position differs by the microns above | match `88c126b099f13f6270ea200b9067ae58ad902eb84939751736136ede4ea5e7b9` |
| Travelling Bell catalog opening, phases 0 s and 1 s | both `miss`, `scored` false, `first-ground-contact`. No prior binding (the layout is new). | `92b93b9622ef29d9935650380023b1138389409a00f26bda716184c30adc3067` at 0 s, `e067ac90f591d8ce04775c75a80d3c9c3e7dc0953c9cea2123d543239a68aed3` at 1 s |

## Not verified

- A person playing any of the six, including the two notebook prompts in [PROTOCOL.md](PROTOCOL.md).
- Listening to the wavs.
- Phone, a desktop GPU, or the production host.
- A Chrome pass on any commit after `02fb406`. That pass is the one recorded above. Later edits to this file do not change the lab.
- Bitwise equality of the bell solution's terminal position between a fresh plugin and the long sweep session.
- Family 2 aim yaw below the 0.1° sample. The measured clear is exactly 0 on the samples that were fired. That does not prove an unmeasured 0.01° neighbour.
- That every coarse cell between Back Pocket's direct-fire samples was visited.
