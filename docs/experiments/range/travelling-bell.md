# Travelling Bell (range lane E)

Feasibility only. This file does not measure players, and it does not establish that a person can time the shot. It records one preset, one motion law, and one headless Havok sweep of launch phase.

Research question: can a player reason about timing a committed projectile to intercept a slow trolley-mounted bell?

Branch `lab/wc-range-e-travelling-bell`, cut from `lab/wc-range-20261024` at `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a`. No pull request, no merge, no deploy.

## Prior art, not imported

`lab/wc-exp-20261024-bell-rail` at `eee0ac0aff3648410f2e1d81527c84777943832c` put a bell on a 4 m rail at 1 m/s (period 8 s). Pose used `t` = launch delay + flight seconds. That delay was stored on the world, so changing it changed world identity. The grid hit fraction there was 350 / 10059 = 0.03479471120389701, and every hit touched both pieces. Delay ±0.5 s on the hitting layouts kept 488 / 662 = 0.7371601208459214. The supplied layout missed at every delay on that grid.

This lane does not merge that branch. It does not copy the synthesized bong, the delay-in-the-world control, or the Bell Rail selector. The pose law, the lathe hull, and the rail ends are the part that was ported, and they now live in the range preset document.

## Preset

Catalog id `travelling-bell`, name `Travelling Bell`, goal `target-contact`. Canonical export: `docs/examples/worldcraft-travelling-bell.json`. Preset hash of that document: `ab39b2d6ea0e07ea509b1d62ba3d5ef42ed0b96782bdbcc46e56252aaa3bb293`.

Opening layout, all three pieces locked, allowance empty:

| Piece | Place |
| --- | --- |
| ramp-yours | (−8, 40), yaw 0° |
| bank-yours | (0, 16), yaw 80° |
| shield | (−10, 52), yaw 0° |

Launcher origin 0 m. Fixed rail: yaw 0°, elevation 18°, charge 0.55. The player's lever on this preset is the release phase. Pieces and aim stay put. Enter: header **Range** → **Travelling Bell**. Reset: **Reset preset**, which also returns the phase to 0.

`worldcraftPinResult` returns null because the goal is not `first-ground-zone`. The receipt says **BELL CONTACT** or that the bell was missed, and it says **No score.** The `scored` flag on a `target-contact` goal result is that predicate (a ledger contact happened). It is not a production score, and score / progression code was not edited.

