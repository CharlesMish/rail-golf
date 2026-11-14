# Chime Terraces — comparison

Three foundry worlds, one harness, one definition set. Measured on `3fb804d`, the merge of lane A `7a29fed`, lane B `23f9b18`, and lane C `1ca936d`. Geometry, voices, and pitches are the lanes' own. Nothing here retunes a piece.

Descending Resonance and Ricochet Loop were measured again in the same process, on the same grid. The lanes' copies of those two worlds disagreed with each other (raw 3+ shots 166 against 168, phrase-family counts 84 against 94, all-six same-family 0.333 against 0.223). Those copies are retired. The numbers below replace them.

## Definitions

Seed `20261114` is recorded and not applied to the solver. The Ricochet Loop sweep file records `20261110`, also not applied. Dynamics are `normal-speed` (face speed) because every measured manifest sets that. The harness default is total speed, so this run sets face speed explicitly. Havok steps at 120 Hz.

The grid is the Ricochet Loop broad grid, 875 shots, rail index 1, origin x 0:

- yaw −24° to 24°, step 2° (25 values)
- elevation 8, 12, 16, 20, 24, 30, 40
- charge 0.35, 0.45, 0.55, 0.65, 0.8

A sounding note is a resonance impact with gain greater than 0.

- **Note sequence.** Sounding notes in onset order, written `piece:pitch` and joined by `>`.
- **Audible event.** A note joins the current event when its onset is at most 150 ms after the previous note. Otherwise it starts a new event. A chord is one event. Pitch sequences use this merge: pitches inside an event are joined by `+`, events by `>`.
- **Phrase length.** Raw length is the sounding-note count. Audible length is the event count. Both are binned 0 / 1–2 / 3–5 / 6+.
- **Phrase family.** Collapse immediate repeats of the same sounding piece, then take the first three distinct pieces in order of appearance. Fewer than three distinct pieces is a short family, written `short:` and the pieces. No sounding notes is `(silent)`. A long family is one with three pieces.
- **Nudge.** One slider step: yaw ±0.5°, elevation ±0.5°, charge ±0.01. Both directions. Reported for shots that already have 3+ raw notes, and again for shots that already have 3+ audible events. A per-axis "both" figure counts the shot only when each direction meets the condition. All six means every step meets it. Same family but different sequence means the family matches and the note sequence does not.
- **Breadth.** Distinct sounding pieces on a 3+ shot. The two-piece share and the busiest-piece share are of every sounding note on the grid. Ping-pong is, per 3+ shot, the share of that shot's notes that come from its own two most-hit pieces. A clean three-piece line with no repeat is 0.667.
- **Aim regions.** Left is yaw ≤ −8, centre is −6 through 6, right is yaw ≥ 8. Low elevation is 8, 12, and 16. High is 20, 24, 30, and 40.
- **Contact order.** Ledger order, with the `worldcraft-object-` prefix stripped. Ground, tee, silent pieces, and repeats stay.

Per-shot rows are in `raw/shots-*.json`. The aggregates are in `raw/summary.json`.

## The three ideas

**Chime Terraces** (21 pieces, capacity 24). Three timber ramps in front of the tee, then three rows of six metal plates, lifted 2 m, 6 m, and 10 m, each tilted −15° so the top leans toward the tee. Columns are tuned so a descent falls in pitch. It asked whether a shot that descends through tiers is easier to find, and belongs to more than one family, than Descending Resonance. On this grid it is the easiest long raw line to hit, and every plate is reached. The descent it was built for is rare: two rows chain, and the third row seldom joins the same line. More than half of the raw 3+ shots open with the first three notes inside fewer than three events.

**Chime Fan** (15 pieces, capacity 24). Three slots side by side. Each slot is a 7 m timber bank, three metal plates hung at lift 7 and tilt −10, and a far metal chime. Yaw picks the slot. It asked whether a sideways choice gives more families per aim region than a vertical cascade, and whether a one-step nudge keeps the family. The family holds, and a long shot is almost never two pieces. The phrase exists only once the aim is high enough to clear the bank. The low half of the grid has no raw 3+ shot. The opening aim rings one bank.

