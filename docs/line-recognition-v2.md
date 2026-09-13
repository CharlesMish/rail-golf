# Line recognition v0.2 — experimental

Current repairs: [v0.2.1 hardening](line-hardening-v021.md) supersedes the dock presence, flight timing, saw, reverse-bank and HUD details below. Placeholder values remain provisional.

**NON-CANONICAL PLACEHOLDERS.** Recognition captions and weights are a playtest instrument, not a final economy. No multipliers, score gates, tiers of achievement, career, or leaderboard.

Play `/lab/lines`. Production Cards 01–03, their objectives/progression/records and their physics remain frozen. Shared scene changes only add feature metadata; the switch move, extra Sky availability, physical loading-dock overlay, captions and receipts are experimental. The original powered Skip Pad is unchanged.

## Workstation control and world state

The shootable control is now beside Lumber Walk, ahead and to the world-right of its launcher, near the rear lumber bays (world x=33, y=3.5, z=142). It still controls the existing mill loading dock at its original footprint. No destination was added. The physical switch, visible face and cable lead are shared by both experimental routes.

Both deterministic dock transforms and passive Havok material remain unchanged. Card/station changes and Retry preserve the current state. Reset Card resets A; fresh lab entry defaults to A. Recall and a valid imported ShareLineV1 explicitly restore the line's recorded starting state. Thus a switch shot from Lumber Walk can change a later Yard Gate attempt. Production storage is never used by this lab.

## Recognition, not callback counting

`lib/line-recognition.js` owns the provisional `REDIRECT_GATES` and a per-projectile tracker used by the browser and HEADLESS tests. The tracker receives actual body contacts, pre-solver velocity and post-solver velocity/position. It never changes physics.

A COMMON redirect currently requires all of:

- A tagged physical feature with a real projectile contact.
- Incoming speed at least 4 m/s and immediate outgoing speed at least 3 m/s.
- At least 25° change between pre-contact and post-contact velocity.
- A contact episode no longer than 0.12 seconds.
- At least 0.10 seconds with no subsequent solid contact and at least 1 m separation from the contact point.
- Confirmation within 0.65 seconds of the episode's first contact.

Any intervening solid contact interrupts free-flight confirmation. Sustained callbacks retain the episode's original incoming velocity and start time; sliding cannot repeatedly reset the clock. Each feature can establish one redirect per launch. These conservative gates may miss very fast successive bounces or shallow but enjoyable redirects; Rail Rat can tune the constants later. They intentionally do not score a roof scrape that eventually slides off.

COMMON features: Bank A/B, mill walls/columns/roof panels, individual Cascade treads, tread-stack sides, lumber bundles, the loading dock, saw-carriage chassis, and bell-gantry posts/beam. Each has a stable feature identity and yard-language caption. Side hits on a tread can become `TREAD SIDE REJECT`, but cannot forge a top-tread sequence. No artificial normal/impulse, homing, collider enlargement or restitution tuning is involved.

Decorative boards, rails, fences and nonphysical trim are not scored. Ground, tees, ordinary target contacts, the saw blade, actual bell and the switch's plinth do not receive COMMON awards. Landing and the shootable switch have their own authority. Unrecognized real contacts remain in the raw ledger.

## Placeholder claims

All weights live in the one `PLACEHOLDER_RULES` table in `lib/line-score.js`.

| Class | Claim | Dummy value |
|---|---|---:|
| COMMON | Qualified redirect, once per feature | 100 |
| NAMED | Sky Token | 250 |
| NAMED | Skip activation | 250 |
| NAMED | Mill Route: qualified mill rebound then target seat | 250 |
| NAMED | Mill Return: qualified mill rebound reversing horizontal travel by at least 120° | 250 |
| NAMED | Direct Finish: target seat without earlier solid/mechanism/token interaction | 250 |
| NAMED | Dock Switch: physical state-changing contact | 250 |
| SIGNATURE | Qualified Bank A then Bank B redirects | 500 |
| SIGNATURE | Qualified top treads 1 then 2 then 3 | 600 |
| FINISH | Valid target seat, captioned with the destination name | 1000 |

Mill Return also requires incoming/outgoing horizontal speeds over 3 m/s. Those thresholds live with the other recognition gates. Other named/signature/finish families pay once per launch. Components and sequences coexist. A miss or Retry retains claims already established; it does not earn a finish. Direct and Sky/Skip/Mill routes are distinct, so a Sky collection does not also claim Direct.

There is still exactly one Sky Token. Its existing swept-volume authority is available from either station/all lab cards, once per shot; the next attempt restores it. It writes no production Route Book progress.

Claims appear as brief text-only captions during the shot. No live numerical combo or multiplier appears. The numerical Line Total and accounting are available after resolution or interruption. The receipt separately lists raw contacts (including callback counts), qualified redirects (including velocities, turn, separation and free time), contributed claims and ignored evidence.

Saved/share contracts remain intact. Local ledgers preserve the new qualified evidence. Old records without velocity/separation evidence do not gain inferred COMMON redirects. Share URLs still contain setup and starting environment only; different-build provenance warnings remain necessary, especially after the switch move. This is not historical replay.

## Verification boundaries

Focused tests cover repeated callbacks, sustained roof/wall contact, tangential departure, settling, interrupted separation, individual banks, ordered banks/treads, side-hit exclusion, once-only Sky/Skip, raw unrecognized evidence, replaceable values, share round trips/state/provenance and qualitative total inequalities. Real full-yard Havok fixtures establish Gallery and Cascade sequences, an existing roof route, Sky, a non-target lumber-box redirect, backwards Skip, both dock states and both switch transitions from Lumber Walk. State survives the station/card rebuild model and restores explicitly on Reset/Recall.

Production fixture files and core courtyard/launch/route rules remain unchanged. No comprehensive balance or discoverability claim is made. The in-browser WebGL playtest is for Charlie and Rail Rat; our available browser cannot render WebGL. Review shallow-angle false negatives, caption pacing, the composition of the switch/dock relationship and which unauthored lines deserve named claims next.
