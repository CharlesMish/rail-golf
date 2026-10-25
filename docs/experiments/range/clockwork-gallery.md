# Clockwork Gallery (range lane, optional)

Feasibility only. This file does not measure players, and it does not establish that a person can time the shot. It records one preset, one motion law, and one headless Havok sweep of launch phase.

Research question: can the travelling-bell kinematic driver carry a second pose — a wooden figure circling a turntable — without a new shot model?

Cut from `lab/wc-range-integrated-20261024` at `6cf951576d29cd051109d119e1d11381aeae0450` onto `lab/wc-range-clockwork-20261025`. The motion code that was swept is `e5e1fd2e77facf53ed1aac1165cba92253102d34`. No pull request, no merge to main, no deploy. Travelling Bell is unchanged.

## Why this did not stop

The bell already moves a Havok `ANIMATED` body with `setTargetTransform` from a pure function of release phase plus flight seconds. The session step is 1/120 s. A circle in the horizontal plane uses that same call. The collider yaw stays the stored offset (0 on this preset), so the box does not spin as a physics degree of freedom. The head turning to face outward, the wobble, and the hearts are child meshes. They are not aggregates. The timber knock is the existing timber voice. None of those write friction, restitution, or the projectile.

A pendulum was the other obvious clockwork motion. It would rotate the collider every step. The circle does not, so it stayed inside the driver the bell already qualified.

## Preset

Catalog id `clockwork-gallery`, name `Clockwork Gallery`, goal `target-contact`. Canonical export: `docs/examples/worldcraft-clockwork-gallery.json`. Preset hash `eb47730a273ce2b3bf59c51af59c630422153a3fe6ba8414111fdf92aac9ba77`.

Opening layout, both pieces locked, allowance empty. This placement misses on every coarse phase. It is not a solution.

| Piece | Place |
| --- | --- |
| plinth | (−16, 32), yaw 0° |
| side-screen | (18, 62), yaw 0° |

Launcher origin 0 m. Fixed rail: yaw 0°, elevation 18°, charge 0.55. The player's lever on this preset is the release phase. Pieces and aim stay put. Enter: header **Range** → **Clockwork Gallery**. Reset: **Reset preset**, which also returns the phase to 0.

`worldcraftPinResult` returns null because the goal is not `first-ground-zone`. The receipt says the hearts popped, or that the figure was not touched, and it says **No score.** The `scored` flag on a `target-contact` goal result is that predicate (a ledger contact happened). It is not a production score.

