# E8 Approach Prop — build report

Isolated lab on `studio/e8-approach-prop`, cut from `main` at `cd9d41ddf6349b47e8d0035fd1707299ac255d55`. Route `/lab/approach-prop` only. This report does not claim that a player understands the yard or enjoys it. Headless Havok shows where the ball and the timber go.

## BUILD

Player-facing `BUILD_ID` is the first 10 hex characters of `HEAD` (`build/build-identity.js`). The headless runs in this folder were executed on the prop code in this commit, before the docs-only follow-up if one exists. The pull request body records the pushed `HEAD`.

## What was built

A 6 kg timber plank stands in front of Tread 1 on Lumber Walk. Hinge `(22, 0.45, 138)`, plank 8 × 12.6 × 0.42 m, standing lean −14°, restitution 0.35, friction 0.55, angular damping 1.6, linear damping 0.4. Invisible lip `(22, 8.12, 128.2)`, 8 × 0.24 × 0.4 m, restitution 0.02, friction 0.98. The plank, lip, and hinge are created only inside the new lab scene (`lib/approach-prop-scene.js`). `buildCourtyard` is unchanged.

Sleep-until-contact holds the address pose with zero linear and angular velocity and `setTargetTransform` until the ball hits the plank. After the hit, the hold stops. The one-way hinge limit is `ANGULAR_X` from −2.2 rad to 0.4 rad. There is no pose teleport on a player shot. Adjust, Reset, and Recall rebuild the plank at a saved pose. Continue adopts the pose the shot left.

Latch means the ball hit the plank and the rest lean is greater than 30°. The measured rest on this scene is 49.9969°.

## Certification

Scene is the lab scene (`mountApproachYard`), gravity 12, step 1/120, substep 1000/120, ball mass 1.5, friction 0.28, restitution 0.38. Existing `collectDeliveryStepEvents` and `padImpulse` stay in the flight observer. No scoring id was added.

| Set | n | Latched | Fraction | Flat (< −40°) | Pass |
| --- | ---: | ---: | ---: | ---: | --- |
| Lumber core | 84 | 66 | 0.7857 | 0 | yes (≥ 0.5) |
| Jitter, 7 salts `ref6-0`…`ref6-6` | 588 | 473 | 0.8044 | 0 | yes |

Core lean range −22.919° to 49.997°. The only core rest below the standing lean is P6 E7 lumber 4 at −22.9194°. Jitter lean range is the same, 3 rests below −20°, none flat. Latch and a tread never occur on the same shot (core 0, jitter 0).

Canonical contact, origin 0, yaw 0, elevation 30, power 0.50: hit, lean 49.9969°, ball z 146.290, contacts `prop` only. Same numbers on both 20-repeat processes.

### Wrong-way tail

Seven lumber shots (K3 E6 3, P2 E7 4, P3 E7 6, P3 E7 8, P6 E7 4, P8 E7 4, P8 E7 5), hinge limit on, then 720 further steps. All rest near −22.92°. None end near −91°. None climb above 30° during the tail. Pass.

P6 E7 lumber 4 (yaw +18, elevation 26.5, power 0.79) at the 960-step cap: lean −22.919°, ball `(z −17.044, y −5.785)`, `kicked` false, contacts `prop` only. That z matches the referee terminal. The ball has not stopped; it is off the ground slab. The extra 6 s leave the timber at −22.919° and carry the ball to z −109.1. The tail applies no new impulse. The timber does not become a ramp.

### Follow-up window on the measured rest

Rest used for the frozen plank: 49.9969°. Not a hand-posed 53°.

Named shot, Lumber, origin 0, yaw 0, elevation 22, power 0.55:

| Pose | Tread 1 | Tread 2 | Ball z |
| --- | --- | --- | --- |
| Bare | no | no | 234.873 |
| Standing, dynamic | no | no | 161.816 (then latches at 49.997°) |
| Frozen rest | yes | yes | 82.747 |
| Live second shot in the same world | yes | yes | 85.112, lean stays 49.997° |

Elevation 12, power 0.48 is not in the set of shots that newly reach a tread on this rest.

Both treads, and neither the standing plank nor the bare yard reaches either tread, on the coarse grid (yaw 0): elevation/power 12/0.65, 14/0.60, 16/0.60, 18/0.55, 18/0.65, 20/0.55, 22/0.55.

