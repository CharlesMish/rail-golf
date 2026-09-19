# Rail Golf lab refinements v1 — director packet

Exact v0 control: `ca1cc8fa101dba04520b7930f8c0eae8e918cf04`. This pack refines four opt-in routes; it does not promote their geometry or mechanics into production. The deployment commit is shown by BUILD on every route.

| Lab | Entry | Principal change | What the physical evidence establishes |
|---|---|---|---|
| Timber Receiver | `/lab/timber-receiver` | A shorter, lower face moved toward the far lumber bay; incumbent camera unchanged. | Three previous Gate returns survive; separate Walk approaches return into existing lumber/treads. |
| Fan & Paddle Works | `/lab/mechanism-vocabulary` | Primary wind and paddle modes, active flow cues, real READY paddle motion. | Bounded wind and repeatable SYNC; LIVE captured-phase contacts are stable in the tested envelope. |
| Travelling Tee | `/lab/travelling-tee` | Clear origin position/reference and isolated TOUR comparison. | Exact release origin and replay, with incumbent velocity and no carriage momentum. |
| Vertical Yard | `/lab/vertical-yard` | Three staggered return faces across the open vertical void. | Ascending, descending and high-return recatch families; bypass and OOB remain. |

## A — preserve the return, recover the view

The receiver is now centered at x45/y5/z134, 18 m long and 10 m high; v0 was x43/y7/z148, 26 m long and 14 m high. Thickness 1.2 m, yaw −25°, restitution .86 and friction .18 are unchanged. No ground, camera, launcher rail, scoring or OOB change.

Seven nearby candidates were screened. Babylon FAMILIAR camera projections covered both stations, three rails and three aspect ratios, including receiver-directed large-yaw setups. Maximum sampled Walk silhouette drops from 36.86% to 8.14% of the desktop viewport, and 29.78% to 6.02% in landscape mobile. These are projected solid silhouettes, not screenshots. At a useful Walk view, existing lumber/tread context points are in frame and unobstructed by the wall.

Three original Gate existing-feature → RETURN references still land back in the yard. A 216-shot receiver-oriented Walk grid produced 100 receiver departures, including 20 followed by an existing-feature redirect. This is a feasibility sample, not a player success rate. A complete Gate feature → RETURN → another-feature chain remains unestablished. Old high/right Walk shots can bypass the smaller receiver; that is intentional.

Details: [Timber Receiver v1](timber-receiver-v1.md).

## B — make the mechanism observable before firing

Source explains v0's poor first impression: OFF wind, tools-only control, static flow cues and a deliberately stationary READY paddle. No separate animation failure was established. The new primary controls are **WIND OFF / LEFT / RIGHT** and **PADDLE SYNC / LIVE**; default/reset is **LEFT / SYNC**.

Nine directional streamers visualize only the actual force volume; fan rotation and OFF's collapsed grey markers distinguish activity. Both sides of the real paddle have contrast stripes and visible pivot collars. New accents have no added collider authority.

Both modes show real paddle movement before firing. SYNC resets to original phase zero at launch, so waiting cannot change the line. LIVE captures the current 120 Hz phase. Its real Havok animated body continues from that phase. RESULT freezes it; Retry resumes; Recall holds the recorded LIVE phase until firing or explicitly selecting LIVE again. Wind changes do not silently release that hold. The nearby UI explains SYNC's deliberate reset.

Eighteen LIVE phase/speed combinations and twelve retained SYNC approaches contact and rebound in the tested envelope. Recorded-phase replay and different idle waits are deterministic. Thin, fast rotors and arbitrary cross-device bit identity are not established. The accepted Mechanism Range far frame is untouched.

Details: [Fan & Paddle Works v1](mechanism-vocabulary-v1.md).

## C — compare origins without changing the launch impulse

Modes: **3 RAILS**, **5 STOPS** (default), **FREE / STOPPED CARRIAGE**, **TOUR**. The track remains −20…+20 m. The UI shows signed position, track marker, previous-origin marker, and a Last origin action that restores position while preserving current aim and power.

