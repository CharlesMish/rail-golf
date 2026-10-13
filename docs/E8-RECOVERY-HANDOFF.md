# E8 recovery semantics — advisory handoff

Reviewed `studio/e8-approach-prop` / PR #49 at
`7279cd025e73da2f5ac297bcd1649d6217d48ce0`, against main
`cd9d41ddf6349b47e8d0035fd1707299ac255d55` and the Round 6 director packet.
Studio owns implementation and Q2. This correction pass does not edit E8.

## Verified findings

- `app/approach-prop-lab.tsx` computes Continue eligibility from `yardChanged(after.lean)`. That predicate compares against the authored standing angle, not `timberBefore`. An unchanged down-to-down shot therefore offers **Continue in Changed Yard**.
- `approachMemory` in `lib/approach-prop.js` always supplies `environment.floor: 'A'`. The Adjust adapter restores standing, even when the saved `propAtAddress` was down. Recall restores that saved pose; Retry restores the live pose. A direct probe of the original policy with saved/current lean 49.997° confirmed all three outcomes. The existing recovery test explicitly expects the divergent Adjust behavior.
- Adjust promises the “starting state,” while the header always says the timber “stands.” Both can be false. The projected pin already follows the actual pose; state indication can build on it.

## Recommended contract

| Action | Environment | Setup |
| --- | --- | --- |
| Adjust Last Line | Immediately preceding shot's captured starting environment, standing or down. | Its station, aim and exact power. |
| Continue in current yard | Settled current environment, adopted for the next address. | Current setup. |
| Restore historical line | Selected record's starting environment. | Recorded station, aim and exact power. |
| Reset address | Authored initial environment. | Initial setup. |

Restoration does not fire or erase history. Missing/incompatible snapshots must not silently become “exact” restores. Keep last committed shot identity separate from selected history identity.

If Retry retains its existing current-yard behavior, describe it as reusing the setup in that yard. Interrupted Retry currently rebuilds at the instantaneous pose and zeroes motion: explicitly define that interruption behavior, or settle before addressing. It does not preserve continuous dynamics.

Maintain two separate facts:

1. **Current environment:** standing, down, or another measured pose. A restrained “Timber down” cue can describe state without explaining the shot. Do not call every displacement a ramp: backward rests near −22.9° also occur.
2. **Latest shot's effect:** compare captured before and settled after using documented tolerances. “Timber moved on this shot” requires that difference. Neutral Continue can remain available after every shot; emphasize “changed” only when this shot changed it.

Use an E8-local environment snapshot rather than overloading shared floor A/B tokens. Include station/card, snapshot version, pose and relevant hinge/sleep state. Current address paths hold zero velocity; document that invariant. Preserve production storage and recovery contracts.

## Studio verification

Cover standing→down, down→same down, down→different pose, standing→unchanged and backward displacement. Adjust and historical Restore must reproduce their respective starting snapshots; Continue/Retry must retain the chosen current state. Check copy, interruption, station changes, legacy snapshots and recording exit. Replace the existing Adjust-expects-standing assertion deliberately.

Referee the revision before separately conducting matched-familiarization Q2. R6 establishes agent exposure and some clearance interpretation, not human ramp understanding. Treat deliberate clearance as potentially meaningful intent rather than requiring ramp vocabulary.