At elevation 22, yaw 0, power stepped by 0.01 from 0.40 to 0.70: both treads only at 0.52, 0.53, 0.54, 0.55.

At elevation 22, power 0.55: both treads at yaw −4, −2, 0, +2, +4. Tread 1 without Tread 2 also at yaw −6, −5, +5, +6. Yaw −8, −12, +8, +12 reach neither tread.

Tread 1 alone, yaw 0, is wider than both-treads. New tread contact (rest reaches a tread, standing and bare do not) appears from elevation 12 through 28, across several powers at each elevation. See `anyNewCells` in `artifacts/e8/follow.json`.

### Determinism

20 repeats, two independent processes (`determinism-a.json`, `determinism-b.json`). Pass on both. Within a process: one contact sequence, terminal xz within 0.05 m, lean within 0.5°. The two processes agree on lean and z for every shot, including P6 at −22.9194° / z −17.044 and the named rest at both treads / z 82.747.

### Not applied

The both-treads band at the named elevation is four hundredths of power and ±4° of yaw. A later revision could lengthen the plank by a few tenths of a meter, or move the invisible lip a few centimeters along the plank, and then re-measure the rest. That is a prop-only geometry change. It is not in this build. Mass, restitution, friction, damping, hinge limits, sleep, the lip’s current pose, and every body outside the prop stay as certified. Do not chase a 53° pose: elevation 12 / power 0.48 is a tread on that hand pose and is not a tread on the measured rest, while the named 22° / 0.55 shot is.

## Recovery

`git diff cd9d41ddf6 -- lib/lab-controls.js lib/diverter-lab.js app/manners-game.tsx lib/courtyard.js lib/courtyard-scene.js lib/line-score.js lib/rail-golf-v02.js lib/delivery-routes.js` is empty.

`returnLabToSetup` (`lib/lab-controls.js` lines 75–83) is the unedited function. `runApproachRecovery` calls it for Adjust, Retry, and Reset.

- Adjust Last Line. Saved `environment.floor` is always `'A'`. The unedited adjust branch restores that token, and the lab rebuilds the standing timber and reloads the saved aim and exact power. A latch that is then undone by Adjust is a contact in the shot row (`continueOffered` true, `continueUsed` false), not an exposure of the changed yard.
- Retry. The unedited else branch calls `restoreEnvironment(environment())`. The lab passes the live pose, so the timber stays where it is, including mid-flight.
- Restore. Reads `propAtAddress` on the saved line and rebuilds that pose. It does not call `restoreEnvironment`.
- Ghost. Toggles a recorded path. It does not move a body or apply an impulse, and it does not predict the next shot.
- Station change. Remounts the hole. Yard Gate and Switchback Gallery build no plank and the notice says so. Lumber Walk builds a standing plank.
- Continue in Changed Yard. Separate button, that exact label. Shown only on the settled-shot panel, and only when `|lean − (−14°)| > 1.5`. It calls `address()` → `adopt()`. It does not call `returnLabToSetup` and it does not call `restoreEnvironment`.

## Arms

Query `k`. Codes are not shown in the lab. Mapping: `artifacts/e8/arm-key.json`.

- `k3v8n1p` and a bare URL: no demonstration.
- `q7m2c4r`: one recorded playback of a fall onto the lip and a follow-up that reaches Tread 1 and Tread 2. Playback uses stored samples. The player’s Fire control does not run during it. The banner calls it a recording, not a recipe, and does not print elevation or power.

Not implemented, proposed for a later protocol: after the same recording, show Continue in Changed Yard to one group and hide it from the other; or address one group on the latched yard and the other on a fresh standing plank. This build does not add that split.

## Legibility and records

The plank carries a placard, both faces, reading `PROP` and `Staged piece`. A projected pin at the plank repeats that. The brief says: “A staged timber piece stands in the approach. It is a yard piece, not a log.” Result text names contacts only.

Each shot is stored under `rail-golf:approach-prop:session-v1` with timber before and after, latch, whether Continue was offered and whether it was used, tread contacts, plan text, build, first ground, setup, and terminal. Lines use `rail-golf:approach-prop:lines-v1`. Export downloads that session JSON. No legacy key is written.

## Preview

Production deploy was not run. If Workers preview auth is absent, the pull request says so. Do not merge.
