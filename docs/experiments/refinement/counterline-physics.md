# Counterline repertoire — physical evidence

The two registered Foundry worlds offer substantially more musical material on the same sampled controls than the two small Workshop arrangements. Their character differs: Descending Resonance favors separated impacts between facing and raised surfaces; Chime Terraces offers more combinations and frequent close clusters. These results support giving Counterline a fairer owner playtest. They do not establish that any duet sounds pleasing.

## Authority and method

Starting authority is PR #84, `8b02b8ceab95f28383f607cc4e891fe7e31dfc7a`. `scripts/refinement/counterline-measure.mjs` imports `foundryRecord()` and reads the validated original world, preset, presentation and opening. It neither copies nor edits world documents. Measured implementation is `2144bc84b45602e1e720dadbde13c1389c2e47fb`. The exact measurement source SHA and file SHA-256 values are in `counterline-evidence.json`; its acoustic capture module is additive, while physical runtime/scene/Foundry inputs match the starting candidate. The parent lane report records its final implementation SHA.

Measurements use actual Havok with Babylon NullEngine, the incumbent 120 Hz step, 1.5 kg projectile, .43 m radius, gravity 12 m/s², normal-speed resonance and unchanged first-ground termination. Seed 20261114 is provenance and is not applied to the solver. Raw sounding means gain > 0, matching the historical comparison. Consecutive sounding impacts at most 150 ms apart are grouped into one onset event. This grouping is analysis only: no contact times are quantized or edited for playback.

The matched 100-shot grid is the original Counterline comparison domain. The richer worlds also repeat the exact historical 875-shot domain. Numerical domains, representative successes, near-silence, misses and eight ordinary neighboring controls are retained in the raw evidence and separate `counterline-solutions.md`. These grids describe sampled settings, not player frequency or human success rates.

## Matched opportunity

| World | Silent / 100 | 1–2 onset events | 3+ onset events | Distinct raw pitch phrases | Sounding pieces reached |
| --- | ---: | ---: | ---: | ---: | ---: |
| Descending Resonance | 30 | 54 | 16 | 30 | 12 / 12 |
| Chime Terraces | 25 | 39 | 36 | 54 | 21 / 21 |
| Early-plate Workshop | 70 | 29 | 1 | 6 | 3 / 3 |
| Original Workshop | 90 | 10 | 0 | 5 | 3 / 3 |

All five assigned pentatonic pitches occur in each richer world. On this matched sample, Descending has no grouped-onset shot; Terraces has 20. Thus the gain is not just a larger maximum contact count: players can reach more pieces and contrasting pitch sequences, including single strikes, separated phrases and clusters. There are still silent regions; both worlds' high-angle outer regions are substantially less active than their lower central regions. No matched shot lasts longer than 15 seconds; the longest is 7.333 seconds in Descending and 6.158 seconds in Terraces.

The original Descending opening remains a stable single strike, not an introductory three-note phrase. Its already-authored `descent` and `west-descent` manifest shots each produce three separated notes and preserve the same three-piece family under all six aim/power neighbors and both half-meter origin neighbors. They are good explicit entry choices. By contrast, one longer Descending crown line loses its third note on all six aim/power neighbors; it is retained as a fragile result, not the recommended arrival.

Terraces' original opening produces two simultaneous notes. Neighboring yaw and origin changes split that into one note; this is a real and useful chord/single-strike distinction. Its existing `centre-climb` manifest line yields four notes in three events, and all eight neighbors retain at least three events while sometimes changing the visited pieces. Its `east-walk` line gives a close pair followed by a later strike; small changes vary that cluster and continuation.

## Historical comparison and an inherited replay limit

Chime Terraces reproduces all 875 historical reduced rows exactly: 159 silent setups and 211 with three or more separated onset events. The source world, pitches, capacity 24 and 21 pieces are unchanged.

Freshly constructing Descending Resonance gives 220 silent setups, 168 raw 3+ lines and 165 separated-event 3+ lines. The historical report lists 220, 166 and 164. **860 of 875 reduced rows match exactly.** This is not concealed as an improved score or a musical integration change.

