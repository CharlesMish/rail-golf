# Appendix — Travelling Bell measurements

Not part of the owner index. These numbers are one headless sweep of release phase. They are not a player result.

The narrative, the motion law, and the window table are in [../../travelling-bell.md](../../travelling-bell.md).

| File | What it is |
| --- | --- |
| `windows.json` | Every coarse trial (320 phases × 3 layouts, plus 8 aim rows), the refined window edges, and the repeat / refire flags. |
| `hit-shot.json` | The range shot for the opening preset at launch phase 1 s. Goal `target-contact`, status `hit`. Terminal reason `first-ground-contact`. |
| `release-phase.png` | Headed Chrome, phase 1.00 s, amber post on the rail, before fire. |
| `hit.png` | The same shot after it resolves. Receipt **BELL CONTACT**. Bell first contact 4.308333333333337 s, same point as `hit-shot.json`. |

Opening coarse fraction: 143 / 320 = 0.446875, two windows. Supplied pieces: 0 / 320. Late arrangement: 175 / 320 = 0.546875, two windows. Binding hash of the phase-1 shot: `88c126b099f13f6270ea200b9067ae58ad902eb84939751736136ede4ea5e7b9`. Preset hash: `ab39b2d6ea0e07ea509b1d62ba3d5ef42ed0b96782bdbcc46e56252aaa3bb293`.

`windows.json` field `gitSha` is the parent the sweep was generated against (`bdc6961dd19b148174f2b5c0a92cb2fd171fc43a`), because the file was written before this lane had a commit. Seed `20261024` is recorded and is not applied to the solver.