**Chime Garden** (12 pieces, capacity left unset). Four timber banks and eight standing metal plates in three pockets, pentatonic, timber banks on the tuned-even voice. It asked whether a denser ricochet field, up toward 24 pieces, can hold several readable families and use the installation, while a nudge still leaves a related line. The shipped world uses every piece. The pockets are real and small. Yaw is the axis that leaves them. A 16-piece copy measured by that lane added no three-note shots; this harness did not re-run that copy.

## Unified table

Shares are of 875 shots unless a row says otherwise. Family and nudge shares below the first block are of the raw 3+ shots, then of the audible 3+ shots.

|  | Terraces | Fan | Garden | Descending Resonance | Ricochet Loop |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pieces | 21 | 15 | 12 | 12 | 10 |
| Capacity opt-in | 24 | 24 | unset | unset | unset |
| Lifted plates (height guides) | 18 | 9 | 0 | 6 | 0 |
| Silent shots | 159 (18.2%) | 241 (27.5%) | 351 (40.1%) | 220 (25.1%) | 478 (54.6%) |
| Raw 0 / 1–2 / 3–5 / 6+ | 159 / 421 / 255 / 40 | 241 / 555 / 60 / 19 | 351 / 410 / 111 / 3 | 220 / 489 / 165 / 1 | 478 / 371 / 26 / 0 |
| Audible 0 / 1–2 / 3–5 / 6+ | 159 / 505 / 211 / 0 | 241 / 555 / 79 / 0 | 351 / 454 / 70 / 0 | 220 / 491 / 163 / 1 | 478 / 375 / 22 / 0 |
| Raw 3+ shots | 295 (33.7%) | 79 (9.0%) | 114 (13.0%) | 166 (19.0%) | 26 (3.0%) |
| Audible 3+ shots | 211 (24.1%) | 79 (9.0%) | 70 (8.0%) | 164 (18.7%) | 22 (2.5%) |
| Raw 3+ that are only two pieces | 89 (30.2%) | 2 (2.5%) | 29 (25.4%) | 59 (35.5%) | 5 (19.2%) |
| Audible 3+ that are only two pieces | 77 (36.5%) | 2 (2.5%) | 8 (11.4%) | 59 (36.0%) | 4 (18.2%) |
| Phrase families, including short and silent | 158 | 40 | 60 | 83 | 39 |
| Long families (three distinct pieces) | 83 | 16 | 21 | 41 | 10 |
| Distinct note sequences | 235 | 64 | 87 | 115 | 48 |
| Distinct pitch sequences after the 150 ms merge | 160 | 61 | 84 | 88 | 42 |
| Distinct contact orders | 257 | 76 | 106 | 143 | 56 |
| Median distinct pieces on a raw 3+ shot | 3 | 3 | 3 | 3 | 3 |
| Raw 3+ piece histogram (2 / 3 / 4 / 5) | 89 / 183 / 23 / 0 | 2 / 62 / 15 / 0 | 29 / 79 / 6 / 0 | 59 / 91 / 15 / 1 | 5 / 15 / 6 / 0 |
| Median ping-pong, raw 3+ | 0.667 | 0.75 | 0.75 | 0.75 | 0.75 |
| Median ping-pong, audible 3+ | 0.75 | 0.75 | 0.667 | 0.75 | 0.75 |
| Two busiest pieces, share of all notes | 26.8% | 48.6% | 46.3% | 42.4% | 38.4% |
| Busiest piece | ramp-c 19.8% | bank-c 31.9% | bank-c 25.6% | ramp-w 22.7% | bank-back 24.1% |
| Pieces reached by a raw 3+ shot | 21 / 21 | 13 / 15 | 12 / 12 | 12 / 12 | 9 / 10 |
| Raw 3+ with any merged onset | 166 (56.3%) | 25 (31.6%) | 69 (60.5%) | 8 (4.8%) | 12 (46.2%) |
| Raw 3+ whose first three notes are under three events | 163 (55.3%) | 23 (29.1%) | 68 (59.6%) | 7 (4.2%) | 11 (42.3%) |
| Raw 3+ whose first three notes are one event | 67 (22.7%) | 4 (5.1%) | 22 (19.3%) | 0 | 2 (7.7%) |
| Raw 3+ that fall to 1–2 audible events | 84 (28.5%) | 0 | 44 (38.6%) | 2 (1.2%) | 4 (15.4%) |
| Third distinct piece speaks within 150 ms of the first | 11 (3.7%) | 3 (3.8%) | 0 | 0 | 0 |

