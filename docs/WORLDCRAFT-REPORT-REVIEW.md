# Worldcraft report review — 15 October 2026

This candidate adds one fixed House Shot challenge and retained measured
before/after trails to `/lab/worldcraft`. It leaves the shared simulation and
all production routes unchanged. It is ready for owner play, not a production
merge or deployment recommendation.

## Source authority and isolation

Authenticated GitHub and fetched repository state on this Mac before editing:

- `main`: `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.
- `lab/worldcraft`, draft PR #52: `092dc58a483f85efa09a2bea1e2eac67a1c8d93d`.
- Separate draft PR #51: `b24f036630ad24e963592c7f787307b1c57995bd`.

The candidate uses an isolated clone and branch
`candidate/worldcraft-loop-20261015`. Existing worker checkouts and remote
branches were not edited. Repository README, Charter and Worldcraft direction
were read; no applicable `AGENTS.md` was present.

All five requested Library attachments were retrieved and identified by their
contents, not the order of the IDs. Original bytes and version-0 provenance are
retained in the sibling `evidence/originals` directory and `evidence/provenance.json`.

| Library ID | Actual file | SHA-256 |
| --- | --- | --- |
| `libfile_8db92fd3ecd88191a01c98a4a57e7fae` | Three Worldcraft Spaces.html | `27134977a19f35f2492f24a5ff35e40f5c252357e74a329a94715273453c8962` |
| `libfile_d4b7804002508191aac4788bf6e0e4a2` | space-2-back-pocket.json | `5ce286d06ca8c1ad0e3045a630cdc80afa3f6b5ae57f3e178142fb3845898c6d` |
| `libfile_a19ac6a557108191a9dcbae3daede188` | space-3-house-shot.json | `f991cbd826693e3bc744368319ca9201aec08c552fab21336dd2136b9b3595cf` |
| `libfile_eaa504568bf88191aebd65b50406fc6b` | headless-rail-rat.zip | `a26e76e776c86b9e62b4b5572c52f509e0738637bea6841c7ca63ef605796088` |
| `libfile_703815fffe988191ad9bd0dfe2d7f09b` | space-1-backstop.json | `15ac5d6f06ae53a0f70d64e0dfe7989c14e657da1853c9b5bccd1a35397721ff` |

The ZIP was checked for path traversal, extracted and every script read before
execution. A working copy changes only relative import paths for its location
under `work/report-harness`; originals remain unchanged. Representative sweeps
ran on the authenticated baseline before implementation.

## What the evidence supports

| Reproduced experiment | Result | Implication |
| --- | --- | --- |
| Backstop, direct / block at back edge | 65 / 132 hits per 5,239 sampled setups | A nearby dull block can enlarge this sampled landing region. |
| Backstop, block 2 m deeper | 96 / 5,239 | Placement matters; merely adding a block is insufficient. |
| Back Pocket, near wall / far angled wall | 136 / 58 hits per 48,348 sampled setups | The near-wall shortcut remains dominant; this is not ready as an unconstrained teaching challenge. |
| Bank rotated in 5° increments | Median landing shift 3.0 m, maximum 3.3 m | Fine rotation and a roughly 3 m goal merit a focused test. |
| Ramp rotated in 5° increments | Median 3.4 m, maximum 3.5 m | A small target could make the available edit step unnecessarily brittle. |
| House approach, ramp at z=38, 42, 45, yaw −45°…45° | All three reproduced a smooth left/right landing family | A reachable nearby goal can expose deliberate surface revision. |

These are fractions of sampled grids, not human hit probabilities. The report's
best Backstop power runs contain two versus six samples spaced 2 percentage
points apart: endpoint spans are 2 versus 10 points, not measured continuous
4% versus 12% windows. The report's 154 m free ballistic range does not prove
that every forward point is reachable in this bounded yard. The complete
reported House grid percentages were not rerun; the local arc and the candidate
neighbourhood were verified instead.

All three supplied JSON files have `rules:null`: pins and a locked launcher were
analysis assumptions, not enforceable content. All three still parse and export
with identical canonical world identities. This is the strongest reason to
implement the already-reserved rule field before making further level claims.

## Smallest chosen loop

House Shot fixes origin 0 m, yaw 0°, elevation 18° and power 55%. Its pin is
(-10, 72.5), radius 3 m. The single editable ramp starts at (0, 42), yaw 0°.
Unlike the report's off-axis staging position (20, 20), the ramp starts on the
approach: this fixture tests steering and comparison without requiring the
player to discover both interception and steering at once.

Success is the measured round centre's x/z at **first ground contact** inside
or on the circle. It is not a resting-ball capture, a required rebound sentence,
or a production score. Interruptions and other terminal reasons cannot clear.
The gold pin has no collider or picking authority.

At ramp yaw 0° the shot misses by about 10.4 m. On the same real Havok setup,
yaws 5° and 10° miss, 15°, 20° and 25° clear, and 30° misses. At 20° the landing
is about 0.4 m from centre. This gives several neighbouring discrete solutions
without changing gravity, impulse, restitution, aim limits or contact gates.

The prior actual trail remains amber and dashed while the new actual path is
cyan. Labels identify changed worlds and launch setups. History is immutable;
there is no predicted path. Continuous dash phase follows every original sample
segment, avoiding the renderer's loss of short segments on dense trajectories.
An explicit kept-line restore clears an unrelated comparison pair.

Optional strict rules also support fixed objects and per-kind movable-piece
allowances. Ordinary edits cannot change the pin, rules, saved launcher default or
fixed objects; runtime checks back up disabled controls. Explicit world loads,
imports and undoing a document load are allowed to change documents. The old
null-rules sandbox and its saved worlds/lines retain their format and identities.

Backstop and Back Pocket remain research evidence, not new curated modes.
Progression, creator validation, a challenge editor and a predicted kick arrow
are deferred. Numeric ±5° controls describe the surface transform; the actual
trail shows its shot consequence without implying a screen-relative direction.

## Validation and review

- Full suite: **478 tests passed**, zero failures, skips or cancellations.
- Typecheck passed; lint passed with two existing `app/manners-game.tsx` hook
  warnings, no errors and no Worldcraft warnings.
- Bounded production build passed. This Mac lacks GNU `timeout`, required by
  the repository's build wrapper, so the same `vinext build` was bounded by
  Python `subprocess.run(..., timeout=180)`, followed by the full Node suite.
  Working Node is 22.22.3; the unrelated Homebrew Node install is broken.
- Added checks cover malformed rules, fixed transforms/removal/rail, allowances,
  boundary success, interrupted terminals, old and new storage/JSON round trips,
  real miss–edit–clear neighbourhoods, retry/reload repeatability, immutable
  retained evidence, and dense/cornered trail dash geometry.
- Existing real-Havok resource, input-lock and full-palette replacement tests
  continue to pass. No new physical-phone performance budget is claimed.
- Independent reviewer accepted the final 12-file code/test snapshot after
  independently running **31/31 Worldcraft tests**, typecheck and diff checks.
  Their three P2 findings were repaired: live comparison used stale setup,
  kept restore retained an unrelated amber trail, and ordinary free-world Undo
  reset the carriage origin. Snapshot fingerprint:
  `76e8013e78bcbc282de5dc91551231b4e88bb9dea84b6202158fe24899548194`.
- Native Brave UI checks on this Mac exercised baseline miss, +20° clear,
  keyboard firing with a fixed rail, in-flight locks, interruption/no-clear,
  ready-again, kept restore and local world save. Actual before/after trails
  were visually checked at desktop and 390×844 / 844×390 responsive sizes.
  Browser resizing exposed a ResizeObserver feedback error; scheduling resize
  on the next animation frame and canceling it on teardown resolved the repeat.
- Native file-picker automation could not complete selection, so UI import,
  export download and post-reload slot opening are **not certified** by this
  pass. Model/runtime import/export and original-file compatibility passed.
  A physical phone, touch ergonomics, real-device frame times, discoverability
  and human enjoyment remain owner-play gates.

Raw logs are retained beside the checkout under `evidence/`: baseline-backstop,
baseline-steer, baseline-arc, pocket-fine, original-imports, final-build,
final-typecheck, final-lint and final-tests. No signed transfer URLs belong in
the candidate or evidence package.

## Playable review

With Node >=22.13 and dependencies installed, run `npm run dev -- --host
127.0.0.1 --port 5174` from the candidate checkout. Open
`http://127.0.0.1:5174/lab/worldcraft`. The review server uses localhost only.

1. Play → Fire line. Observe the roughly 10.4 m miss; optionally Keep line.
2. Build → select the ramp → four +5° turns → Play → Fire line. Expect a clear
   about 0.4 m from centre. Survey should show amber before and cyan latest.
3. Ready again → Fire line should reproduce it. Stop a separate flight: no
   clear and no Keep action. Reset House Shot returns the initial challenge.
4. Worlds & lines → Open starter checks the unrestricted editor. Move the
   carriage, revise a piece, Undo/Redo: aim and origin should remain intact.
5. Import [the example](examples/worldcraft-house-shot.json), export it, reload,
   open a saved copy and restore a kept line on the owner's browser/phone.
   Then try the loop without following the known-solution recipe.

The candidate does not establish that this is fun. It makes the question
concrete, constrained and reviewable.