v1 world-export identity of house, orc, starter, and empty is unchanged: `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

## Motion

Defined on the preset, not in a side channel.

| Field | Value |
| --- | --- |
| kind | `segment-shuttle` |
| phaseReference | `endpoint-0` (t = 0 sits on the first endpoint) |
| endpoints | (−28, 58) then (−24, 58) |
| speed | 1 m/s |
| length | 4 m |
| period | 8 s |
| y | collider `centerY` 1.5 m |

Speed is constant. The shuttle reverses instantly at each end. With `t` = release phase + flight seconds (idle wall-clock is not added):

```
u = t mod 8, folded into [0, 8)
travelled = u * 1
along = travelled <= 4 ? travelled : 8 - travelled
x = -28 + along
z = 58
direction = +1 (out, toward the far stop) when u = 0 or travelled < 4, else -1 (back)
```

So t = 0 is (−28, 1.5, 58), outward. t = 4 is (−24, 1.5, 58), coming back. t = 8 is t = 0. A negative phase folds the same way (phase −1 s is phase 7 s).

The release phase is not stored on the world. Sweeping it does not change world identity. It is stored on the range shot as `launchPhase` and is included in the binding text only when it is a number, so an Open Workshop shot that has no phase keeps its previous binding.

## Collider and hit

Collider, required to match the fixed bell constants (the dull-block friction and restitution):

| Field | Value |
| --- | --- |
| shape | `lathe-convex-hull` |
| height | 2.4 m |
| skirtRadius | 0.75 m |
| centerY | 1.5 m |
| friction | 0.8 |
| restitution | 0.1 |
| hit | `any-contact-before-ledger-close` |
| body | `worldcraft-target-bell` |
| bell id | `bell` |
| yaw | 0° (5° grid if a variant turns it) |

A hit is any recorded contact with that body before the incumbent ledger closes. The bell does not have to be the first body touched. First ground still ends the line: the range session was not edited, and a miss in this sweep ends `first-ground-contact`. The existing yard exit (`out-of-bounds`) still closes the ledger too. On the opening layout, 14 of the coarse hits touched the bell and then left the yard without a ground contact. Those still count, because the bell contact was already in the ledger. `pin` stays null.

Path clearance samples the skirt square (side 1.5 m) every 0.5 m along the rail and rejects a yard exit, a launcher-corridor overlap, or a piece overlap. Crown and clapper ornaments, the rail, the stops, and the 1 m ticks have no collider.

## Why the motion can be reproduced

The architecture can support this, so the lane did not stop.

The pose is a pure function of the recorded launch phase and the physics flight clock. `beforeStep` moves the bell to `phase + elapsed + dt` with Havok `ANIMATED` and `setTargetTransform`. `dt` is the session step, 1/120 s, not the frame delta. Launch and the build-mode action recreate the hull at the release pose, so idle velocity is not inherited. There is no idle step, so looking at the yard does not move the bell. The amber post is not a physics body, and it stays at the release pose during flight.

The lab already sets the physics timestep to 1/120 s and the substep to 1000/120 ms. `(1000/120) / 1000 === 1/120` in IEEE-754. Headless code calls `physics._step(1/120)` once per `beforeStep`. The browser scene advances by the same substep, so a frame waits until the accumulator holds one substep and then runs one `beforeStep` and one `_step(1/120)`. A test fires the opening preset at phase 1 s both ways and the contact signatures match. Global deterministic lockstep was not turned on; that would have changed House Shot and Open Workshop.

After the shot, build mode places the bell back on the release pose. The reproducible record is the shot (contacts, terminal, `launchPhase`), not the mesh pose after the mode change.

## What the player can read

The goal panel states that the goal is bell contact, that first ground still ends the line, and that there is no score. It shows the phase in seconds, the direction ("out, toward the far stop" or "back, toward the first stop"), metres along the rail, the turn at 4.00 s, and the return at 8.00 s. An amber post and a short direction bar mark the release pose. The slider and the ±0.05 s buttons step by 0.05 s, from 0 up to one step short of the period. The sweep below is finer than that control.

The bell rings with the existing metal A4 voice (degree 4, role `bell`). The sound does not write Havok coefficients. The orc thunk is unchanged.

## Sweep

```
node scripts/range/sweep-travelling-bell.mjs
```

Raw rows: [appendix/travelling-bell/windows.json](appendix/travelling-bell/windows.json). One saved hit: [appendix/travelling-bell/hit-shot.json](appendix/travelling-bell/hit-shot.json). Short solution note: [appendix/travelling-bell/SOLUTIONS.md](appendix/travelling-bell/SOLUTIONS.md).

Headless Havok, same runtime as the lab. Seed `20261024` is recorded and not applied to the solver. The run that wrote `windows.json` took 29.183537229 s. That file's `gitSha` is `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a` because the sweep ran on this lane's working tree before the lane commit existed. The parent at that moment was the range base. Re-running the script on the lane commit updates `gitSha` and `elapsedSeconds` only if the windows match; that check is stated under Checks when it has been done.

Inside one layout, aim, charge, pieces, and the bell law stay fixed. The only change is launch phase.

Coarse grid: phase `k * 0.025` s for `k = 0 .. 319`, so `[0, 8)`, 320 trials. The hit fraction is coarse hits / 320. The edge walk is not in that denominator.

A window is a run of consecutive coarse hits. If phase 0 and the last coarse sample are both hits, those two runs are one wrapping window. From the first coarse hit, the script walks backward by 1/120 s until a miss (wrapping only for a wrapping run). `start` is the last hit on that walk. From the last coarse hit it walks forward the same way. `end` is the last hit. `endOpen: true` means the next 1/120 s sample misses. This does not fire every tick inside the run, and it does not look for a window that sits entirely between two coarse misses (narrower than 0.025 s).

### Opening (the catalog preset)

World identity sha256 `2b698a8e4762a81684845e756410ce29a9ba5c3bdd5b9c439b12a9b279ad96e2`. Phase sweeps do not change it.

Coarse: **143 / 320 = 0.446875**. Two windows. Phase 0 misses.

| | Coarse first | Coarse last | Coarse count | Refined start | Refined end |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.475 | 2.1 | 66 | 0.45833333333333326 | 2.1083333333333334 |
| 2 | 4.975 | 6.875 | 77 | 4.958333333333332 | 6.875 |

Both windows are non-wrapping, `endOpen: true`. Contact orders on the 143 hits:

| Order | Trials | Terminal |
| --- | ---: | --- |
| `object-bank-yours>object-ramp-yours>target-bell>ground` | 129 | `first-ground-contact` |
| `object-bank-yours>object-ramp-yours>target-bell` | 14 | `out-of-bounds` |

The 14 out-of-bounds hits are phases 0.65, 0.675, 0.7, 0.725, 0.75, 0.775, 0.8, 0.825, 0.85, 0.875, 6.625, 6.65, 6.675, and 6.7. Misses: 177 / 320, every one `first-ground-contact`, order `object-bank-yours>object-ramp-yours>ground`. Bell-contact time on the hits spans 4.308333333333337 s to 4.458333333333345 s.

### Supplied (prior-art pieces)

Ramp (0, 42, yaw 0), bank (14, 28, yaw 0), same shield and the same bell. World identity sha256 `ffbff70d06f8c26ad97b091d5c0db894265689091c18597aacdcec8c0adc5208`.

Coarse: **0 / 320 = 0**. No window. Every trial ends `first-ground-contact`. Release phase alone does not solve that layout. That matches the prior-art report that delay alone does not solve the supplied layout. It is a different grid (320 phases instead of 21 delays), not a re-run of the 10059-shot search.

### Late (one both-piece arrangement)

Ramp (−1, 42, yaw 20), bank (−6, 68, yaw 20), same shield and bell. World identity sha256 `b324544f499dd3a3084080f68a466c70e81602e78eafa5fa623e58506b18a3a2`. This is one late arrangement from the prior-art neighbourhood, not that sweep's medoid (the medoid ramp was at z 42.5).

Coarse: **175 / 320 = 0.546875**. Two windows. Every hit and every miss ends `first-ground-contact`. Every hit order is `object-ramp-yours>object-bank-yours>target-bell>ground`. Bell-contact time on the hits spans 6.7416666666667915 s to 6.825000000000129 s.

| | Wraps | Coarse first | Coarse last | Coarse count | Refined start | Refined end |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | yes | 6.825 | 0.975 | 87 | 6.816666666666666 | 0.9916666666666666 |
| 2 | no | 1.35 | 3.525 | 88 | 1.3416666666666668 | 3.533333333333333 |

The wrapping window is phases from 6.816666666666666 s through the period and on to 0.9916666666666666 s. Both ends are open on the next 1/120 s sample.

## Small aim changes

Same opening pieces, charge 0.55. Yaw or elevation moves, so each row is a new world and a new identity. The catalog preset does not let the player do this; the fixed rail stays at yaw 0°, elevation 18°. These rows ask whether a small aim error erases the phase windows.

| Yaw ° | Elevation ° | World identity sha256 | Coarse hits | Fraction | Windows |
| ---: | ---: | --- | ---: | ---: | --- |
| 0.5 | 18 | `53df0f32dc6775915837fb7dd1da39547889e23ea248b87b131ac255ad536c25` | 189 / 320 | 0.590625 | 0.9916666666666667–3.2583333333333333 (91); 3.816666666666667–6.258333333333334 (98) |
| −0.5 | 18 | `bb6273e710e00b0f8865e621d335d77cf529ce5d52da0cb4911da49a26752975` | 0 / 320 | 0 | none |
| 1 | 18 | `5d4016067bd635b37fe45b865bff0edd4002b5392bf718f8f103aa54ec5ebbd2` | 0 / 320 | 0 | none |
| −1 | 18 | `f854f5133826f5ebb34c6f63a586fa6aca6e56a9849f485137c220124a00ce84` | 0 / 320 | 0 | none |
| 0 | 18.5 | `d55a7a80860fca39e9506b92baed6a90872d78dc125c0797743f4beed0bfaf0a` | 87 / 320 | 0.271875 | 0.6–1.6 (41); 5.558333333333333–6.716666666666668 (46) |
| 0 | 17.5 | `747ea268d76cf64d27d0de5de04144c90debd63f00d682032b4792ec4d82197e` | 168 / 320 | 0.525 | 0.4–2.3583333333333334 (79); 4.766666666666667–6.975 (89) |
| 0 | 19 | `35401fe0fdf51fc18f096764fa7e3ce65a89a06c1132a9b06e15a612af0ab440` | 39 / 320 | 0.121875 | 0.825–1.275 (19); 5.908333333333332–6.416666666666668 (20) |
| 0 | 17 | `f606bc5c4195e0cdb1dd8695d0910bb27b315428d552219b0315535643b7ceda` | 178 / 320 | 0.55625 | 0.3416666666666666–2.4583333333333335 (85); 4.708333333333332–7.041666666666668 (93) |

Window ends in that table are the refined `start` and `end`, `endOpen: true`, none of them wrapping. Yaw −0.5°, +1°, and −1° wipe the coarse grid. Yaw +0.5° widens it. Elevation changes from 17° to 19° keep two windows and move the fraction from 0.55625 down to 0.121875. Elevation 17.5° is the only aim row with out-of-bounds hits: 22 of 168, order `object-bank-yours>object-ramp-yours>target-bell`. The other aim hits in this table end on first ground.

## Repeat, save, import, refire

Opening preset, phase 1 s, fired twice in the same runtime. The trial records match (`determinism.match: true`).

That shot was bound, exported, parsed, and fired again from the imported world and `launchPhase`. The trial records match (`saveImportRefire.match: true`). Binding hash `88c126b099f13f6270ea200b9067ae58ad902eb84939751736136ede4ea5e7b9`. Preset hash as above.

The saved shot, phase 1 s:

| | |
| --- | --- |
| Order | bank, then ramp, then bell, then ground |
| bank first | 0.22499999999999998 s, point (0.4231705665588379, 4.679812908172607, 10.650684356689453), count 2 |
| ramp first | 1.4333333333333307 s, point (−9.20988941192627, 1.736019492149353, 37.72132110595703), count 2 |
| bell first | 4.308333333333337 s, point (−25.218032836914062, 2.8389058113098145, 57.966529846191406), count 2 |
| ground first | 5.758333333333409 s, point (−29.157838821411133, 0.009521424770355225, 67.4073486328125), count 1 |
| Terminal | `first-ground-contact` at 5.766666666666743 s, position (−29.180723190307617, 0.4300020635128021, 67.46179962158203) |
| Goal | `{ kind: "target-contact", status: "hit", body: "worldcraft-target-bell", scored: true }` |
| Pin | null |

## Not established

A fixed layout can have phase intervals that hit and phase intervals that miss, and a fraction of a degree of yaw can remove the coarse windows. That is a timing structure a player could in principle read off the post and the period. Nobody was asked to do it. The 0.446875 opening fraction is a coarse sample of one locked layout, not a player hit rate, and it is not comparable to the prior-art 350 / 10059 piece-and-delay search.

The slider is 0.05 s. The measured edges are 1/120 s. A player on the buttons cannot sit on the refined edge itself.

## Checks

Run on this working tree, parent `bdc6961dd19b148174f2b5c0a92cb2fd171fc43a`. The dev server footer still prints that parent, because the lane commit did not exist yet. The page was serving this tree.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --pretty false` | exit 0 |
| `npm run lint` | exit 0. Three warnings, all outside this lane: `app/manners-game.tsx` (two `react-hooks/exhaustive-deps`) and `scripts/sweep-orc-static.mjs` (`details` unused). |
| `npm test` | build, then 493 tests, 493 pass, 0 fail, 18.846 s |

Headed Chrome 156.0.8078.47, SwiftShader WebGL (`--use-gl=angle --use-angle=swiftshader-webgl`), `/lab/worldcraft?qa=1`. Enter Travelling Bell, set launch phase to 1 s, survey view, fire the fixed rail.

The browser shot matches `hit-shot.json`: goal `{ kind: "target-contact", status: "hit", body: "worldcraft-target-bell", scored: true }`, bell first contact 4.308333333333337 s at (−25.218032836914062, 2.8389058113098145, 57.966529846191406), order bank, ramp, bell, ground, terminal `first-ground-contact`. The receipt reads **BELL CONTACT**, "Release phase 1.00 s. Goal is target contact, not a first-ground zone.", and "Bell contact. First ground still ended the line. No score."

Stills, also copied under [appendix/travelling-bell/](appendix/travelling-bell/): the release pose with the amber post (`release-phase.png`) and the receipt after the hit (`hit.png`).
