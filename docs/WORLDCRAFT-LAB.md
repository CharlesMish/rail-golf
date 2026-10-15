# Worldcraft v0.2 — fixed-goal revision study

Route: `/lab/worldcraft`. Read [the director decision](WORLDCRAFT-DIRECTION.md)
first. This route changes neither the public courtyard nor any historical lab.
It branches main `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`, independently of
draft environmental PR #51.

## What to try

1. Enter Play and fire House Shot. Its fixed setup misses the gold pin by about
   10.4 m at first ground contact.
2. Return to Build, select the ramp and rotate it +5° at a time. Fire with the
   same setup. The amber dashed trail is the preceding recorded attempt; cyan
   is the new actual path. Survey makes their different departures easy to see.
3. At +20° the supplied fixture clears by about 0.4 m from the pin centre.
   Try neighbouring angles before resetting. This is a review recipe, not an
   in-game predicted solution. Reset House Shot restores the initial ramp and
   clears temporary trails; Ready again retains the current world and setup.
4. Keep a resolved line, edit the ramp, and restore that kept world and setup.
   Fire manually. Save a world copy, reload and reopen it too. Worlds & lines
   still offers the original three-part Open starter and Empty clearing.

The experiment asks whether comparing a changed surface's actual consequence
makes a revision worth another shot. A solved fixture establishes feasibility,
not discoverability or enjoyment. See [the report review](WORLDCRAFT-REPORT-REVIEW.md)
for evidence, deliberate limits and a repeatable candidate review.

## Controls and state

Build opens with one editable ramp, a fixed pin and an overview. Drag a part to move its translucent
preview on a 1 m grid. Release to validate and commit; invalid placement returns
to the existing physical arrangement. The selected-piece fields commit on Enter
or blur, with 0.5 m translation and 5° rotation precision. Rotation buttons use
5°. Their numeric signs describe surface rotation, not the shot's screen direction. The piece list is also a selection control; Focus magnifies the selected
part for touch manipulation. Empty-space dragging orbits the view, or pans when
Pan view is selected (Shift-drag also pans). Zoom and Center are explicit controls.

Undo/Redo covers accepted world edits and loads/restores; it does not reverse
physics or delete saved slots. A blank clearing is optional in Worlds & lines.
The sandbox palette is deliberately small: bank, inclined rebound ramp, dull block.
A challenge can restrict additions by kind and fix specific pieces; disabled
fields and runtime validation both enforce those constraints.
Parts have fixed dimensions and height. The entire rotated footprint must stay
inside the editable yard, avoid other pieces and leave the launcher corridor free.

In sandbox worlds, Play provides the existing yaw/elevation envelope and charge-to-speed mapping.
Set power is the initial control; Hold to charge is also available. The stopped
carriage moves from −10 to +10 m in exact 0.5 m increments. It contributes no
velocity. It is not the production three-rail selector. Canvas dragging aims;
arrow keys aim and Q/E move the carriage when focus is on the play surface.
Space fires/charges there; native focused buttons keep their ordinary behavior.
Charging, flight and a modal memory view prevent conflicting edit/fire inputs.
Escape, pointer cancellation and focus loss cancel charging without a launch.

First ground contact ends the line. A challenge clears only when the measured
round centre's x/z at that terminal lies inside or on the fixed pin circle.
It does not require a qualified rebound or a resting capture. Stop, timeout,
out-of-bounds and other terminals do not clear. House Shot fixes origin, yaw,
elevation and charge, so the player changes its one ramp. There is no predicted
parabola, production score or progress award. Dull blocks can still earn a
qualified departure when actual physics satisfies the existing gates.

| Action | Contract |
| --- | --- |
| Build → Play | Validate the arrangement and enter address; never auto-fire. |
| Play → Build | Only after resolution or explicit Stop; dispose the round before editing. |
| Aim again | Keep the current world and setup. |
| Adjust last line | Restore the last actual shot's complete starting world and exact setup. |
| Restore world & line | Restore the selected kept snapshot and setup; select its recorded history; manual fire required. |
| Before / latest | Retain the selected preceding actual path when firing; amber dashed before, cyan live/latest. Different world and changed setup are labelled explicitly. |
| Stop shot | Interrupt and retain diagnostic history; the UI does not offer Keep for an interrupted attempt. |

Restoring a kept line does not rewrite the latest actual shot: Adjust last line
still refers to that shot. Restore clears the temporary comparison to avoid
pairing unrelated records. The selected historical trace and latest actual shot
are separate state. Repeated Keep of the same resolved record is idempotent.
Different-build restores warn that a new physical result may differ.

## World and line contracts

`lib/worldcraft-model.js` defines a strict v1 document. The top-level fields are
`format`, `version`, `id`, `name`, `environment`, `objects`, `launcher`, `rules`.

- Environment: `{preset:"forest-clearing-v1",seed:1}`. Only this preset exists.
- Objects: `{id,kind,x,z,yaw}`; kind is `bank`, `ramp` or `block`. Stable IDs
  identify physical contacts. The code-owned catalog supplies dimensions, height,
  pitch and existing physical material coefficients.
- Launcher: `{x}` stores the initial/default stopped carriage position. Each
  actual shot separately captures `originX`, yaw, elevation and charge. The
  internal `railIndex` is fixed at 1, avoiding a second lateral offset.
