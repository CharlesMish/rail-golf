# Survey reliability and Kicker Pallet

Baseline: `5d6a715a7ac12a6bb967e812e053f031fbbc646b`. Route: `/lab/lines` only.
All score values remain **NON-CANONICAL PLACEHOLDERS**. No weights, redirect gates,
production objectives, progression, station transforms, launch physics or existing
colliders were changed. Dedicated diverter labs retain their default geometry.

## Survey storage / export

Shot tools now contains EXPORT SURVEY (JSON), CSV summary, and an explicit,
confirmed CLEAR SURVEY LOG. Card/station changes, Retry and Reset never clear it.
Each launch receives a UUID session + monotonically increasing session sequence.
Resolution/interruption snapshots the complete receipt and starting setup/state
before changing the recent-shot UI/history. Repeated finalization of one launch
cannot create another attempt.

A synchronous localStorage write-ahead journal precedes an IndexedDB transaction.
The journal is removed only after archive commit; reload recovers pending entries,
with an archive unique-ID index preventing duplicates after a commit/crash race.
The archive retains up to 2,000 attempts or 64 MiB, evicting oldest first and
reporting the eviction count. The temporary journal is capped at 2 MiB; the memory
fallback at 2,000 attempts / 64 MiB. Storage failures show a visible warning and
exports include surviving pending attempts. Browser storage is local to the origin
and profile: clearing site data, browser eviction, or moving machines still requires
an export backup. This is not cloud synchronization.

JSON contains build, card/station, exact rail/yaw/elevation/power/speed, starting
floor state, timestamps, ending, target clear, full award IDs/tiers/values/indices,
VARIETY, RUN and qualified metres, unique feature count, normalized recognition and
rejection events, ignored-reason counts, and compacted physical contacts. Contacts
are grouped by body/surface with observation count, first/last source indices and
first/last points. Receipt indices refer to the ORIGINAL ledger; retained evidence
carries `sourceIndex`. The receipt is computed before compaction. Unusually large
records truncate diagnostics explicitly (96 KiB budget, omitted counters); they
never change totals. CSV provides one summary row per attempt, with matching totals.
The recorded full trajectory remains in the existing saved-line tooling.

## Calibration (real shared Havok authority)

`tests/survey-calibration.test.mjs` contains source-only references, not walkthrough
UI. The exact Lumber bank-zero probe reproduces 0 three times: real Bank B upper-edge
contact, approximately 8.12° velocity turn, >4 m separation, sufficient free flight.
Its reason is `turn-too-small`, against the unchanged 25° gate. No recognizer fix or
threshold relaxation is justified by this case.

Known Skip + Mill Bell, strict top/top/top TREAD RUN + receiving seat, and the
separate top/side/top CASCADE LINE all pass. The supplied negative tread probe gives
a side reject and finish, without a false strict TREAD RUN. Receipts match before
and after adding the pallet. Existing production/Havok fixtures run in the full suite.

Charlie's rounded Gate candidate is retained, but does NOT reproduce the reported
1350 family: it currently reaches Bank B and totals 150. Trying the opposite yaw sign
also did not reproduce it. This is not evidence against the human discovery; an
exact share link/receipt is needed to establish that particular regression. The
candidate itself is unchanged by the overlay. No Sky/score rebalance was made.

The hosted baseline was opened in the available cloud browser, which reported
“3D graphics are unavailable in this browser.” Consequently these are shared-scene
HEADLESS authority results, not a claimed rendered-browser flight calibration.

## Kicker Pallet

One timber pallet on the open west apron, before the existing loading platform:
center (-32, .5, 39), 10 × .8 × 8 m. Switch beside it at (-39, 2.2, 35). No ground
extension or new target. Board joints and two state-colored bands distinguish it
from a second roost. The floor is solid, not a hollow visual pallet with hidden holes.

A is level. B rolls -18° and raises its center 1.53 m, keeping the low edge above
ground. Real static Havok collider replacement occurs AFTER the physics step.
One physical switch contact changes A↔B once per launch. Retry/cards/stations keep
state; Reset/fresh entry restore A; recall/share restore the launch's starting state.
ShareLineV1 `environment.floor` now denotes this pallet in `/lab/lines`; build
provenance warnings remain important for older links whose environment was inactive.

The pallet uses the existing 100-point COMMON gate and once-per-feature protection.
Switch use retains the existing 250-point switch family, captioned PALLET SWITCH.
References verify actual A↔B contact, useful pallet departures from both stations
in both states, repeatability, reset/share restoration, and different outgoing
velocity for the same setup across states. A Lumber reference uses the original
Skip Pad and pallet in the same launch.

Powered strip deliberately omitted. The existing Skip authority is a horizontal
swept surface with world-vertical recovery; a rotated strip cannot simply reuse that
contact plane/impulse unchanged. It would require a separately verified local-frame
adaptation or risk double application with the physical pallet. The passive version
already supplies the requested cross-yard vocabulary without changing boost physics.