Lane A wrote that about a third of its long shots bunch the first three onsets inside 150 ms. Under this definition that is not the count. The strict span, third distinct piece within 150 ms of the first, is 11 of 295. What the terrace actually does is open as a chord: 163 of 295 raw 3+ shots put their first three notes into fewer than three events, and 84 of 295 then fall out of the audible 3+ bin entirely. The garden is the same shape, a little worse (44 of 114). The fan loses none of its raw 3+ shots to that bin. Descending Resonance loses 2 of 166.

### Nudges

Of the shots that already have 3+ raw notes. "Both" means both directions of that axis.

|  | Terraces (295) | Fan (79) | Garden (114) | Descending (166) | Loop (26) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Yaw, both stay 3+ | 73.9% | 97.5% | 51.8% | 93.4% | 53.8% |
| Yaw, both same family | 42.4% | 67.1% | 37.7% | 71.7% | 30.8% |
| Yaw, both same family, different sequence | 7.8% | 10.1% | 16.7% | 16.3% | 15.4% |
| Elevation, both stay 3+ | 76.3% | 97.5% | 62.3% | 59.0% | 38.5% |
| Elevation, both same family | 62.4% | 43.0% | 57.0% | 45.2% | 30.8% |
| Elevation, both same family, different sequence | 38.0% | 17.7% | 23.7% | 16.3% | 15.4% |
| Power, both stay 3+ | 78.3% | 87.3% | 64.9% | 72.9% | 57.7% |
| Power, both same family | 64.8% | 64.6% | 56.1% | 56.0% | 30.8% |
| Power, both same family, different sequence | 35.6% | 39.2% | 20.2% | 28.3% | 11.5% |
| All six stay 3+ | 54.2% | 87.3% | 39.5% | 51.2% | 26.9% |
| All six same family | 26.1% | 27.9% | 27.2% | 32.5% | 7.7% |
| All six same family, different sequence | 21.4% | 15.2% | 16.7% | 16.9% | 3.9% |

The same all-six block on audible 3+ shots: Terraces 40.3% stay / 31.8% family, Fan 84.8% / 27.9%, Garden 25.7% / 35.7%, Descending Resonance 50.6% / 32.9%, Loop 18.2% / 4.5%. Garden's family share sits above its stay share because a nudge can keep the three pieces while two of them merge into one event.

Restricted to long families (the shot already names three pieces), all six keep that family on 12.1% of Terraces (206 shots), 28.6% of the Fan (77), 34.1% of the Garden (85), 15.9% of Descending Resonance (107), and 4.8% of the Loop (21). The terrace's large family count is a catalogue of lines that a yaw step leaves.

### Aim regions

Families in the region, then the top family's share of that region's shots. Under that, raw 3+ shots and the top family among those shots.

