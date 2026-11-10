# Ricochet Garden — Loop

Arrangement B, an enclosed return. World `ricochet-garden-loop`. Measured on gallery tip `960b9e933a9e1d084a94ebdccb8c8a7c8f0b33d7`. That tip was still the head of `lab/wc-foundry-gallery-20261109` when this branch was cut. Seed `20261110` is provenance only. It is not applied to the solver. Physics, restitution, charge mapping, and first-ground termination are unchanged.

Grid counts below are how many sampled setups produced an order. They are not a probability that a person finds that order.

## Definitions

Piece contacts, ground omitted, repeats kept. An edge contact is a point within 0.7 m of a piece's side or 0.55 m of its top. A rebound is two or more piece contacts. A return is a repeated piece, or a later contact more than 1.5 m uprange of the previous one. A loop is a piece, then a different piece, then the first piece again. Chaotic means seven or more piece contacts. Interesting means an edge, a rebound, or a return. A near neighbour is the same order, one substituted contact, or one contact inserted or dropped.

Slider steps are 0.5° of yaw, 0.5° of elevation, and 0.01 of charge. Family width is the contiguous run of those steps that keeps the order, including the centre. A walk that is still inside the order at the cap is a lower bound.

## What was sketched

An empty-yard check at elevation 18° and charge 0.55 lands near z 46, with the ball already above a 4 m plate through the middle of the yard and still under a 7 m bank near z 34. Three first sketches put the back wall near z 44–46. A 30-shot probe mostly missed them. They were dropped before the measured trio. The measured trio sits in z 16–36, where that arc actually hits.

Each measured variant has 10 resonant pieces, a free launcher, goal none, and one movable back bank. The selection probe is yaw −18° to 18° step 3°, elevation 10°, 14°, 18°, 22°, charge 0.45, 0.55, 0.68. 156 shots.

| Variant | Orders | Multi | Return | Loop | Edge | Chaotic |
| --- | --- | --- | --- | --- | --- | --- |
| Pocket | 28 | 38 | 30 | 10 | 86 | 0 |
| Wedge | 46 | 67 | 41 | 25 | 100 | 3 |
| Lane | 34 | 41 | 32 | 13 | 90 | 0 |
| Open Contacts, same probe | 10 | 14 | 12 | 6 | 50 | 0 |

The wedge loops more and also produces 7- and 8-contact shots. The lane's loops are smaller. The pocket keeps every contact count at 5 or below on this probe and still has a bank-then-hook return and a bank-corner-bank loop. A later half-degree band (588 shots, yaw −12° to 12° step 0.5°, four elevations, three charges) found the pocket loop and the three-plate order as regions, not single cells.

One revision eased the back bank from yaw −15° to −10° and moved the three quietest west pieces. On the 875-shot broad grid it raises multi-contact shots from 107 to 150 and loops from 16 to 44, and it adds one 10-contact shot and 72 orders. The kept pocket stays at 5 contacts or fewer on that grid. The revision was not kept.

## Kept layout

Launcher x 0. Opening aim yaw 0°, elevation 18°, charge 0.55. The back bank is the only movable piece.

| Id | Kind | x | z | Yaw | Voice |
| --- | --- | --- | --- | --- | --- |
| bank-back | bank | 0 | 34 | −15 | timber 0 |
| bank-flank | bank | −12 | 26 | 90 | metal 1 |
| plate-mouth-w | plate | −4 | 18 | 20 | metal 3 |
| plate-mouth-e | plate | 4.5 | 18 | −20 | metal 4 |
| plate-east | plate | 6 | 26 | −30 | metal 2 |
| plate-west | plate | −5.5 | 26 | 35 | timber 3 |
| plate-side-e | plate | 10 | 30 | −80 | timber 1 |
| plate-side-w | plate | −8 | 32 | 70 | metal 0 |
| plate-corner-e | plate | 6.5 | 32 | −40 | metal 4 |
| plate-hook | plate | 2.5 | 28 | −55 | timber 2 |

