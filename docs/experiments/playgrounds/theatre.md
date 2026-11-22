# Two-Shadow Theatre — observation as play

## Decision and owner invitation

Preserve as a **playable visual instrument**, separate from a larger architectural
world. The interaction is composing and comparing two views of one real flight.
The stage is intentionally spare: here empty space carries information, unlike
a world whose only invitation is finding another collision.

Open `/lab/playgrounds-theatre`. Try an open flight, explore what the upright
flat does to the two views, and use the sloping rostrum for a different shape.
Keep a line that suggests another. Change one control, compare, and scrub both
views at the same recorded time. There is no score, target image or required
contact sequence.

Six voluntary Keeps are available. Restore sets the original launch and shows
its recorded history; Fire runs Havok again. Reset launch retains Keeps. Remove
is explicit; a full shelf never overwrites a line. Downloads contain exact launch,
layout/build identity, actual contacts, sampled positions and terminal results.
Malformed stored data is preserved rather than replaced; storage failure leaves
an in-memory shelf with a download warning.

## What was selected, and what changed from the proposal

Astra's original Theatre proposed physical cloth screens in a theatrical 3D
setting. This version uses two persistent orthographic SVG panes and a small
stage plan instead. **Babylon NullEngine still constructs the 3D collision bodies
and runs real Havok at the accepted 120 Hz.** SVG is the presentation of that
physical output, not a substitute ballistic model. It works without WebGL, so
projection and comparison can be tested independently of renderer availability.

The front uses `(x,y)`; the wing uses `(z,y)`. Both have the same fixed metric
scale and shared time. Framing is owner-selected, never fitted to the latest
trajectory. Wide covers 90 m of height; Low flight is a fixed alternate frame.
The current position is the latest actual sample at or before the selected time;
there is no interpolation of a made-up point or predicted path. A dashed complete
line is explicitly a previously Kept flight. The plan's short aim arrow is
labeled as aim rather than a trajectory.

Raked Court was not fused into this instrument. Its accumulated ground marks ask
for attention to distribution and repeated placement; Theatre asks for paired
silhouettes and synchronized differences. Neither benefits from adding a second
history interface before owner evidence.

## Physical proof and useful negatives

The exact configurations and solutions are in [the separate appendix](theatre-solutions.md).
All actual records are in [the raw evidence](theatre-evidence.json).

- Open center flight: first ground at **2.316667 s**. This establishes the paired
  views without requiring any physical contact before ground.
- Broad flat-side interaction: contact episode **1.466667–1.475000 s**. x velocity
  changes from **+5.917727 to −5.012425 m/s**; z remains forward, changing from
  **+22.085255 to +21.038456 m/s**. The normal is along x. A reversal therefore
  appears on the front cloth, while depth continues on the wing. Removing the
  flat removes that contact; the ablation has a distinct layout identity.
- Rostrum top: contact episode **2.016667–2.025000 s**, with vertical velocity
  **−10.999113 → +17.513355 m/s**. The actual normal is mostly vertical, with
  the expected slope component. Both views show the upward departure. First
  ground is **5.166667 s**. Removing the rostrum removes this continuation.
- A steeper launch clears the flat entirely. A wider yaw hits its near corner,
  giving an oblique normal and reversing depth as well as across-stage motion.
  This is retained as a negative to the simple “one cloth reverses” premise,
  not silently counted as a broad-face success.
- Two open flights can resemble one another on the front cloth while differing
  substantially in depth. The measured pair differs by at most **0.452317 m**
  vertically across sampled common times while depth differs by **10.412189 m**.
  This is a near-rhyme, not identical shadows or a promise that every altered
  launch has a matching companion.

Each flat and rostrum fixture retains its principal contact under all six local
control changes: yaw ±0.5°, elevation ±0.5°, power ±1 percentage point. The
launcher has three genuine rail stops, four metres apart. Rostrum retains both
adjacent rail variations; moving the flat fixture to the left rail produces an
open bypass. Open center also gains a rostrum interaction from the left rail.
Those larger origin changes are distinct choices, not failures of tiny-detent
sensitivity.

