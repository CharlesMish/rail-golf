# Worldcraft experimental range

Route: `/lab/worldcraft`. The range selector sits in the lab header. It does not add a route. House Shot, Orc Stand-in, and saved v1 worlds stay available. Choosing a preset loads that preset's own rules. **Reset preset** puts the current preset back to the arrangement you entered.

Non-production preview for the parent branch `lab/wc-range-integrated-20261024`: [https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://lab-wc-range-integrated-20261024-rail-golf.charlesmish.workers.dev/lab/worldcraft). Pinned preview for `e36074d` on this branch: [https://012e39f9-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://012e39f9-rail-golf.charlesmish.workers.dev/lab/worldcraft). The record is [MUSIC.md](MUSIC.md). Neither is `rail-golf.cmish.dev`.

A preset states its launcher, which pieces are fixed, and its goal. The goal is one of `none`, `first-ground-zone`, `target-contact`, or `contact-phrase`. A contact phrase is an order of notes read from the contact record. It is not a score and not a rhythm. Fixed pieces do not move from the Build controls. A fixed launcher does not take a new aim or charge. A preset may instead leave aim and power inside a window and lock the carriage origin; the window is enforced on the controls and on the shot. Soft Landing and Musical Workshop are the presets whose launcher is not fixed and has no window: `launcher.fixed: false` compiles to an unlocked rail, and the stored aim is only the starting shot. Origin, yaw, elevation, and power still have to sit inside the existing shot bounds. Fixed Shot Workshop stays locked. Resonant Run: Free and Resonant Phrase are fixed shots. There is no production score on this route. The musical pass is [MUSIC.md](MUSIC.md). Its sitting is [PROTOCOL-MUSIC.md](PROTOCOL-MUSIC.md). The bank-dynamics follow-up is [MUSIC-2.md](MUSIC-2.md). Its sitting is [PROTOCOL-MUSIC-2.md](PROTOCOL-MUSIC-2.md).

Measured solutions and landing numbers are kept out of this page. They live under [appendix/](appendix/).

## A — Fixed Shot Workshop

The preset id is still `open-workshop`. The selector label is **Fixed Shot Workshop**.

Enter: header **Range** → **Fixed Shot Workshop**. Reset: **Reset preset** (also repeated beside the goal note).

| | |
| --- | --- |
| Physical question | What does a committed shot do in a small arrangement when nothing is asking to be scored? |
| What can change | The ramp, the bank, and the plate: position, facing, and resonant voice. The launcher stays on one fixed shot. |
| What stays | No pin, no target, no score. First ground contact ends the line. |
| Success | You can see that a piece change changed the shot, because the previous trail is the one that was recorded. |
| Voices | The ramp, bank, and plate ring on contact. The sound does not change how the shot flies. |

The opening arrangement is a ramp on the approach, a bank off to the side, and a plate further along the yard.

## Musical Workshop

Enter: header **Range** → **Musical Workshop**. Reset: **Reset preset**.

| | |
| --- | --- |
| Physical question | What order of contacts can this trio make when the shot can move as well as the pieces? |
| What can change | The ramp, the bank, and the plate. Origin, yaw, elevation, and power, inside the rail stops. |
| What stays | No pin, no target, no phrase, no score. The same physics as the fixed shot. First ground contact ends the line. |
| Success | The impact line names the sounds the shot actually made. The previous trail is the one that was recorded. |
| Voices | The opening tuning is the same trio as Fixed Shot Workshop. Retuning a piece does not change the flight. |

This is the unrestricted workshop. Fixed Shot Workshop is the locked shot, for comparing a geometry change. Measured arrangements are not on this page. They are under [appendix/music/](appendix/music/). The note is [MUSIC.md](MUSIC.md).

## B — Back Pocket

Enter: header **Range** → **Back Pocket**. Reset: **Reset preset**.

| | |
| --- | --- |
| Physical question | A gold circle sits behind the timber screen. Can a shot inside the aim window land there by moving the bank? |
| What can change | The one bank: position and facing. Yaw, elevation, and power, inside the window shown beside the goal. |
| What stays | The screen. The carriage origin. There is no score. |
| Success | First ground contact inside the gold circle. The circle is drawn and judged. |
| Opening | The bank stands off to the left. The opening aim is not a solution. The spare bank is tinted and listed as movable. The screen banks stay fixed. |

One measured landing holds only inside about 0.081° of yaw. The aim step is 0.5°, so that landing is not a route these controls can sit on. Coordinates stay in [back-pocket.md](back-pocket.md).

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

### Resonant Run: Free (fixed shot)

Enter: header **Range** → **Resonant Run: Free (fixed shot)**. Reset: **Reset preset**. The selector says this is a fixed shot.

| | |
| --- | --- |
| Physical question | What does this fixed shot ring when nothing is asking the notes to come out in an order? |
| What can change | The ramp, the bank, and the plate: position, facing, and resonant voice. |
| What stays | No pin, no target, no phrase, no score. First ground contact ends the line. The rail stays fixed. |
| Success | You can move or retune a piece and fire the same shot. The previous trail is the one that was recorded. |
| Voices | Bank C4 timber, ramp D4 metal, plate E4 metal, until you retune them. The sound does not change how the shot flies. |

### Resonant Phrase (fixed shot)

Enter: header **Range** → **Resonant Phrase (fixed shot)**. Reset: **Reset preset**. The selector says this is a fixed shot. The preset id is still `resonant-run-phrase`.

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
