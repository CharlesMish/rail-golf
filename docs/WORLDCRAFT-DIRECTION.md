# Worldcraft — Gate A direction

This is an isolated experiment, not a production architecture decision.

The original Gate A brief below is retained as the design rationale. The
v0.2 report follow-up adds a fixed House Shot challenge and before/after measured
trails; [the current playable contract](WORLDCRAFT-LAB.md) and
[review evidence](WORLDCRAFT-REPORT-REVIEW.md) describe that small extension.
It does not adopt the report's full progression or change shared physics.

## Authority

Starting main: `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.
Branch: `lab/worldcraft`. PR #51 remains a separate, unmerged draft at
`b24f036630ad24e963592c7f787307b1c57995bd`. The experiment branches from main;
it does not require the owner to accept PR #51. The September Start Here,
Current State and Lab Index attachments are historical context, superseded by
current source where they differ.

## Director assessment

Worldcraft is promising as **another way to prepare a physical play context**.
The common verb is still a committed shot, its observed consequences, and a
deliberate revision. Authored courses supply an arrangement and optional goals;
Free Play removes the goal; Build permits changes to the arrangement. These
need not become three separate permanent game modes. Keep remains a voluntary
memory action across them, not a score or a reason the game invents for a shot.

The strongest competing direction is simpler courtyard Free Play with the
existing expressive carriage. That already has substantial implementation in
Linecraft Open. Repackaging it would answer an accessibility question, but not
the new question of whether changing a bank is worth another shot. This slice
therefore tests construction without rewriting the courtyard or promoting a
historical lab. A later integration may offer authored, open and player-built
contexts through the same shot controls; owner play must precede that decision.

Broader aesthetic authorship is deferred. One coherent mill-clearing setting
should supply context without filling the palette with decorations. PR #51's
forest-edge direction is a reference, not a hidden dependency or merger.

## Narrow playable contract

- One fixed House Shot challenge, the original open starter and an optional empty layout.
- Three fixed-size parts: a rebound bank, a real inclined rebound ramp, and a
  dull obstacle. No arbitrary scale, physics parameters, scripts or asset URLs.
- Move in x/z and rotate; snapping and fine buttons complement direct dragging.
  A small part cap is an interaction limit to test, not a performance claim.
- Build is a stable state. Drags preview visually; an accepted edit replaces
  static bodies only while no shot is active. Undo/Redo records accepted edits.
- Play retains incumbent yaw, elevation, charge and first-ground semantics.
  A stopped carriage spans −10 to +10 m in 0.5 m steps. It never contributes
  velocity. No predicted landing arc or freely oriented launch stations.
- The prior actual trail can remain while building, clearly marked historical
  when geometry changes. Return to aim in the current world preserves setup;
  exact Adjust restores the previous shot's whole starting world and setup.
- Local world slots and bounded JSON import/export use a new namespace.
  Invalid imports are rejected before replacing anything. A kept line carries
  its validated world snapshot, exact setup, build and authority provenance.

## Architecture

An independent schema and scene adapter sit beside the existing courtyard.
The document separates environment, physical objects, launcher and optional
rules (null for the original sandbox; validated fixed-goal rules in the follow-up). Stable object IDs identify contacts; a world content identity
and a code-owned catalog/physics contract bind a line to its firing context.
Imported geometry parameters come only from the supported catalog.

The runtime reuses `createSpatialSession` → `createMechanismSession`, including
the incumbent sphere, impulse, 120 Hz cadence, first-ground termination and
`createRedirectTracker` gates. The custom adapter supplies actual matching
static BOX bodies, ground metadata and per-object generic `lineFeature` IDs.
It does not assign production `cascadeStep` metadata to movable parts: that
recognition path is tied to authored world coordinates. It awards no production
progress, score, stamps or Route Book entries.

## Risks and evidence gates

The primary risk is friction: camera/navigation/edit controls may interrupt the
pleasure of firing. Secondary risks are unreadable surface semantics, an overly
large search space, historical lines misrepresented after edits, resource leaks,
and a technically working editor whose arrangements are not worth revisiting.

Acceptance needs actual player-input records and Havok shots showing at least
two distinct relationships, then a changed outcome after a geometry revision.
A solved fixture establishes feasibility, not discoverability or enjoyment.
Desktop and phone review must test the transition and edit locks, not only
screenshots. On touch, Build manipulates geometry and Play aims/fires; there is
no shared gesture that can accidentally perform both.

Budgets will be published from measured starter and full-palette layouts:
colliders, meshes/materials/draws, texture memory, shadow casters, rebuild cost,
repeated edit/fire/reset resource stability and software frame time. A proposed
12-part ceiling will be revised if those measurements do not support it.
SwiftShader evidence cannot certify physical-phone or real-GPU responsiveness.

## Independent perimeter proposal

Keep PR #51 unchanged in this commission. Review its quiet boundary for short
fence returns and a restrained ground/service transition; avoid creating new
apparently playable ledges. This is a separate art proposal, not a prerequisite
for the Worldcraft loop.