The mouth plates leave a gate. The flank closes the west. The hook and the east corner sit where a bank rebound comes back. The east side is plates, so a kick can leave instead of rattling between two tall walls.

## Broad grid

Yaw −24° to 24° step 2° (25), elevation 8°, 12°, 16°, 20°, 24°, 30°, 40° (7), charge 0.35, 0.45, 0.55, 0.65, 0.80 (5). Origin x 0. 875 shots. The same grid was fired at four other back-bank poses, at the simpler subset, at the rejected revision, and at Open Contacts with the same kind of bank poses.

### Kept pocket, default bank

875 shots, 47 orders, 0 rejected. Multi 107 (12.2%). Return 67 (7.7%). Loop 16. Edge 232 (26.5%). Rebound 107. Interesting 263 (30.1%). Chaotic 0.

Contact-count histogram: 0 contacts 480, one 288, two 82, three 9, four 12, five 4. Nothing above five. The four- and five-contact shots are the busy end. They are not a pile-up, and they are a small share of the grid.

Piece hits (shots that touch the piece at least once): back bank 126, flank 56, mouth west 79, mouth east 78, hook 64, corner 30, east 28, side east 24, side west 22, west 21. Every piece is reached. The west pieces are the least used.

Orders with at least six shots:

| Shots | Order | Coarse span |
| --- | --- | --- |
| 480 | no piece | the whole grid, mostly the high lobs |
| 70 | bank-back | yaw −10° to 10°, every elevation and charge |
| 67 | plate-mouth-w | yaw −18° to −6°, elevation 8° to 16° |
| 62 | plate-mouth-e | yaw 8° to 20°, elevation 8° to 16° |
| 34 | bank-flank | yaw −24° to −20°, every elevation and charge |
| 22 | plate-hook | yaw 2° to 8°, elevation 8° to 24° |
| 21 | bank-back > plate-hook | yaw −2° to 2°, every elevation and charge |
| 16 | bank-flank > plate-side-w | yaw −24° to −22° |
| 11 | plate-east | yaw 10° to 16°, elevation 16° to 24°, low charge |
| 8 | plate-side-e | yaw 18° to 20° |
| 7 | plate-mouth-e > plate-mouth-w | yaw 8° only |
| 6 | plate-west | yaw −14° to −8° |
| 6 | bank-back > plate-west | yaw −10° only |
| 6 | bank-back > plate-mouth-e | yaw −6° to −4° |

The 2° grid under-samples families that are only a few degrees wide. The loop and the three-plate order show up in the half-degree band and in the walks below, not as large coarse buckets.

### Open Contacts, same grid

875 shots, 13 orders. Multi 48 (5.5%). Return 46 (5.3%). Loop 6. Edge 156 (17.8%). Interesting 166 (19.0%). Chaotic 0. Histogram: 0 contacts 615, one 212, two 42, three 4, five 2. The aim plates at x ±12, z 20 are not hit inside yaw ±24°. The two return plates and the timber bank carry the grid. Each bank-then-return-plate order has 20 shots, spanning about 6° of yaw and elevation 8° to 24°.

On this grid the pocket has more orders (47 against 13), more multi-contact shots (107 against 48), more loops (16 against 6), more edge shots (232 against 156), and fewer misses (480 against 615). Open Contacts' two-contact returns are wide. The pocket's matching return, back bank then hook, is also wide once it is walked at slider steps. The pocket adds the corner loop, the three-plate chain, and the west flank, which this grid reaches and Open Contacts' outer aim plates do not.

Turning Open Contacts' bank to yaw ±15° drops loops from 6 to 2. Yaw −30° drops them to 1. Sliding that bank to x 2 leaves 6 loops. Turning this world's back bank does not remove the multi-contact shots: yaw 0 gives 104 multi and 18 loops, with 3 chaotic shots including one of 8 contacts; yaw −30° gives 107 multi, 20 loops, and 0 chaotic; yaw +15° gives 106 multi and 13 loops and moves returns onto the west plate; x +2 gives 112 multi and 16 loops. The default pose already holds the return, the loop, and the flank. The moved bank changes which of those is easy. It is not the only place they exist.

