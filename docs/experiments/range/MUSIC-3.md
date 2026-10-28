# Musical Workshop — bank voice study (music3)

Branch `lab/wc-range-music3-bank-voice`, stacked on PR #55 (`9d8278b`).
Audio only. No physics, collider, launch, scoring or mode change. Not for `main`.

## Question

PR #55 measures the strike correctly (pre-step speed into the contact face), but
soft contacts fall away and the timber bank reads as a short blip next to the
metal pieces, especially on a phone. The owner heard the even-decibel ladder
become audible earlier than PR #55 and asked for a side-by-side choice, without
making the bank simply louder or excessively bright.

## Variants (Musical Workshop only; default stays PR #55)

| Id | Label | Gain from face speed | Bank voice |
|---|---|---|---|
| `pr55` | A · PR #55 | smoothstep, knee 32 m/s | original timber (~90 ms) |
| `even-db` | B · Even-decibel curve | 18 dB range, shape 1.7, knee 32, silent below 1 m/s, fades in to 2 m/s | original timber |
| `woody` | C · Woody timber | as B | `timberWoody`: longer body, stronger octave and 3rd partial, band-passed knock, level set so the first 100 ms matches the original |
| `woody-bright` | D · Woody + strike colour | as B | C, with upper partials and knock tilted about ±1.5 dB by strike, energy-normalised |

The even-decibel curve tracks PR #55 within about 1 dB from roughly 14 m/s
upward, so firm hits keep their level and only the soft end is lifted.

Every variant reads the same `normalSpeed` the PR #55 ear records. Kept lines
store only the PR #55 gain, which is inverted exactly to recover face speed.
`lib/worldcraft-runtime.js` is not edited; variants are applied when a sound is
scheduled.

## In the lab

Musical Workshop shows **Bank sound (listening A/B)** with the four variants and
**Replay last shot**, which replays the last shot's recorded impacts with the
selected sound without firing again. Live impacts and kept-line playback use the
selection too.

## Evidence

- `scripts/range/music3-capture.mjs` re-fires 11 real shots through the unchanged
  runtime: 7 single bank hits (face 2.1 → 36.7 m/s) and 4 phrases
  (graze → ramp; bank → ramp → plate; ramp → bank → plate; ramp → plate).
  Contacts: `appendix/music3/contacts.json`. Face speeds and times match PR #55
  and PR #54 records.
- `scripts/range/render-music3.mjs` renders each shot × variant in Chrome with
  `renderResonanceWav`, writes `audio/music3/in-game/` (exact lab level) and
  `audio/music3/level-matched/` (loudest 400 ms at −20 LUFS, peaks ≤ −1 dBFS),
  and records K-weighted loudness in `audio/music3/manifest.json`.

### Equal-gain calibration (one full-strength note)

| | strike 100 ms | momentary 400 ms | phone 400 ms | peak |
|---|---|---|---|---|
| timber (A, B) | −22.1 LUFS | −28.2 | −41.3 | −5.2 dBFS |
| woody (C) | −22.2 | −27.9 | −38.0 | −9.0 |
| woody + colour (D, hardest) | −22.1 | −27.8 | −37.3 | −8.6 |
| metal plate | −16.5 | −20.6 | −25.9 | −6.2 |

C keeps strike loudness, adds 0.3 dB over 400 ms, and gains 3.3 dB on the
small-speaker model, with 3.8 dB more headroom. The bank stays deliberately
quieter than metal; closing that gap would mean a louder bank, which was not asked.

### Softest real graze (2.1 m/s)

A −57.3 LUFS strike (effectively silent) → B −37.3 → C/D −37.4, and on the phone
model A −77.4 → B −57.2 → C −52.9.

### Phrases

- **Ramp → Bank → Plate:** the bank (16.8 m/s) is 5.4 dB under the ramp in every
  variant at strike, but on the phone model the gap is 16.9 dB for A/B and
  11.7 dB for C. The closing plate lands softly (3.6 m/s): A plays it at
  −44.9 LUFS, B–D at −30.9.
- **Bank graze → Ramp:** the opening graze sits 37 dB under the ramp in A and
  17 dB under in B–D.
- **Ramp → Plate (no bank):** all variants within 0.3 dB; the metal voice is unchanged.

### Headroom

