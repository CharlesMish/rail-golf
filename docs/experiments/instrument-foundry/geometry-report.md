# Expressive geometry: Across the crown

Base: `10b09baafc9d85eef0d87a630b55600d623dcde0` (owner-played Architectural Forms & Ensemble).
Branch: `research/expressive-geometry-20261127`.
Measured implementation: `f7058e084ff95134a08454232c111898ca007520`.
The evidence packet also records exact source-file hashes.

The owner's successful canopy play is reason to investigate its shape as a
musical opportunity. It is not yet evidence that every curved surface is useful.
This bounded continuation turns the existing crown across the direction of fire
and puts it between two low receiving decks. The same visible faceted barrel
construction and real convex Havok hull are reused. The curve changes the
departure according to where a shot lands; it does not inject a velocity or note.

## Scope and honest representation

The main Instrument Foundry does not depend on this study. Ordinary Worldcraft
currently validates catalog boxes and preserves those shapes in exported physical
records. A custom hull cannot be slipped into that contract while retaining an
ordinary v1 identity. Therefore `/lab/expressive-crown` is a separate code-owned
SpatialLab with its own crown and flat-control identities and four-line shelves.
Its records deliberately fail Counterline's physical-record validator.

The live page uses ordinary impact feedback. The technical onset timeline uses
the existing Worldcraft resonance ear on **actual contact callbacks**, independently
of sports recognition. It demonstrates timing material a future instrument could
use; it does not pretend the current study is a portable ensemble instrument.
No second physics/audio/recording engine was written. No generic schema changes
or arbitrary mesh import were made.

The crown is 22 m along the shot direction, 20 m across, and 4 m tall, beginning
at ground height. Ten planar strips sample a circular cross-section. One convex
hull contains the complete roof volume; its underside is flat. There is no hollow
arch, smooth visual skin, hidden flat collider or seam between separate roof bodies.
The near and far decks are matching visible/physical boxes. The control replaces
only the crown with a box having the same footprint, base and maximum height.
Its greater filled volume is a real geometric difference, not a collision trick.

Both variants use the canopy's established static surface coefficients (.86
restitution, .18 friction), the unchanged projectile and launch mapping, gravity,
120 Hz Havok session, and first-ground termination. These values are code-owned;
contributors cannot supply arbitrary coefficients through Instrument Foundry.

## What the curve adds

Four selected relationships survive all six ordinary neighboring adjustments
(±0.5° yaw, ±0.5° elevation, ±1 percentage point power). Numerical settings are
separate in `geometry-solutions.md`.

| Relationship | Central crown onsets | Ordinary neighbors retaining relationship | Same shot on flat control |
| --- | --- | ---: | --- |
| Repeated crown | Crown, then crown after 2.517 s | 6/6 | Crown then near deck after .400 s |
| Near return | Crown then near deck after 2.142 s | 6/6 | Also returns, but after .100 s |
| Low carry | Crown then far deck after 3.367 s | 6/6 | Crown then near deck after .283 s |
| High carry | Crown then far deck after 2.300 s | 6/6 | Same broad sequence; gap 2.908 s |
| Delayed carry | Crown, crown, far deck | 5/6 | One crown onset, then ground |

The near return and high carry do not establish that curvature is required.
The low carry changes destination, and the repeated crown offers separated
attacks from a single continuous surface. Those are the stronger reasons to
retain the proof. One positive neighboring repeated-crown shot gains an onward
deck contact; preserving the relationship does not mean every sample is identical.

The repeated-crown central shot has two physical onsets at .950 and 3.467 seconds
with measured face-speed gains .427 and .409, but only **one qualified sports
redirect**. The second is a genuine later return after free flight, not another
solver callback from the first collision. An instrument should retain it even
when sport recognition does not award another event. The analysis preserves
the ear's existing five-frame callback grouping and never fabricates an onset.

## Coverage and negative evidence

A matched grid uses five yaw settings, seven elevations and six powers: 210
shots for each form. It is a sampled opportunity map, not human discovery frequency.

| Outcome | Crown | Flat control |
| --- | ---: | ---: |
| Silent shots | 71 | 66 |
| Any crown contact | 125 | 133 |
| Repeated contact with the central body | 36 | 30 |
| Crown first, then near deck | 7 | 34 |
| Crown first, then far deck | 11 | 16 |
| Bounds exits | 27 | 23 |
| Over 15 seconds / settled in this grid | 0 / 0 | 0 / 0 |

The flat control has broader sampled coverage. The curved form is not selected
for its total contact count. It offers different trajectories and gaps within
an otherwise small scene.

The coarse grid misses an important negative: a separately retained near-deck
repetition lasts **20.217 seconds**, with 23 grouped onsets and only two sports
redirects. It becomes a progressively quieter repetition, and is not recommended
as an authoring goal. A finer edge sweep also finds a 21.458-second ending.
A low-power case misses the crown, merely clips the near deck, and reaches ground
in .575 seconds. A high-power case is silent and leaves the open bounds. A fragile
return loses its intended relationship in one of six neighbors. None was removed
to make the form appear universally accessible.

