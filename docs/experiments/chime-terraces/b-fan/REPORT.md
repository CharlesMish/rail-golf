# Chime Fan

A foundry world of 15 existing pieces. Three slots stand side by side. Yaw picks the slot, and inside a slot it picks which hung plate speaks first. The near bank and the far bank of that slot stay the tail.

This is one layout. Earlier layouts were measured and dropped. The numbers below are the kept world, on the same 875-shot grid as Ricochet Garden Loop, with Descending Resonance and the Loop run again on that grid by the same harness.

## What it is

Each slot is the Descending Resonance gap, copied sideways.

- A timber bank, 12 m wide and 7 m tall, at z = 26. West is x = −12, centre is x = 0, east is x = 12. They tile the yard from x = −18 to x = 18.
- A metal bank, the far chime, at z = 31 on the same x.
- Three metal plates, 4 m wide, hung across that slot at z = 30.5, lift 7, tilt −10.

The plates lean toward the tee. A ball that clears the 7 m bank rings a plate, is turned down, then meets the near bank and the far chime. It often bounces between those two again. The first three distinct pieces stay put while the later repeats change. That is the related-but-different line inside one aim.

Voices are existing ones, and they are different on purpose. Timber banks use the H voice (`tuned-even`, the long tuned-wood bar). Metal plates and the far banks stay the long metal chime. Default timber on a plate was not used, because that voice is a short knock.

| slot | entry plates, left to right | tail |
| --- | --- | --- |
| west | C4, D4, E4 | timber G4, then metal A4 |
| centre | E4, G4, A4 | timber C4, then metal D4 |
| east | G4, A4, C4 | timber D4, then metal E4 |

The two outermost plates, west C4 at x = −16 and east C4 at x = 16, sit outside yaw −24 to 24. A further aim can ring one of them. See the shoulder shot.

Capacity is the opt-in 24. The default cap is still 12. The v1 export hash is unchanged. No new piece type, no new physics, no scoring.

## What it tests

Whether yaw-driven branching gives more distinct phrase families per aim region than a vertical cascade, and whether a one-step nudge keeps the family.

A phrase family is the first three distinct sounding pieces after immediate repeats of the same piece are collapsed. A shot with fewer than three distinct pieces is a short family. A back-and-forth between two pieces is a short family, and it is not counted as success.

Regions: left is yaw ≤ −8, centre is −8 < yaw < 8, right is yaw ≥ 8. Low elevation is 8, 12, and 16. High is 20, 24, 30, and 40.

## What was discarded

All of these used the same piece types. None of them is in the world.

- A ramp in front of each slot launched the ball over the slot. On a coarse grid almost every shot was one note.
- Yawing the banks inward did not add a phrase.
- A closer gap made a few bank, ramp, bank lines. That is two pieces.
- Standing plates on yaw rays overlapped, or, when they fitted, sat at one height and made no gap.
- Three plates in front of one bank split the first note and rarely reached three pieces.
- A chevron of angled plates in front of one shared bank shared the first note and broke under a nudge.
- One hung plate per slot, lift 7 and tilt −10, made the right shape (plate, then near bank, then far bank) and very few of them. Widening to three plates per slot is what raised the count.
- Putting the ramps back added ping-pong and did not add clean three-piece lines.
- Tilt −20, and a second tier at lift 11, were measured on the full 875 grid. The upper tier added no phrase shots, and all-six family stability fell apart. Tilt −10 at lift 7 is the one that kept a phrase under a half-degree step.
- A standing plate in front, or no near bank, let a centre plate hit a side bank. Left and right stopped being separate.

No second revision was made after the full-grid measurement of the kept layout.

## How it was measured

`docs/experiments/chime-terraces/b-fan/repro/measure.mjs` loads the three presets into one Havok instance and uses `createRangeHarness` from `scripts/range/run.mjs`. Dynamics are normal-speed, which is the presentation on all three worlds. The seed is recorded and is not applied to the solver.

