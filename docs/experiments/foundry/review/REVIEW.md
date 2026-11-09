# Foundry v0 review

Independent check of the six candidate worlds on kit `1ad3166d0839ea042379f5a861ed7523cb46d47e`. Physics, pieces, and the play panel were left as each branch shipped them. Every number below comes from a fresh Havok run of the shipped preset (`docs/experiments/foundry/review/reproduce.mjs`, seed `20261109` recorded and not applied to the solver) or from headless Chrome on that same commit. The authors' sweep scripts were not re-run.

The first half is what a player meets. Setups, neighbour tables, and the simpler arrangements are in [Solutions and evidence](#solutions-and-evidence).

Screenshots, desktop 1280×800 and phone 390×844, are in `screenshots/`. They were taken with headless Chrome and SwiftShader. That is a picture of the page, not a handset and not a listening session.

## The Other Way

Three dull blocks stand in a row across the clearing. The opening shot runs into the middle one and stops short of it. The invitation says a way past is still unused, and that taking one way leaves the others. There is no circle and no score. The blocks do not move.

In Survey the row, the launcher, and the invitation are all on screen. After the opening shot the follow camera sits on the struck block: the ball and one face are in frame, the other two blocks are not. The impact line is the sentence that names what happened: "Block middle-stop was touched and did not ring." On a 390×844 screen the invitation sits below the fire control, so the first view is the blocks, the launcher, and the sliders.

The card names the world and says the pieces stay. After a shot the status line still says "Revise a piece and fire the same shot," which the locked blocks will not allow.

What is interesting is the choice the row offers: stop, go around, or go over. Survey is the view that makes the row readable.

## Open Contacts

A timber bank faces the tee. Metal plates stand to either side and one stands farther down the clearing. There is no circle. The invitation says the shot can change and the bank can be moved, and that there is no target.

Survey shows the cyan bank and the grey plates clearly. The impact line after a shot already names the order that happened ("Bank C4 → Plate E4 → Bank C4" on the three-contact line). The note timeline, the contact marks on the trail, and the bank-sound control stay off, because those are still reserved for Musical Workshop.

The card does not say Open Contacts. It says Musical Workshop, and it says the ramp, the bank, and the plate can move and ring. This world has no ramp. The plates are fixed. Only the bank moves. The invitation is the status line under the controls. On the phone that line is below the first screen.

What is interesting is that the order of contacts can change, by aim or by turning the bank, and nothing is being scored.

## Right Angle

Two banks meet in a corner off to the right. The opening shot runs straight past them and lands far down the clearing. The banks stay put. Aim and power are free. There is no circle.

The card names Right Angle and says the pieces stay put. The invitation is the status line, not the card. After a return the follow camera shows the ball back on the launch deck and the trail coming home. The corner itself is mostly out of frame. The impact line ("Bank E4 → Bank C4") is what says both faces were touched. On the phone the same deck landing is visible and the invitation is below the first screen.

What is interesting is a corner that can send the ball back toward the carriage, with no circle to tell you that happened.

## The Carry

The shot is locked: origin, aim, and power are printed and the sliders are absent. One ramp starts on the near ground and can be moved. A gold circle sits down the clearing. The gallery card says that plainly.

Survey shows the ramp, the circle, and the locked launcher together, on desktop and on the phone. After a clearing placement the follow camera sits on the ball inside the circle, and the receipt says "Inside the circle · 0.2 m from centre." That result is readable without knowing the pose.

The card above the fire button does not say that. It says "Aim and power stay inside the rail stops. The block and the bank can move." This world has no block and no bank, and the aim cannot be changed. The status line under the button is the one that tells the truth.

What is interesting is a placement problem: the shot stays, and the ramp is the thing you move.

## Return Address

Two banks face each other just down the clearing from a launcher that starts on the left half of the deck. The invitation is to send a ball down the clearing and bring it home to the other half, then start the reply from where it landed. There is no circle.

Survey shows both banks. A line that comes home is visible from the follow camera: the ball is sitting on the deck, and the trail runs back onto it. The impact line says "Bank C4 → Bank G4" and then "A silent piece was touched and did not ring." That silent piece is the deck. Its contact position is in Contact record (`worldcraft-tee`, with x, y, z). Nothing on the page turns that x into the next carriage stop.

The card says Musical Workshop, and it says a ramp, a bank, and a plate can move. This world has two banks. One of them can move. There is no ramp and no plate. The status line after the catch says "Revise a piece and fire the same shot."

What is interesting is using the deck as the receiving end, so the landing is the address of the next shot.

## Bell Loft

A small room stands at the far end of the clearing: two floor blocks, three bell walls, a fourth wall standing aside, and a wooden stair in front. The invitation says the ground ends every line it touches, the loft floor is not the ground, and the fourth wall and the stair can move.

Survey makes that readable. The open room, the door standing to one side, and the stair are all in frame on desktop. The opening shot, door aside, reaches the loft and rolls back out to the ground.

With the door moved across the opening, the same shot stays upstairs. The receipt says "Line ended: settled." It also names the floor block and says two of the bells were not touched. It never says the ball is upstairs. The default follow camera is inside a wall: the ball is not in the picture, on desktop or on the 390×844 screen. Survey, after the fact, shows the trail ending inside the room, and on the phone that overhead view is still large enough to read. The card says Musical Workshop and invents a movable plate. There is no plate.

What is interesting is a line that can finish without touching the ground. Seeing that happen depends on leaving the follow camera.

## What was not verified

Whether any of these is fun. Whether a person finds the relationship without being told. How the banks sound. How the controls feel under a real finger. The SwiftShader pages are not a phone. A working shot is not a probability that someone enjoys it, and a count of grid cells is not that probability either.

The full author lattices were not re-fired: Right Angle's 21,750 shots, The Other Way's 1,153, The Carry's 16,675 poses. Sampled edges and one interior lattice are in the appendix. A long Havok process that had already fired the other five worlds moved Bell Loft's opening landing by about 5 mm; the Bell Loft file kept here is from a fresh process, which matched the manifest.

---

# Solutions and evidence

Harness: `scripts/range/run.mjs` `createRangeHarness`, 120 Hz, substep `1000/120`, first ground ends the line, same path as `scripts/foundry/validate.mjs`. Fixtures are the preset and manifest bytes from each branch, hashed in `results/index.json`. `fixtures/SOURCES.txt` lists the SHAs. UI steps are the kit's: 0.5° aim, 0.01 charge, 0.5 m position, 5° yaw.

Browser success terminals matched these headless terminals exactly, on each world's own commit.

## The Other Way

`40e805546277e9b328db280374f5957dfac99936`. Preset sha256 `42d131e8fab5e5729a44c659b13bd1e4bfcc08b467c372674e0950554c2b6f5b`.

**Judgement.** The stop, the side pass, and the carry are three different physical outcomes, and the opening neighbourhood stays a stop, so the idea is something a player can sit on. One block in the middle produces the same three outcomes for the same four shots, so the row of three is partly a picture of a choice that a single obstacle already gives. Depth is a brief study. Discoverable from the opening, because the families are wide. Presentation is the weak part: Survey shows the row, the follow camera does not, the phone hides the invitation, and the status line asks you to move a piece that will not move.

All four manifest shots matched (`Object.is` on reason, elapsed, position, outcome).

| Shot | Setup | Terminal |
| --- | --- | --- |
| opening | origin 0, yaw 0, elev 16, charge 0.55 | first ground `(0, 0.430, 28.578)` at 1.575 s, touched `middle-stop` |
| left | yaw −10.5 | `(−7.845, 0.430, 42.327)` at 1.500 s, no contact |
| right | yaw 10.5 | `(7.845, 0.430, 42.327)` at 1.500 s, no contact |
| carry | elev 24 | z 54.377, no contact |

Eight one-step neighbours of the opening (yaw, elevation, charge, origin) all stop on `middle-stop`. Eight neighbours of the left pass and eight of the carry all clear (no block contact, z > 39).

Yaw at elev 16, charge 0.55, sampled rather than every half degree: −48.5 out of bounds; −27.5 and −18 stop on the left block; −17.5 and −15.5 clip; −15 and −6 clear; −5.5 through 5.5 stop on the middle; 6 and 15 clear; 15.5 and 17.5 clip; 18 and 27.5 stop on the right; 48.5 out of bounds.

Elevation at yaw 0, charge 0.55: 5 and 9.5 short; 10.5 and 17 stop; 17.5 and 19.5 clip; 20, 24, 45, 70, and 70.5 clear; 71 clips; 74 stops; 74.5 and 85 short. The claimed carry band's edges behave as described. The interior was sampled, not recounted.

Charge at elev 16, yaw 0: 0.20, 0.42, and 0.43 short; 0.44, 0.55, and 0.58 stop; 0.59 and 0.64 clip; 0.65 and 1.00 clear.

Origin at the opening aim: −10 and −3.5 clear; −3, 0, and 3 stop; 3.5 and 10 clear.

Simpler. Drop the two side blocks and keep the middle one. The opening still stops, both side aims still clear, and the carry still clears. Remove every block and the opening lands at z 43.05 with nothing to stop it. The left-pass landing z is the same with or without the blocks, because that line never touches them.

## Open Contacts

`a3c719c5ba660d48f8ee954855a038508dc4fecc`. Preset sha256 `b4f8211f1d020cfe3f7cbc9cb507006e3b1ddc5330ef23813acdae93be022c17`.

**Judgement.** The order really does change with aim and with the bank's yaw, and a bank alone or the plates alone do not produce those orders. That is a workshop, and it is physically its own thing. The two-note at yaw 4 sits on a yaw edge (half a degree back is the bank only). The three-contact family is wider in yaw and thin in power, which matches the author. Presentation fights the idea: the page calls it Musical Workshop, offers a ramp that is not there, and says the plates can move. The order is already in the impact headline, so the timeline and the H bank voice would be a reuse of existing gates, not a new instrument. Depth is an open workshop. Enjoyment was not tested.

Four manifest shots matched. Opening order `bank-timber`, z 20.352. Two-note (yaw 4) `bank-timber` then `plate-return-right`, z 22.326. Rattle (yaw 6) those two plus the bank again, z 32.025. Lob (elev 26) `plate-deep`, z 45.302.

Opening neighbours, all eight, stay `bank-timber` only.

Yaw from −14 to 14 in 0.5° steps, elev 18, charge 0.55:

| Yaw | Order |
| --- | --- |
| −14..−11 and 11..14 | silent |
| −10.5, −3.5..3.5, 10.5 | bank only |
| −10, −9.5, −9, −4.5, −4 | bank, then the left return plate |
| −8.5..−5 | bank, left return plate, bank again |
| 4, 4.5, 9, 9.5, 10 | bank, then the right return plate |
| 5..8.5 | bank, right return plate, bank again |

Bank yaw at the opening aim, steps of 5°: −25, −20, −15 go bank then the right plate; 15, 20, 25 go bank then the left plate; −30, −10, −5, 0, 5, 10, 30 are the bank only.

Lobs at yaw 0, charge 0.55: elev 20 and 23 hit the bank; 23.5, 26, and 28 hit `plate-deep`; 28.5 and 32 are silent.

**Claim that did not reproduce.** At elev 26, yaw 0, charge 0.51 hits `plate-deep`. The notes said 0.51 misses. Measured: 0.50 bank, 0.51, 0.52, 0.55, and 0.57 `plate-deep`, 0.58 and 0.60 silent.

Neighbours of the published shots, where the author claimed them: the two-note keeps its order at elev ±0.5 and charge ±0.01. Yaw −0.5 (3.5°) drops to the bank only. The author did not claim that yaw step. The rattle keeps three contacts at yaw ±0.5, elev +0.5, and charge +0.01. Elev −0.5 and charge −0.01 drop to two contacts. The third bank contact is at y 0.840 (first bank contact y 4.72), inside the author's 0.7–1.1 m.

Simpler. Remove the bank: opening, yaw 4, and yaw 6 are silent; the lob still hits the far plate; a direct aim (yaw 10, elev 12) still hits the right return plate. Remove the plates and keep the bank: opening, yaw 4, and yaw 6 are only the bank, and the lob is silent. The order families need both.

## Right Angle

`57b82bd95d3d726ebb559e7f8533fab52e58ba32`. Preset sha256 `6f4f6156431f9b46c1eec4ed2f0f4a93a14b3f81c2969e37224bfdf800a5c649`.

**Judgement.** The recorded aim is a real two-face return, and every one-step neighbour still hits both faces and lands inside 16 m. A coarse sample of the claimed window shows returns in it, and also shows the window is not full. A single bank set at 45° sends that one recorded aim home, so a simpler wall can look like this corner for one shot. Removing either face of this corner breaks that shot. Depth is a brief study. The missing circle is right: a short landing in the open would mean something else. The follow camera shows the homecoming and hides the corner. The 2,650 and 4,263 counts were not re-fired.

Both manifest shots matched. Opening (yaw 0, elev 18, charge 0.55) misses both banks and lands at z 46.148. The recorded return is yaw 38.5, elev 14.5, charge 0.86. Order `side-face` at 0.800 s, then `back-face` at 0.817 s, then the ground at 1.800 s. Terminal `(4.294, 0.430, 4.310)` at 1.808 s. Distance from the origin is 6.084 m.

All 26 one-step neighbours (yaw ±0.5, elev ±0.5, charge ±0.01, and the combinations) hit both faces and landed inside 16 m. Several of them add further face contacts (four or five ledger rows) and some come to rest on the deck (ball centre y ≈ 0.73). The recorded shot itself is exactly two faces.

Independent 5×4×5 sample inside the claimed window, 100 cells: yaw 32, 36, 38.5, 42, 46; elev 12, 14.5, 18, 24; charge 0.60, 0.70, 0.80, 0.86, 0.90. Nineteen were exactly two contacts and inside 14 m. Twelve of those nineteen kept all 26 neighbours inside 16 m. Other cells hit both faces and landed 15–30 m out, reversed the order, or missed a face. This is not a recount of 4,263 or 2,650.

Opening yaws −1, −0.5, 0.5, 1, and 5 all miss both banks, distance about 46.15 m. Origins −2 through 2 at the recorded aim all strike both faces. Origin −0.5 lands at 15.052 m with four face contacts, outside 14 m. The author's "7.6 to 14.6 m" is tighter than that one origin.

Edges: yaw 28, elev 14.5, charge 0.86 hits the back face only, distance 26.93 m. Yaw 50 hits the side face only, distance 39.58 m. Yaw 54, elev 14, charge 0.70 hits the side face only and lands 5.164 m out, on the deck.

Simpler. Side face alone, recorded aim: lands about 54.8 m down the clearing. Back face alone: out of bounds. One timber bank at (16, 28.5), yaw 45°, same aim: one contact, distance 7.167 m, inside 14 m. Only that aim was fired at the single wall.

## The Carry

`5b8244389bde44ffbd8ee2d553cbefa0f4b6ea37`. Preset sha256 `293e8a03d95894da2b27c4e23e8af4693e3ad20a7ecb438f3ef4f6e2420b0b87`.

**Judgement.** Moving the ramp onto a wide band (9 m across, 19 m along, yaw ±5°) clears the locked shot, and the circle receipt tells you so. That is a repeatable placement, not a lip, once someone thinks to move the ramp. A free aim with no ramp lands in the circle more directly, and the shipped rail rejects that aim, so the lock is what makes it a construction. A block at the nearest tried pose misses the circle by about 0.15 m. A bank does not carry this shot. Depth is a challenge you can repeat. The panel paragraph describes a different world. The 16,675-pose lattice was not re-fired.

The opening matched: z 36.762, distance 16.238 m, elapsed 1.475 s, no piece contact. Moving the ramp to z 18.5 keeps that same terminal. Yaw 0.5, elev 18.5, charge 0.46, and the direct aim are all rejected on the shipped preset ("This rail is fixed. Revise the piece, then fire the same shot.").

Ramp at (0, 36, yaw 0), and the other published examples, matched. Distances: (0, 24) 0.704; (0, 32) 0.198; (0, 36) 0.238; (0, 40) 0.746; (4, 32) 0.198; (0, 32, yaw 5) 1.954 clear; (0, 32, yaw 10) 3.866 miss; (4.5, 32) clear; (5, 32) 2.632 miss; (0, 20) 1.533 clear; (0, 20.5) 5.996 miss.

Across at z 36, yaw 0: x −4.5 through 4.5 clear, and −6, −5.5, −5, 5, 5.5, 6 miss. That is 9 m. Along at x 0, yaw 0: z 20 clears, z 20.5 misses, z 21 through 40 clear, z 40.5 and 41 miss. The main run is 19 m, plus the thin pocket at 20. Yaw at (0, 36): −5, 0, and 5 clear; −10 and 10 miss.

Free launcher, same world, ramp removed, yaw 0, elev 19, charge 0.60: z 52.986, distance 0.014 m, elapsed 1.800 s, no contact. Six one-step neighbours all clear. Widths: yaw −2.5..2.5, elev 18..20.5, charge 0.58..0.62. The shipped rail will not fire any of these.

Simpler. Empty yard is the opening miss. A block or a bank is refused by the ramp-only allowance, so each was marked fixed and fired on the locked shot. Block at (−1, 28, yaw 0): distance 2.651 m, outside the circle. Bank at (0, 32, yaw 0): 28.242 m. Bank at (−2, 40, yaw 45): 16.277 m. Neither carries the locked shot.

## Return Address

`4041bb67cd9051a3b7e265ed6512e88c6ac2e5b0`. Preset sha256 `ca3537f60481e8ff7bc7e3b7be6d1aeec66fbd314356e43e60280275b4a748b8`.

**Judgement.** The deck return is real, the tee contact x is already in the ledger, and a player can see the ball come home. The published rally does not develop: exchange 3 is exchange 1 with the same terminal. One yaw step (4.5° instead of 4°) makes the addresses walk toward centre, which is a more interesting game than the symmetric one. A flat bank at a different aim also rallies to the opposite deck, and a direct lob touches the opposite deck with no wall at all. The pair of faces adds a cross-yard leg and a shallow aim that the one-wall serve does not have. Depth is an authored catch. The page calls it Musical Workshop and never names the next carriage stop. The 1,223 and 1,138 counts reproduced. The back-to-sender count came out 306 against the author's 304.

All eight manifest shots matched.

Serve, origin −4, yaw 4, elev 13, charge 0.68. Order west then east. Tee contact x 3.981, y 0.350, z 1.269, first contact 1.367 s. Terminal ball centre x 3.993, y 0.730 (on the deck), z 1.093, elapsed 1.375 s. Nearest legal carriage stop is 4. `readableFromExistingLedger` is true: `last.contacts` already holds `worldcraft-tee` and `point.x`. The UI prints that point inside Contact record and does not compute the nearest stop.

Reply from origin 4, yaw −4, same elev and charge. Order east then west. Tee x −3.983, nearest carriage −4, terminal x −3.995.

Chained by taking the nearest carriage and reversing yaw:

| Exchange | Origin | Yaw | Tee x | Nearest | Same as |
| --- | --- | --- | --- | --- | --- |
| 1 | −4 | 4 | 3.981 | 4 | |
| 2 | 4 | −4 | −3.983 | −4 | |
| 3 | −4 | 4 | 3.981 | 4 | exchange 1 |
| 4 | 4 | −4 | −3.983 | −4 | exchange 2 |

The same chain started at yaw 4.5 walks: tee x 3.508 → carriage 3.5; then −2.759 → −3; then 2.503 → 2.5; then −2.453 → −2.5. Those four setups are different from each other.

Eight one-step neighbours of the serve (yaw, elev, charge, origin) all stayed two-face catches on the opposite deck. Power from 0.54 to 0.88 in steps of 0.01: two-face deck returns are exactly 0.62 through 0.81. Outside that, the ball still hits west then east and misses the deck.

East face, one editor step, serve aim. All six still catch the opposite deck. x or z plus 0.5 m: tee x ≈ 4.503, terminal x ≈ 4.515. x or z minus 0.5 m: tee x ≈ 3.558, terminal x ≈ 3.570. Yaw 50° (plus 5°): terminal x 1.633, tee x 1.650. Yaw 40°: terminal x 6.252, tee x 6.213.

Local box, 5 origins × 7 yaws × 5 elevations × 7 charges = 1,225 shots. First-shot two-face catches: 1,223. Second catch from the resulting carriage: 1,138. Back to the sender within 0.5 m: 306. The author counted 304 on that last one. The two first-shot misses are origin −5, yaw 2.5, elev 12, charge 0.65, and origin −4, yaw 4, elev 12, charge 0.65. Both hit west then east and miss the deck. My back-to-sender rule was `abs(nearest − originX) <= 0.5`, which includes a neighbouring stop. That is the likely two-shot gap. I am not calling their count wrong.

Controls, on a coarser grid than the author's 1,053 (yaw −20..20 step 2, charge 0.52..0.76 step 0.04, elev 13, origin −4, 147 shots): west bank alone, 1 opposite-deck return; one flat bank at (0, 16, yaw 0), 18; empty clearing, 0.

The published serve on those three arrangements:

| Arrangement | Result |
| --- | --- |
| West bank only | one face, first ground `(20.461, 0.430, 16.377)`, no tee |
| Flat bank, same aim | out of bounds near `(−1.590, −8.138)` |
| Empty | first ground `(−0.589, 0.430, 48.785)`, no contact |
| Flat bank, yaw 14.5, charge 0.58 | tee x 3.940, nearest 4, terminal `(3.979, 0.730, −4.029)`. Reply from 4 at yaw −14.5 returns tee x −3.940 |
| Direct lob, yaw 70, elev 65, charge 0 | tee x 1.658, nearest carriage 1.5, no piece contact, terminal `(1.678, 0.730, 2.067)` |

The lob does touch the opposite half of the deck. It never goes down the clearing, and the receiving stop is 1.5 rather than 4. The flat-bank rally is a real mirrored catch on a different aim, with no cross-yard leg. West-only does not catch the published serve.

Opening charge 0.58 still hits both faces and lands short of the deck, at `(3.561, 0.430, 4.977)`.

## Bell Loft

`8c2df88b4f5b7ea81dcf3ce3a59ba5c95aefec2b`. Preset sha256 `4faba8fecdce3e59358565ad096752cba541daaf39b3676d5a8e217da987abb4`.

**Judgement.** Shutting the door turns an escape into a rest on the loft floor, at y 4.43, after 12.4 to 18.0 s. The walls and the stair are both required. The door move is a placement across the opening, and the nearby slots that were tried overlap another piece, so it is not a nudge. A player who stays on the follow camera does not see the ball. Survey shows the line ending in the room. The receipt says "settled" and names a floor block, and it does not say upstairs. Depth is an authored world that needs one Build move. Whether that feels like an accomplishment is not something this review could settle.

Fresh Havok process. All five open-door manifest shots matched, including the opening at z 45.491, elapsed 5.191666666666714 s. The same opening at the end of a 3,966-shot process had landed about 5 mm off, and some settle times had moved. Those numbers are not used here.

The closed door is the door piece at x −4, z 49, yaw 0. That preset validates. Door x 8.5, 4, and 0 at z 49 all fail with "Piece 6: overlaps another piece." The catch is not one editor step from the shipped x 9.

Closed-door rests, all at y 4.430 unless noted. Open-door twins of the same aim are first-ground escapes.

| Aim | Open | Shut |
| --- | --- | --- |
| opening, yaw 0, elev 12, charge 0.49 | ground z 45.491, 5.192 s | settled 15.250 s, `(0, 4.430, 53.880)` |
| charge 0.48 | ground z 42.912 | settled 13.233 s, z 52.430 |
| charge 0.50 | ground z 46.844 | settled 13.700 s, z 51.278 |
| yaw −0.5 | ground z 45.488 | settled 15.667 s, x −1.181, z 53.997 |
| yaw 0.5 | ground z 45.489 | settled 15.625 s, x 1.185, z 54.008 |
| elev 11.5 | ground z 42.074 | settled 13.942 s, z 52.791 |
| elev 12.5 | ground z 45.428 | settled 12.417 s, z 51.677 |
| lob | ground z 39.376 | settled 14.042 s, z 51.432 |
| slam | ground z 30.907 | settled 14.467 s, z 53.313 |
| across | ground z 42.718 | settled 18.025 s, `(−4.468, 4.430, 50.471)` |
| stock aim, elev 18, charge 0.55 | ground z 46.148, no contact, 1.642 s | identical, no contact |

Every closed catch in that table is inside 12–18 s. The two yaw neighbours are not the same time. The notes' "both are 15.62 s" is slightly loose: yaw −0.5 is 15.667 s and yaw +0.5 is 15.625 s. The lob and the slam match the author's 14.03 s and 14.47 s within a hundredth. The across-shot matches 18.02 s.

Closed opening notes, total-speed: D4 at 0.89 s strength 0.98, E4 at 3.46 s strength 0.73, C4 at 4.28 s strength 0.02, E4 at 5.68 s strength 0.00, C4 at 8.76 s strength 0.00. That is the author's ear line. Listening quality was not checked.

Simpler, door shut, opening aim. Without the three bell walls the ball takes the stair and the floor and rolls off to first ground at z 67.88. Without the stair it never goes up: first ground z 32.46, no piece contact. Floors alone do the same. The room and the stair are both necessary.

Browser, on commit `8c2df88`, after the door was placed and the opening aim fired. The page terminal was settled at 15.250 s, position `(0, 4.430, 53.880)`, the same numbers as the headless run. The follow-camera frame is a wall and sky. The survey frame shows the trail inside the loft. Both were shot at 1280×800 and at 390×844. The card text on both viewports contains "Musical Workshop".