All 44 real renders peak at or below −5.4 dBFS. A worst-case pile-up (bank, ramp
and plate at full strength within 20 ms) peaks at −2.8 dBFS (A, B) and −2.5 dBFS
(C, D). No limiter is needed for these variants.

### Strike colour (D)

Restrained by design: at matched energy, D differs from C by at most about
0.7 dB on the phone model. It may be inaudible; that is a valid answer.

## Not established

Nobody has judged these by ear yet; the owner chooses after phone listening.
The phone figure is a band-pass approximation, not a handset measurement.
Headless Chrome confirmed the selector and replay at 1400×900 and 390×844 (no
page errors, voices started on replay); it did not play sound to a person.

## Round 2: making the bank a note

Owner listening: B is the right dynamics everywhere, and D is preferred over C.
But as the C in a C–D–E phrase the bank is still weak: "our best, but not very
good". The ring of the woody tail helps; it should stay recognisably wood, not
another metal piece.

Reading: the original and woody voices are knocks with a pitch on them. A melody
note needs (1) enough sustained pitch for the ear to lock the note, (2) pitch
energy where phones can play it, and (3) roughly the musical weight of its
neighbours. The model that does all three in wood is a tuned bar (marimba).

Two new variants, both on the B curve with strike colour (as D):

| Id | Label | Voice |
|---|---|---|
| `tuned` | E · Tuned wood | `timberTuned`: bar fundamental (0.6 s), resonator hum (1.5 s), octave, a two-octave overtone (ratio 4, C6 ≈ 1046 Hz, well inside phone range), a short 10th mode, soft band-passed mallet. Harmonic and mellow, distinct from the inharmonic metal bar. |
| `tuned-long` | F · Tuned wood, longer hum | same bar with a 2.3 s resonator, to find where the ring stops reading as wood |

Strike colour now has per-partial sensitivity: the fundamental and hum never
move; the octave moves a little, the ratio-4 overtone by the default ±1.5 dB, and
the top mode most, as a harder mallet would.

### Round 2 measurements (in-game gain)

| Full-strength bank | strike 100 ms | momentary 400 ms | phone 400 ms | peak |
|---|---|---|---|---|
| B (original timber) | −22.1 | −28.2 | −41.3 | −5.2 |
| D (woody + colour) | −22.1 | −27.8 | −37.3 | −8.6 |
| E (tuned) | −20.7 | −26.0 | −34.7 | −8.7 |
| F (tuned, long) | −20.1 | −24.8 | −33.9 | −9.0 |
| metal plate | −16.5 | −20.6 | −25.9 | −6.2 |

Ramp → Bank → Plate, bank at 16.8 m/s, gap to the ramp D4:

| | momentary | phone |
|---|---|---|
| B | 7.5 dB | 16.9 dB |
| D | 7.0 dB | 11.6 dB |
| E | 5.0 dB | 8.8 dB |
| F | 3.8 dB | 8.0 dB |

The attack rises only 1.4 dB (E) / 2.0 dB (F) over the original; most of the
gain is sustained pitch and the overtone. Worst-case pile-up peaks −2.2 dBFS (E)
and −2.1 dBFS (F).

**Arrangement note.** In two of the three real phrases the C is a graze (2.1 and
4.4 m/s into the face), so it is quiet by design under any curve with real
dynamics. If those phrases should read as even melodies, the remaining lever is
the curve's range (18 dB now; 12 dB would bring grazes up about 4–5 dB) or a
firmer bank placement, not the voice.

## Round 3: presence for the C

Owner listening: F wins every row, but the bank's C is still too quiet next to
the D and E, at in-game level and level-matched. Not "loud", but present.

Three options on F (metal and the stand-in keep the B curve; peaks stay inside
the original timber headroom):

| Id | Label | Change |
|---|---|---|
| `tuned-presence` | G · F, more presence | bank trim ×1.36 (+2.7 dB): a full-strength bank sits about 1.7 dB under the plate at 400 ms |
| `tuned-even` | H · G, grazes lifted | G, bank-only range 18 → 12 dB |
| `tuned-forward` | I · H, midrange forward | H with a stronger octave and two-octave overtone (`timberTunedPresent`), trim ×1.3 |

Bank gap to its metal neighbour (momentary 400 ms / phone 400 ms, dB under):