v1 world-export identity of house, orc, starter, and empty is unchanged: `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

The travelling-bell example document is unchanged. Its preset hash is still `7b3c95341d131c8d6bc2e16a5a444a2b2f4411ce883be6cef9f8c2589372345e`.

## Motion

Defined on the preset, not in a side channel.

| Field | Value |
| --- | --- |
| kind | `turntable` |
| phaseReference | `near-point` (t = 0 sits on the point closest to the tee) |
| center | (4, 44) |
| radius | 2 m |
| period | 8 s |
| arc speed | π/2 m/s (1.5707963267948966) |
| direction | +1, counterclockwise seen from above |
| collider yaw | 0° (the box does not yaw with travel) |
| y | collider `centerY` 1.35 m |

With `t` = release phase + flight seconds (idle wall-clock is not added):

```
u = t mod 8, folded into [0, 8)
θ = (u / 8) · 2π
x = 4 + 2 · sin θ
z = 44 − 2 · cos θ
```

So t = 0 is (4, 1.35, 42), the near point, head facing the tee. t = 2 is (6, 1.35, 44), going out to the right. t = 4 is (4, 1.35, 46), the far point. t = 8 is t = 0. A negative phase folds the same way (phase −1 s is phase 7 s).

The release phase is not stored on the world. Sweeping it does not change world identity. It is stored on the range shot as `launchPhase`. Target phase at a contact is that same fold of `launchPhase + contact.first`. It is not a new field on the shot. Range shot version stays 1. A travelling-bell shot and a workshop shot still parse. A clockwork shot without a launch phase is rejected.

## Collider and hit

The figure is a box. Coefficients are the dull block, the same numbers as the bell's hull. The shape is the existing box, not a new contact law.

| Field | Value |
| --- | --- |
| shape | `box` |
| width | 0.9 m |
| depth | 0.7 m |
| height | 2.2 m |
| centerY | 1.35 m |
| friction | 0.8 |
| restitution | 0.1 |
| hit | `any-contact-before-ledger-close` |
| body | `worldcraft-target-figure` |
| figure id | `figure` |

A hit is any recorded contact with that body before the incumbent ledger closes. The figure does not have to be the first body touched. First ground still ends the line. `pin` stays null.

The deck, the pegs, the amber post, the head, the eyes, and the hearts have no collider. Path clearance samples the oriented box every half metre of arc and rejects a yard exit, a launcher-corridor overlap, or a piece overlap.

The head yaws to face outward from the hub. That rotation is local to the head mesh. `setTargetTransform` is called with the constant collider yaw. On a hit, the head wobbles and five primitive hearts rise for 1.8 s. The wobble writes `rotation.x` and `rotation.z` on the head. The hearts are transform nodes. A kinematic test with no projectile left the box on the pose, and the physics body count did not rise when the hearts appeared. Disposing the runtime after that dropped the body count to 0.

The figure rings with the existing timber E4 voice (degree 2, role `clockwork`). The bell's metal A4 path is unchanged. The sound does not write Havok coefficients.

## Sweep

```
node scripts/range/sweep-clockwork-gallery.mjs
```

Raw rows: [appendix/clockwork-gallery/windows.json](appendix/clockwork-gallery/windows.json). One saved hit, from the on-path measurement, not from the catalog: [appendix/clockwork-gallery/hit-shot.json](appendix/clockwork-gallery/hit-shot.json). On-path document: [appendix/clockwork-gallery/on-path-preset.json](appendix/clockwork-gallery/on-path-preset.json).

Headless Havok, same runtime as the lab. Seed `20261025` is recorded and not applied to the solver. Wall time 12.783884747 s on `e5e1fd2e77facf53ed1aac1165cba92253102d34`. `windows.json` `gitSha` names that commit.

Inside one layout, aim, charge, pieces, and the turntable law stay fixed. The only change on the coarse grid is launch phase.

Coarse grid: phase `k * 0.025` s for `k = 0 .. 319`, so `[0, 8)`, 320 trials. The edge walk is not in that denominator. A window is a run of consecutive coarse hits, refined by 1/120 s the same way as the bell sweep. `endOpen: true` means the next 1/120 s sample misses.

### Opening (the catalog preset)

World identity sha256 `130b25192406ae8ca2874b82a324c6272e5c17b3011168c93335fe2786a92978`. Phase sweeps do not change it.

Coarse: **0 / 320 = 0**. No window. Every trial ends `first-ground-contact`, order `ground`. The plinth is not touched. The side screen is not touched. The figure is not touched. Release phase alone does not solve this layout.

### On-path (measurement, not the catalog)

Same pieces, same period, same rail. Turntable center (0, 44), so the circle crosses the fixed shot. World identity sha256 `694d7e9e9662b6a78924c3e5bb1d2dcc642a8d916e4c86f82a63d8fcec706630`. Preset hash `53dd5a67cef1e874832dadca31a52804f75acc13035f9a10b3c8eb642a15a429`.

Coarse: **98 / 320 = 0.30625**. Two windows. Every hit order is `target-figure>ground`. Every hit and every miss ends `first-ground-contact`. Figure-contact time on the hits spans 1.441666666666664 s to 1.60833333333333 s.

| | Coarse first | Coarse last | Coarse count | Refined start | Refined end |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.775 | 2.975 | 49 | 1.775 | 2.9916666666666667 |
| 2 | 5.925 | 7.125 | 49 | 5.916666666666666 | 7.133333333333334 |

Both windows are non-wrapping, `endOpen: true`. Misses: 222 / 320.

## Small aim changes

These rows use the **catalog opening** pieces and the catalog turntable (center (4, 44)), not the on-path measurement. Yaw or elevation moves, so each row is a new world. The catalog preset does not let the player do this; the fixed rail stays at yaw 0°, elevation 18°.

| Yaw ° | Elevation ° | World identity sha256 | Coarse hits | Fraction | Windows |
| ---: | ---: | --- | ---: | ---: | --- |
| 0.5 | 18 | `21e85f5f9b467165ff218cb78fb5e05a1782d2dabed0bdeb804eba9170a944a6` | 0 / 320 | 0 | none |
| −0.5 | 18 | `8c65cd7c7f38c34cf01a756f719b634bbf7243b9a08efe98e547c2aa897b993d` | 0 / 320 | 0 | none |
| 1 | 18 | `f7a530115377174da33eed3351c32cad1c7061a9151b42b400bbb2cd073cd99a` | 0 / 320 | 0 | none |
| −1 | 18 | `9b72bbd4f70681876bf5900282073831adcceea98b4954f3814b926b35096b80` | 0 / 320 | 0 | none |
| 2 | 18 | `a4666d24d6cced6e6ff767fa3ce3108c552478e6a79bbc1a5cdee5990890b8fb` | 74 / 320 | 0.23125 | 3.4833333333333334–5.325 (74) |
| −2 | 18 | `1c2ad99f6f186588116fab069a2b026ad74eb10edc2941b4ba42bce3f270bf5e` | 0 / 320 | 0 | none |
| 4 | 18 | `b4240521efe3fb1a4632859c159d4286f3adeb153abd50b23497f501ef5104e3` | 127 / 320 | 0.396875 | 2.3–3.8583333333333334 (63); 4.833333333333332–6.433333333333334 (64) |
| −4 | 18 | `2f60fb935076bfbea7bb3aa019ada81a108d49fdaaa2c342095eb12c4651bdb9` | 0 / 320 | 0 | none |
| 6 | 18 | `c4e44ec507cbdf17732ce49bba2773e65505fd539b18ebed258954cdd23cd9bc` | 105 / 320 | 0.328125 | 1.125–2.4416666666666664 (53); 6.175–7.458333333333334 (52) |
| 8 | 18 | `dbb700ec9384a38cfd4e9dc7652139ec28e4933e1e4d572b73f7d695b3241ee8` | 89 / 320 | 0.278125 | 7.158333333333332–1.3833333333333333 (89, wraps) |
| 0 | 18.5 | `e4c1e81499d3fd43453852e6d40f482f224447d76989fef8ce29bcbfe61d0163` | 0 / 320 | 0 | none |
| 0 | 17.5 | `66cc50f85012366956714c8b34d312f1f84e31e95b7bdfff561bda5dbe13c191` | 0 / 320 | 0 | none |
| 0 | 19 | `e1d99706aeafc0b230b323efa25e0ebd5f3bac771794d41802a8a071de352ebe` | 0 / 320 | 0 | none |
| 0 | 17 | `0f6f98d1f044a3c4179d1c93b5edbfaa1719c3767814700ef840d9a225332b76` | 0 / 320 | 0 | none |

Window ends in that table are the refined `start` and `end`, `endOpen: true`. The yaw +8° window wraps through the period. Every aim hit in this table ends on first ground, order `target-figure>ground`.

Yaw ±0.5° and ±1°, every negative yaw in the table, and elevation changes that keep yaw at 0 all stay at 0 / 320. The opening miss is stable under those nudges. Yaw +2° is the first row that creates a coarse window. The figure's circle sits on the positive-x side of the yaw-0 ray, so a negative yaw moves the shot farther away.

## Repeat, save, import, refire

Catalog opening, phase 0, fired twice in the same runtime. Contacts and terminal match (`determinism.openingPhase0.match: true`).

On-path layout, phase 1.775 s, fired twice. Contacts and terminal match (`determinism.onPath.match: true`).

That on-path shot was bound, exported, parsed, and fired again from the imported world and `launchPhase`. The trial records match (`saveImportRefire.match: true`). Binding hash `76e79d18372239f38c89000540dfb5ccd34ad9e6b6f1defa8a8d1ccea14b8294`.

The saved shot, phase 1.775 s:

| | |
| --- | --- |
| Order | figure, then ground |
| figure first | 1.60833333333333 s, point (0.4197919964790344, 0.7318945527076721, 45.41583251953125), count 1 |
| target phase | 3.38333333333333 s (release 1.775 plus contact time, folded into the 8 s period) |
| pose at that phase | (0.931229040650227, 1.35, 45.76997527492608) |
| Terminal | `first-ground-contact` at 1.6416666666666633 s, position (−0.031702157109975815, 0.43000003695487976, 46.13292694091797) |
| Goal | `{ kind: "target-contact", status: "hit", body: "worldcraft-target-figure", scored: true }` |
| Pin | null |

After the sweep the runtime was disposed. Physics bodies went from 5 to 0.

## Headed Chrome

Chrome 156.0.8078.47, headless, SwiftShader, window 1400×900. Script: `scripts/range/clockwork-browser.mjs`. The page is `/lab/worldcraft?qa=1`. The footer build was `e5e1fd2e77-dirty` because the ornament and receipt edits were not committed yet.

Catalog opening, release phase 0. The shot missed. No ledger contact with `worldcraft-target-figure`. Terminal reason `first-ground-contact`. Notice: “The figure was not touched. First ground ended the line. No score.” Receipt: **Figure missed.**

On-path layout imported from `on-path-preset.json`, release phase 1.775 s. The shot hit. Goal `{ kind: "target-contact", status: "hit", body: "worldcraft-target-figure" }`. Figure contact time `1.60833333333333` s, the same value as the headless record. Binding hash `76e79d18372239f38c89000540dfb5ccd34ad9e6b6f1defa8a8d1ccea14b8294`, the same hash. That hash is world identity, setup, and launch phase.

The live contact point in that browser shot was (0.4167960286140442, 0.7318788766860962, 45.415061950683594). The headless point is (0.4197919964790344, 0.7318945527076721, 45.41583251953125). About 3 mm in x and under 1 mm in z. A second browser run, after the head was lifted onto the box, repeated the same browser point, the same time, and the same hash. Phase and contact time match across the two runtimes. The points differ at the millimetre. Notice: “Hearts popped. The figure was touched. First ground still ended the line. No score.” Receipt: **HEARTS POPPED.** The snapshot counted 15 heart meshes (five hearts, three primitives each).

The head is a sphere parented to the box, with two eye boxes and a smile box. It has no aggregate. The first capture had the sphere inside the box, so the still read as a plain block. It now sits on top of the box. The collider dimensions are the ones the sweep used. The contact time did not move when the ornament moved.

Stills and the clip are in [appendix/clockwork-gallery/](appendix/clockwork-gallery/). `release-phase.png` is the catalog survey at phase 0. `quarter-turn.png` is the same survey at phase 2.00 s. Those yard views keep the whole clearing in frame. `opening-miss.png` is the play camera on the catalog miss, and the head is readable there. `hit.png` and `hit.mp4` are the on-path shot at phase 1.775 s, including the hearts. The clip plays the capture frames at 8 fps.

## Not established

The catalog opening misses at all 320 coarse phases. Release phase, the only lever on that preset, does not meet the figure. The on-path arrangement is a different locked layout: it has two phase intervals that hit, each a bit over a second wide, and a fraction of a turn that misses. A yaw of +2° on the opening pieces also creates a window; ±1° does not. Nobody was asked to do it. The 0.30625 figure is a coarse sample of the on-path layout, not a player hit rate. The opening's 0 / 320 is the same kind of coarse sample.

The slider is 0.05 s. The measured edges are 1/120 s. On the on-path layout the windows are wide enough that a 0.05 s step can sit inside them. That layout is not the catalog.

## Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --pretty false` | exit 0, after the receipt and head-ornament edits |
| `npx eslint` on the lane files | exit 0, same tree |
| `node --test tests/worldcraft-clockwork.test.mjs` | 4 tests, 4 pass |
| Full `npm test` | exit 0. Build, then 507 tests, 507 pass, 0 fail |
