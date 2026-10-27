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