| Phrase (bank face speed) | F | G | H | I |
|---|---|---|---|---|
| Ramp → Bank → Plate (16.8 m/s) | 3.8 / 8.0 | 1.3 / 5.5 | 0.3 / 4.0 | 0.5 / 2.6 |
| Bank → Ramp → Plate (4.4 m/s) | 12.0 / 17.0 | 9.6 / 14.5 | 5.2 / 10.2 | 6.0 / 8.9 |
| Bank graze → Ramp (2.1 m/s) | 15.8 / 20.7 | 13.3 / 18.3 | 8.4 / 13.4 | 9.1 / 12.0 |

Headroom: real renders peak ≤ −5.4 dBFS; the full-strength pile-up peaks
−1.9 dBFS (G, H) and −1.7 dBFS (I).

## Decision

After phone listening the owner chose **H · G, grazes lifted** (`tuned-even`):
tuned wood with the longer hum, bank trim ×1.36, bank-only range 12 dB, metal on
the B curve. It is now the Musical Workshop default (`MUSICAL_WORKSHOP_SOUND`).
The A/B selector stays in the lab so the level can be retuned after more play;
the bank trim is the one number to raise (about 1.5–2 dB of headroom remains
before a full-strength pile-up nears clipping). Other presets keep PR #55.

## Follow-up: the bank, not every timber piece

Branch `lab/wc-range-music3-20261026`, cut from `2c975014477264b870f578d7866a682431db2cd0`.
Still audio only. Havok, colliders, launch, restitution, and saved sample paths are unchanged.

The H settings (voice `timberTunedLong`, trim ×1.36, 12 dB range) were keyed on `material === 'timber'`. A real shot makes that visible. Seed `20261026` is provenance only. Layout `phrase-early-plate`: bank at (0, 16) yaw 80°, ramp at (−8, 40), plate at (−24, 58), shot yaw 0, elevation 18, charge 0.55, origin 0, rail 1, dynamics `normal-speed`. Setting the ramp and the plate to timber as well left all 224 samples `Object.is`-identical to the metal-ramp, metal-plate shot, and first ground still ended it. Face speeds were bank 4.3602 m/s, ramp 16.4137 m/s, plate 15.1925 m/s.

Before the fix, H's 12 dB curve was on all three. The ramp's gain was −3.53 dB against −5.30 dB on the ordinary 18 dB curve. The plate was −4.02 dB against −6.02 dB. A full-strength timber ramp rendered at the same −6.29 dBFS peak as the bank, which is the trimmed tuned-wood voice, not ordinary timber.

There is no reason to share that voice across timber. H is the bank's sound. The key is the piece role `bank`, not the material and not the piece id. A timber ramp and a timber plate keep ordinary timber and the 18 dB curve, trim 1, no strike colour. A metal ramp or plate stays on the B curve. C–F still retimbre every timber piece, which is what those variants were. The bank selector applies to a bank whose material switch says metal as well: H replaces that bank's timbre. Degree still chooses the note.

After the fix the same shot gives the bank `timberTunedLong` at trim 1.36, and the timber ramp and plate `timber`. A full-strength timber ramp renders at −5.22 dBFS, the same peak as ordinary timber under PR #55. The bank stays at −6.29 dBFS.

### What "consistent" means when the bank voice changes

Physical events do not change. Samples, contact times, notes, and the stored gain stay put. A kept line stores the PR #55 gain and does not store the selected voice or the face speed. Replay inverts that gain (the inverse is within a fraction of an ulp; replayed gain matches the live gain inside 1e-9) and plays whatever variant is selected at that moment.

So a line kept while H is selected, then heard after switching to A, plays as A. A line kept under A, then heard under H, plays as H. The kept record is not rewritten. Live play, Replay last shot, and Hear recorded sounds use that same rule. The note timeline is the contact order and the gaps; switching voice does not change it.

Checked on the all-timber shot above, on graze-85 (bank only, face 2.0927 m/s at 0.8167 s), on square-055 (bank only, face 25.8245 m/s at 0.6917 s), and on opening-aim-24 with both ramp hits forced to timber. Those two ramp hits stay two notes, and neither takes the bank voice. Thirty replay cycles that release before each play leave no active voice nodes.

### Headroom

