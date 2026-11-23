# Recorded contact pairs — Lane C2

## Decision

Preserve a small playable **audio-only listener**, `/lab/playability-loops`. It is
independent of the finite physical repeater. It reuses Worldcraft's real kept-line
format and resonance synthesis, and creates no scene, projectile or physics body.
Two captured flights have enough differing event timing to make a useful
comparison possible. Human enjoyment and musical usefulness remain owner
questions. This is not a sequencer proposal or evidence for multi-ball physics.

The interesting distinction is that a fragile discovered phrase can become
reliable recorded material. Replaying it does not repair its fragile physical
geometry or make the shot easier to discover.

## Source and scope

Lane branch: `research/playability-loops-20261122`.
Exact base: `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054` (PR #81).
The final lane SHA is recorded in the director's repository handoff. Existing
Theatre, Cistern, Guest Stone, Worldcraft implementation, voices and historical
shelves are unchanged. This lane adds new modules and one isolated route.

`public/playability/loops-examples.json` contains two **full, newly measured**
Worldcraft kept lines, including exact source world identity/build, launch,
physical path, evidence, contact ledger, ending and recorded resonance attacks.
They reuse two earlier Musical Workshop layouts; their original numerical
setups are deliberately kept out of the invitation. The capture script records
source-file hashes in `loops-evidence.json` and the tests independently re-fire
both source arrangements through the unchanged runtime.

Run:

```sh
node scripts/playability/loops-capture.mjs
node --test tests/playability-loops.test.mjs
```

The examples were captured from the exact PR #81 base; reproducing the capture
later changes the build provenance to the executing checkout's SHA, as intended.
The JSON comparison for repeated physical runs is exact for contact ledger,
terminal and resonance. A separate focused test reproduces the bundled path and
all sound-event fields exactly. This is same-runtime reproducibility, not a
cross-platform bit-identity promise.

## What the listener actually does

- Choose two full recorded lines: bundled examples, valid resonant Keeps in this
  preview's existing Worldcraft shelf, or a Worldcraft memory export from another
  preview origin. Import never writes to Worldcraft's shelf.
- Use A and B alone or together. Their gain stays at the same 0.45 trim when solo
  or combined, so solo does not silently become louder.
- The common cycle rounds the longer recorded flight plus at least 0.5 seconds
  of silence up to the next half second. Every attack retains its original
  elapsed physical time. There is no beat snapping, stretching or contact editing.
- Optionally start B half a common cycle later. Its full last pass is retained;
  the delayed end is not cut off to fit the other layer.
- One Start plays up to eight passes (at most 120 seconds of common-cycle starts)
  and then closes the context after the final voice tail. Long imported flights
  automatically use fewer passes. Start/Stop are explicit.
- Save pair stores both immutable source records and the entrance choice under
  a separate key. Download pair carries them between origins. Loading, importing,
  selecting, resetting or restoring a pair stays silent. Invalid saved bytes are
  preserved and disable overwrite; download remains available.

This listener uses the original Worldcraft timber/metal/thunk voices and the
saved gains. A legacy kept line does **not** contain the later live bank-voice
variant. Consequently this is not guaranteed to reproduce the exact timbre the
owner selected when originally hearing a line. That limitation is disclosed in
the source details. No tuning or physics coefficient is accepted from a new
world-import privilege.

## Evidence and useful negatives

Numerical solutions and event timings are in `loops-solutions.md`, raw evidence
in `loops-evidence.json`, and full actual recordings in the public fixture.

Both examples contain three distinct attacks separated by substantial free
flight. They are not chords within a single flight. When their launches are
aligned, two middle attacks nearly coincide; the half-cycle entrance spreads
them into a different recurring relationship. This timing change is an explicit
audio arrangement choice, not a different physical result.

The shorter source retains its complete phrase in five of six immediate control
neighbors. The longer source loses its final grazing catch in **all six** nearby
control changes. That source is a poor robust physical challenge, but a credible
example of why someone might preserve one discovered line. A one-percentage-point
power increase reduces it to just one note. The loop should not conceal that
negative result in the physics packet.

Removing the source geometry produces zero resonant attacks in both controls.
The loops do not manufacture an attack on ground contact. Each kept attack comes
from the existing Worldcraft resonance ear, which collapses continuous solver
callbacks with the established five-frame contact hold. All selected attacks
have two callbacks; the original callback counts and timestamps remain intact.

## Integrity, resource costs and checks

The audio page adds **zero static or dynamic Havok bodies, zero 3D meshes/draw
calls, and zero shadow casters**. Its timing diagrams are two SVGs. It does not
load Babylon/Havok to listen. The two source records together are about 54.5 KB;
raw neighboring evidence is about 29.1 KB. Those are text, not binary archives.

The scheduler uses a 25 ms lookahead timer and the audio clock, scheduling at most
150 ms ahead. It never silently batches a delayed series of old attacks: an
observed scheduling delay over 0.5 seconds stops and asks for an explicit restart.
Audio suspension/interruption similarly stops. Stop, mute, page hiding, pagehide
and unmount retire already scheduled source nodes, not just future timer calls.
Stop closes the context, including the shared mix/gain graph. Each new Start
creates a fresh context after an explicit gesture. An unresolved resume cannot
revive a stopped context.

Imports remain bounded by the existing 32 recorded sounds per line and file
limits. Additionally, the finite combined schedule rejects more than 24 attacks
inside a 2.1-second voice window (at most 120 oscillator/noise source nodes for
these fixed voices), with an explicit explanation. It does not delete imported
notes to satisfy that limit. The shared Worldcraft mix limiter remains active. The example pair schedules
48 attacks / 224 oscillator-or-noise sources across eight passes. The modeled
voice-envelope plus lookahead overlap is ten sources with aligned entrances and
eight with the offset; gain/mix AudioNodes are additional, so these are not total
audio graph counts or heap measurements.
At most one replacement import batch is retained in the selector; past batches
do not accumulate without bound.

Source validation requires an existing id/timestamp, exact expected line fields,
the full validated world snapshot, chronological timestamped path with matching
launch/terminal, and sound metadata/time ranges corresponding to source-world
voices and actual contact-ledger entries. These checks establish internal
consistency, **not cryptographic authenticity of user-imported history**. This
page does not run arbitrary imported records through Havok. The bundled records
are separately authenticated by executable reproduction tests.

Focused checks cover actual source re-firing; rejected altered identity/path/
contact metadata; preservation of malformed stored data; exact cycle timing;
late final B events; dense-input refusal; asynchronous resume cancellation;
per-layer immediate mute; scheduler failure; external suspension; and twelve
successive start/stop/dispose cycles with no tracked source/context/timer left.
TypeScript and focused lint are run before lane handoff. Integrated build/full
suite and browser measurements belong to the director's verification packet.

`?qa=1` exposes an explicit diagnostic button that renders two passes through the
actual shared `scheduleImpact` and a browser `OfflineAudioContext`, reporting
floating-point peak/RMS, source count, duration and render time for A/B/both with
and without the entrance delay. It does not play audio or advance physics. If
that measurement is unavailable, do not claim it was run. Neither mock cleanup
nor offline audio proves real-device frame time, auditory comfort or enjoyment.

## Cost to promote

Proof: two rerunnable source recordings and exact contact-clock scheduling.
Playable prototype: import provenance, two source selectors, solo/mute, finite
transport, bounded state and reliable cleanup; this is the larger part of the
work. Generic author support: **defer**. Existing Worldcraft Keeps already supply
the useful input. Adding arbitrary event editing, instrument banks or general
sequencing would answer a different question. A useful next signal is an owner
voluntarily importing a new physical line to replace one of the examples.