The grid is the Loop's published one. Yaw −24 to 24 step 2 (25 values). Elevation 8, 12, 16, 20, 24, 30, 40. Charge 0.35, 0.45, 0.55, 0.65, 0.8. Rail index 1, origin x 0. 875 shots.

A nudge is one slider step: yaw ±0.5°, elevation ±0.5°, charge ±0.01, both directions. Same definition as the Loop neighbour walk. Contact order omits the ground and the tee, which is how the Loop's published grid counts 47 orders and 480 misses. This run of the Loop also counts 47 orders.

Seed on the fan is 20261114. The two baselines were re-run with seed 20261110. `gitSha` in the raw summary is `6d9da5dfd072f5294865f58ac8690e439924ba92`, the physics this branch was cut from. The solver was not changed.

## The grid

| | Chime Fan | Descending Resonance | Ricochet Loop |
| --- | ---: | ---: | ---: |
| shots | 875 | 875 | 875 |
| distinct contact orders | 65 | 114 | 47 |
| distinct note sequences | 64 | 117 | 47 |
| phrase families, including short | 40 | 84 | 38 |
| three-piece families | 16 | 42 | 9 |
| 0 notes | 0.2754 | 0.2514 | 0.5486 |
| 1–2 notes | 0.6343 | 0.5566 | 0.4229 |
| 3–5 notes | 0.0686 | 0.1886 | 0.0286 |
| 6+ notes | 0.0217 | 0.0034 | 0 |
| shots with 3+ notes | 79 | 168 | 25 |
| of those, three or more distinct pieces | 77 | 109 | 20 |
| yaw, both steps still 3+ | 0.9747 | 0.9226 | 0.56 |
| elevation, both steps still 3+ | 0.9747 | 0.5774 | 0.4 |
| charge, both steps still 3+ | 0.8734 | 0.7262 | 0.6 |
| all six steps still 3+ | 0.8734 | 0.494 | 0.28 |
| all six, same family | 0.2785 | 0.3333 | 0.08 |
| all six, same sequence | 0.1266 | 0.1607 | 0.04 |
| all six, same family, different sequence | 0.1519 | 0.1726 | 0.04 |
| median distinct pieces on a 3+ shot | 3 | 3 | 3 |
| two most-hit pieces, share of all notes | 0.4863 | 0.4225 | 0.3876 |
| median per-shot share on the two loudest pieces | 0.75 | 0.7084 | 0.75 |
| 3+ shots that are only two pieces | 0.0253 | 0.3512 | 0.2 |
| sounding pieces reached by a 3+ shot | 13 / 15 | 12 / 12 | 9 / 10 |
| first ground / out of bounds | 815 / 60 | 777 / 98 | 818 / 57 |

The Loop's 47 orders are the check that the harness still matches the published grid.

Three-piece families inside each region:

| region | Chime Fan | Descending Resonance | Ricochet Loop |
| --- | ---: | ---: | ---: |
| left, low | 0 | 4 | 1 |
| left, high | 6 | 6 | 0 |
| centre, low | 0 | 18 | 5 |
| centre, high | 5 | 20 | 2 |
| right, low | 0 | 5 | 3 |
| right, high | 7 | 7 | 2 |

The fan does not have more families per region than the cascade. Descending's centre-high alone has 20. The fan's families are fewer, and they are sorted by side.

On the fan, the low band has no three-piece family. A low aim rings one near bank: west G4, centre C4, or east D4. That is one note, and the side of the aim does choose which bank. It is not a phrase.

The high band is where the phrases are. The most common three-piece family in each yaw column, counting the phrase shots in that column:

