# Reference instruments: physical families and accessible variation

Descending Resonance and Chime Terraces remain the two original registered
physical worlds. The new instrument wrappers preserve their exact **ordered**
world documents, original and curated starts, pitches and acoustic profiles.
They add an authoring envelope, not a new physics implementation or an edited
version of either instrument. Their usefulness now also has the owner's genuine
ensemble-play evidence; the measurements below explain possibilities without
substituting for that experience.

## Authority and comparison

Foundation: `10b09baafc9d85eef0d87a630b55600d623dcde0`. Measured script/CLI commit:
`859762a2ba7c21a205f92ba482f304d30c65aecf`, including the pure instrument module
from author checkpoint `c0cb9af56507d9ed1e69812d2b3b124998fac7c6` (local dependency
cherry-pick `0b82a30`). Exact file hashes appear in `reference-evidence.json`.

Actual Havok uses the established 120 Hz loop, 1.5 kg / .43 m projectile and
gravity 12 m/s². The first terminal ground contact still ends the line. The two
wrappers deep-equal the original ordered Counterline worlds, profiles and opening
setups. All ten selected central physical histories also deep-equal their old
adapter controls in equivalent fresh scenes: world, setup, launch, contact ledger,
complete sampled path, recognition events, terminal and resonance history.
Identity hashing alone was not treated as replay evidence.

This does not eliminate the previously documented Descending construction-history
sensitivity: some shared-surface outcomes depend on prior body construction/order.
Equivalent initialization is the comparison here. The earlier 15/875 discrepancy
remains disclosed in `../refinement/counterline-physics.md`; new authors should
avoid coincident/shared seams and report differing initialization outcomes.

## Families, not successful-note quotas

The technical probe documents contain five candidate families per reference,
two unsuccessful cases and ordinary neighboring changes. Each central case tests
±0.5° yaw, ±0.5° elevation, ±1 percentage point power and ±0.5 m origin. Boundary
neighbors are rejected explicitly, never clamped or included as successful repeats.
A family can remain useful when the exact pitch or last receiving surface changes.

| Descending relationship | Measured neighboring behavior |
| --- | --- |
| Central raised plate → near wall → far wall | All 8 neighbors retain the exact three-piece/pitch sequence |
| Western raised plate → near wall → far wall | All 8 retain its different exact three-piece/pitch sequence |
| Low ramp → crown → returning ramp | All 7 valid neighbors retain this core; 5 continue to a near wall, with 4 retaining the exact central four-piece sequence |
| Ramp → raised plate → wall, then another answer | All 6 valid neighbors retain the initial three-region relationship; 3 repeat the plate/wall answer, 1 continues to the far wall, 2 stop after the first answer |
| Sparse direct timber strike | All 8 retain the single strike |

The two plate descents are one broad physical type with different pitches/regions;
they are not presented as two entirely new mechanics. The crown return, repeated
plate/wall exchange and sparse strike offer genuinely different ways to contribute
material. The longer repeated answer is more sensitive than its shorter core.
Both can be useful ensemble contributions.

| Terraces relationship | Measured neighboring behavior |
| --- | --- |
| Ramp → upper row → receiving region | All 8 reach the upper row after the ramp; 7 reach the middle row, while the other returns to a ramp. All retain at least 3 grouped onsets, but none repeats every exact central piece |
| Middle-row contact → lower receiver | All 8 retain the middle/lower relationship; 2 retain the exact central piece sequence. Some continue upward again |
| Displaced low ramp → middle plate → ramp/lower region | All 6 retain the first ramp/middle relationship;4 retain the central ramp/middle/ramp/lower order. Power neighbors shorten or reorder the continuation |
| Compact lower-row pair or single strike | All 8 reach the lower row. Yaw/origin neighbors split the pair into one strike; some elevation/power neighbors add a ramp |
| Western ramp → upper plate → middle receiver | All 8 retain the initial relationship; 1 retains the complete five-strike central alternation, while others give shorter answers |

For Terraces, exact whole-phrase repetition is often a poor measure of useful
variation. A nearby launch chooses a different upper plate or trades a clustered
contact for a single strike while retaining an understandable route. That is
relevant to composition through play. It is not a claim that all variations sound
good or that players will discover them unaided.