- Rules: `null` keeps the original unrestricted v1 contract. Optional rules are
  `{pin:{x,z,r},locked:[objectId],allowance:{kind:count},rail:null|{yaw,elevation,charge}}`.
  The whole pin circle must fit on the floor, with radius 0.5–5 m. Locked IDs
  must exist and cannot be moved, rotated, removed or replaced during ordinary
  edits. Allowances count movable pieces; omitted kinds allow zero. The total
  12-piece limit includes fixed pieces. A non-null rail also fixes launch origin
  to `launcher.x` at firing and when keeping a record. With `rail:null`, origin,
  aim and power remain free; `launcher.x` remains the saved default. All rule
  keys are required.
  Changing rules requires an explicit import/load, not an ordinary edit. These
  are local authoring constraints, not an anti-cheat boundary. There is no rule
  editor or creator-solvability validator.

No arbitrary dimensions, y positions, physics coefficients, scripts, asset URLs
or unsupported keys are accepted. Import rejects malformed/oversized JSON,
unsupported versions, duplicate IDs, nonfinite/off-grid transforms, excessive
counts, out-of-bounds footprints and overlaps before replacing the current world.
The JSON world limit is 32 KiB and 12 physical pieces.

Exact canonical scene JSON is the compatibility identity, avoiding short hash
collisions. Name/document ID and array order do not change that physical identity;
object IDs, transforms, environment, launcher and rules do. Catalog and physics
contract versions are included. Static shapes use a canonical ASCII ID order.

A kept line contains an immutable validated world snapshot, its scene identity,
catalog/physics/build provenance, exact setup and measured launch, raw contacts,
qualified/rejected evidence, actual sampled path and terminal. Runtime sampling
is bounded to 1,024 points with deterministic decimation; the final sample is
retained. This is sampled history, not a replay simulation or pre-shot solution.

## Local memory

Worlds and kept lines have separate four-slot collections:

- `rail-golf:worldcraft:v1:worlds`
- `rail-golf:worldcraft:v1:lines`

No existing storage namespace is read, migrated or written. Full collections
require explicit removal; there is no automatic eviction. Save new world copy
captures the current carriage position as the world's next initial position.
World and line removal affects only that selected local slot.

Corrupt/unsupported stored bytes remain untouched. If access or a write fails,
new choices remain in memory with a visible warning. Export world JSON produces
an importable arrangement. Export local memory preserves all current worlds and
kept-line evidence for safekeeping; that evidence envelope is not a playable-world
import format in this slice. There is no account, cloud synchronization or URL
sharing system. Observed competing-tab writes are rejected; localStorage is not
a cross-tab atomic database.

## Physical and resource ownership

`worldcraft-scene.js` builds matching visible BOX meshes and static Havok shapes
from the same validated catalog/transforms. `worldcraft-runtime.js` configures
the unmodified `createSpatialSession` → `createMechanismSession`. Gravity,
projectile mass/radius/material, charge mapping, aim limits, launch impulse,
120 Hz stepping, first-ground termination and `REDIRECT_GATES` remain incumbent.
There is no score or production progress adapter.

The runtime permits replacement only in stable Build. A replacement validates
and compiles synchronously, then swaps sessions and disposes every old aggregate,
shape, mesh and shadow-list entry. One scene observer pair forwards to the
current session. Generation guards reject stale session events. A failed proposal
retains the current world. The shot sphere is also checked against actual oriented
body bounds immediately before launch; failure explains the obstruction rather
than moving the round or changing physics.

Custom parts never use production `cascadeStep` tags: that path checks fixed
courtyard coordinates. They use stable generic `lineFeature` IDs and the existing
qualified-departure tracker. Visual scenery has no collider, picking or recognition
authority and stays outside the construction boundary.

The cap is 12 editable parts, 14 static bodies including floor/tee, and one round.
Materials and the six scenery batches are shared for the scene lifetime. The
scenery has 2,560 triangles and zero textures, lights or shadow casters. The
pre-measurement targets were ≤160 total draws, ≤80 visible submeshes, ≤32 shadow
casters, ≤10 persistent authored materials, no surface textures, rebuild p95
≤50 ms desktop / ≤100 ms physical phone, and phone warm-frame p95 ≤33 ms.
Final evidence reports measured values separately; headless SwiftShader cannot
certify the physical-phone targets.

## Provisional choices and separate work

Three fixed-size part types, one environment, a 12-part cap, the track span, Build's camera,
the initial Set power control and four local slots are study choices. No public
product hierarchy or object-marketplace architecture is declared. There is no
freely placed launcher, arbitrary modeling, challenge editor, active mechanism,
physics prediction or new authored production world.

The straightforward courtyard Free Play proposal remains a later integration
decision; historical Linecraft Open continues to provide relevant evidence.

Separate PR #51 perimeter proposal: continue its west siding (`x≈−68`, north end
`z≈260`) a short way into a wooded cutting, with restrained ballast/verge. Keep
it beyond physical bounds, in the existing merged scenery batches, without
shadows/collision. Judge it in matched Survey/high-flight views. No PR #51 source
is changed by this Worldcraft commission.
