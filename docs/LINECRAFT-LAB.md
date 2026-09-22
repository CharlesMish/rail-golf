# Linecraft graduation slice — handoff and runtime contract

Starting HEAD: `8eb7ef65e6614176104df43d43b98fd98a83a093`.
Route: `/lab/linecraft` on the existing public Rail Golf host.

Read [the director memo](LINECRAFT-SPINE.md) for the candidate hierarchy and
its disagreements, [the future Rail Rat protocol](LINECRAFT-RAIL-RAT-PROTOCOL.md)
for study design, and [clip feasibility](LINECRAFT-CLIP-FEASIBILITY.md) for the
bounded video-export assessment. No Rail Rat study was run.

## Learn, then Open

The route starts in Learn at Yard Gate. The three challenges are BANK A → BANK B,
TREAD 1 → TREAD 2 at Lumber Walk, then TREAD 1 → TREAD 2 → TREAD 3 there.
They use existing qualified redirect events; no new recognition gates or
geometry. Learn identifies the required bank/tread faces in the scene and Survey.
It reports reached clauses separately from the terminal. A resolved unsuccessful
attempt permits Continue; interruption does not. Completion and attempted
exposure are distinct. Finishing the sequence enters Open, not a mastery award.

An explicit Skip to Open supports a future comparison. The `cold` entry flag
means a curriculum bypass, not proof of a naive player: fire-time progress and
exposure remain in the export, so partially trained entries must not be analyzed
as fresh cold controls. A kept setup or setup link enters `revisit` Open.

Open has no required sentence or invention prompt. Both established stations
remain available. Score starts hidden; the toggle only changes presentation.
The exact incumbent score receipt is recorded in either visibility condition.
Values, RUN, VARIETY, recognition gates and precedence are unchanged. Learn shows
no numeric score. No targets or target clauses are introduced in this slice.

A lesson/stage/station transition clears recent/previous lines, partial clauses,
result, score display/best, captions, selected ghost and active attempt, returns
power to timed mode, clears MAX and restores PALLET A. Shelf and durable evidence
remain. Transitions are rejected during charging, flight, theatre or replay.
Ordinary Retry preserves the current pallet; Adjust/Recall restores the shot's
starting pallet and exact power. Learn fixes the lesson station.

## Keep and local memory

KEEP LINE is available after a resolved shot in both stages, including an
unrecognized miss. Recognition never chooses its eligibility. Four slots persist
locally; full shelves require explicit removal, with no automatic replacement.
Each entry retains exact setup, station, wind identity, starting/ending pallet,
build, exact muzzle/direction/speed launch snapshot, ordered events, terminal,
original receipt and up to 320 sampled actual trajectory points.

- **Restore** enters Open/revisit, restores the kept station/setup/starting
  pallet, selects exact power and clears MAX. It never fires or credits Learn.
  Different builds show a warning; a new physical attempt may differ.
- **Ghost** selects one stored path in Survey. It has no collision body, does
  not predict the current aim and is hidden during live play/replay. Ordinary
  Previous Line can also be visible; its separate toggle remains available.
- **Play Replay** deliberately restores the setup into Open, then animates a
  nonphysical marker along recorded samples. Playback is distance-normalized
  over six seconds, with a following viewing camera. Starting pallet is frozen;
  original event timing, camera, rotation, sound and world transitions are not
  reconstructed. Stop or completion disposes the replay meshes and restores the
  pre-view camera. It cannot fire, create a survey attempt, score or credit Learn.
- **Copy setup link** shares only setup/environment/build. Opening it enters
  Open/revisit ready for manual fire. It does not contain the historical trail
  and never auto-fires. Study JSON can carry the actual trail evidence.

Reload starts a fresh Learn session with empty recent history and curriculum
progress. Shelf and study records persist independently in dedicated Linecraft
storage and IndexedDB namespaces. Storage failure is visible; in-memory entries
remain exportable. Browser clearing or a different device does not retain them.
There is no cloud synchronization or study-export re-import contract.

## Study evidence

Fire-time tickets capture stage/lesson, progress, entry path, score visibility,
recovery lineage and available shelf capacity. Keep observations join by immutable
attempt ID and survive removal of the viewing slot. Ordinary Retry/non-Keep is
undecided, not inferred dislike. Export preserves Open's original score receipt
computed before survey evidence compaction; it never rescores normalized events.
Learn study exports omit numeric receipts. JSON includes shelf trails; CSV is an
attempt summary. Both retain orphan Keep observations if older survey attempts
were evicted; CSV flags `archivedAttemptMissing`.

All storage is separate from production, Intent and the other labs. Existing
Route Book/stamps and earned production progress are neither read nor awarded.
No export, upload or telemetry leaves the browser without a player action.

## Verification and limits

Focused module and actual-handler integration tests cover curriculum/order,
resolved-vs-interrupted progression, clean resets, Keep in both stages, exact
saved authority/reload, ghost isolation, Restore/replay, score visibility and
receipt association, namespace/progress isolation and no auto-fire links.
Real Havok verifies the three sentences without embedding QA solutions in UI.
The full build/test suite, TypeScript and lint remain required without weakening
existing tests. Frozen physics, geometry, score, RUN, recognition and Intent
source/tests are checked by diff and regression tests.

A successful headless fixture proves attainability, not discoverability or fun.
Local cloud-browser access was blocked; final rendered playability and mobile
camera/overlay quality require owner play unless hosted browser verification
establishes them. Clip export is documented, not implemented or certified.

The biggest design question remains transfer: do taught relationships produce
new player-authored intentions after the prompt disappears, or mostly repetition?

Release verification (2026-09-22): production build and **409/409 tests passed**;
TypeScript passed; lint passed with zero errors and the two incumbent mount-only
hook dependency warnings. Existing tests were not edited or weakened. Final
source includes 21 new focused module/integration tests. Score, RUN, recognition,
core physics, courtyard geometry and the original Intent files have no diff.
