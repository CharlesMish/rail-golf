# Linecraft graduation slice — handoff and runtime contract

## Graphics borrowing from Claude's yard polish (isolated experiment)

The comparison started from our three-pad/low-stack branch at `6be94f7572`,
with current `main` at `825bbe9678`. Claude's `claude/timber-yard-polish` commit
`f708485015` forked that main, which still had the two-pad/tall-return geometry.
Its visual ideas are adapted onto the latest yard rather than merging that
older geometry into the experiment.

Linecraft alone now uses Claude's warmer indirect ground light, finer and
lower-contrast mipmapped timber grain, soft tiled dirt, and dusk sky gradient
with a matching fog horizon. The dirt tile is drawn once and shared at the
two footprint scales, with explicit repeat wrapping. The sky is not pickable
and has no physics or recognition authority. The outer ground apron was not
carried over: its lack of collision would imply playable ground beyond the
fence. The vignette was also left out to keep the line and yard edges readable.

The three pads, low lumber stack, controls, cameras, storage and scoring remain
as in the previous preview. Production and every other lab retain their visual
setup. A real Havok before/after check preserves the exact bank, full-tread and
Open fixture results under the new presentation. Headless texture/mesh setup
checks are not evidence of rendered appearance or phone performance; owner
play must judge the sky palette, distant visibility and texture scale.

## Three-pad and low-stack yard follow-up (isolated experiment)

After playing the two-pad version, Charlie asked to try a third magenta pad on
the center strip nearer the banks, leaving both existing pads in place for a
direct comparison. The third pad is centered at x = 0, z = 62, away from the
original x = 0, z = 84 and side x = −15, z = 84 pads. Its swept contact uses
the same boost impulse and once-per-shot authority. A pad remains an invitation
to try a line, not a required lesson target.

The x = −11, z = 120 mill-side return is now a low, wider lumber stack: 5.8 m
wide, 3.6 m tall, 12 m deep. Its one physical body retains the previous lively
restitution and qualified-redirect rules; the end grain and straps are visual.
The tall right-hand Timber Receiver remains. The lower silhouette should open
more angles toward the mill and the yard behind it. Owner play should judge
the actual sightline and whether all three pads remain useful. This change is
Linecraft-only; production and the other labs retain their geometry.

Old Shelf trajectories remain intact. A re-fired saved setup can meet the new
pad or stack and produce a different line, so the existing build-mismatch
notice remains meaningful. Headless fixtures verify collisions, qualification,
the taught lines and Open reachability, but cannot establish rendered framing.

## Owner-play yard and dock tuning (isolated follow-up)

Charlie marked two physical opportunities in the v0.2.1 yard and found that
the aiming console and stacked top chrome obscured too much of the shot. This
branch tests those observations without replacing the courtyard or declaring
the arrangement final.

Linecraft alone now draws a second magenta pad at x = −15, z = 84 alongside the
original x = 0 pad. Both are visual swept-volume pads, not rigid catch bodies;
either triggers the same incumbent boost impulse on descent, at most once per
shot, before a later first-ground event. The original pad remains in place.
The established Timber Receiver face at x = 45, z = 134 is reused on the right.
A short matching timber return face at x = −11, z = 120 provided a distinct
physical surface in the open middle/far area in that preview. Both faces used real static
Havok colliders and the existing qualified-redirect vocabulary. No new award
weight, target, rule, or forced line is introduced. These geometry choices are
provisional; owner play should decide whether either face or pad earns its place.

The lesson is a slim single strip, with Skip/Next/Restart quiet alongside it.
Shelf stays in one utility position across address and result. The large
LEARN/score display and separate pallet chip are removed from Linecraft's top
chrome; the actual pallet state remains visible inside the compact shot dock.
The dock uses one metric/MAX row, short power track, origin slider, and
fire/fine-aim row. Shot tools stay collapsible, and the introductory hint
disappears after a resolved shot. Portrait and short-landscape layouts stack
these controls rather than squeezing the values into unreadable columns.

Historical Keep/Restore preserves the exact old launch setup and recorded
trajectory. Re-firing a restored setup in this new physical environment can
produce a different line if it meets the newly added surfaces; build mismatch
warnings remain important. Storage schema, lesson qualification, score values,
RUN, VARIETY and first-ground semantics are unchanged. Production cards, root,
and other labs do not receive the extra geometry or the compact dock.

Headless physics/UI tests establish authority and reachability, not actual
framing or comfort. Charlie should compare desktop and phone, both stations,
the two pads, both return faces, and post-shot line visibility in the hosted
preview before a further geometry decision.

## v0.2.1 continuity preflight (same experimental branch)