A bounded 63-shot grid found 44 open flights, seven flat interactions and twelve
rostrum interactions, with no both-piece chain. This is **not** a success score.
Open flights remain substantive output for this visual instrument. It does show
that the stage is not an architectural journey or a multicontact course.

The side fixture reproduces byte-identical serialized physical records after a
fresh load and under 30/60/144 Hz and mixed frame-time partitions of the fixed
120 Hz steps. JSON equivalence treats `-0` and `0` identically, as the saved format
does. This does not establish cross-version or cross-platform Havok identity.

## Presentation, audio and lifecycle

Set power is the default. Optional hold-to-charge uses the unchanged charge
mapping. Aim/elevation sliders use 0.5° increments; set power uses 1%. Both views
stay visible on desktop and stack on narrow screens. A half-speed viewing option
changes the rate of fixed-step advancement, not gravity or the timestep.
Fire immediately brings the cloths into view before the next physics frame, so
firing from controls below the plots does not hide the flight. Launch settings
returns directly to the controls. Dirty development build suffixes remain in
kept provenance rather than being stripped. Backgrounding pauses progression and cancels a charge; no giant recovery step
is applied on return.

Familiar opt-in audio is supplied by `playgrounds-audio`: charge while actually
charging, launch on a real fire, actual collision normal speed at contact, and
terminal sound at actual completion. Scrubbing and loading historical records
are silent. Audio has no role in recognizing or fabricating collisions.

World-only counts are **three static bodies, no animated bodies and one dynamic
projectile during a shot**. There are three world meshes and one shared material;
the projectile adds one mesh. There are no GPU-rendered meshes, WebGL draw calls
or shadow casters in this SVG presentation. The SVG panes contain bounded paths
and projected hulls; their rendering is a separate browser/DOM cost.

Warm NullEngine builder median: **0.491 ms** versus **0.263 ms** for the empty-stage
control, in alternating sequential samples; maximum full-world sample **1.691 ms**.
Cold initialization including WASM is not included. Eight fresh runtime cycles,
each firing five representative shots, returned owned meshes, materials,
geometries and transform nodes to **zero** after disposal. This is not a proof of
JS heap or WASM heap reclamation. No phone throughput or rendered frame-rate
claim follows from these headless measurements.

The shelf is limited to six records, 3,603 samples and 450 kB per record; paths
are sampled every second physical step, plus exact terminal. Raw collision
callbacks are capped at 500. Browser UI refresh is at most 30 Hz while physical
stepping remains 120 Hz. Body, timer and audio cleanup are explicit on unmount.

## Engineering and authoring boundary

Base: `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb`.
Branch: `research/playgrounds-theatre-20261121`.
Dependency: the accepted spatial session, stations, ball constants and the
small new opt-in audio helper. No historical runtime, Foundry schema or v1 world
identity is changed. Final commit and preview are recorded in the director handoff.

Theatre's large fixed flat and sloping slab are code-owned boxes, with projections
calculated from the same centers, sizes and rotations used for collision. They
are **not ordinary Foundry-sized parts**, and this candidate does not pretend to
be a data-only Foundry registration. The extension is presentation and bounded
recording; generic world imports still cannot execute code or set coefficients.

The reusable opportunity is a two-plane review of a recorded flight, potentially
useful to authors as well as players. Promoting it into every Worldcraft world
would require safe framing, world identity integration and history selection;
that is more work than this self-contained instrument.

## Reproduce and remaining gates

```sh
node scripts/playgrounds/theatre-measure.mjs
node --test tests/playgrounds-theatre.test.mjs tests/playgrounds-audio.test.mjs
npm run typecheck
```

Focused checks cover actual Havok fixtures, projection/time correspondence,
first-ground history limits, malformed storage, foreign/ablation identities,
full-shelf behavior, frame partitions and ordinary control neighbors. Root runs
full build/lint/test/Foundry checks after integration. Existing tests are unchanged.

Owner enjoyment is unmeasured. Continue if the owner invents a second visual
intention, returns to a kept comparison, or learns something that one view hid.
Stop expanding the theatrical presentation if it remains a diagram they inspect
once, if divided attention is tiring, or if comparison takes more effort than
making another shot. Do not add targets or scoring to manufacture a reason to stay.