| Region | Terraces | Fan | Garden | Descending | Loop |
| --- | --- | --- | --- | --- | --- |
| Left, low (135) | 46 fam, top short:ramp-w 20.0%. 58 raw 3+, top 10.3% | 3 fam, top short:bank-w 52.6%. 0 raw 3+ | 24 fam, top short:bank-l 30.4%. 37 raw 3+, bank-l>l1>l2 27.0% | 11 fam, top short:ramp-w 51.1%. 13 raw 3+ | 10 fam, top short:plate-mouth-w 44.4%. 1 raw 3+ |
| Left, high (180) | 36 fam, top silent 33.9%. 31 raw 3+ | 15 fam, top silent 33.9%. 29 raw 3+, plate-w-inner>bank-w>chime-w 31.0% | 13 fam, top silent 67.8%. 14 raw 3+ | 17 fam, top silent 55.0%. 18 raw 3+ | 9 fam, top silent 76.7%. 0 raw 3+ |
| Centre, low (105) | 28 fam, top short:ramp-c>mid-2 6.7%. 72 raw 3+, ramp-c>high-2>high-3 8.3% | 2 fam, top short:bank-c 80.0%. 0 raw 3+ | 12 fam, top short:bank-c 33.3%. 25 raw 3+, bank-c>c1>c2 60.0% | 34 fam, top short:wall-near-e 15.2%. 55 raw 3+ | 18 fam, top silent 26.7%. 12 raw 3+ |
| Centre, high (140) | 20 fam, top silent 25.0%. 38 raw 3+, mid-2>mid-3>low-3 15.8% | 18 fam, top silent 30.0%. 21 raw 3+, plate-c-mid>bank-c>chime-c 42.9% | 15 fam, top silent 44.3%. 9 raw 3+ | 40 fam, top silent 15.0%. 43 raw 3+, high-c>wall-near-e>wall-far-w 9.3% | 11 fam, top silent 65.0%. 5 raw 3+ |
| Right, low (135) | 48 fam, top short:ramp-e 20.0%. 60 raw 3+ | 3 fam, top short:bank-e 52.6%. 0 raw 3+ | 22 fam, top short:bank-r 17.8%. 24 raw 3+, bank-r>r1>r2 25.0% | 13 fam, top short:ramp-e 51.1%. 16 raw 3+ | 14 fam, top short:plate-mouth-e 45.9%. 4 raw 3+ |
| Right, high (180) | 36 fam, top silent 33.9%. 36 raw 3+, mid-3>mid-4>low-4 16.7% | 16 fam, top silent 33.9%. 29 raw 3+, plate-e-inner>bank-e>chime-e 31.0% | 14 fam, top silent 67.2%. 5 raw 3+ | 19 fam, top silent 53.3%. 21 raw 3+ | 12 fam, top silent 80.0%. 4 raw 3+ |

The fan is the only world whose high band has a dominant three-piece family in every yaw column, and whose low band is a single named bank. Descending Resonance still has the most families inside one region (40 in centre-high). The terrace spreads families across the low band and never lets one of them own more than a sixth of a region's long shots.

## Chords and ping-pong

A raw count of 295 is the terrace's headline and it is the wrong success. Of those shots, 89 name only two pieces, and 84 have only one or two audible events. The shots that are both audible-3 and three or more pieces number 134 (15.3% of the grid). Median ping-pong on the raw 3+ set is 0.667, which is a clean three-note line, and it rises to 0.75 once the chord shots have been removed from the audible set. The centre ramp is 19.8% of every note on the grid, and the two busiest pieces together are 26.8%. That concentration is the best of the five worlds. It is also a ramp that feeds a chord: `centre-climb` is E4, then A4 and G4 together, then E4.

The fan's 79 raw 3+ shots are all still audible 3+. Two of them are two pieces. Median ping-pong is 0.75 because the entry plate speaks once and the near bank and the far chime answer again: on the west starter, four of the five notes are bank-w and chime-w. The family definition hides that tail. The two near banks that dominate the grid (bank-c 31.9%, bank-e 16.7%) dominate it from the low band, where the shot is one note. The two outer plates never appear inside yaw −24 to 24.

