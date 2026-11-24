# Counterline — live physical play beside a recorded phrase

Counterline makes a kept physical line available **during the next real shot**.
It is a new activity using existing Musical Workshop architecture, not another
musical world or a second simulated projectile. `/lab/places-counterline` starts
in Solo; Keep a phrase, select it as companion, then fire manually. The companion
plays once. Original Worldcraft and Contact Loops remain unchanged and linked.

## Authority and independent scope

- Branch: `research/places-counterline-20261123`.
- Exact base: `ddeed5b688ae8c15166c42a0302bf768bb11be70` / PR #82.
- First functional checkpoint: `2101aa9c35ec821139c89137f65eaf77cb6f87ce`.
- Measured runtime: `ec510f6e77274f7b09b9988095e46c8f1e98d4a2`.
- Raw source hashes, physics, grid, sensitivity and resources: `evidence.json`.
- Final published candidate, draft PR and pinned preview: director publication
  packet / PR body. Local and published Git commits may differ in metadata; their
  exact trees must be checked before representing them as equivalent.

This lane adds only new files. It changes no prior route, physics module, world
identity, Foundry schema, sound synthesis, scoring, recognition or historical
shelf. The early-plate arrangement is **the existing Musical Workshop study from
Contact Loops example A**, with identical world bytes. Original Musical Workshop
is a selectable physical control. Two bundled histories remain separately
identified examples; a player can instead use their own new Keep, an existing
Worldcraft Keep on this origin, or a validated exported history.

## Physical and acoustic authority

The sole active projectile is `createWorldcraftRuntime`'s actual Havok body.
Mass 1.5 kg, radius .43 m, gravity 12 m/s², charge mapping and first-ground ending
are unchanged. The new route manually advances the established
`beforeStep → physics._step(1/120) → afterStep` sequence and disables automatic
physics advancement during `Scene.render()`, preventing a second step.

After an explicit Fire gesture, Web Audio must finish unlocking before the shot
commits. Audio-context time establishes physical time zero. The integral step
budget preserves every due 120 Hz tick. Only rendering partitions change. Live
collision callbacks go to the normal Worldcraft resonance ear and contact
ledger; only then are acoustic copies sent to Counterline. Historical events go
directly to an isolated audio scheduler. They have no path back to the runtime,
its resonance history, terminal recognition, trajectory or saved live line.

Both audible contributions use `audioOrigin = physicalOrigin + 0.100 s`. A live
collision therefore has scheduling headroom even when detected near a render
boundary. Contact times are not rounded to music beats. The same exact recorded
pitch, gain and elapsed timestamp are used by both live and history, with a
fixed 0.45 layer trim and the shared Worldcraft mix limiter. This first version
uses **canonical timber/metal/thunk voices**, not selectable later bank variants.
Legacy histories never captured every live voice selection; UI source details
state that their original timbre is not guaranteed. New pairing settings
explicitly name `canonical-resonance-v1`.

The common delay is a real tradeoff: sound follows the visible physical contact
by about 100 ms, plus output-device latency. Headless scheduling fixtures show
why a tiny buffer is fragile: 20 ms runs out of headroom in the sampled 30 Hz
partition; 50 ms runs out by 23.333 ms in the mixed partition containing a 70 ms
frame; 100 ms retains 26.667 ms of headroom there. These are controlled frame
partitions, not measured browser frame rates. Whether the resulting sound feels
attached to the ball remains an owner question. Do not infer that 100 ms is an
ideal final latency from these results.

If more than 12 physical ticks are overdue, the audio timer is delayed over
120 ms, the context suspends, or a note misses its audio deadline by over 8 ms,
the pairing stops explicitly. It never drops physical time or turns overdue
notes into an undisclosed burst. Failure during a collision callback queues
physical interruption until `_step` and `afterStep` have returned; it does not
dispose Havok bodies reentrantly.

## Physical results and accessibility

`tests/counterline.test.mjs` compares actual Havok path samples, contact ledger,
terminal result and recorded performance against Solo. They are exactly equal
under 15, 30, 60 and 144 Hz render partitions and a mixed partition. A separately
scheduled companion is present in those tests; the live record still contains
only its own three acoustic attacks. This is same-runtime reproducibility, not
a promise of bit identity across all machines.

The early-plate opening produces three separated contacts and ends after
5.566667 s. Six of eight ordinary neighboring changes preserve all three notes;
seven of eight retain at least two. The original arrangement gives two notes,
preserved in seven of eight neighbors. Removing the pieces produces no resonant
notes. Exact settings, contacts and failures belong in `SOLUTIONS.md`.

A deliberately coarse 100-setup grid per arrangement exposes a limitation:

