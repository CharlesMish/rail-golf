# Appendix — Travelling Bell measurements

Not part of the owner index. These numbers are one headless sweep of release phase. They are not a player result.

The narrative, the motion law, and the window table are in [../../travelling-bell.md](../../travelling-bell.md).

The catalog opening used to be this solution. It met the bell on 143 of 320 release phases, so it was moved here. The selector preset is a different placement and misses on every coarse phase. Bell path, speed, collider, and hit rule are the same in both documents.

| File | What it is |
| --- | --- |
| `solution-preset.json` | The former catalog opening: ramp (−8, 40, yaw 0), bank (0, 16, yaw 80), shield (−10, 52, yaw 0). Preset hash `ab39b2d6ea0e07ea509b1d62ba3d5ef42ed0b96782bdbcc46e56252aaa3bb293`. |
| `windows.json` | Every coarse trial (320 phases × opening, solution, and late, plus 8 aim rows on the solution), the refined window edges, and the repeat / refire flags. |
| `hit-shot.json` | The range shot for the solution preset at launch phase 1 s. Goal `target-contact`, status `hit`. Terminal reason `first-ground-contact`. |
| `release-phase.png` | Headed Chrome, phase 1.00 s, amber post on the rail, before fire. Lane still, of the solution layout. |
| `hit.png` | The same shot after it resolves. Receipt **BELL CONTACT**. Bell first contact 4.308333333333337 s, same point as `hit-shot.json`. |

Catalog opening coarse fraction: 0 / 320 = 0. World identity `ffbff70d06f8c26ad97b091d5c0db894265689091c18597aacdcec8c0adc5208`. Catalog preset hash `7b3c95341d131c8d6bc2e16a5a444a2b2f4411ce883be6cef9f8c2589372345e`.

Solution coarse fraction: 143 / 320 = 0.446875, two windows. World identity `2b698a8e4762a81684845e756410ce29a9ba5c3bdd5b9c439b12a9b279ad96e2`. Late arrangement: 175 / 320 = 0.546875, two windows. Binding hash of the phase-1 solution shot: `88c126b099f13f6270ea200b9067ae58ad902eb84939751736136ede4ea5e7b9`.

Aim rows in `windows.json` are the solution layout, not the catalog opening.
