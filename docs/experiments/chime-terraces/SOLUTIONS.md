# Chime Terraces — recorded aims

Appendix to `COMPARISON.md`. Seed `20261114` is provenance. It is not applied to the solver. Origin is 0 and the rail index is 1 on every shot. Dynamics are face speed (`normal-speed`).

Family, raw length, and audible length are the unified definitions: a family is the first three distinct sounding pieces after immediate repeats collapse, raw length counts sounding notes, and audible length merges onsets within 150 ms of the previous note.

The lab page played every shot below on the merged build. The terminal matched the manifest with `Object.is` on elapsed time and position. The note sequence matched. The contact list matched. The same check passed for the Descending Resonance and Ricochet Loop starters. `raw/browser.json` is that record. Terminals and contact bodies live in each world's `manifest.json`.

## Chime Terraces

Plates are ordinary metal. Ramps are ordinary timber. There is no timber-bank voice. Every plate tilts −15°.

| Row | x = −10, −6, −2, 2, 6, 10 |
| --- | --- |
| High, lift 10 m, z = 34 | A4, G4, A4, G4, G4, E4 |
| Mid, lift 6 m, z = 29 | E4, D4, G4, E4, E4, D4 |
| Low, lift 2 m, z = 24 | C4, C4, D4, C4, D4, C4 |
| Ramps, z = 16 | C4 at x = −11, E4 at x = 0, D4 at x = 11 |

| Id | Yaw | Elev | Charge | Family | Raw | Audible | Sequence |
| --- | ---: | ---: | ---: | --- | ---: | ---: | --- |
| opening | 0 | 18 | 0.55 | short:low-2>low-3 | 2 | 1 | low-2 D4 and low-3 C4 together |
| centre-climb | 0 | 8 | 0.55 | ramp-c>high-2>high-3 | 4 | 3 | ramp-c E4, then high-2 A4 and high-3 G4 together, then mid-3 E4 |
| centre-drop | 0 | 20 | 0.55 | mid-2>mid-3>low-3 | 3 | 2 | mid-2 G4 and mid-3 E4 together, then low-3 C4 |
| west-climb | −14 | 8 | 0.55 | ramp-c>high-0>mid-0 | 5 | 5 | ramp-c E4, high-0 A4, mid-0 E4, high-0 A4, mid-0 E4 |
| east-climb | 8 | 16 | 0.45 | ramp-c>high-4>mid-4 | 3 | 3 | ramp-c E4, high-4 G4, mid-4 E4 |
| east-walk | 8 | 20 | 0.65 | mid-3>mid-4>low-4 | 3 | 2 | mid-3 E4 and mid-4 E4 together, then low-4 D4 |
| near-miss | −24 | 12 | 0.35 | short:ramp-w | 1 | 1 | ramp-w C4 |

`opening` is the printed aim. It leaves the yard. `near-miss` is one timber knock. `centre-drop` and `east-walk` are chords followed by one later note, so the audible length is 2. `west-climb` is the busiest resting starter and the shot the frame pass flew.

The rendered neighbour of `centre-climb` is charge 0.54. The family stays `ramp-c>high-2>high-3`. The sequence continues: high-3 G4, mid-3 E4, ramp-c E4. Raw 7, audible 6. High-2 and high-3 still speak together, and the line returns to the ramp. Peak 0.410, RMS 0.024. The harness's highest-scoring one-step neighbour is a different step, elevation 7.5, which adds one more ramp-c E4 (raw 5, audible 4) and keeps the same family.

## Chime Fan

Timber banks use the H voice (`tuned-even`). Metal plates and the far chimes stay ordinary metal.

| Id | Yaw | Elev | Charge | Family | Raw | Audible | Sequence |
| --- | ---: | ---: | ---: | --- | ---: | ---: | --- |
| opening | 0 | 18 | 0.55 | short:bank-c | 1 | 1 | bank-c C4 |
| west | −16 | 24 | 0.55 | plate-w-inner>bank-w>chime-w | 5 | 5 | plate-w-inner E4, bank-w G4, chime-w A4, bank-w G4, chime-w A4 |
| west-long | −16 | 20 | 0.65 | plate-w-inner>bank-w>chime-w | 6 | 5 | the west line, then one more bank-w G4. The first two notes sit inside 150 ms |
| centre | 0 | 24 | 0.55 | plate-c-mid>bank-c>chime-c | 5 | 5 | plate-c-mid G4, bank-c C4, chime-c D4, bank-c C4, chime-c D4 |
| east | 16 | 24 | 0.55 | plate-e-inner>bank-e>chime-e | 5 | 5 | plate-e-inner G4, bank-e D4, chime-e E4, bank-e D4, chime-e E4 |
| shoulder | −28 | 24 | 0.55 | short:plate-w-outer>bank-w | 2 | 2 | plate-w-outer C4, bank-w G4 |

`shoulder` is outside the broad grid. It is the outer plate and the west bank, without the far chime. `west-long` is the busiest resting starter.

The rendered neighbour of `west` is elevation 24.5. The family stays. The sequence adds one more bank-w G4 (raw 6, audible 6). Peak 0.389, RMS 0.043. That is the harness's highest-scoring one-step neighbour for this world.

Tails, which stay while the entry plate changes inside a slot:

- west: bank-w G4, then chime-w A4
- centre: bank-c C4, then chime-c D4
- east: bank-e D4, then chime-e E4

## Chime Garden

Timber banks use the same H voice. Plates stay metal.

| Id | Yaw | Elev | Charge | Family | Raw | Audible | Sequence |
| --- | ---: | ---: | ---: | --- | ---: | ---: | --- |
| centre | 0 | 12 | 0.55 | bank-c>c1>c2 | 3 | 3 | bank-c C4, c1 E4, c2 A4 |
| left | −14 | 12 | 0.55 | bank-l>l1>l2 | 3 | 3 | bank-l D4, l1 C4, l2 G4 |
| right | 18 | 12 | 0.55 | bank-r>r1>r2 | 3 | 2 | bank-r A4, then r1 D4 and r2 E4 together |
| near-miss | 0 | 16 | 0.55 | short:bank-c>c1 | 2 | 2 | bank-c C4, c1 E4, then the tee |
| left-reverse | −22 | 8 | 0.65 | l2>l1>bank-l | 4 | 4 | l2 G4, l1 C4, bank-l D4, l2 G4 |
| right-leak | 16 | 8 | 0.8 | bank-r>r2>c2 | 3 | 2 | bank-r A4 and r2 E4 together, then c2 A4 |

`left-reverse` is the busiest resting starter. `right` is a three-piece family whose last two notes are one event, so the audible length is 2. The harness's highest-scoring neighbour of `right` is elevation 12.5, which adds a later bank-r A4 and keeps the family (raw 4, audible 3).

The rendered pair is `right-leak` and elevation 7.5. The family stays `bank-r>r2>c2`. The neighbour adds bank-c C4, and that C4 lands 84 ms after c2, so it joins the second event. Raw 4, audible 2. The new piece is inside the chord. Peak 0.509, RMS 0.058.

On the 875-shot grid, under this harness: the centre family is the top raw-3+ family of the centre-low region (60% of that region's 25 raw 3+ shots), the left chain `bank-l>l1>l2` is the top of left-low (27% of 37), and `bank-r>r1>r2` is the top of right-low (25% of 24).
