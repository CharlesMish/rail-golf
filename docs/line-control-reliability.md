# Line lab control reliability

Baseline: `8e3bb464d145fca5d312ba71aee33c20e083d931`.
Scope: `/lab/lines` interaction and evidence authority. No scoring, claim, RUN,
VARIETY, Kicker geometry, station transforms or production progression changes.
All lab score values remain **NON-CANONICAL PLACEHOLDERS**.

## Findings

- **Confirmed stale survey metadata:** the scene's mount-only effect captured the
  initial React `hole` for `surveyLog.begin`. The muzzle read `holeIndexRef` and
  the live station. Thus real card/station changes could still export
  `mill-delivery / gate`. This is sufficient to explain the contradictory survey
  metadata; it does not prove which buttons Rail Rat pressed. Old tickets remain
  immutable and are not retrospectively relabeled.
- **Confirmed Adjust misrouting:** `reset(true)` entered the diverter reset branch,
  ignored `restore`, reset A and default aim, and rebuilt the course twice through
  `retry` followed by `loadHole`. Lab Adjust now restores the remembered setup,
  exact power and starting environment in one rebuild. Retry preserves the current
  environment and MAX. Reset restores A in one rebuild. Each interrupts/saves a
  live shot before replacing it.
- **Confirmed guard/UI mismatch:** utility Reset was disabled outside ready even
  though the lab handler accepted the other live phases. It is now available
  during flight/theatre; result has its own foreground Reset and Retry controls.
- **Confirmed layering risk:** forensic receipt z36 could cover result z15 or the
  shot tools. The result now owns one foreground surface with an inline expandable
  receipt. Its background is inert and a backdrop catches pointer gestures. The
  setup receipt collapses by default and disappears while shot tools are open;
  tools rise above other setup panels. Closed tool bodies cannot receive input.
- **Input audit:** no timer/physics auto-next-card path was found. All next/select,
  reset/retry/recall controls now use the lab dispatcher. Native pointer clicks
  must match their pointer-down control and state revision. Phase changes,
  replacement controls, cancelled and duplicate gestures reject the click.
  Lab hotkeys defer to focused inputs/buttons/summaries/contenteditable elements.
  Keyboard charge release requires a matching owned key-down; button key events
  do not also reach the global charge handler. Held Enter/Space does not repeat
  activation. Ordinary production handlers retain their original behavior.
- **Exact shot-4 / shot-16 outages: NOT REPRODUCED.** The available hosted browser
  reports WebGL unavailable. These source-confirmed defects and targeted tests
  do not prove the cause of each observed inert click. No action-ref disappearance
  was found; refs are installed once and cleared on actual scene unmount.

## Fire-time invariant

`captureLabLaunch` takes the current authoritative card/station, aim/power and
starting pallet state. Its immutable muzzle/direction drive the actual Havok
launch, and the same snapshot supplies the survey ticket and saved-shot identity.
Tickets now also retain muzzle/direction. The displayed active card/station uses
that same card array and index. Open Line station buttons have an explicit selected
appearance. Shared-entry and automatic resume transitions are traced separately.

## Local action trace

Separate from the unchanged 2,000-attempt / 64 MiB IndexedDB archive and its
write-ahead journal. Local storage retains up to 5,000 actions / 1 MiB, shared
across tab/session keys; older sessions/entries retire when either bound is reached.
Exports report retirement and storage failures. Available action history can thus
be shorter than attempt history. No network/telemetry.

Entries include build, session, sequence, wall-clock timestamp, monotonic time,
action/source, request, accepted/rejected reason, and before/after phase, card,
station, pallet, setup and current attempt ID. Sources are pointer, keyboard,
restore/share, or internal/programmatic. Trusted zero-detail activations are
classified as keyboard (also includes assistive activation); synthetic script
clicks are programmatic. Aim repeats/physics callbacks are not journaled. Fire
snapshots retain exact aim. Phase, launch, scene load and disposal records expose
internal transitions. Unexpected handler exceptions are reported, not swallowed
as an inert control.

**EXPORT SURVEY · JSON** adds `actionTrace` alongside unchanged attempt `records`.
Attempt CSV stays unchanged; **Action trace · CSV** exports the action table.
Explicit Clear Survey Log confirms clearing both diagnostic logs, leaving saved
lines alone. Export remains possible when graphics initialization fails.

## Verification

- 40 repeated control cycles / 120 launch tickets exercise Open Line Gate/Walk,
  charge/fire, theatre/result, Adjust, Retry, Reset and other-card/return actions
  through the same dispatcher and single-rebuild return helper used by the app.
- Every live phase permits Reset/Retry; unavailable/throwing/phase-rejected handlers
  produce explicit diagnostics and remain recoverable. No fake attempt is added
  for ready/charging without a launch; interruption saves before replacement.
- Detached fire snapshot and real Havok Gate/Walk fixtures prove recorded muzzle,
  direction, station and setup match the physical launch. Explicit snapshot-driven
  impulses reproduce the pre-existing station helper path exactly.
- Gesture ownership rejects stale, cancelled, wrong-control and duplicate clicks.
- Action immutability, reload/export, count/byte bounds and blocked storage tested.
  Existing survey persistence/export tests retain their original authority.

These are control/state and real-Havok regressions, not a claim of a successful
120-shot WebGL browser run. Charlie's next manual benchmark should retain action
JSON on any new failure before attempting a reload.
