# Timber Receiver v1 — smaller receiver, clearer aiming context

Route: `/lab/timber-receiver`. Exact v0 experiment control: `ca1cc8fa101dba04520b7930f8c0eae8e918cf04`.

The route still uses the real Timber Courtyard/Open Line and its incumbent FAMILIAR camera, three rails, launcher, Rail Round, power, recognition and scoring. This refinement changes **one opt-in wall geometry record only**. No camera transparency, visual/physical mismatch, new rails, ground extension, OOB expansion or scripted return was introduced.

## Frozen candidate

The retaining face moves from `(43, 7, 148)` to `(45, 5, 134)`, shortens from 26 to 18 m and lowers from 14 to 10 m. Thickness remains 1.2 m, yaw remains −25°. It now belongs more closely to the existing far lumber bay. Its oriented bounds are approximately x40.65–49.35 / z125.59–142.41. There is physical clearance from the existing lumber stack; it does not enclose the far end or right edge. There is open space above and around both ends.

The static Havok box retains restitution .86 / friction .18, the same authority as ordinary courtyard banks. Existing timber, brick and dark machine materials are reused, including visual-only board courses, straps and cap. The launcher and round are the actual existing `MannersGame` implementation. No duplicate equipment builder or material palette was needed for this lane.

## Candidate screening

Seven nearby candidates including v0 were checked against seven existing physical reference lines (49 launches). This was a geometry screen, not a score-distribution or success-rate survey. Reducing height alone did not improve the station-to-wall relationship enough; moving the bounded face toward the lumber bay did.

| Candidate | Center x / z | Height / length | Yaw | Old Gate return controls retained | Old Walk return controls retained |
|---|---:|---:|---:|---:|---:|
| v0 | 43 / 148 | 14 / 26 | −25° | 3/3 | 4/4 |
| Lower only | 43 / 148 | 9 / 20 | −25° | 2/3 | 0/4 |
| Moderate forward move | 44 / 141 | 10 / 20 | −25° | 2/3 | 2/4 |
| Shorter/lower forward | 44 / 139 | 9 / 18 | −25° | 1/3 | 0 useful downstream chains |
| Mild splay | 45 / 140 | 10 / 18 | −18° | 2/3 | 1/4 |
| Far lumber, longer | 44 / 134 | 10 / 20 | −25° | 3/3 | 0/4 |
| **Far lumber, short (selected)** | **45 / 134** | **10 / 18** | **−25°** | **3/3** | **0/4** |

The last column is expected to change when the wall moves and lowers: preserving the old high/right Walk aim is not the objective. Three plausible candidates then received the same coarse 216-launch Walk sweep: three incumbent rails, six yaw samples, four elevations, three powers. The moderate-forward, longer far-lumber, and selected short far-lumber candidates respectively produced 97/113/100 qualified receiver departures and 33/21/20 receiver→existing-feature chains. These conditional, deliberately receiver-oriented grids do not estimate ordinary player success.

The selected wall prioritizes sightlines and clearance while retaining physical variety. Regression fixtures establish:

- All three original Gate→middle-tread/lumber→RETURN lines still turn baseline spatial OOB into ground endings inside the existing yard.
- Distinct Walk lines across all three existing rails give RETURN→far lumber, RETURN→nearer lumber and RETURN→low tread.
- Real qualified contacts use unchanged recognition thresholds and ordinary COMMON scoring once per feature.
- Non-contact shots, including Charlie's existing expressive bank/tread reference, remain byte-for-byte identical to the no-wall yard fixture.
- Existing OOB routes and high/right bypasses remain available; the receiver is smaller, not a universal backboard.

A full existing-feature→RETURN→another-existing-feature Gate chain is still **not established**. The positive Gate lines return to existing ground regions. This remains a spatial invitation, not a guaranteed combo.

## Screen-space evidence

`tests/helpers/receiver-sightlines.mjs` projects the actual rotated box through Babylon's settled FAMILIAR address-camera matrices. It uses incumbent station transforms, camera offset/target, portrait mode and FOV without changing them. The measure is the clipped convex projected solid silhouette, not a rendered image, and does not subtract occlusion by other scenery.

Receiver-directed views cover both Gate and Walk, all three rails, desktop 1440×900, landscape mobile 844×390 and portrait 390×844. Gate yaw samples are 10°–30°; Walk samples are −40° to −70°. These angles include the previously useful large-yaw receiver approaches.

| Largest wall silhouette in the sampled views | v0 | v1 |
|---|---:|---:|
| Gate, 1440×900 | 1.21% | 0.72% |
| Walk, 1440×900 | 36.86% | 8.14% |
| Walk, 844×390 | 29.78% | 6.02% |
| Walk, 390×844 | 14.03% | 3.17% |

At Walk middle rail / yaw−65° on desktop, wall height drops from 74.47% to 37.38% of the viewport; area drops from 29.33% to 6.60%. At a receiver-directed −45° view, the existing far lumber top, high tread edge and middle tread edge are all in frame and are not occluded by the receiver. This is geometric context evidence, not a guarantee every object is visually legible. At the most sideways −65° view some tread landmarks remain outside the normal FOV; this refinement does not move the camera or pretend to reveal the entire yard at once.

## Verification and manual limit

The existing seven receiver regressions continue to pass with updated Walk references. Three focused projection tests cover the sampled station/rail/aspect family, visible unblocked context markers and the previous large-yaw composition. Extra controls establish no-wall physics identity where the wall is untouched, physical return repeatability, pallet-state independence, isolated storage and variant-preserving share links.

Rendered WebGL inspection is not available in this environment. Charlie should judge whether the smaller wall is still easy to notice from Gate, whether Walk's opening around it makes intended return regions understandable, and whether the far-lumber composition feels like a retaining structure rather than an extra puzzle wall. No player-facing reference coordinates or new instructional labels were added.