| Existing arrangement | Silent | One note | Two notes | Three or more |
| --- | ---: | ---: | ---: | ---: |
| Early plate study | 70 | 26 | 3 | 1 |
| Original Musical Workshop | 90 | 9 | 1 | 0 |

These are sampled setup outcomes, **not player hit rates or play frequency**.
The arrangements provide approachable openings and meaningful nearby variations,
but do not make the whole aiming space musically useful. The first companion
study should establish whether a short remembered phrase gives local variation
new purpose. It does not establish a broad musical instrument or justify a new
universal authoring feature. A dedicated layout is deferred until owner play
shows which contrasting entries, rests or registers are actually wanted.

## Memory and lifecycle

Four new physical Keeps use the existing validated Worldcraft line format in a
separate namespaced shelf. Prior shelves are read-only sources. Full shelves
require explicit removal; failed serialization produces a visible recovery
message rather than silently truncating a history. The new pair format stores
both complete immutable source snapshots and explicit voice/gain/mute/delay
settings. It is not one physical record. Imports require validated provenance,
path/terminal agreement and contact-backed notes, with bounded sizes. Conflicting
source IDs with different physical bytes are refused. These checks establish
internal consistency, not cryptographic authenticity of arbitrary user imports.

Save pairing is available for a completed resonant new line with a companion.
Changing a mute during the performance cancels already scheduled voices for
that contribution, but disables saving that audition as a fixed arrangement;
the UI explains that both individual physical lines remain Keepable. Thus a
saved initial mask never falsely claims to describe mid-flight mute changes.

Natural live completion leaves a longer companion and its tails running; a
short companion does not stop the live shot. Canonical maximum tails fit the
2.1 s cleanup allowance. Stop, Retry, next launch, companion/world changes,
focus loss, page hiding and unmount stop obsolete audio. Restore, reload, import
and saved-pair selection remain silent. An unresolved context resume or file
read cannot revive a superseded run. No context, timer or tracked sound source
survives the repeated cleanup tests. A shared 24 overlapping-attack budget stops
a pathological dense combination explicitly rather than silently omitting notes.

## Costs and verification

Both arrangements use 5 static physics bodies and one dynamic projectile while
active; accompaniment adds **zero physics bodies**. The instrumented rendered
scene resources (NullEngine construction, not GPU rendering) are identical for
the two controls: 17 ready meshes / 22 active meshes (20 enabled/visible),
4,362 ready / 8,156 active triangles, 9 materials, and 9 ready / 11 active shadow
casters. The route additionally owns one nonphysical aiming line and, after a
shot, one recorded trajectory line. Counts are allocations, not measured draw
calls. Actual draw calls and rendered frame times require WebGL.

Measured world runtime construction was 3.645 ms early-plate and 2.188 ms original
in this one warmed NullEngine run. Ten rebuild/fire/reset cycles per arrangement
returned to 5 bodies, 17 meshes and 9 materials each time. CPU cycle times ranged
8.138–53.984 ms and 9.823–84.125 ms respectively, including an entire accelerated
headless flight; isolated outliers are retained. No frame-rate inference is made.
Runtime disposal left zero physics bodies; full scene disposal left zero bodies,
meshes and materials. Browser heap/physical-phone performance are unmeasured.

Twelve focused tests, TypeScript and targeted lint pass with no new warnings.
Tests include exact physical partition comparison, pair tampering, source-ID
collision, natural completion in both orders, asynchronous resume cancellation,
mutes, long stalls, missed deadlines, suspension, scheduling exceptions, dense
voice refusal, 12 successive start/stop/dispose cycles, and QA cancellation when a
hidden browser delivers no further animation frame. Full build, full
repository suite, Foundry checks and hosted browser results are recorded by the
director for the integrated candidate.

`?qa=1` exposes two explicit audio measurements that work even without WebGL:
actual OfflineAudioContext rendering and an actual AudioContext/rAF probe that
delivers **recorded notifications**, not live Havok collisions. The director has
run both: the combined offline sample peak was about .165815; the recorded clock
probe scheduled all six attacks at their exact common targets with no late
notes, a 33.4 ms maximum observed frame interval, and zero remaining sources.
Raw browser evidence and environment details belong in the director packet.
These results establish browser audio scheduling, not rendered live-shot feel.

## Owner decision gate

The first question is whether hearing a retained phrase changes the next action
from “make another contact” to a specific musical intention. Compare Solo,
companion-only mute, and both together. Note whether the delayed sound feels
connected to the collision and whether interruptions are too sensitive on the
actual device. Enjoyment and compositional usefulness require that play evidence.
Do not expand to more tracks, quantization, offsets or a new musical world yet.