## Facets, seams and camera

The two fine sweeps vary elevation or yaw by half-degree increments. Of 152
shots, 145 reach the crown, producing 411 raw crown callbacks. Four hundred
align with a supporting face normal to at least .999 absolute dot product;
eleven are convex-edge interactions, with minimum alignment .802. This is a
faceted hull, not a smooth normal field. Raw points, timestamps, normals and
incoming/outgoing **whole-step** velocity brackets are retained. A bracket is
not the isolated impulse of one callback when a solver step contains several.

Camera clipping uses the rotated crown's same supporting planes and the two
deck boxes. A geometric audit of seven named trajectories on each form, four
effective canvas shapes and 30/60 Hz sampling covers 19,684 frames. It finds
zero sampled blocked sightlines or projectile frustum escapes. Maximum camera
step is 3.765 m at 30 Hz during initial launch-to-follow easing; after .5 seconds,
the maximum is 1.001 m. This does not establish rendered camera comfort. An
owner may prefer Survey for comparing the full relationship.

## Cost and cleanup

| Runtime harness ownership | Crown | Flat |
| --- | ---: | ---: |
| Static bodies | 4 | 4 |
| Active live projectile | 1 | 1 |
| World meshes / submeshes | 4 / 4 | 4 / 4 |
| Shadow casters | 3 | 3 |
| Triangles | 76 | 48 |
| Vertices after flat shading | 192 | 96 |
| Materials including harness fixture | 5 | 5 |

Seven load/fire/retry/fire/reset/dispose cycles per variant keep ready counts
stable and leave zero counted bodies, meshes, materials, textures, geometries,
casters and submeshes. Warm NullEngine build medians in this run are 1.73 ms
for crown and .89 ms for flat. These are noisy CPU construction measurements,
not draw calls, GPU memory or rendered frame rates. The shared launcher, trails
and other browser presentation objects are outside these world-only counts.

The three focused tests establish physical families and negative controls,
rotated-hull correspondence, separate memory identities, first-ground authority
and resource cleanup. Publication checks at
`95f9ebeaede6e98281fe3cfcc6796815916dc904` also pass:

| Command | Result |
| --- | --- |
| `npm test` | Five-stage production build passed; 712 tests passed, 0 failed/skipped/cancelled |
| `npm run typecheck` | Passed |
| `npm run lint` | 0 errors; 5 warnings in unchanged historical files |
| `node scripts/foundry/validate.mjs` | 16 worlds and 75 recorded shots validated |

The full raw command outputs and hashes are retained under
`geometry-verification/`, with machine-readable counts in `summary.json`.
Build warnings concern the proxy environment, plugin timing and existing large
chunks; none prevents route emission. The five lint warnings are two historical
hook dependency warnings and three unused historical research variables. No
source was changed for these checks. Node was v24.22.3 and npm 11.19.1. The
repository suite took 36.511 seconds after the build; these timings occurred
while other director lanes ran checks and are not gameplay performance evidence.

Browser results remain a separate director verification. No rendered image or
listening result is claimed by this lane.

A subsequent hosted browser audit found two presentation defects: the isolated
branch linked to an unavailable local Instrument Foundry route, and the shared
Yard controls displayed an empty Station selector when no station choices were
configured. The link now leads to the durable [Instrument Foundry authoring
handoff](https://github.com/CharlesMish/rail-golf/pull/92), and the Station label
and selector render only when the choices array is nonempty. Existing populated
station selectors retain their behavior. These are two JSX-only changes; the
geometry, physical configuration, world identities and history paths are
unchanged. TypeScript, targeted lint on both changed components, and all three
focused crown tests pass after the corrections. The full suite was not rerun
locally for these presentation-only corrections; the complete checkpoint above
and the hosted publication checks remain separately identifiable.

## Authoring decision

Preserve this one optional geometry study, but do not put a curve into every
instrument brief. Existing stock pieces remain sufficient for the primary
authoring round. If owner play confirms that strike position and repeated
crown timing are useful musically, a future extension can begin with **one
bounded barrel element**: fixed facet construction and surface coefficients,
validated dimensions/placement/voice, explicit physical identity, honest camera
planes, and capture/export acceptance. It should pass the same instrument audit
before being offered to independent authors.

Concave and doubly curved surfaces are deferred. Concavity requires compound or
mesh collision choices and their seam review; there is no need to incur that
cost to establish the current Foundry. A general mesh editor is not recommended.

Reproduce with `node scripts/expressive-geometry/measure.mjs` and
`node --test tests/expressive-crown.test.mjs`. `geometry-evidence.json` retains
the actual trajectories, all sampled onsets, sensitivity and controls, callback
normal checks, camera geometry and resource cycles.