TOUR moves at 2 m/s with predictable reflected endpoints, a 40-second full cycle. Aim and charge remain available during travel. Release synchronizes the clock before recording the exact origin; the shot receives the normal launch impulse with **no inherited platform velocity**. Flight/result hold the origin. Retry and Recall park exactly at the recorded origin; Resume TOUR deliberately resumes timing. Survey holds travel; window blur pauses it and prevents hidden-time catch-up. Reset returns to centered 5 STOPS.

Actual Havok tests compare muzzle and first-step velocity against the incumbent stopped launch and repeat recorded trajectories exactly. Camera comfort is still a human question. TOUR is an optional comparison, not a replacement for stopped play.

Details: [Travelling Tee v1](TRAVELLING-TEE-V1.md).

## D — vertical travel as a choice of returns

Three timber faces occupy separated positions around the void: low cheek at (−10,17,43), opposite middle cheek at (12,28,64), rear cheek at (−12,29,95). Each has a different pitch/yaw and narrow honest support posts. There are no mandatory sequence tokens or points. Original apron, terraces, gantry, far receiver and bounds remain.

A coarse 504-shot grid found 52 broad-face departures across 20 ordered families; 87 shots still ended OOB. Established families include low → higher opposite cheek, middle → low descending return, and gantry → far receiver → rear cheek on descent. Different powers from the same origin and aim lead to different regions; the faces do not impose an automatic chain. Most scanned shots bypassed them.

A shallower low face mainly sent shots back toward the apron; a −65° orientation was selected for better onward cross-space returns. The rear face was kept near gallery height to catch a descending line rather than adding another high obstacle in the initial ascent.

Details: [Vertical Yard v1](vertical-yard-v1.md).

## Shared review and verification

The launcher and Rail Round remain the incumbent builders. Spatial-lab track/machine/steel/accent materials now use the exact same material objects as that equipment; world timber palettes and silhouettes remain distinct. Receiver uses the existing courtyard renderer. No projectile/launcher physics fork was added.

Optional prelaunch and idle callbacks let the experimental session capture phase and animate READY. Without those callbacks, accepted Mechanism Range follows its previous path. TOUR's origin clock never advances Havok or adds projectile velocity. The familiar Fire/aim/MAX/recovery controls stay outside the scrolling experiment/tool area so additional controls do not push Fire below its scroll fold.

- Full verified production build and **376/376 tests pass**.
- Typecheck passes. Lint: no errors, only the two existing `MannersGame` dependency warnings.
- Focused suites: receiver 10, fan/paddle 17, tee 16, vertical 14, shared refinement 6.
- Tests cover actual Havok returns/transforms, animated contact/replay, origin capture/recovery, same launch velocity, camera projections, open bypass/OOB, material identity and the frozen physical reference fixtures.
- Accepted Timber Courtyard/Open Line source, Cards 01–04, scoring, recognition, RUN/VARIETY, Kicker, progression, and the accepted Mechanism Range geometry/controls/presentation are unchanged.
- Exact v0 remains recoverable at the control commit; no history rewrite or baseline replacement.

## Manual review and stop

The available hosted browser reports WebGL unavailable. No rendered visual success or playable screenshot is claimed. DOM and deployment checks cannot substitute for Charlie's rendered play.

**First five minutes: Fan & Paddle Works.** It previously failed before a meaningful playtest could begin. Wait ten seconds: can the direction/extent of flow and the reflector's movement be understood without Shot Tools? Compare SYNC and LIVE only after that. Then try receiver-directed Walk aiming for context, TOUR for comfortable timing, and Vertical Yard for intentional ascent/descent choices.

Still uncertain: the receiver's noticeability from Gate; whether SYNC's reset reads clearly; TOUR's sporting feel versus extra timing burden; whether the ladder supports leave the void visually readable. These should be answered in play before more geometry, labels, points or progression. All four refinements stop here.
