# Author outcome atlas — bounded diagnostic, not a world score

This tool answers a limited question: **what did these explicitly selected player
setups actually touch, and where did they end?** It does not optimize a world,
certify reachability, assign quality, or fire extra balls in the player interface.

Branch: `research/playgrounds-atlas-20261121`. Base:
`4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb`. The accompanying evidence was generated
at code commit `355d54cf5b3bf07070ae7ff5f5d150dce7698601`, with no modified source
files. Every output records its own Git HEAD and SHA-256 hashes for the shared
session, projectile/station authority, selected geometry and sampler.

## What it runs

[`scripts/playgrounds/outcome-atlas.mjs`](../../../scripts/playgrounds/outcome-atlas.mjs)
builds a code-owned lab in Babylon NullEngine with Havok and uses the existing
`createSpatialSession`. The accepted launch, projectile, contact ledger,
first-ground ending and 120 Hz step remain authoritative. There is no analytical
replacement trajectory and no scripted ball impulse beyond the accepted launch.

The CLI whitelist currently contains `swing-gate`, `swing-gate-absent` and
`vertical-yard`. The absent-gate entry invokes the existing code-owned ablation;
it does not introduce an imported physics coefficient. No config argument can
load a script path, package or remote URL. Grid files contain only numeric arrays.

A reviewed new spatial lab can import `runAtlas` from its own author script and
pass its code-owned config, source filenames, and optional phase-restoration
adapter. That is an engineering integration, not a new user-world capability.
This runner intentionally does **not** claim to handle post-terminal persistent
object settling. Such a lab needs an explicit adapter for its longer lifecycle.

## Inputs and bounds

The grid lists every value; it never expands a guessed range or searches for a
successful solution. Yaw/elevation must lie on 0.5-degree fine-control detents,
power on integer percentages, and rail index on the existing three carriage
positions. These are a conservative subset of the available controls; pointer
aiming can also produce intermediate values. No setup is silently clamped.

Gate phase is an integer release tick within its existing 1,440-tick period.
This records the 120 Hz release clock; it is **not** a claim that players have a
numeric phase input or can manually pick one exact tick. Use separated phases
and nearby variations to assess a live timing choice. Static configs require
phase tick zero.

The default cap is 64 shots. `--limit` explicitly raises it, up to a hard maximum
of 320. Grid input is capped at 16 KiB. Each record retains at most 256 raw
collision callbacks and 602 sampled path points; any truncation is counted.
Surface coverage is marked incomplete if collision callbacks were dropped.

## Evidence contract

Each shot records:

- Exact normalized launch values, station, muzzle, direction and release phase.
- Full environment snapshot before launch and at accepted projectile termination.
- Terminal reason, position, tick and accepted session elapsed time.
- The accepted contact-episode ledger, plus raw callback points and normals.
- Projectile velocity immediately before and after the whole collision step.
- An actual sampled path: initial position, every twelfth physics tick, and the
  terminal position. Samples are `[tick,x,y,z]`; divide ticks by 120 for seconds.

Callback times are **step intervals**, not invented substep timestamps. A callback
with `step:[100,101]` happened within that fixed step. The bracketing velocities
include gravity and every contact resolved in that step. Multiple simultaneous
contacts share the same bracket; it is invalid to attribute the entire velocity
change to each one separately. Raw Havok normals retain `projectileIsCollider`
to expose event ordering; the sampler does not infer a uniformly oriented normal
or solve for contact impulse.

The surface catalog contains real physics bodies, terminal tags, motion types,
feature labels, initial transforms, local bounds and material data. Repeated mesh
names receive distinct instance IDs. An animated body rebuilt during phase
restore is associated with its same named surface. Its start orientation follows
the recorded phase and code-owned pose function; the catalog describes the
initial build, not every phase simultaneously.

The summary counts shots touching each body, lists untouched nonterminal bodies,
and groups observed body/feature sequences. A sequence label does not establish
that two paths are physically equivalent or equally interesting. Inspect their
positions, directions and negative examples. There is no contact-count reward,
success fraction, universal distance score or suggested geometry mutation.

## Forty-shot example and matched absent-gate control

