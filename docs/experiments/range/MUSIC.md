# Musical Workshop

Branch `lab/wc-range-music-20261025`, from `lab/wc-range-integrated-20261024` at `6cf951576d29cd051109d119e1d11381aeae0450`.

Route `/lab/worldcraft`. No production deploy. The pinned non-production preview for this branch is recorded at the bottom of this file once Workers Builds publishes it. It is not `rail-golf.cmish.dev`.

This note separates what was implemented and checked on real Havok from what was not listened to and is not a musical claim. Coordinates for the five fired arrangements are in the appendix below and in [appendix/music/search.json](appendix/music/search.json). The sitting that omits them is [PROTOCOL-MUSIC.md](PROTOCOL-MUSIC.md).

## Implemented

The selector names are the distinction.

| Selector label | Id | Shot |
| --- | --- | --- |
| Fixed Shot Workshop | `open-workshop` | Locked. Same trio as before. For comparing a geometry change. |
| Musical Workshop | `musical-workshop` | Ramp, bank, and plate can move. Origin, yaw, elevation, and charge start on the fixed-shot opening and can change inside the existing shot bounds. |
| Resonant Run: Free (fixed shot) | `resonant-run-free` | Locked shot. No required order. |
| Resonant Phrase (fixed shot) | `resonant-run-phrase` | Locked shot. Phrase still C4, D4, E4. |

Old preset files with the previous names still validate. Renaming a preset does not change world identity. The v1 export hash `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389` is unchanged. Mass 1.5, radius 0.43, gravity 12, and the charge mapping are unchanged.

Both workshops still draw the two actual trails: amber dashed for the previous recorded flight, cyan for the current one. The hint still says whether the launch setup changed. Binding hashes still cover world identity and setup.

Movable pieces get a tint on the mesh they already had. Fixed pieces do not. The piece list puts movable pieces first and tags each one. No extra mesh, material, or Havok body is added. Back Pocket's spare bank is the movable one; the screen banks stay fixed.

The play panel leads with the impact line taken from the ear, for example `Ramp D4 → Plate E4`, and a short reason: how many piece-notes, which pieces, solver repeats counted as one note, a later hit on the same piece counted again, silent pieces, and pieces that were not touched. Callback counts, contact coordinates, and speeds sit under **Contact record**.

**Keep line** may store `performance.impacts` (piece, note, time, gain, callbacks). Lines saved before that field still load, and the field is not added when it was absent. **Hear recorded sounds** schedules those recorded impacts. It does not launch Havok.

`runLayoutShots` declares `requestedPhase` before either branch reads it. A non-bell layout fires. A non-bell layout that carries a phase is rejected.

Back Pocket's family 2 aim yaw is about 0.081° wide. The editor step is 0.5°. The goal note says that landing is not a route those controls can sit on. The bisection numbers stay in [back-pocket.md](back-pocket.md) and [REVIEW.md](REVIEW.md).

## Physically verified

Seed `20261025` is provenance only. It is not applied to the solver. Havok, NullEngine, 120 Hz, substep `1000/120`, gravity 12. Catalog preset hash of Musical Workshop at this document: `6d96340191f363a5b240d2e255e40d8f9fbafcdfdb007d3511b5a5f85b1c7ec8`.

`scripts/range/music-search.mjs` fired 300 legal shots and rejected 10 overlaps, out of 310 candidates. Piece steps were 0.5 m and 5°. Aim steps were 0.5° and 0.01 charge. The orders that occurred:

| Order | Shots | Example |
| --- | --- | --- |
| D4 → C4 → E4 | 3 | `late-catch-4` |
| C4 → D4 → E4 | 1 | `early-plate-14` |
| C4 → D4 | 40 | `early-cooccur` |
| D4 → C4 | 39 | `late-plate` |
| D4 → E4 | 20 | `opening` |
| D4 → D4 | 3 | `opening-aim-24` |
| C4 | 24 | `bank-on-line` |
| D4 | 12 | `opening-aim-20` |
| E4 | 2 | `ramp-aside` |
| no resonant note | 156 | plate not on the flight |