## Starter shots

All six immediate neighbours match, except where noted. Widths are slider steps.

| Id | Aim | Order | Exact neighbours | Width yaw, elevation, charge |
| --- | --- | --- | --- | --- |
| return | yaw −1°, elevation 16°, charge 0.55 | back bank, hook | 6/6 | 12, 12, 15 |
| loop | yaw 5.5°, elevation 16°, charge 0.57 | back bank, east corner, back bank | 6/6 | 5, 5, 6 |
| plates | yaw 6°, elevation 14°, charge 0.55 | hook, east side, east corner | 6/6 | 7, 3, 4 |
| flank | yaw −22°, elevation 16°, charge 0.55 | flank, west side plate | 6/6 | 6, 15, 16 |
| mouth | yaw −12°, elevation 12°, charge 0.55 | west mouth plate | 6/6 | at least 17, 12, at least 17 |
| bank-turned | yaw −4°, elevation 16°, charge 0.55, back bank moved to yaw −30° | back bank, hook, back bank | 6/6 | 9, 6, 8 |

The return, the mouth, and the flank are the wide ones. The loop is smaller and still has every adjacent detent inside it: 68 cells in the half-degree window around it had all six neighbours exact. The three-plate order is thin in elevation (3 steps, so one detent either side) and solid in yaw. The turned bank is a layout shot. That loop is wider than the loop on the authored yaw.

The opening aim, yaw 0° elevation 18° charge 0.55, is not a starter. It plays back bank, hook, west side plate, and the third contact disappears at yaw −0.5°, at elevation 17.5°, and at charge 0.54, leaving the wide return. A four-contact continuation, back bank, corner, back bank, hook, was walked from yaw 8° elevation 24° charge 0.45: 3 of 6 neighbours match and the widths are 2, 3, and 2 steps. That one is a knife-edge and is not in the manifest.

## Simpler arrangement

The same 875-shot grid with the flank, the west plate, and the west side plate removed (7 pieces). Orders 37. Multi 79 (9.0%). Return 57. Loop 16. Edge 209. Interesting 229. Chaotic 0. Misses rise from 480 to 543. The back-bank-then-hook order stays at 21 shots. The coarse loop count stays at 16. The west-wall orders leave with the pieces: the flank's 34 shots and the flank-then-side-plate's 16 shots. The simpler yard keeps the east return and does not keep the west contact. It is not the same instrument.

## What failed

The first three placements were past the landing, so the ball met the ground before the room. The wedge's extra loops came with 7- and 8-contact shots. The revision's extra loops came with a 10-contact shot and more fragmented orders. The opening aim's third contact, and the four-contact corner continuation, do not survive neighbouring slider steps. High lobs in the broad grid (elevation 30° and 40°) clear the banks and inflate the miss count. Yaw beyond about ±24° was not the sampled window.

Numbers for every run are in [sweep.json](sweep.json).

## Screenshots

Headless Chrome, SwiftShader, `?qa=1`. Opening is the survey view. The three families are the return, the corner loop, and the west flank. Each family frame includes the note timeline. The browser contact orders matched the headless shots.

- `screenshots/opening-desktop-1280x800.png`
- `screenshots/opening-portrait-390x844.png`
- `screenshots/opening-landscape-844x390.png`
- `screenshots/return-desktop-1280x800.png`
- `screenshots/return-portrait-390x844.png`
- `screenshots/return-landscape-844x390.png`
- `screenshots/loop-desktop-1280x800.png`
- `screenshots/loop-portrait-390x844.png`
- `screenshots/loop-landscape-844x390.png`
- `screenshots/flank-desktop-1280x800.png`
- `screenshots/flank-portrait-390x844.png`
- `screenshots/flank-landscape-844x390.png`