| yaw | phrase shots | dominant family |
| ---: | ---: | --- |
| −24, −22, −20 | 3 | plate-w-mid, bank-w, chime-w |
| −18 | 3 | plate-w-inner, plate-w-mid, bank-w |
| −16, −14, −12 | 3 | plate-w-inner, bank-w, chime-w |
| −10 | 4 | plate-c-left, bank-c, chime-w |
| −8, −6, −4 | 3 | plate-c-left, bank-c, chime-c |
| −2, 0, 2 | 3 | plate-c-mid, bank-c, chime-c |
| 4 | 3 | plate-c-right, plate-c-mid, bank-c |
| 6, 8 | 3 | plate-c-right, bank-c, chime-c |
| 10 | 4 | plate-c-right, bank-c, chime-e |
| 12, 14, 16 | 3 | plate-e-inner, bank-e, chime-e |
| 18 | 3 | plate-e-inner, plate-e-mid, bank-e |
| 20, 22, 24 | 3 | plate-e-mid, bank-e, chime-e |

Walking yaw from −24 to 24 walks the line from the west slot, through the centre, to the east. Three columns are seams that ring two plates and the near bank and miss the far chime (−18, 4, 18). Two columns cross the slot boundary (−10 names the centre bank and the west chime, 10 names the centre bank and the east chime). The other twenty columns are one entry plate plus that slot's two banks.

`aim-regions.svg` colours each yaw-and-elevation cell by the slot of the most common three-piece family among the five charges. A grey cell has no three-piece family. Elevation 8, 12, and 16 are grey. Elevation 20, 24, and 30 carry the colour. Elevation 40 is grey again: that aim goes over the plates. The chart's slot is the first of bank-w, bank-e, bank-c named in the family, so the two cross-slot seams are painted as the centre.

Inside one of those columns, the six slider steps usually keep three or more notes (87% of phrase shots, against 49% on Descending and 28% on the Loop). They less often keep the exact family (28%, against 33% on Descending). About half of the family-stable shots change the exact sequence. The extra note is another bounce between the near bank and the far chime.

The median 0.75 is that bounce. On a five-note line the entry plate speaks once and the two banks speak twice each, so four of the five notes are the two banks. That shot still has three distinct pieces. The failure the brief names, a phrase that is only two pieces, is 2 of 79 phrase shots (0.0253), against 0.3512 on Descending.

The two most-hit pieces on the whole grid are bank-c (0.3193 of all notes) and bank-e (0.167). bank-w is 0.166, tied with the east bank for practical purposes. The three near banks are most of the notes because 555 of 875 shots are one or two notes, and a low aim is one bank. That concentration is the low band, not the phrases.

Piece coverage of the phrase shots is 13 of 15. The two missing pieces are plate-w-outer and plate-e-outer. They are reachable past the grid: yaw −28, elevation 24, charge 0.55 rings plate-w-outer and bank-w, and drops chime-w. One step back toward the grid, yaw −27.5, adds the chime.

## What the renders contain

Five shots were rendered with `renderResonanceWav` and variant `tuned-even`, which is the bank voice the page applies. Chrome's OfflineAudioContext. Opus in an ogg, from that wav. Peak and RMS are of the wav. Files are in the artifact store, not in git. Hashes are in `audio-manifest.json`.

| shot | notes, in order | seconds | peak | RMS |
| --- | --- | ---: | ---: | ---: |
| opening | bank-c C4 | 2.850 | 0.4312 | 0.0290 |
| west | plate E4, bank G4, chime A4, bank G4, chime A4 | 4.050 | 0.3586 | 0.0405 |
| centre | plate G4, bank C4, chime D4, bank C4, chime D4 | 3.958 | 0.3726 | 0.0424 |
| east | plate G4, bank D4, chime E4, bank D4, chime E4 | 4.050 | 0.3510 | 0.0421 |
| shoulder | plate C4, bank G4 | 3.467 | 0.3488 | 0.0310 |

On the west render the metal E4 is first, then the wood G4, then the metal A4, then the wood and the metal again. The centre and east renders are the same shape on their own notes. The opening render is one wood C4. The shoulder render is a metal C4 and a wood G4, and no third note. Nothing here is a claim about musical quality. The files are those notes, in that order, on the two existing voices.

The lab page played all six manifest shots, including west-long. Each contact list and each terminal matched the manifest with `Object.is` on the elapsed time and the position. The west timeline on the page reads Plate E4, then Bank G4, then Bank A4, and five notes. The far piece is a metal bank, so the page calls it a bank. That matches the headless order.

