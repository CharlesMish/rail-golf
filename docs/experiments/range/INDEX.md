# Worldcraft experimental range

Route: `/lab/worldcraft`. The range selector sits in the lab header. It does not add a route. House Shot, Orc Stand-in, and saved v1 worlds stay available. Choosing a preset loads that preset's own rules. **Reset preset** puts the current preset back to the arrangement you entered.

Non-production preview for this branch: [https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft). It is not `rail-golf.cmish.dev`. The build that was opened in Chrome is recorded in [REPORT.md](REPORT.md).

A preset states its launcher, which pieces are fixed, and its goal. The goal is one of `none`, `first-ground-zone`, `target-contact`, or `contact-phrase`. A contact phrase is an order of notes read from the contact record. It is not a score and not a rhythm. Fixed pieces do not move from the Build controls. A fixed launcher does not take a new aim or charge. A preset may instead leave aim and power inside a window and lock the carriage origin; the window is enforced on the controls and on the shot. Soft Landing is the preset whose launcher is not fixed and has no window: `launcher.fixed: false` compiles to an unlocked rail, and the stored aim is only the starting shot. Origin, yaw, elevation, and power still have to sit inside the existing shot bounds. Open Workshop stays locked. There is no production score on this route.

Measured solutions and landing numbers are kept out of this page. They live under [appendix/](appendix/).

## A — Open Workshop

Enter: header **Range** → **Open Workshop**. Reset: **Reset preset** (also repeated beside the goal note).

| | |
| --- | --- |
| Physical question | What does a committed shot do in a small arrangement when nothing is asking to be scored? |
| What can change | The ramp, the bank, and the plate: position, facing, and resonant voice. The launcher stays on one fixed shot. |
| What stays | No pin, no target, no score. First ground contact ends the line. |
| Success | You can see that a piece change changed the shot, because the previous trail is the one that was recorded. |
| Voices | The ramp, bank, and plate ring on contact. The sound does not change how the shot flies. |

The opening arrangement is a ramp on the approach, a bank off to the side, and a plate further along the yard.

## B — Back Pocket

Enter: header **Range** → **Back Pocket**. Reset: **Reset preset**.

| | |
| --- | --- |
| Physical question | A gold circle sits behind the timber screen. Can a shot inside the aim window land there by moving the bank? |
| What can change | The one bank: position and facing. Yaw, elevation, and power, inside the window shown beside the goal. |
| What stays | The screen. The carriage origin. There is no score. |
| Success | First ground contact inside the gold circle. The circle is drawn and judged. |
| Opening | The bank stands off to the left. The opening aim is not a solution. |

Measured landings and arrangements that clear are not on this page. They are under [appendix/back-pocket/](appendix/back-pocket/). The measurement note is [back-pocket.md](back-pocket.md).

## C — Soft Landing

Enter: header **Range** → **Soft Landing**. Reset: **Reset preset** (also repeated beside the goal note).

| | |
| --- | --- |
| Physical question | Can you build a line that's easier to repeat? |
| What can change | The block, the bank, and the launcher. Origin, yaw, elevation, and power stay inside the rail stops. |
| What stays | The gold circle. First ground contact is the landing that is judged. No score. |
| Success | The round's centre is inside the circle at first ground. |
| Opening | The block and the bank start out of the way. The opening shot misses the circle. |

The measurement record is [soft-landing.md](soft-landing.md). Solutions and landing numbers are not on this page.

## D — Resonant Run

Two presets. Both open on that same trio and the same fixed shot. Measured layouts stay in [appendix/resonant-run/](appendix/resonant-run/). The evidence log is [resonant-run.md](resonant-run.md).

### Resonant Run: Free

Enter: header **Range** → **Resonant Run: Free**. Reset: **Reset preset**.

| | |
| --- | --- |
| Physical question | What does this fixed shot ring when nothing is asking the notes to come out in an order? |
| What can change | The ramp, the bank, and the plate: position, facing, and resonant voice. |
| What stays | No pin, no target, no phrase, no score. First ground contact ends the line. The rail stays fixed. |
| Success | You can move or retune a piece and fire the same shot. The previous trail is the one that was recorded. |
| Voices | Bank C4 timber, ramp D4 metal, plate E4 metal, until you retune them. The sound does not change how the shot flies. |

### Resonant Run: Phrase

Enter: header **Range** → **Resonant Run: Phrase**. Reset: **Reset preset**.

| | |
| --- | --- |
| Physical question | Can this fixed shot touch the resonant pieces in the order C4 then D4 then E4? |
| What can change | The ramp, the bank, and the plate: position, facing, and resonant voice. |
| What stays | The phrase, the rail, and the stand-in. The stand-in is a separate hit, not a note in the phrase. |
| Success | The contact record's resonant notes are C4, D4, E4 in that order. The stand-in hit is shown on its own line. Neither is a score. |
| Voices | The opening tuning is the same trio. The opening arrangement does not already play the phrase. |

## E — Travelling Bell

Enter: header **Range** → **Travelling Bell**. Reset: **Reset preset** (also repeated beside the phase control). Reset returns the release phase to 0.

| | |
| --- | --- |
| Physical question | Can a committed shot be timed to meet a slow bell on a short rail? |
| What can change | The release phase. The ramp, the bank, the shield, and the rail stay where the preset put them. |
| What stays | First ground still ends the line. The goal is contact with the bell, and that is not a first-ground zone. There is no score. The bell's path, speed, and hit rule are in the preset. |
| Success | A ledger contact with the bell before the line ends. The amber post is the release you chose. |
| Voices | The bell rings on contact. The sound does not change how the shot flies. |

The opening arrangement is a ramp on the approach, a bank beside it, a shield, and a bell shuttling a 4 m rail beyond the shield. Measured windows are kept out of this page. They live in [travelling-bell.md](travelling-bell.md) and under [appendix/travelling-bell/](appendix/travelling-bell/).

## F — Clockwork Gallery

Enter: header **Range** → **Clockwork Gallery**. Reset: **Reset preset** (also repeated beside the phase control). Reset returns the release phase to 0.

| | |
| --- | --- |
| Physical question | Can a committed shot be timed to meet a wooden figure circling a turntable? |
| What can change | The release phase. The plinth, the side screen, and the turntable stay where the preset put them. |
| What stays | First ground still ends the line. The goal is contact with the figure, and that is not a first-ground zone. There is no score. The figure's circle, speed, and hit rule are in the preset. |
| Success | A ledger contact with the figure before the line ends. The amber post is the release you chose. |
| Voices | The figure gives a timber knock, and a few hearts pop. Neither changes how the shot flies. |

The opening arrangement is a plinth, a side screen, and a figure riding a circle beside the straight shot. Measured windows are kept out of this page. They live in [clockwork-gallery.md](clockwork-gallery.md) and under [appendix/clockwork-gallery/](appendix/clockwork-gallery/).
