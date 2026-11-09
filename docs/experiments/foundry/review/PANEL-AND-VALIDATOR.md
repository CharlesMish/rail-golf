# Play panel and validator

Recommendation and spec only. Nothing here is implemented. The panel text was read on each candidate's own commit, in headless Chrome, at 1280×800 and 390×844. The sentences below are from those pages.

## What the kit says

On `1ad3166`, `app/lab/worldcraft/worldcraft.tsx` picks the goal card like this.

- Goal `first-ground-zone`, and the preset is not Back Pocket: "First ground in the gold circle." Then "Aim and power stay inside the rail stops. The block and the bank can move."
- Goal `none` and the rail is fixed: "Fixed shot." Then "The ramp, bank, and plate can move and ring."
- Goal `none` and the rail is free: "Musical Workshop." Then "The ramp, bank, and plate can move and ring."

That last branch is the one free-launcher Foundry worlds fall into. The foundry invitation is stored as `ui.notice` (`openFoundry` uses `card.invitation`) and rendered at the bottom of the aside. It is not the card heading.

`shotNotice` for goal `none` and a first-ground ending says "Revise a piece and fire the same shot." For any other ending it says "Line ended: settled" (or whichever reason) and "No pin, no target, no score." `playNoticeFor` for goal `none` and a free launcher says "Move a piece, or change origin, aim, and power."

Three audio and display gates key off `presetId === 'musical-workshop'`:

- `presetDynamics` in `lib/worldcraft-resonance.js` returns face speed (`normal-speed`) only for that id. Every other preset, including every Foundry world, stays on total speed.
- `resonance.play` is given the selected bank voice only when the preset id is `musical-workshop` (`worldcraft.tsx`, the impact callback). Otherwise the variant is omitted. Variant H is `tuned-even` (`MUSICAL_WORKSHOP_SOUND`). The H settings apply to timber banks only.
- The note timeline and the contact marks on the trail are built only when the preset id is `musical-workshop`.

`describeImpactSequence` is not behind that gate. It already runs for every world. On Open Contacts the three-contact shot printed "Bank C4 → Plate E4 → Bank C4" with the timeline absent. On Return Address the deck was "A silent piece was touched and did not ring."

## What each branch did

Only two branches edit `worldcraft.tsx`.

The Other Way (`40e8055`) shows the foundry card name and the invitation when a foundry card is open, then a sentence from the edit flags: pieces that are not fixed can move, or "These pieces stay where they are," plus whether aim is free. A dull world with no card gets the world name. Musical Workshop remains the fallback when the world has resonant pieces and no foundry card. Confirmed on the page: the card is the invitation, and the pieces-stay sentence is present. After the shot, `shotNotice` still says "Revise a piece and fire the same shot." This branch does not run for a `first-ground-zone` world, so it would not correct The Carry.

Right Angle (`57b82bd`) shows the Musical Workshop card only when `presetId === 'musical-workshop'`. A geometry-locked, goal-none world gets the preset name and "These pieces stay put. Origin, aim, and power can change." `shotNotice` for that case says the pieces stay and aim can change. Confirmed on the page. The invitation stays in the status line. A world whose geometry can move and whose goal is none (Open Contacts, Return Address, Bell Loft) is outside this branch. The Carry's gold-circle paragraph is unchanged.

Open Contacts, The Carry, Return Address, and Bell Loft do not change the panel. Their manifests name the mismatch under limitations. Confirmed on the pages:

| World | Card heading | Wrong sentence on the page | What the world actually is |
| --- | --- | --- | --- |
| Open Contacts | Musical Workshop | "The ramp, bank, and plate can move and ring." | No ramp. Plates fixed. One bank moves. Goal none. |
| The Carry | First ground in the gold circle | "Aim and power stay inside the rail stops. The block and the bank can move." | Rail fixed, sliders absent. One ramp moves. No block, no bank. The status line under the button is correct. |
| Return Address | Musical Workshop | "The ramp, bank, and plate can move and ring." | Two banks, one of them movable. No ramp, no plate. |
| Bell Loft | Musical Workshop | "The ramp, bank, and plate can move and ring." | A stair and one wall move. No plate. |

The Other Way and Right Angle do not show the words Musical Workshop. The Carry does not either. The wrong Carry sentence is the gold-circle paragraph.