The world limit is 12 pieces (`WORLDCRAFT_LIMITS.objects`). Musical Workshop's allowance is still one ramp, one bank, and one plate. The earlier −1.9 dBFS pile-up was three notes about 10–20 ms apart. It was not twelve notes, and it was not a simultaneous sum.

Chrome `OfflineAudioContext` float peaks, before the WAV clamp, variant H:

| Case | Before | After |
|---|---|---|
| One full-strength bank | −6.29 dBFS | −6.29 dBFS |
| Graze, face 2.0927 m/s | −17.63 | −17.63 |
| Full-strength timber ramp | −6.29 (bank voice) | −5.22 (ordinary timber) |
| Bank, metal ramp, metal plate, 20 ms apart | −2.41 | −2.41 |
| Those three at the same instant | +3.22, 21 samples over full scale | −1.00, none over |
| 12 notes at once (1 bank, 6 timber ramps, 5 metal plates) | +15.26, 813 samples over | −1.00, none over |
| 12 banks at once | +15.29, 826 samples over | −1.00, none over |
| Real all-timber early-plate phrase | — | −10.48 |

The mix bus is linear at and below 0.85 (−1.41 dBFS) and a tanh approach to −1 dBFS above that. A graze and a square hit on one bank stay −17.63 and −6.29, so the 11.34 dB between them is still there. Notes under the knee are not turned down to pay for the pile-up. The real early-plate phrase peaks at −10.48 dBFS (all timber) and −11.48 dBFS (metal ramp and plate). Numbers are in [appendix/music3/headroom.json](appendix/music3/headroom.json).

## Phrase construction with the three pieces

This is not a judgement of musical quality. It is what the existing trio actually does.

The search of 300 legal shots (seed `20261025`, [appendix/music/search.json](appendix/music/search.json)) produced these contact orders: D4→E4 (20), D4→C4→E4 (3), C4→D4→E4 (1), E4 (one of the single-plate lines), D4→D4 (3), C4→D4 (40), D4→C4 (39), C4 (24). A three-note line is rare. The player cannot add a fourth resonant piece: the workshop allowance is one of each, and a block does not ring.

The one C4→D4→E4 line (`early-plate-14`) is bank (0, 16, yaw 80°), ramp (−8, 40), plate (−24, 58), the fixed-shot aim. Re-fired here with `normal-speed`:

| Note | Role | Time | Gap | Face speed |
|---|---|---|---|---|
| C4 | bank, timber | 0.225 s | — | 4.3602 m/s |
| D4 | ramp | 1.4333 s | 1.208 s | 16.4137 m/s |
| E4 | plate | 4.2417 s | 2.808 s | 15.1925 m/s |

First ground ends it. The gaps are the flight, not a grid. The opening C is a light contact, so under H it is still quieter than the D and the E. Retuning the ramp and plate to timber does not move the ball.

`late-catch-4`, re-fired on the same dynamics, is the other three-note order: D4 at 1.4167 s (face 16.3782 m/s), C4 at 4.1417 s (face 16.7839 m/s), E4 at 6.8000 s (face 3.5771 m/s). The closing plate is a light contact. The repeated ramp (`opening-aim-24`, from the earlier search record) hits D4 at 2.0083 s and again at 4.8083 s. Same note, 2.800 s apart, because the ball came back, not because a duration was chosen.

What the player can do on purpose is limited to moving the three pieces and the shot until one of these orders shows up, then keeping it. What they cannot do is pick a duration, a pulse, or a fourth note. The impact line and the timeline report the order the shot made. They do not help the player construct one.

One small next experiment, and only this: sit on the known `early-plate-14` layout with the bank left on H, and change only aim and power, and see whether that same C→D→E order can be found again on purpose. No new piece, no new mode, no new voice. This follow-up did not run that sitting.

## A metal bank stays metal

The earlier note that H replaces a bank even when its material switch says metal is no longer the rule. H (`tuned-even`) applies only when the role is `bank` and the material is `timber`: voice `timberTunedLong`, trim ×1.36, 12 dB range. A metal bank keeps the ordinary metal voice, trim 1, and the 18 dB curve, the same curve a metal ramp or plate already used. A timber ramp and a timber plate stay ordinary timber. G and I use that same timber-bank gate. C–F are unchanged: they still retimbre every timber piece, and a metal piece, including a metal bank, stays metal. The selector and the default stay H. Degree still chooses the note.