## Cost

15 pieces. The method is `scripts/capacity/measure-headless.mjs` and `scripts/capacity/measure-browser.mjs`, the same scripts as the 24-piece study. Headless is NullEngine, three fresh processes. Browser is headless Chrome, SwiftShader, 1280×800 plus the 390×844 and 844×390 viewports. The browser leak pass is 20 load-and-fire cycles, alternating with Descending Resonance. The capacity study used 50. Bodies did not move at 20.

Headless, three runs. The middle value is the median of the three run medians, and the bracket is the low and high run.

| | Chime Fan |
| --- | --- |
| pieces | 15 |
| cold construct | 19.89 ms [19.26–19.90] |
| cold rebuild | 8.30 ms [8.16–8.47] |
| warm rebuild, median | 4.49 ms [4.25–4.50] |
| warm rebuild, p95 | 6.73 ms [6.55–6.73] |
| idle step, median | 0.0062 ms |
| opening shot step, median | 0.0123 ms [0.0122–0.0124] |
| west shot step, median | 0.0121 ms [0.0118–0.0123] |
| west shot step, p95 | 0.0451 ms [0.0409–0.0468] |

All six tested shots matched the manifest in each headless run.

Browser, three runs, desktop survey. The middle value is the median of the three run medians.

| | desktop 1280×800 |
| --- | --- |
| renderer | SwiftShader |
| survey frame, median | 22.4 ms [22.3–22.6] |
| survey frame, p95 | 24.7 ms [24.5–25.4] |
| survey draws, median | 59 |
| opening flight, median | 32.2 ms [32.2–32.5] |
| west flight, median | 34.2 ms [33.6–34.4] |
| west flight, p95 | 41.1 ms [40.4–41.6] |
| static bodies / meshes | 17 |
| shadow casters | 21 |

Portrait and landscape survey frames sit on the 16.7 ms tick in this software renderer. That is a resized desktop window, not a phone.

The piece list in Build has all 15 buttons. In landscape 844×390 the list is 96 px of a 716 px scroll. On the desktop it is 165 px of 716. In portrait 390×844 the 15 buttons fit (387 px of 387). Selecting one is under a millisecond. Nudging an unfixed plate one grid step rebuilt in about 4.5 ms and reported the move. The shipped world keeps every piece fixed, so that nudge was the editor probe, not a change to the document.

Twenty load cycles left static bodies, physics bodies, meshes, materials, textures, and shadow casters on the same counts.

## Verdict

Yaw does the thing this lane asked. Across the grid, every yaw column from −24 to 24 has a dominant three-piece family, and those families walk from the west slot through the centre to the east. A half-degree yaw step keeps a 3+ note line on both sides for 97% of phrase shots. All six slider steps keep 3+ notes for 87%, which is higher than Descending Resonance (49%) and the Loop (28%). When a line is long enough it is almost never only two pieces (2.5% of phrase shots, against 35% on Descending). The notes on the three sides are different on purpose: west is E or D, then wood G, then metal A; the centre is G or E, then wood C, then metal D; the east is G or A, then wood D, then metal E.

It does not produce more phrase families per aim region than the cascade. The fan has 16 three-piece families against 42 on Descending, and the centre-high region is 5 against 20. The variety is which side you are on, not a pile of families inside one side. A phrase is also uncommon: 79 of 875 shots have 3+ notes, against 168 on Descending, because the bank is 7 m and cannot be shortened. Below that, the aim still picks which bank speaks, and it is one note. All-six same-family is 28%, close to Descending's 33%. The two outer plates never appear inside the broad grid.

This is not one precise corridor. It is three corridors, and the yaw slider walks between them. It is also not a denser cascade.

## What was not verified

A physical phone, a phone GPU, and speakers. Enjoyment was not tested with a person. The portrait and landscape frames are a resized desktop browser on SwiftShader. The opus files were not played back through the lab's live audio graph; they were rendered by the same `renderResonanceWav` the graph calls. Sibling lanes were not opened.
