# Hairpin — independent review of the original Fable instrument

**Recommendation: admit the unchanged original to the temporary exhibition.**
Its closing-gap rhythm is physically reproducible and different from a lateral
call-and-response instrument. It also supports short direct and bell phrases.
Do not treat that admission as permanent repertoire selection or as a listening
verdict. No geometry, profile, opening, camera or identity was changed.

## Authority and evidence separation

Review branch: `research/exhibition-hairpin-20261127`.
Base: `8278fee69fb1bd0c196c2d6fa258faaaaec452e6` (published PR92).
The original declares kit `3c67ceb9de1739c23092f6fdd8680b9047536a9f`.
The measured implementation is `83dd545a5f1d3145772a0712e25517620c4325c3`;
`hairpin-evidence.json` also records its exact source-file hashes. Original raw instrument SHA256:
`de676687df6375a0dac8de413ec34180a27ef230b91cbfdb20d71317702b4355`.

Fable's submitted README, 19-case validator report, 2,205-setting survey,
15,147-setting trap scan, 95 construction-history comparisons and six software
WebGL captures remain **author evidence**. This review read the actual report and
measurement script without executing the author's script. It independently ran
the repository's authoritative validator and a smaller, newly written Havok
measurement. The broad author sweeps were not rerun or presented as ours.

The instrument and probe documents pass before Havok initialization. All 19
central cases and 139 valid ordinary neighbors complete: **158 physical records**.
Thirteen requested neighbors lie outside the controls and remain rejected rather
than clamped. The seven relevant source-file hashes, validated instrument, physical
identity, profile and probe hashes match the submitted report. Every complete
physical-payload hash and path hash matches: **158/158 exact**.

Re-voiced event pieces, pitches and timestamps match throughout. Playback-gain
arrays are bit-identical in 94/158 runs; the remaining 64 differ only by final
floating-point bits, with maximum absolute gain difference
`1.1102230246251565e-16`. Both the exact result and a separate 1e-12 acoustic
comparison are retained. This is not a physical mismatch, a gain adjustment or
a relaxed physical replay test. The recorded normal-speed physical history is
included in the exact hashes.

## What is actually reproduced

The twelve fixed pieces are two timber ramps, five inclined metal lid plates
and five higher metal bell plates. The ball alternates between a legal ramp
floor and the closing lid, then can return to the apron, leave through the back
slot, or contact the upper plates. The principal family is rhythmic alternation,
not twelve unrelated targets.

| Relationship | Central measured result | Ordinary neighboring evidence |
| --- | --- | --- |
| Central closing-gap exchange | Five musical impacts, two qualified redirects | Exact piece sequence in 7/7 valid neighbors |
| Same exchange with more power | Same five notes; shorter span and larger middle gains | Exact sequence in 7/7 |
| Western longer roll | Nine central impacts between one floor and one lid | Exact full sequence 3/7; every neighbor retains that floor/lid relationship, 7–10 impacts |
| Eastern knock | Three impacts | Exact sequence 7/7 |
| Raised lid-first opening | Six impacts, lid before floor | Exact sequence 8/8 |
| Escape to a higher bell | Two impacts, floor then bell | Exact sequence 8/8 |
| Bell and lid-top answer | Five impacts in the eastern example | Exact sequence 5/8; shorter answers remain possible |
| Direct lid strike | One impact | Exact sequence 7/8; the other adds an impact |

These are related gestures, not eight new mechanics. The author correctly
separates closing-gap exchange, slot escape, upper exchange and a direct strike.
Both author-designed openings remain available and verified.

A further ordinary-control lane/power sample holds the central low approach and
uses 30%, 50%, 70% and 90% power. The same G–E–G–E–G order spans **1.400, .792,
.550 and .408 seconds** from first to last impact. This is evidence that power
can change rhythmic density while preserving a recognizable phrase. At 50%, the
five interpreted gains are approximately .327, .452, .515, .332 and .289. The
rise and fall is real but not a mathematically prescribed envelope; other lanes
are less symmetric. Musical quality still needs listening.

## Accessibility beyond selected successes

A separate 300-setting grid uses three origins, five yaws, five elevation bands
and four powers, all real control detents. Its exact domain and every compact
outcome are in the JSON appendix. It deliberately differs from the author's
larger grid and must not be read as player frequency.

| Result | Independent 300-setting sample |
| --- | ---: |
| Silent | 140 |
| One substantial impact | 33 |
| Two | 31 |
| Three or four | 62 |
| Five to eight | 34 |
| Bounds exits | 44 |
| Settled / safety timeout | 0 |
| Musical impacts exceed qualified redirects | 106 |

For this table only, gain >= .01 describes a substantial positive impact. It is
not an audibility threshold or a new playback filter. Sounding counts at elevation
bands 5°, 12°, 20°, 32° and 50° are respectively **48, 35, 39, 26 and 12 out of
60**. The lower controls are more productive, while moderate elevations still
provide distinct singles, pairs and bell encounters. The full control range is
not uniformly useful. The record does not support calling every high arc a
meaningful musical choice.

The separate 36-shot lane/power sample shows which changes choose a different
lane and which retain a repeated two-pitch relationship. The sampled grid has no
nine-note phrase, even though the selected western family does. That contrast is
useful: a long roll can be accessible nearby without dominating broad exploration.

## Negative outcomes, seams and construction history