The historical comparison reused one physics scene across Terraces, Fan and Garden before loading Descending. Repeating that construction history with the same current modules reproduces **all 875 archived Descending rows**, including 166 raw / 164 separated 3+ counts. A repeated fresh construction exactly reproduces the fresh result. Loading Terraces alone before Descending does not change it. The construction sequence affects a small set of shared-contact arrangements; the specific lower-level Havok ordering mechanism is not isolated here.

Some differences are effectively inaudible extra ledger contacts. One shared-ramp case, however, changes subsequent surfaces and its landing by roughly ten meters. Full differing contact/timing/terminal examples are preserved in the evidence and appendix. The selected central descent is byte-identical across these measured construction histories, including its sampled-path hash. Its west counterpart and local neighborhoods remain useful evidence, but no universal cross-world-switch bit-exact replay claim is made. No solver, collision seam or physical document was modified to force agreement with archived counts.

## Authored sound versus raw contact counting

Descending opts into face-speed dynamics and the H tuned-even timber-bank voice. Terraces opts into face speed with canonical metal and timber. The raw historical survey intentionally counts every gain > 0; an extremely small positive solver value is still counted. The actual H mapping gates sub-threshold strikes, so the fresh Descending 875 sample has 223 silent voiced performances and 164 with three or more voiced onset events. This is the authored acoustic interpretation, not a change to physics or a face-speed reinterpretation of historical unknown-dynamics Keeps.

The largest voiced attack window in this sampled domain is 5 attacks within 2.4 seconds for Descending, 10 for Terraces. Any pairing of two sampled broad-grid lines is therefore bounded by 20 attacks in that interval, below Counterline's 24-attack safeguard. This does not certify arbitrary imported histories or every unsampled launch. The parent audio tests exercise the actual scheduling/lifecycle behavior.

Four small, contact-backed public recordings are generated for browser audio QA: two existing Descending descents and Terraces' centre-climb/east-walk. They contain independent Worldcraft v1 lines and additive captured acoustic profiles. They are actual histories, not trajectories synthesized for the audio demonstration.

## Resources and cleanup

| World | Ready static bodies | Active dynamic bodies | Ready / active meshes | Ready / active shadow casters | Materials |
| --- | ---: | ---: | ---: | ---: | ---: |
| Descending | 14 | 1 | 32 / 37 | 18 / 20 | 15 |
| Terraces | 23 | 1 | 53 / 58 | 27 / 29 | 27 |
| Either Workshop | 5 | 1 | 17 / 22 | 9 / 11 | 9 |

The static count includes the tee and terminal ground. Accompaniment creates zero physics bodies. Mesh/submesh allocations are not rendered draw calls. The route separately owns its aim/trail lines. Exact build, rebuild, reset and whole accelerated-flight CPU timings are retained in the resource rows; they are NullEngine timings, not frame-rate evidence.


| World | Initial construction ms | Median switch ms | Median reset ms | Median full CPU cycle ms |
| --- | ---: | ---: | ---: | ---: |
| descending-resonance | 4.571 | 2.633 | 0.027 | 6.175 |
| chime-terraces | 4.919 | 5.360 | 0.030 | 9.819 |
| early-plate | 0.865 | 1.391 | 0.028 | 7.544 |
| original-workshop | 0.694 | 0.877 | 0.030 | 8.320 |

A full CPU cycle includes building the world, an entire accelerated headless flight and clear. It is not a rendered frame. Rebuild medians use twelve observations for each rich world and eight for each Workshop in the mixed-world cycles.

Forty measured load/fire/reset cycles switch among all four worlds. Every return to each world has the same body/mesh/material counts, with one projectile during a shot and none after clear. All four runtime disposals leave zero physics bodies; full scene disposal leaves zero bodies, meshes and materials. GPU frames, browser heap and physical-phone cost remain browser/owner verification questions.