Five of those were re-fired in the same process and again by `tests/worldcraft-music.test.mjs`. The second fire matched sample coordinates with `Object.is`, matched impact times with `Object.is`, and matched the recorded binding hash for the opening. `scored` stayed false.

With the stand-in collider absent, the phrase-preset layout `early-cooccur` (plate at x −24, z 64) hears C4 then D4. The plate is missed. `late-plate` (plate yaw 90°) hears D4 then C4. The plate is missed. Moving that plate onto the flight that was actually flown produces the three-note rows. Those rows are Musical Workshop arrangements. They are separate shots from the phrase preset.

Retune is physics-neutral on the opening and on `late-catch-4`: every sample matched with `Object.is`, and the note names changed. The search's own retune of the opening went from `D4>E4` to `E4>G4` with identical samples and the same terminal.

E4 alone did occur. A plate note followed by another piece note was outside the orders this lattice produced. That limit belongs to this search.

### Renders

Chrome `OfflineAudioContext` called `renderResonanceWav` on the recorded impacts. Mix stayed 1. Nothing was scaled. Peak is the saved file. Listening was not done. These files are not a claim that the result is musical.

| File | Order | Peak | Seconds | Binding |
| --- | --- | --- | --- | --- |
| [opening-d4-e4.wav](audio/music/opening-d4-e4.wav) | Ramp D4 → Plate E4 | −7.09 dBFS | 6.508 | `12d2820f68243da2ea9134f21f4d887ae8d2d08dc48bee5fe9cd20d98827c9ee` |
| [late-catch-d4-c4-e4.wav](audio/music/late-catch-d4-c4-e4.wav) | Ramp D4 → Bank C4 → Plate E4 | −6.57 dBFS | 8.850 | `5bb60e1fc07707e382bcf0bd787824a94a92ff463e369620f553b0a50946626c` |
| [early-plate-c4-d4-e4.wav](audio/music/early-plate-c4-d4-e4.wav) | Bank C4 → Ramp D4 → Plate E4 | −5.40 dBFS | 6.292 | `2d1acfcc52b4c0690d89d09e7d8192154ffc75359580aa24c30ed17566d79b92` |
| [plate-e4.wav](audio/music/plate-e4.wav) | Plate E4 | −11.60 dBFS | 3.258 | `8b889dacbe27a4fcb7bc47bc626a6eb7f6d73862d4ac0b27de7c44955eff9f01` |
| [return-d4-d4.wav](audio/music/return-d4-d4.wav) | Ramp D4 → Ramp D4 | −11.41 dBFS | 6.858 | `aeaeef72aa3e6925084254ac9f66bece8e4a0fb802ad0eb0f3948a6af3f7aa47` |

Sidecars sit beside the wavs: branch, git SHA, preset, setup, objects, seed, contact sequence, peak dBFS. The `gitSha` in those files is the commit `rangeGitSha()` returned when the renderer ran. A docs commit that only records the preview URL does not change the wav bytes.

## Browser smoke

Headless Chrome, SwiftShader, local dev server. Desktop 1400×900 and a 390×844 viewport.

The selector options were Fixed Shot Workshop, Musical Workshop, Back Pocket, Soft Landing, Resonant Run: Free (fixed shot), Resonant Phrase (fixed shot), and Travelling Bell. The closed control was photographed. Headless Chrome did not paint the open native menu. The option texts were read from the page.

Musical Workshop: Build, **Play →**, **Fire line**. The impact line was `Ramp D4 → Plate E4`, with the two-note explanation, and the bank named as untouched. **Ready again** returned to ready. The header **Build** returned to Build. From the next result, **Back to Build** returned to Build. The fired binding hash was the opening arrangement above. `scored` was false.

Back Pocket listed the spare bank first, tagged movable. The three screen banks were tagged fixed. The 0.081° sentence was on the goal note. The spare bank drew in the cyan tint; the screen stayed on its own color.