The explicit sampling grid is
[`atlas-example-grid.json`](../../../scripts/playgrounds/atlas-example-grid.json).
It uses one rail position, five yaw detents, two elevations, two powers and two
release phases. It contains 40 launches, not 40 human playtests.

```sh
node scripts/playgrounds/outcome-atlas.mjs \
  --config swing-gate \
  --grid scripts/playgrounds/atlas-example-grid.json \
  --output /tmp/gate-atlas.json --svg /tmp/gate-landings.svg

node scripts/playgrounds/outcome-atlas.mjs \
  --config swing-gate-absent \
  --grid scripts/playgrounds/atlas-example-grid.json \
  --output /tmp/absent-atlas.json --svg /tmp/absent-landings.svg
```

Stored evidence: [gate records](atlas/gate-40.json),
[absent-gate records](atlas/absent-40.json), and terminal-position plots for the
[gate](atlas/gate-40.svg) and [control](atlas/absent-40.svg). Plots use the same
world bounds and equal metre scales on x/z; hover titles identify raw records.
They plot measured terminal positions only, with no interpolated density or
prediction. They are an author artifact, not an implemented Raked Court.

| Observation within this grid | Moving gate | Gate absent |
|---|---:|---:|
| First-ground termination | 40 | 40 |
| Shots touching gate | 21 | — |
| Shots touching either portal post | 9 | 8 |
| Shots with no nonterminal contact | 11 | 32 |
| Shots touching far receiver | 0 | 0 |
| Raw callback/path truncation | 0 | 0 |

One gate shot also touches a post, so contact rows are not exclusive. Nineteen
of the forty moving-gate paths match the absent-gate paths exactly. The remaining
21 contain actual gate contact. This is a direct causal comparison, not a claim
that only one outcome is useful. The moving-gate terminal times span approximately
1.475–2.483 seconds for this grid.

**The useful negative is the untouched far receiver.** Previous Horizons evidence
already demonstrates that it is reachable, including a return through the gate.
This small grid misses that part of the environment entirely. Therefore an author
should ask whether the opening controls and accessible region invite that route,
or whether a deliberately different sampling region is needed. “Never hit in
these forty shots” must not become “unreachable,” and adding hundreds of shots
automatically would not answer the presentation question.

The absence control also reveals eight post-only shots. A more complicated
physical apparatus is not responsible for every altered destination nearby.

## Cost and verification

The samples run sequentially, reset the accepted environment for each shot, and
dispose all owned resources at the end. The active projectile adds one dynamic
body and one mesh; counts below are measured after it is cleared.

| NullEngine resource | Gate | Absent control |
|---|---:|---:|
| Static / animated bodies | 6 / 1 | 6 / 0 |
| World meshes / geometries | 18 / 18 | 10 / 10 |
| Materials, including scene default | 2 | 2 |
| Shadow-caster registrations | 6 | 5 |
| Build time, one measured run | 19.83 ms | 20.12 ms |
| Forty-shot batch, one measured run | 307.09 ms | 347.98 ms |

Counts after all forty fire/reset cycles equal the initial counts. After disposal,
body, mesh, geometry, material and caster counts are all zero. Timing is noisy
shared-host process timing, not a comparative performance claim. The absent
control's larger batch time does not mean it is slower. This is neither rendered
frame timing nor a phone/GPU-memory measurement. Full heap reclamation is not
established by ownership counts.

The focused tests reject off-detent, duplicate, oversized and unknown grid
fields; reproduce gate records in fresh runtime instances; establish the absent
phase control; check actual contact/path evidence; verify reset/disposal counts;
and run the historical elevated Vertical Yard with its true station and empty
environment. All three focused tests pass. Focused ESLint and `git diff --check`
pass. The integrated branch should run the full repository gates after cherry-pick.

## What would justify expanding this tool

The next useful addition is an explicit per-world region label supplied in code,
so an author can distinguish two receiving places without assuming that all
different body names represent different intentions. Neighbor comparisons should
refer to those labels and retain the underlying records. A persistent lab also
needs separate projectile-terminal and world-settled snapshots.

Do not add an automatic “best world” optimizer or promote high contact counts to
the design objective. The atlas should make untested assumptions visible while
leaving the author free to value a simple, funny or beautiful line.