The garden's 114 raw 3+ shots become 70 audible events, and 8 of those 70 are still two pieces, so 62 shots (7.1%) are a three-piece phrase you can hear as three attacks. Median ping-pong on that audible set is 0.667. The raw set is 0.75. The right pocket's own starter is one of the chords: A4, then D4 and E4 together.

Descending Resonance is the baseline that already knew this. Its raw and audible counts almost match (166 and 164), 4.8% of the long shots contain a merge, and 35.5% of them are still two pieces bouncing. The loop is the other baseline: 26 raw 3+ shots, 22 audible, half the grid silent.

## Frame cost

Same session, headless Chrome 157 on SwiftShader, window 1280×800, canvas 1000×703, fixed survey camera. `sampleDetail(120)` after a 44-frame warmup, then flight frames of each world's busiest resting starter. Three runs, worlds rotated. The reported median is the median of the three run medians. The noise band is the widest relative spread in the session: 28.7% on survey (Descending Resonance ran 28.4, 22.3, and 22.0 ms), 25.7% on flight (the Loop ran 36.6, 39.0, and 29.6 ms). The harness marks every world "no measurable difference" against Descending Resonance. `raw/frames.json` has the runs.

|  | Survey median (runs) | Survey p95 | Flight median (runs) | Flight p95 | Survey draws | Casters | Materials | Bodies |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Terraces | 23.6 (23.6, 28.4, 22.9) | 31.6 | 25.2 (28.1, 25.2, 24.9) | 37.0 | 80 | 27 | 31 | 23 |
| Fan | 22.2 (27.5, 22.2, 21.8) | 24.1 | 32.9 (38.9, 32.9, 32.9) | 40.2 | 59 | 21 | 22 | 17 |
| Garden | 21.8 (25.9, 21.8, 21.3) | 27.3 | 29.7 (35.2, 29.6, 29.7) | 45.5 | 44 | 18 | 13 | 14 |
| Descending Resonance | 22.3 (28.4, 22.3, 22.0) | 24.8 | 29.3 (35.7, 29.3, 28.5) | 40.0 | 50 | 18 | 18 | 14 |
| Ricochet Loop | 25.9 (25.9, 26.5, 21.4) | 29.5 | 36.6 (36.6, 39.0, 29.6) | 45.5 | 41 | 16 | 13 | 12 |

Lane A reported a desktop survey of 31 ms median and 34.1 ms p95, against a capacity-study 24-piece fixture near 23.5 ms. Lane C reported 34.7 ms median and 49.1 ms p95 during its centre shot. Both numbers are in this session's slow runs, and neither is the three-run median. Terraces' slow survey run is 28.4 ms, the same figure Descending Resonance posted on its slow run. Garden's slow flight run is 35.2 ms median and 48.9 ms p95, which is the lane's sample. The three-run medians sit with Descending Resonance.

The draw list really is longer on the terrace, and it does not move the frame clock.

An elevated plate adds a height guide (`lib/worldcraft-scene.js`): a line system, no body, no collider, not a shadow caster. Terraces has 18 of them, the fan 9, Descending Resonance 6, the garden and the loop none. Across Terraces, the Fan, the Garden, and Descending Resonance, the survey draw count equals the physics meshes, plus the shadow-caster list, plus one draw per height guide, plus 12 draws that stay constant (the yard). That sum is 80, 59, 44, and 50. The loop is one draw off the same sum (40 against a measured 41). Materials move with the guides on the three chime worlds: the garden has 13 and no guides, the fan 22 and 9 guides, the terrace 31 and 18 guides. Descending Resonance has 6 guides and 18 materials, one short of that line.

Nine extra pieces against Descending Resonance are 18 draws (the box and its shadow) and 12 extra guides are 12 draws. Those 30 draws are why the terrace's survey is 80 against 50. The sampled render duration on that survey is 0.4–0.6 ms. The physics step, NullEngine, is 0.0076 ms median on the terrace's flight and about 0.005 ms on the others. The browser physics sample during flight is 0, which is a timer that cannot see a sub-millisecond step. Thirty extra draws inside a half-millisecond render cannot explain an 8 ms swing in a frame whose wall-clock gap is already 22 ms, and whose run-to-run spread is 6 ms. The 22–36 ms figures are the SwiftShader frame gap. They are the same gap on a 12-piece world and a 21-piece world.