Switching every preset twice left live bodies at 0 and active audio voices at 0. Voices started during the earlier shots were cleaned (20 started, 20 cleaned). The second pass matched the first: Musical Workshop 5 static and 5 physics bodies, Back Pocket 6 and 6, Soft Landing 4 and 4, Resonant Phrase 6 static and 9 meshes, Travelling Bell 5 static and 6 physics bodies.

On the 390×844 viewport the piece chips, **Play →**, and, after the shot, the full impact line under **Ready again** and **Back to Build** were on screen.

Screenshots from that pass: `desktop-selector.png`, `desktop-musical-workshop.png`, `desktop-impact-sequence.png`, `desktop-back-pocket.png`, `phone-musical-workshop.png`, `phone-impact-sequence.png`.

## Not established

- No one listened. Musical quality, pleasure, and whether a person would keep playing were not measured.
- The browser pass is headless Chrome with SwiftShader, not a handset GPU and not a person playing.
- A plate note followed by another piece note was outside the orders this lattice produced.
- Family 2's 0.081° width was not re-measured on this branch. The figure is the existing bisection.
- The preview URL is filled in when Workers Builds publishes a version for this branch. Until that line exists, there is no pinned URL.

## Preview

Pending a Workers Builds version URL for the commit that contains this branch. Non-production only.

## Appendix — five arrangements

Seed `20261025`. Preset `musical-workshop`. Full floats, contacts, and the order histogram are in [appendix/music/search.json](appendix/music/search.json).

### 1. Opening — Ramp D4 → Plate E4

Setup origin 0, yaw 0, elevation 18, charge 0.55. Ramp (0, 42) yaw 0 metal D4. Bank (14, 28) yaw 0 timber C4. Plate (0, 68) yaw 0 metal E4.

Ramp at 1.425 s, plate at 4.458 s, two solver callbacks each. Bank was not touched. First ground near (0, 0.43, 91.88) at 7.217 s. Binding `12d2820f68243da2ea9134f21f4d887ae8d2d08dc48bee5fe9cd20d98827c9ee`.

### 2. late-catch-4 — Ramp D4 → Bank C4 → Plate E4

Same opening aim. Ramp (−1, 42) yaw 20 metal D4. Bank (−6, 68) yaw 20 timber C4. Plate (−28, 58) yaw 0 metal E4.

Times 1.417 s, 4.142 s, 6.800 s. The same bank and ramp with the plate at yaw 90° miss the plate. First ground near (−26.72, 0.43, 58.68). Binding `5bb60e1fc07707e382bcf0bd787824a94a92ff463e369620f553b0a50946626c`.

### 3. early-plate-14 — Bank C4 → Ramp D4 → Plate E4

Same opening aim. Ramp (−8, 40) yaw 0 metal D4. Bank (0, 16) yaw 80 timber C4. Plate (−24, 58) yaw 0 metal E4.

Times 0.225 s, 1.433 s, 4.242 s. The phrase-preset plate at z 64, with a stand-in in that world, is a different shot. This one has no stand-in. First ground near (−31.33, 0.43, 40.50). Binding `2d1acfcc52b4c0690d89d09e7d8192154ffc75359580aa24c30ed17566d79b92`.

### 4. ramp-aside — Plate E4

Same opening aim. Ramp (18, 40) yaw 0, off the line. Bank (0, 64) yaw 0. Plate (0, 36) yaw 0 metal E4.

Plate at 1.208 s. Ramp and bank were not touched. The ball rebounds and first ground is near (0, 0.43, −6.70). Binding `8b889dacbe27a4fcb7bc47bc626a6eb7f6d73862d4ac0b27de7c44955eff9f01`.

### 5. opening-aim-24 — Ramp D4 → Ramp D4

Opening pieces. Setup origin −4, yaw 0, elevation 32, charge 0.40.

The ramp rings at 2.008 s and again at 4.808 s. Those are two notes. The later hit is not collapsed into the first. Bank and plate were not touched. First ground near (−4, 0.43, 31.99). Binding `aeaeef72aa3e6925084254ac9f66bece8e4a0fb802ad0eb0f3948a6af3f7aa47`.
