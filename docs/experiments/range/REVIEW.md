# Independent review — Worldcraft experimental range

24 Oct 2026. This review did not build the range. It re-derived the claims in [REPORT.md](REPORT.md) on branch `lab/wc-range-integrated-20261024` at `434cc00c106c90cb5e030b849ecaa5cf1b689808`.

`0b2daa3` is the lab. `02fb406` and `434cc00` change only [INDEX.md](INDEX.md) and [REPORT.md](REPORT.md). This file is the only addition from the review. The preview URL lines already in those two pages were loaded and left as written.

## Method

A separate driver called `createRangeHarness` and `runRange` from `scripts/range/run.mjs`, with the real Havok plugin, NullEngine, 120 Hz, substep `1000/120`, gravity 12, mass 1.5, and radius 0.43. Speed is `6 + 37 * charge`. The lane scripts (`back-pocket-measure.mjs`, `soft-landing-measure.mjs`, `resonant-search.mjs`, `sweep-travelling-bell.mjs`, and the rest) were not used.

Seeds `8675309` and `8675310` label the random samples. The runner does not apply a seed to the solver. The geometry lattice and the wav byte check do not load Havok.

## Preview

Chrome on 24 Oct 2026, with this commit as the branch head.

| URL | What Chrome showed |
| --- | --- |
| Alias [https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft) | Phase `ready`. Range listed Presets, Open Workshop, Back Pocket, Soft Landing, Resonant Run: Free, Resonant Run: Phrase, and Travelling Bell. Footer `BUILD 434cc00`. |
| `02fb406` version [https://8862bf60-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://8862bf60-rail-golf.charlesmish.workers.dev/lab/worldcraft) | Footer `BUILD 02fb406`. Workers build `602eb3dd-e6a4-4f32-9b47-20ca7bb8aa0d`. |
| `0b2daa3` version [https://cffd3e7d-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://cffd3e7d-rail-golf.charlesmish.workers.dev/lab/worldcraft) | Footer `BUILD 0b2daa3`. The same six preset names. |

Those three strings are the lines already in INDEX and REPORT. They still resolve, and the two version URLs still show the builds those lines name. The alias follows the branch, which is what REPORT already says. During this pass it was serving `434cc00`. Workers Builds for that commit also published [https://62495496-rail-golf.charlesmish.workers.dev](https://62495496-rail-golf.charlesmish.workers.dev) (build `5254e02d-2055-4eb4-ba41-554fe748fa46`, version `62495496-bc4a-4554-be2a-3b981e1c1982`). That version URL is recorded here and was not copied into INDEX or REPORT.

The six-preset tour and the fired shot were on the alias. Each preset opened in Build at phase `ready`. The goal panel stated the goal and did not mark the opening as already clear. Open Workshop, then Play, then Fire line, reached phase `result`: goal none, first ground contact, ramp D4 metal at 1.425 s, plate E4 metal at 4.458 s, 2 sounds, 4 solver callbacks, 2 collapsed, ground at about 7.208 s near z 91.81. That shot is the opening. It is not a solution. The host is not `rail-golf.cmish.dev`.

The Range list was photographed while it was expanded on the yard that was already loaded, House Shot. The fired preset is the Open Workshop result.

## Claims

| Claim | Independent result | Agree? |
| --- | --- | --- |
| Back Pocket opening misses, about 12.866 m at (0.09, 43.99), and is not a solution | Distance 12.865555814668523 m, position [0.08594323694705963, 0.4300009310245514, 43.99300003051758], order screen-b then screen-c then ground, status `miss`, `scored` false | Yes |
| A fresh sample of at least 2000 legal direct aims never clears | Wall-only seed 8675309: 2000 fired, 0 rejected, 0 clears, nearest 9.376397134075683 m. Parked catalog preset seed 8675310: 2000 fired, 0 rejected, 0 clears, nearest 9.362848316962628 m | Yes. These are new samples. They are farther than the report's targeted-grid nearest of 8.699 m |
| Appendix family 1 and family 2 clear | Family 1: 0.19376482069597709 m, elapsed 2.3333333333333277 s, bank then screen-b then ground, status `clear`. Family 2: 0.11288690539120315 m, elapsed 2.6916666666666598 s, bank then ground, no screen, status `clear` | Yes, at the report's rounding (0.194 m and 0.113 m) |
| Family 2 aim yaw clears only at exactly 0. ±0.1° misses by 8.496 m and 8.789 m | ±0.1° miss at 8.495994331422496 m and 8.788502784936869 m. At 0.02° steps the clears are −0.04°, −0.02°, 0°, and +0.02° (span 0.06°). Bisection: last clear −0.04203125°, first miss −0.0421875°; last clear +0.03921875°, first miss +0.039375°. Width 0.08125° | The tenth-degree misses agree. The "exactly 0" wording does not. See discrepancies |
| No geometric hole through the screen into the pocket | The report lattice matches exactly: 1,073,173 aims, 7,054 would land in the pocket with the wall removed, all 7,054 occluded, free-in-pocket 0, minimum free distance 8.17748088149375 m, minimum clearing landing z on the pocket x-span 61.71548563190676 m. Seam gaps 0 and 0. A finer grid of 1,501,011 aims is also free-in-pocket 0. Descent minimum that clears the screen with x in [−12, −4] lands at z 61.51435444168665, past the pocket far edge z 58. 27 Havok probes aimed at the joints and at the pocket ray all miss | Yes. The point-mass model is the unobstructed flight. The Havok probes cover the joints that were aimed at |
| Soft Landing opening misses by 17.85245132446289 m | Exact: position [0, 0.43000003695487976, 46.14754867553711], elapsed 1.6416666666666633 s, ground only, `scored` false | Yes |
| Fragile charge width 0.034, forgiving 0.082. Fragile elevation width 3.5°, forgiving 6.5° | Charge: fragile 0.596–0.630, 18 samples, width 0.034, brackets 0.594 and 0.632. Forgiving 0.596–0.678, 42 samples, width 0.082, brackets 0.594 and 0.680. Elevation: fragile 23.75–27.25, 15 samples, width 3.5°. Forgiving 20–26.5, 27 samples, width 6.5° | Yes |
| Resonant opening terminal is shared, phrase is a miss, and a voice change does not move the trajectory | Phrase opening elapsed 7.216666666666815 s at [0, 0.429999977350235, 91.8843994140625], heard [1, 2], status `miss`, `scored` false. On the early-cooccur layout, all-timber and degree-shifted voices match all 265 samples and the terminal [−24.261465072631836, 0.43000245094299316, 69.77838897705078], elapsed 6.591666666666784 s. Timber heard [0, 1, 2], status `match`, `scored` false. Shifted heard [3, 4, 0], status `miss` | Yes |
| Sounds equal impacts on random resonant shots, and the wavs do not clip | Five accepted random phrase layouts (seed 8675309, one reject): sounds, impacts, and sounding contact rows were equal on each (four with 0, one ramp-only with 1). Five wavs are 16-bit mono 44100 PCM. Peaks match the manifest. Clipped samples 0. Sound-off peak 0 | Yes for this sample and for the bytes. Listening was not done |
| Travelling Bell opening is 0/320. The appendix solution is 143/320 with the published windows | Opening 0/320, every trial `miss:object-ramp-yours>ground:first-ground-contact`. Phase 0 also misses, elapsed 4.683333333333356 s. Solution 143/320. Windows: coarse 0.475–2.1 (66), refined 0.4583333333333333–2.1083333333333334, end open; coarse 4.975–6.875 (77), refined 4.958333333333333–6.875, end open. Orders 177 miss, 129 ground hits, 14 out-of-bounds hits | Yes. The refined starts differ from the report's last printed digit and are the same 1/120 s step |
| Rules are enforced in the runner, the goal is judged, and the opening is not a solution | `runRange` rejected, before physics: fixed-rail yaw on workshop, resonant free, resonant phrase, and bell; launch phase on workshop and phrase; Back Pocket yaw 61, elevation 27, charge 0.91, and a moved origin; Soft Landing origin 12, origin 0.25, yaw 71, elevation 86, and charge 1.2. Goal kinds were `none`, `first-ground-zone`, `contact-phrase`, and `target-contact`. Openings were `none` or `miss`. Family imports judged `clear`. The bell solution judged `hit` | Yes |
| INDEX and PROTOCOL do not contain solution spoilers | A scan found none of the measured widths, the 143/320 count, the family names, the family coordinates, or the window edges. The phrase C4 → D4 → E4 is the goal statement | Yes |

## Discrepancies

**Family 2 aim yaw is a band of about 0.081°, not a single point.** The report's own unverified list already says the 0.1° sample does not prove a 0.01° neighbour. The 0.02° grid and the bisection above are that measurement. ±0.1° still misses at the reported distances, and 0.081° is still a hairline beside a 0.5° editor step. Severity: moderate, and it is a wording correction. The family remains a knife-edge. It is not an aim region a coarse control can sit in.

**`runLayoutShots` throws before it fires a non-bell layout.** In `scripts/range/run.mjs`, the non-bell branch reads `requestedPhase`, and that name is not declared in `runLayoutShots`. The call raises `ReferenceError: requestedPhase is not defined`. The resonant shots in this review were fired with `createRangeHarness` after that throw. Severity: medium for the exported helper. The Havok claims that were re-derived agree. The runner was not patched.

**The alias build moved after the sentence in REPORT.** That sentence is past tense and the next sentence says the alias follows later commits. The URL strings are right, so they were not edited. REPORT also lists "a Chrome pass on any commit after `02fb406`" as unverified. This pass is that later pass, on `434cc00`, and it is recorded here rather than by rewriting REPORT. Severity: low, documentation lag.

## What remains unverified

- A person playing, including the notebook prompts in [PROTOCOL.md](PROTOCOL.md).
- Listening to the wavs. Peaks and clipping were read from the bytes.
- A phone, a desktop GPU, and `rail-golf.cmish.dev`.
- The full Back Pocket uniform grid, the player-like walks, the yaw×charge areas, the deeper-block islands, the bell aim-offset rows, and the late bell arrangement at 175/320.
- Bitwise equality of a long bell-sweep terminal against a fresh plugin. The coarse windows, hit count, and contact orders were re-derived. The phase-1 solution position was not compared with `hit-shot.json`.
- Every cell between the original Back Pocket direct-fire lattice. The fresh sample is 4000 random legal aims, not that lattice.
- A click-through of all six presets on the pinned `0b2daa3` and `02fb406` version URLs. Those two were checked for the footer and, on `0b2daa3`, the Range names. The tour and the fired shot were on the alias while it served `434cc00`.
- The resonant search script itself. `runLayoutShots` throws, so that path was not re-executed. Trajectory identity was checked on three harness shots. The five random sound shots are mostly misses and do not re-prove the search's callback-collapse statistics. The early-cooccur shot did show 4 sounds and 8 callbacks.
- A Havok bounce through a numerical seam smaller than the 27 joint probes. Those probes missed. The geometric argument is the unobstructed point-mass flight: the muzzle lies on the aim from the rail at the origin, so the horizontal ray is `x = z * tan(yaw)`, and every pocket-bound ray in the stored lattice crosses the screen interior.