The original negative cases reproduce. A western roll cut off by the slot becomes
two impacts. An underpowered line gives five floor-only knocks over **3.942 s**,
with gains decreasing from about .280 to .194. It is legitimate recorded rhythm
but can also be unproductive waiting. Three selected overshoot/edge cases are
silent. No result was replaced with a more favorable recipe.

The two ramps meet at a coplanar seam; adjacent lid plates also meet along edges.
Four half-degree yaw settings around the ramp crossing were independently traced
with actual collision callbacks, normals, points and whole-step incoming/outgoing
velocities. At one setting the projectile contacts both ramps at **the same
.300-second instant**, producing two distinct pitches rather than an invented
sport redirect. A later return to the western ramp can have zero gain and is
preserved as such.

The sharp lateral departures are not a smooth curved-surface effect. A contact
near a lid edge has a normal whose maximum absolute alignment with a box axis
falls to **.718**; neighboring shots can hit a different lid or lose part of the
exchange. The JSON preserves these callbacks, including their whole-step velocity
brackets. Those brackets are not isolated per-contact impulses when one physics
step contains multiple collisions. The original seam-pedal-change sequence is
exact in only 5/7 ordinary neighbors. This is a meaningful sensitivity limitation,
not evidence that the instrument needs immediate repair.

Six histories compare every original central probe with a fresh baseline:
reversed order, reference worlds played first, alternating references, one fresh
scene per shot, explicit same-world reload before each shot, and Exchange plus
Antiphonal Arc played before Hairpin. **114/114 full records remain identical**.
All nineteen fresh hashes also match the submitted construction-history baseline.
This expands the sampled histories; it does not guarantee every possible prior
world-switch sequence. Both other submissions were accepted by the data validator
for this construction-history check; their own gameplay review is separate.

## Acoustics and ensemble role

The original `normal-speed` / `tuned-even` profile is preserved. Despite the
`bankVoice` name, tuned-even applies the existing 18 dB even gain interpretation
to non-bank contacts too. Hairpin has no banks: its ramp and metal timbres remain
canonical, while soft-contact gains are lifted by that interpretation. The H
bank timbre itself is not secretly assigned to its ramps or plates. The raw
normal-speed physical gains and the interpreted playback gains are distinct.

The denser submitted neighborhoods reach ten attacks within a conservative
2.4-second voice window. Short direct strikes, pairs and three-note knocks are
also credible ensemble contributions. A long western roll should be auditioned
for whether it fills useful space or obscures another part. The independent
ensemble/audio lane owns combined attack-budget, loudness and scheduling results;
this physical review does not infer loudness from contact count or claim listening.

## Camera, rendering and resources

This review inspected the author's supplied launch-desktop and Overview-phone
captures. They show the ramp, lid and higher plates together; the side Overview
makes the gap easier to see. The dark plate undersides are visible in the provided
images and agree with the author's stated limitation. These remain supplied
software-renderer captures, not an independently rendered scene or proof of phone
performance. The author's reported follow-camera obstruction behind the lid/bells
is a reason to keep Overview easy to reach during owner play. No camera was
silently changed to improve the comparison.

Ready runtime resources reproduce **14 static bodies, 24 meshes, 17 materials**;
one live shot adds one dynamic body and mesh. The validator resets every shot
without growth and disposes to zero. The additional 26 harness sessions contain
481 launches and 27 world replacements; every reset returns to its own ready
counts, and every disposal returns counted bodies, meshes and materials to zero.
These are CPU/runtime ownership checks. Presentation, launcher/trail/shadow costs,
rendered draw calls, GPU memory, listening and physical-phone frame timing are
not measured here. The unchanged twelve-piece layout adds no new capability cost.

The independent script passes focused lint. The existing instrument and author
validator suites pass **10/10**; the director owns the final integrated TypeScript,
full lint, build and repository suite. No old test was weakened.

## Lessons retained, without inventing missing evidence

The author reports failed coarse 30° facets, converging walls without a legal
floor, a downward funnel with long diminishing rattle, a deep lid that hid the
shot, narrow slots that trapped balls, and a rear wall that produced unwanted
repetition. Those prototype files were not supplied, so the mechanisms and counts
cannot be independently replayed from this packet. Preserve the narrative as
hypotheses and design history, not as validated limits of every concave geometry.

The successful original already uses the stock vocabulary to make a distinctive
rhythmic relationship. It does not establish a compelling missing generic mesh,
concavity or synthesis capability. A future curve request should demonstrate a
specific useful departure or timing pattern that a simpler arrangement cannot
provide. Likewise, slot width exceeding ball diameter is useful clearance design,
not proof that every arbitrary launch can never settle elsewhere.

## Reproduction

Extract the unchanged Hairpin author archive to a directory, then run:

```sh
node scripts/instrument-foundry/validate.mjs /path/to/hairpin-fable-v1/instrument.json --probes /path/to/hairpin-fable-v1/probes.json --output /tmp/hairpin-validator.json
node scripts/exhibition/measure-hairpin.mjs --submission /path/to/hairpin-fable-v1 --exchange /path/to/exchange/instrument.json --arc /path/to/antiphonal-arc-v1/instrument.json
node --test tests/instrument-foundry.test.mjs tests/instrument-author-validator.test.mjs
```

The source and raw file hashes, original/proposed identity, exact control settings,
ordinary neighbors, sampled negatives, seam callbacks, history comparisons and
resource results live in `hairpin-evidence.json`. Numerical material stays outside
the ordinary owner invitation.
