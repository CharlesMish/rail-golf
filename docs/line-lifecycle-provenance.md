# Line lab lifecycle / trace authority

Baseline: `e5842a7c5c368b8ac6b8b8de64fdd5d5d16c3d12`.
This is a zero-shot diagnostics pass. Scoring, recognition, RUN/VARIETY, Kicker,
physics, production Cards 01–03 and the survey attempt archive are unchanged.

## What was and was not found

The reported Open Line → Delivery incident is **NOT ESTABLISHED** as a MAX bug,
a same-document remount, or a browser reload. Old exported action sessions do not
identify their originating documents/tabs; merged retained sessions cannot prove
one visible page repeatedly remounted.

No application MAX → card/navigation/reinitialization path was found. The actual
MAX handler only calls `maxLatchAfter` and its React state setter. The `/lab/lines`
route has no reactive component key; initialization has an empty effect dependency
list. Normal setup changes do not call a router refresh, navigation or reload.
There is no application error-boundary reset or context-loss reconstruction path.
Babylon's installed engine restores its GL resources after context loss, without
asking React to reconstruct the game. Explicit links/navigation, external browser
reload/discard, framework recovery, and developer effect replay remain distinct
possibilities; this pass does not attribute the historical event to any of them.

Two preparatory changes address actual authority weaknesses:

1. The former card ref and React index were updated separately. No sustained
   committed divergence was reproduced, but that arrangement allowed a transient
   publication window. The lab now uses `createLabSelection` with
   `useSyncExternalStore`: rendered card/station, controls, course selection and
   launcher lookup all read the same immutable selection snapshot. Production
   still uses its existing ref/state path.
2. A rejected asynchronous initialization could enter its catch after disposal.
   In the lab it now records `initialization-abandoned` in the original mount's
   trace and cannot overwrite newer UI. Listener cleanup returned after disposal
   is immediately applied. This is not evidence that the historical incident was
   caused by a rejected Havok promise.

The committed card label's DOM attributes are checked after React commits and
before user control actions. A mismatch produces an explicit `state-divergence`
row and visible `STATE DIVERGENCE` banner; the user action is not run. Alignment is
recorded separately; no automatic card repair occurs. `visible-selection` rows
record actual committed card/station changes, not every render or MAX toggle.

## Identity

Every new row receives:

- `tabId`: sessionStorage identity, stable through ordinary same-tab reloads.
- `documentId` and `timeOrigin`: fresh for each Document; stable across component
  mounts and bfcache return to that same Document.
- `componentId`: stable for a mounted React component, including effect replay.
- `mountId` and per-document `mountNumber`: fresh for each game authority effect
  start. Same component ID + new mount ID indicates effect restart, not necessarily
  a new React component.
- existing action `session`, sequence and build.
- current URL/path/hash, visibility, `wasDiscarded` (null when unsupported),
  navigation type and readyState.

Tab identity contains no selected card, station or shot setup. Startup still uses
existing saved progress/share behavior; this does not add automatic Open Line
resume. An accessible opener's copied session identity is separated before the
first row. A local BroadcastChannel detects remaining concurrently active cloned
lab tabs; the newer document rotates its tab ID and records
`tab-identity-collision`. Only identity tokens/timeOrigin cross that local channel,
never traces or gameplay data. The channel closes during pagehide/freeze and
reopens on pageshow/resume to avoid confusing bfcache documents with live tabs.
When storage/channel support is absent, exports disclose the limitation. A cloned
tab whose source is inaccessible/inactive may share a tab ID until both lab tabs
can exchange probes; document IDs remain distinct. Do not equate a tab ID alone
with a browser-native guaranteed tab identifier.

## Lifecycle

Native listeners record `pageshow`/`pagehide` with persisted, visibilitychange,
freeze/resume, popstate, hashchange, error, unhandledrejection and canvas WebGL
context lost/restored. No handler prevents an event, suppresses an exception,
navigates, reloads, changes selection or changes physics. beforeunload is omitted
because an observational listener can impair bfcache behavior.

`authority-mount`, `lifecycle-observer-start`, initialization failures/abandonment,
existing `session-entry`, and normal `session-dispose` complement browser events.
The observer starts before Havok initialization. If pageshow already happened,
observer-start explicitly says so; no synthetic pageshow is invented. Hard process
loss may write neither pagehide nor dispose. Subsequent document/navigation IDs
and wasDiscarded provide separate evidence, not a guaranteed crash diagnosis.

Each effect captures its own trace object: an old async completion cannot silently
append into a new mount's action session. Action, lifecycle and diagnostic rows
have distinct categories and keep the original before/after authority format.

## Exports

Shot Tools has a trace identity/count and **Action trace scope** selector:

- Current mount only (default).
- Current document.
- Current tab history.
- All retained traces.

Scope applies to `actionTrace` in survey JSON and Action trace CSV. Survey attempt
JSON/CSV remains complete and the existing archive is untouched. Trace JSON v2
includes the selected scope, explicit active identity, grouped session summaries,
retained-total count and legacy-without-identity count. Old rows are never
retroactively attributed; they appear in All retained traces only. CSV includes
tab/document/component/mount, browser context, category and event detail.

The existing 5,000-row / 1 MiB trace retention stays bounded independently of the
2,000-attempt / 64 MiB archive. Hard-loss and storage-limit caveats still apply.

## Verification

Focused tests exercise identity continuity across reload/remount/bfcache/new tabs,
opener/BroadcastChannel cloning, native event capture and cleanup, no default-event
suppression, all four export scopes and legacy isolation, explicit divergence and
alignment evidence, and a shared Card04/Gate/Walk snapshot under 500 MAX/Survey/tool
toggles. An AST/source regression inspects the actual MAX handler and mount-only
initialization effect. Existing control-session/Havok and production fixtures run
unchanged. These checks do not stand in for a WebGL-enabled zero-shot human probe.