Voice count does not sort with frame time either. After the busiest starter the garden had started 115 voices and posted the fastest survey (21.8 ms). The terrace started 61, the fan 94, Descending Resonance 20, the loop 37. The terrace has no timber-bank voice. Its plates stay ordinary metal. That choice is not a render cost.

Flight draws fall (terrace 46, fan 46, garden 40, Descending 44, loop 36) as the camera leaves casters outside the shadow frustum. The terrace's flight median, 25.2 ms, is the fastest of the five, on the world with the heaviest survey list.

No optimization was made.

## Is 24 pieces a real constraint?

The cap stopped one discarded layout. It did not stop the music.

- Terraces. A first staircase used 25 pieces and the cap rejected it (lane A report). The world that shipped uses 21. The searches that failed inside the cap failed because a plate 4 m wide at restitution 0.86, ending at first ground, chains two rows and rarely a third. Spare slots were left over.
- Fan. Fifteen pieces. A second tier at lift 11, still inside the cap, was measured on the full 875 grid and added no phrase shots, and all-six family stability fell apart. The two outer plates are already in the world and sit outside the grid. The shoulder shot rings one of them and the west bank, two pieces.
- Garden. Shipped at 12, and left `capacity: 24` unset, because the pieces that would have used it were not reached. Lane C added four plates to a 16-piece copy, remeasured the full grid, and the three-note count stayed 111 with coverage still 12 of 16. Those four plates were removed. This harness was not pointed at that copy. On the shipped world it counts 114 raw 3+ shots, three more than the lane's 111.

The binding limits are the trajectory and the 150 ms chord. More pieces, on the evidence the lanes already gathered, sit in the yard and stay quiet.

## Ranking

1. **Chime Fan, as a line you can keep.** Seventy-nine shots, all of them still three or more events after the chord merge, two of them only two pieces. Both yaw steps keep a raw 3+ line on 97.5% of those shots. All six steps keep it on 87.3%. The high band is three slots with a dominant family each. The price is paid in reach and in the tail: the low band is empty of long shots, the opening aim is one note, and median ping-pong is 0.75 because the bank and the chime repeat. Sixteen long families is a small catalogue next to Descending Resonance's 41.

2. **Descending Resonance, still the reference for variety inside one aim.** 164 audible 3+ shots, 41 long families, 40 of them able to appear in the centre-high region, and an all-six family hold of 32.5%. A third of its long shots are two pieces. It is the world the new ones had to beat, and on family-per-region they do not.

3. **Chime Terraces, as a keyboard, not as a phrase.** The most pieces reached (21 of 21), the least concentration (two pieces, 26.8% of all notes), the most long families (83), and 134 shots that are three pieces and three events. A yaw step both ways keeps a long family on 26.2% of those lines, and all six keep it on 12.1%. The raw 33.7% is a chord and a two-piece rattle counted as success.

4. **Chime Garden.** Three pockets, every piece reached, 62 shots that survive as three pieces and three events. The centre pocket's long family owns 60% of the centre-low raw 3+ shots, which is a readable aim. Yaw both ways keeps a raw 3+ line on 51.8%. Forty percent of the grid is silent. The extra plates were already tried.

5. **Ricochet Loop.** 22 audible 3+ shots. The grid it lent the others is mostly silence on its own world.

## Recommendation

The direction worth continuing is the fan's: yaw chooses a slot, and inside the slot a one-step nudge keeps the same three pieces while the tail gets longer or shorter. The direction that is not worth another layout pass is spending the 24-piece budget. Terraces already showed what 21 pieces buy, and the garden already showed what the 13th through 16th pieces buy.