This bounded follow-up tests **Line A → local Explore → Line B → Open**. It
does not establish a mandatory product ladder. After a qualified BANK A →
BANK B completion, **Explore Here** is primary; **Next Lesson** stays available
for players who want Lumber Walk immediately. Explore remains at Yard Gate,
removes the required sentence and uses the same launch-origin equipment. It
preserves the resolved line as visible Previous Line, including its actual
trajectory, contact history, exact origin/aim/power and starting pallet state.
It does not Keep the line automatically. During Explore the quiet Next Lesson
control starts the tread lesson at Lumber Walk and clears temporary working
history at that deliberate station boundary; the Shelf and study records stay.

After the full TREAD 1 → 2 → 3 lesson, **Explore Here** starts final Open at
Lumber Walk with the successful tread line intact. Both existing stations are
then available. Incomplete Learn results and exploratory results still make
Adjust Last Line the primary action; Keep remains universal and quiet. A cold
Skip to Open and a kept-line Restore continue to enter distinct Open paths.

Fire-time tickets and exports identify Yard Gate Explore with stage `explore`,
`openEntry: local-explore` and no active lesson. It cannot credit the next
lesson, imply mastery, or create a new score objective. Final trained Open,
cold Open and kept-line revisit retain their existing entry identities. The
session still starts fresh on reload; no public returning-player contract has
been added. Historical Shelf entries and raw quarantine behavior are unchanged.

The launch console now gives the origin slider a separate compact full-width
row above the three-column origin arrows / FIRE / fine-aim row. The hidden Sky
Token no longer contributes Linecraft contacts or evidence; production and
other labs retain their aerial-token vocabulary. After a Linecraft result the
camera moves to the station's established Survey frame, leaving live flight
and impact theatre behavior untouched. This framing and responsive layout
still need owner play on a real desktop and phone; headless tests cannot
establish visual legibility or discoverability.

The central question remains whether taught relationships generate new
self-authored intentions in Open or mainly repetitions/variations of taught
routes. Local Explore is a smaller test of how the previous physical line
supports revision after the requirement disappears.

## v0.2 owner correction (experimental branch)

Owner play of v0.1 found that three lessons behaved as two meaningful physical
relationships. The active Learn sequence is now BANK A → BANK B, then the full
TREAD 1 → TREAD 2 → TREAD 3. Reaching the second tread is useful partial
progress within Lumber Walk. The qualified redirect gate, actual out-of-order
evidence, and first-ground rule are unchanged. An attempted lesson can still be
skipped; completing the second leads to Open without a mastery award.

Keep worked as a capability but its result button was over-promoted. In v0.2
each result has one prominent action: Adjust Last Line on incomplete Learn/Open,
Next Lesson after the first completion, Open the Yard after the final completion.
Keep remains available on any resolved line, including an unrecognized miss,
in a quiet, consistent position. Shelf lives in utility chrome and the first
Keep opportunity gives a single inline explanation. Lower Keep frequency after
this change cannot be interpreted against v0.1's prominent button as diminished
interest. Study exports and the provisional score toggle live in the Shelf's
collapsed Study tools section.

Owner play also found that instrumentation crowded the world, inactive roosts
looked like goals and restricted origins interfered with imagined Open lines.
Linecraft hides inactive colored roost assemblies and the existing Sky Token;
production retains them. A future authored endpoint and smaller aerial-token
experiment remain possible, with no new gameplay in this branch. The new
stopped launch-origin control serves both Learn and Open: −10 to +10 m at each
station in 0.5 m steps. It preserves aim, power and pallet state when moved.
The span is an initial geometric/physics choice; rendered camera and end-range
usability require play verification. No Travelling Tee modes or moving release
were ported.

New Linecraft setups save `originX` explicitly, while old three-position setups
map exactly to −4/0/+4 m. Shelf v1 remains readable, including historical
`tread-pair` entries; these keep their original identity and two-clause meaning.
New Linecraft setup links use version 2; version 1 links remain accepted and
restore the same muzzle. Per-entry loading preserves valid Shelf and Keep journal
neighbors; damaged raw collections are copied into a separate quarantine key
before a partial collection can be written. If preservation fails, new choices
stay in memory and cannot overwrite the original raw bytes. Browser-local
namespaces remain isolated from production and other labs.

Reload still resets Learn progress for this study. A future representative
public build needs a separately versioned remembered-completion contract and
an explicit Restart Lessons control; do not promote this reset behavior to the
public root as-is. A representative public build and the final architecture are
separate decisions. Current owner question: **Do taught physical relationships
produce new self-authored intentions in Open, or mainly repetitions and
variations of taught routes?**

### v0.1 contract retained for historical context

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
