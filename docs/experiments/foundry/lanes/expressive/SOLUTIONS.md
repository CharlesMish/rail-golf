# Open Contacts — measured orders

Not shown in the gallery. Seed `20261109`, not applied to the solver. Kit SHA `1ad3166d0839ea042379f5a861ed7523cb46d47e`. Script: `scripts/foundry/open-contacts-sweep.mjs`. Summary: [sweep.json](sweep.json). 954 Havok shots. Dynamics were face speed for the recorded gains. The flight does not use that setting.

The authored bank is x 0, z 34, yaw 0, timber degree 0. Plates are fixed. Goal kind is `none`. There is no required order. A direct plate hit is another family, not a bypass of a challenge.

## Opening

Yaw 0, elevation 18°, charge 0.55, origin 0. Order: timber bank C4 only. Terminal z 20.35 m, back toward the tee.

Yaw −3.5° through 3.5° at that elevation and charge: still the bank only (15 steps of 0.5°). Yaw −4° adds the left return plate (D4 metal). Yaw 4° adds the right return plate (E4 metal).

At yaw 0, elevation 16° through 20° (step 0.5°) and charge 0.50 through 0.60 (step 0.01) stay bank only. Origin −1 m through 1 m stays bank only. Bank x −2 m through 2 m, and bank z 32 m through 36 m, at the opening aim, stay bank only. Moving the bank sideways does not create a second contact. Turning it does.

## Aim families on the authored bank

Elevation 18°, charge 0.55, positive yaw, step 0.5°:

| Yaw | Order |
| --- | --- |
| 0 to 3.5° | timber bank only |
| 4 to 4.5°, and 9 to 10° | timber bank, then right plate E4 |
| 5 to 8.5° | timber bank, right plate E4, timber bank again |
| 10.5° | timber bank only |
| 11 to 14° | no resonant contact |

Negative yaw mirrors that with the left plate D4. The three-contact run is yaw −8.5° to −5°.

The two-note at yaw 4° stays two-note at elevation 17.5° and 18.5°, and at charge 0.54 and 0.56. The three-contact at yaw 6° stays three-contact at yaw 5.5° and 6.5°, at elevation 18.5°, and at charge 0.56. Elevation 17.5° and charge 0.54 drop it to two contacts. The third hit is wide in yaw and thin in power. The third bank contact is low (about 0.7 to 1.1 m). It is a real contact, not a ground skim of a plate. It is the less robust family.

Elevation 16°, charge 0.55: yaw 4° through 10° is two-note, with no third contact. That band is 6° wide.

Elevation 12°, charge 0.55: yaw 6° through 16° rings only the right plate, except yaw 15.5°, which also touches the outer right plate. Yaw 4° to 5.5° is still the bank only. Yaw 16.5° to 18° is silent. The direct plate is about 10° wide. It does not need the bank.

Elevation 10°, charge 0.55: yaw 27° through 35° rings only the outer right plate (A4). Yaw 26.5° also touches the right return plate. Yaw −35° through −27° rings only the outer left plate (G4). About 8° on each side.

Elevation 23.5° through 28°, yaw 0, charge 0.55: the ball clears the bank and rings the far metal plate (C4). Elevation 20° through 23° still hits the bank. Elevation 28.5° through 32° misses the far plate. At elevation 26°, yaw −2.5° through 2.5° still hits that plate, and charge 0.52 through 0.57 does too. Charge 0.50 hits the bank. Charge 0.51 and 0.58 through 0.60 miss.

## Turned bank

Opening aim. Bank yaw is the 5° editor step.

| Bank yaw | Order |
| --- | --- |
| −30°, −10°, 0°, 10°, 30° | timber bank only |
| −25°, −20°, −15° | timber bank, then right plate E4 |
| 15°, 20°, 25° | timber bank, then left plate D4 |

Three editor steps on each side. Aim yaw ±0.5° at bank yaw 15°, 20°, and 25° stays the two-note order. The plate contact on the return sits about 2.2 to 2.9 m up, with face speed about 15 to 19 m/s. Not a graze.

The same two-note class is also available without turning the bank, by aiming a few degrees off the opening. Turning the bank is a second route from the opening aim. Neither route is required.

## Coarse grid

666 shots. Yaw −36° to 36° step 2°, elevations 8, 12, 16, 18, 24, 26, charges 0.40, 0.55, 0.70.

| Order | Count |
| --- | --- |
| no resonant contact | 443 |
| timber bank only | 63 |
| left plate only | 37 |
| right plate only | 37 |
| outer left plate only | 27 |
| outer right plate only | 27 |
| bank then left plate | 7 |
| bank then right plate | 7 |
| far plate only | 6 |
| bank, left plate, bank | 3 |
| bank, right plate, bank | 3 |
| other one- and two-step orders | 6 |

## Musical Workshop opening, for contrast

Same aim on Musical Workshop: metal ramp D4, then metal plate E4. The timber bank is not touched. Open Contacts has no ramp, and the opening touches the timber bank only.

## Sound renders

Gallery playback of this preset does not pass `tuned-even` and uses total speed. Four files under `audio/` were rendered offline from the opening shot and the three-contact shot: total-speed original voice, and the existing `tuned-even` function on the same impacts (timber bank only; a metal plate stays ordinary metal). Each pair is RMS-matched to the quieter file, then held under −3 dBFS. Together they are 1,236,448 bytes. Musical quality is not claimed. Live playback of H was not verified. A SwiftShader browser did fire the opening shot and heard only the timber bank. That is not a phone.