All original timings are retained. The analysis groups consecutive impacts no
more than 150 ms apart for a descriptive onset count; playback is never quantized.
A second descriptive count uses voiced gain ≥ .01 to expose negligible positive
contacts. That threshold is **not** a new audibility rule or playback filter.

## Broader sampled opportunities and negatives

A compact 135-setting sample per world includes three launch origins, five yaw
values, three elevation bands and three powers. The owner examples motivated
including displaced low-angle launches instead of sampling only the center rail.
The numerical domain is in the JSON appendix. It is not player frequency.

| World | Silent | One or two grouped onsets | Three or more grouped onsets | Musical impacts exceed qualified redirects | Bounds exits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Descending,135 setups |57|66|12|16|6|
| Terraces,135 setups |53|58|24|22|8|

Two Terraces samples contain only tiny positive gains; treating gain ≥ .01 as the
analysis floor changes its silent count from 53 to 55. We report that distinction
rather than calling every positive floating-point event a rewarding note.

Outer origins are not automatically easier. Descending's silent counts across
left/center/right origins are 25/9/23 out of 45 each; Terraces gives 19/15/19.
Nevertheless, the owner found longer low-angle routes from those outer regions,
which a center-only grid would miss. More sample coverage does not guarantee
human accessibility, and source count does not establish musical enjoyment.

The explicit low outward miss is silent and ends on ground after .592 seconds.
The high carry is also silent and reaches ground after 6.325 seconds. Both occur
in each reference; accompaniment does not turn either into a new live phrase.
No sampled grid shot exceeds 5.9 seconds. No claim is made that longer sequences
are inherently more valuable than short gestures.

## Musical authority and cost

The resonance ledger retains genuine repeated contacts independently of sport
redirect qualification. The owner's final Descending source is a concrete case:
five musical impacts, including revisits to a plate and wall, but only three
qualified redirects. The validator reports both ledgers. It does not create
sound from recognition events or artificially redirect a projectile.

| Runtime-only resources | Descending | Terraces |
| --- | ---: | ---: |
| Ready static bodies |14|23|
| Additional active live bodies |1|1|
| Ready / active meshes |20 /21|41 /42|
| Materials |13|25|
| Added by instrument wrapper |0|0|

These counts exclude presentation, launcher, trails and shadows. They are not
rendered draw-call counts. The measured initial construction times were 26.35 ms
and 13.74 ms respectively; first-use/JIT and concurrent work make these noisy CPU
observations, not a comparative frame-rate claim. Six final repeated fire/reset
cycles per reference return to ready counts, and disposal leaves zero counted
bodies, meshes and materials. All ten fresh adapter-comparison pairs also dispose.

The reusable CLI additionally executes 58 Descending and 59 Terraces shots across
their seven-case probe sets and valid neighbors. It verifies one active projectile,
exact ready counts after every reset and zero counted resources after disposal.
The two `reference-validator-*.json` reports retain every actual contact, musical
impact, qualified redirect, terminal and physical-payload hash. They contain no
invented quality score. Four author-validator tests plus six pure-envelope tests
pass 10/10; focused lint passes. The director packet owns full repository checks.

No browser-rendered image, sound listening, GPU cleanup, draw-call measurement or
physical-phone frame timing is claimed here. The unchanged reference geometry
and acoustic engine inherit previous costs; the wrapper itself adds no physics.

## Reproduction and numerical appendices

- `node scripts/instrument-foundry/reference-measure.mjs` regenerates families,
  neighbors, negatives, the compact origin survey, adapter comparisons and resource
  evidence. It does not need the owner's private file.
- Optionally add `--owner-file /absolute/path/to/ensemble.json` to validate that
  source and produce a sanitized owner summary without mutating/publishing it.
- `node scripts/instrument-foundry/validate.mjs worlds/instruments/descending-resonance/instrument.json --probes worlds/instruments/descending-resonance/probes.json --output report.json`
- Substitute `chime-terraces` for the second reference.

Successful settings live in `worlds/instruments/*/probes.json` and technical JSON,
not in the ordinary owner invitation. New authors should use these as examples
of honest evidence, not as a requirement to reproduce their architecture, pitch
sequences or contact counts.