Hand **Chime Fan** to Astra or Claude. One refinement: bring that three-piece line down to the elevation the world opens on. The opening aim is yaw 0, elevation 18, charge 0.55, and it rings bank-c once. Elevations 8, 12, and 16 have zero raw 3+ shots in every yaw column, because the near bank is 7 m and a low ball meets the bank and stops. A second tier at lift 11 was already measured on this grid and added no phrase shots, so the change to try is the bank height (or an equivalent move of the hung plates toward a shot that leaves elevation 18), then the same 875-shot harness. The refinement has to keep the slot separation and has to keep an eye on the 0.75 ping-pong: the family is already a plate plus a repeating pair, and a lower bank that only makes a longer pair has not made a better instrument.

## Audio

Six Opus files, two per chime world, a starter and a one-step neighbour. Rendered from this merge through `lib/worldcraft-resonance.js` into an `OfflineAudioContext`, then Opus at 48 kbit/s. Level match was not applied. Worlds with `bankVoice` use `tuned-even`. Terraces has no banks, so its ramps stay ordinary timber and its plates stay ordinary metal. Seed `20261114` is provenance and is not applied. The files are in `/opt/cursor/artifacts/chime-compare/`. They are not in git. Setup, sha256, peak, and RMS are in `audio-manifest.json`.

| File | Setup | Sequence | Peak | RMS |
| --- | --- | --- | --- | --- |
| chime-terraces-centre-climb.ogg | yaw 0, elev 8, charge 0.55 | ramp-c E4, high-2 A4, high-3 G4, mid-3 E4 | 0.516 | 0.027 |
| chime-terraces-centre-climb-neighbour.ogg | charge 0.54 | the same four, then high-3 G4, mid-3 E4, ramp-c E4 | 0.410 | 0.024 |
| chime-fan-west.ogg | yaw −16, elev 24, charge 0.55 | plate E4, bank G4, chime A4, bank G4, chime A4 | 0.359 | 0.041 |
| chime-fan-west-neighbour.ogg | elev 24.5 | the same five, then one more bank G4 | 0.389 | 0.043 |
| chime-garden-right-leak.ogg | yaw 16, elev 8, charge 0.8 | bank-r A4, r2 E4, c2 A4 | 0.486 | 0.051 |
| chime-garden-right-leak-neighbour.ogg | elev 7.5 | the same three, then bank-c C4 | 0.509 | 0.058 |

The terrace pair shares the family `ramp-c>high-2>high-3`. The charge step lets the line continue and return to the ramp (raw 7, audible 6; high-2 and high-3 still speak together). The fan pair shares `plate-w-inner>bank-w>chime-w`. The elevation step adds one more bounce on the timber bank (raw 6, audible 6). The garden pair shares `bank-r>r2>c2`. The elevation step adds the centre bank, and that C4 arrives 84 ms after c2, so it joins the second event. Raw 4, audible 2. The new piece is inside the chord. The harness's own highest-scoring terrace neighbour is a different step (elevation 7.5, which returns to ramp-c once). The rendered pair is the charge step.

## What was checked

Headless Chrome played every starter in the five manifests on the merged build. Terminals matched with `Object.is` on elapsed time and position. Note sequences matched. Contact lists matched, including ground and tee. That is 32 shots, recorded in `raw/browser.json`. Screenshots, desktop 1280×800 and portrait 390×844, are in `/opt/cursor/artifacts/chime-compare/` for all five worlds. The portrait is that browser window resized. It is not a phone.

## Reproduce

```
node docs/experiments/chime-terraces/measure.mjs
node docs/experiments/chime-terraces/frames.mjs
node docs/experiments/chime-terraces/render-audio.mjs
node docs/experiments/chime-terraces/browse.mjs
```

`measure.mjs` writes `raw/summary.json` and `raw/shots-*.json`. `frames.mjs` needs Chrome. `browse.mjs` and `render-audio.mjs` need the lab server and ffmpeg.