On 390×844 the invitation, when it is only the status line, sits below the fire control. The Other Way phone opening shows the blocks and the sliders, and the invitation is off that first view.

## One panel approach

Drive the card from the foundry manifest and the loaded preset. Do not add a list of world ids.

When `foundryId` is set:

1. The card heading is the foundry card's name.
2. The first sentence is the card's invitation.
3. The next sentence is derived from the preset that was just loaded.
   - `rules.launcher.fixed`: the shot stays on the printed origin, yaw, elevation, and power.
   - Otherwise: origin, yaw, elevation, and power can change inside the rail stops.
   - Movable kinds are the kinds of objects that are not in `rules.fixed`, limited to kinds whose `rules.allowance` count is greater than zero. If that set is empty, say the pieces stay where they are. Name a kind only when it is present. Do not say ramp, bank, block, or plate unless that kind is in the movable set.
   - Goal `first-ground-zone`: the gold circle judges the first landing, and the landing is not a score.
   - Goal `none`: there is no circle and no score. The line ends on first ground, or when the ball settles.

`playNoticeFor` and `shotNotice` use those same sentences. A geometry-locked world does not ask the player to revise a piece. A fixed rail does not say that aim and power stay inside the stops as though they could be changed. A world with no block does not say the block can move.

Leave the Musical Workshop heading, the bank-sound control, the note timeline, and the contact marks on `presetId === 'musical-workshop'`. A later manifest field can opt a world into those three without becoming Musical Workshop. Something like `presentation: { dynamics: "normal-speed" | "total-speed", bankVoice: true, timeline: true }`, read at the three gates above and in `presetDynamics`. Absent means today's behaviour. Open Contacts could then ask for the H timber-bank voice and the timeline. Key the field off the manifest, not off an allow-list of ids. This review does not add the field.

The nearest carriage stop is a presentation gap on Return Address, separate from the card. `last.contacts` already contains `worldcraft-tee` and `point.x` (printed in Contact record to two decimals). The nearest legal stop is `Math.round(x * 2) / 2`, kept only if it lies in −10..10. Showing that next to the tee row would tell the player where the reply starts. It does not require a physics change. It is not part of the card recommendation above.

The Other Way's patch is the closest of the two: invitation, name, and edit flags. It still leaves the status line wrong, and it misses a fixed-rail world with a circle. Right Angle's patch covers the locked corner and leaves the movable worlds and The Carry on the kit text.

## Validator spec

Smallest change that would have caught the two holes this review had to fire by hand. No new goal kind. No neighbour search. No change to physics.

In the manifest schema (`lib/worldcraft-foundry.js`) and in `scripts/foundry/validate.mjs`, each tested shot may carry two optional fields. The runner is the one that already exists (`runRange` / `runLayoutShots` in `scripts/range/run.mjs`).

### `layout`

Optional `{ "objects": [ ... ] }`. Merge it over the preset's objects by id (new transforms, same pieces), then `validateRangePreset`. Fire that arrangement through the existing harness and compare `reason`, `elapsed`, `position`, and `outcome` with `Object.is`, as today.

This covers the closed-door Bell Loft shot and one Carry ramp pose. The closed-door shot can assert `reason: "settled"`, the recorded elapsed time, and a position whose y is the loft floor. The open-door shots stay as they are. A pose that fails `validateRangePreset` (the overlapping door slots) fails the manifest, which is what the editor already does.

### `contacts`

Optional array of 1 to 8 body ids. Each entry is `worldcraft-object-<piece id>` or `worldcraft-tee`. Compare it, in order, to the ledger rows whose body is a piece or the tee. Ignore `worldcraft-ground`. A mismatch fails the shot the way a terminal mismatch fails it.

Return Address serve would assert `["worldcraft-object-west", "worldcraft-object-east", "worldcraft-tee"]`. The short opening would assert the two banks and no tee. The direct lob would assert `["worldcraft-tee"]` only. Open Contacts would assert the order families the same way (`bank-timber`, then `plate-return-right`, then `bank-timber`).

Do not assert the nearest carriage in the validator. That is a reading of the tee x, and the tee x is already the ledger point. Do not assert `nearbySensitivity`. The manifest can keep recording it; the runner does not have to search it.
