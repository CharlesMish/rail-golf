# Guest Stone — numerical evidence appendix

This appendix reveals tested setups. The owner invitation is in [persistence.md](persistence.md). All rows use the middle rail (`railIndex:1`); power is the UI percentage, not a force applied to the stone. Each individual study starts at home unless stated otherwise.

| Study | Yaw | Elevation | Power | Contact family |
| --- | ---: | ---: | ---: | --- |
| Central | 0° | 8° | 55% | Stone → pavement |
| Left flank | −5° | 8° | 55% | Stone → pavement |
| Right flank | +5° | 8° | 55% | Stone → pavement |
| Strong central | 0° | 5° | 100% | Stone → pavement |
| West-bank access | −50° | 10° | 85% | West bank → stone → pavement |
| Far-bank return | 0° | 20° | 85% | Far bank → stone → pavement |
| Clean miss | +25° | 8° | 55% | Pavement only |
| Low energy | 0° | 8° | 15% | Pavement before stone |
| Overhead miss | 0° | 55° | 75% | Out of bounds |

The central, left-flank, right-flank and west-bank families retained their contacts for each of the six single-variable neighbors (yaw/elevation ±0.5°, power ±1%). The far-bank return missed the stone at elevation 20.5°. At 86% it still hit but moved the stone only about 0.187 m toward the player, versus 1.093 m at 85%.

## One contact in detail

Central stone callbacks begin at simulation time 0.575 s, point approximately [0.000034, 2.392735, 20.607601], reported normal [0.00001845, 0.000000139, 1]. The previous-step ball velocity is [0, −3.225635, 26.144524] m/s. The solver's first outgoing sample has z velocity +9.555126; the continuing callback at 0.583333 s leaves [−0.003213, −2.340693, −5.984035] m/s. A collision spans substeps: selecting only the first callback would obscure the actual inward rebound. Ground callback occurs at 0.991667 s; the accepted first-ground record ends at 1.000 s at [−0.001340, 0.429999, 17.838839]. The prop is held at 1.633333 s, center [−0.000439, 1.999987, 24.976385].

Raw callback times are the accepted flight elapsed time before that fixed step's increment. Incoming velocity is the preceding step sample and outgoing is the actual post-step body velocity, not an analytically predicted reflection. Raw normals follow Havok's callback orientation. See the JSON for all callback rows, including continuing contacts.

## North delivery

From home, fire eight successive shots at yaw 0°, elevation 5°, power 100%, choosing Next shot between blows. The stone's successive z coordinates are approximately 26.4614, 28.9008, 31.3340, 33.7684, 36.1806, 38.5884, 40.6882, 40.7581 m. The last center is x≈−0.526 m, against the receiving cradle. Each next record's before-state exactly equals the preceding record's settled state.

## Eastern delivery

From home, all at 100% power, use these successive yaw/elevation pairs:

1. −50.5° / 5°
2. −50° / 5°
3. −49.5° / 5°
4. −49.5° / 8°
5. −50° / 8°
6. −50° / 8°
7. −50.5° / 8°
8. −50.5° / 8°
9. −50.5° / 8°
10. −50° / 8°
11. −51° / 8°

The final center is approximately [12.7680, 1.99999, 32.6099] m, at the alcove mouth. The next tried shot, −51.5° / 8° / 100%, hits only the west bank and pavement. It does not complete a fictional delivery deeper into the alcove. No automatic sequence is supplied in the playable UI.

## Reproduce

Run `node scripts/playgrounds/measure-persistence.mjs` to regenerate `persistence-evidence.json` from the current runtime SHA. Run `node --test tests/playgrounds-persistence.test.mjs` for lifecycle, ordinary-detent neighborhoods, fresh-scene/frame-partition reproduction, retirement contrary tests, cleanup and saved-record validation. The measurement script also preserves the failed/no-stone grid and isolated carriage comparison.
