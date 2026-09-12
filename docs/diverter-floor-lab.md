# Diverter Floor — isolated proving hole

Frozen control: main `0d2aa96b0a39266a3bbdef64a87fe4abd0da7e4b` (PR #14 merged).
The courtyard card data, geometry, stations, cascade, global launch rules and
existing physics fixtures are unchanged. The experiment is a separate single-card
route at `/lab/diverter`, linked only from `/practice`. It has separate progress
and shot-library keys and cannot unlock or alter courtyard cards.

## Physical authority

One visible switch selects one timber floor's two authored static transforms:
A / LEVEL (amber stripes) and B / RISE (violet stripes, raised far edge).
Both use the same passive timber material and real box collider. A projectile's
Havok collision callback must identify the actual switch body; no proximity or
swept trigger volume substitutes for that contact. A shot can change the switch
once, preventing contact chatter from repeatedly flipping it.

The requested transition is committed after the physics step. The old floor body
is disposed and a new static body is created at the matching visible transform.
There is no hinge simulation, destination-aware force, scripted reflection, wind,
second switch, moving launcher or change to the launch impulse.

Floor evidence requires real top-face contact on that floor body. The lab's first
landing is ruled from actual target/ground/tee body contacts: a first top contact
on the cyan target clears; another ground contact ends the shot without a clear.
This is specific to the lab. The frozen courtyard's existing first-kiss crossing
rule is unchanged. Lab receipts name the physical landing instead of displaying
a distance against the courtyard's older scoring-plane tolerance.

## State lifecycle and evidence

- Fresh route entry starts in A, regardless of saved progress or lines.
- Retry Shot / R preserves the current floor state, including after a switch hit.
- Reset Card restores A and retains earned records and saved lines. It is also
  available in Shot tools on phones, including during flight.
- Recall explicitly restores the saved **starting** floor state, aim and power
  marker. The player still fires. This is announced in the UI.
- A line records `environment.floor` at launch and `environmentAfter.floor` at
  ruling/interruption, plus physical switch/floor contacts. A → B is distinct
  from a shot that started in B. Floor state is part of the saved family key.
- Lab lines with missing or invalid floor states are rejected rather than recalled
  under an assumed environment. Existing courtyard saves remain compatible.

## Build identity

Every playable route shows a quiet `BUILD` label. Workers Builds supplies
`WORKERS_CI_COMMIT_SHA` automatically; Vite embeds only the validated short SHA in
client and server bundles. See [Cloudflare's build metadata documentation](https://developers.cloudflare.com/changelog/post/2025-06-10-default-env-vars/).
Local builds use git HEAD, with `-dirty` when there are local edits. Missing
provenance is displayed as `unknown`, never as an invented game version.
A merge deployment will display the merge commit, which may differ from the PR head.

## Verification and blind handoff

The shared scene builder and contact handler are used by the browser and
`tests/helpers/diverter-physics.mjs`. The test suite establishes ordinary direct
clears in both states, floor-contact clear neighborhoods across all three rails,
a changed physical rebound for identical inputs, real switch transitions in both
directions, retry/reset behavior, and state-aware save/recall through reload.
It also checks default label-anchor projection in an 844×390 landscape viewport.
These are deterministic HEADLESS claims, not browser playtest findings.

QA setups live only in `tests/diverter-lab.test.mjs`. Keep them out of Mode A's
handoff. Rail Rat should freeze its blind discovery report before reading those
fixtures for Mode B. Neither the UI nor this handoff document supplies winning
setup coordinates.

Local browser interaction and rendered visual QA were blocked by the available
preview environment. The production responses, TypeScript, build and headless
suite are verified; hosted browser behavior remains Rail Rat's next check.
