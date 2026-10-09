# k5 presentation

Visual check only. This does not claim that the ring, the tube, or the kept dashes change play or motivation.

## Verdict

k5's 0.15 m amber tube stays. The **20 px screen-space first-kiss ring** on arm `k6` is worth owner review. A near-vertical trail does not hide the launcher, so no fade was added. The kept-line dashes are not worth adopting.

## Where it is

- Branch: `studio/k5-presentation`
- Draft PR #43: https://github.com/CharlesMish/rail-golf/pull/43
- Base: `studio/e1b-trail-refine` (PR #40). That branch was not pushed to.
- Cloudflare Workers Builds, commit `330530bd`: https://4e699155-rail-golf.charlesmish.workers.dev
- Branch preview: https://studio-k5-presentation-rail-golf.charlesmish.workers.dev
- Ring and tube: `d83b36d85d5fd56d169297f0d275c7593109f249`. On-screen BUILD `d83b36d85d`.
- Kept brightness, one later commit: `d6bb9ddf94a777a4dd5d82e4e7618b68f4fa1e3a`. On-screen BUILD `d6bb9ddf94`. Address and survey frames are the earlier SHA. The kept-pair frames are the later SHA. The tube and the ring are the same in both.
- `a7`, `c3`, and `k5` are unchanged, so k5-before is still on this build at `/lab/linecraft-e1?arm=k5`.

`k6` matches `k5` on controls, shelf, captions, storage isolation, and the historical tube. The differences are the kiss mark and the kept-line mesh.

| | k5 (unchanged) | k6 |
| --- | --- | --- |
| Tube | 0.15 m amber, same material as before | same tube |
| First kiss | pin 0.90 × 0.14 m, head 0.48 m | 20 px hollow ring, screen space |
| Kept line | solid cyan hairline, alpha 0.45 | dashed teal tube, radius 0.12 m |

## Why a ring, not another sphere

Revision 1 already showed the projective problem. On a phone loft, a 1.06 m head was still a 2 px end inside a 4 px tube. A head wide enough to clear that tube would be about a 3 m sphere, which is a bulb on the desktop. A ground ring is the same kind of object: its pixel size still shrinks with distance. A screen-space ring does not. It stays 20 px on both viewports, hollow, amber (`rgba(186, 112, 36, 0.96)`), with a 1 px dark edge so it does not melt into the tube. It is not a crosshair. The cyan muzzle spine stays the aim reference.

The ring is drawn only from a recorded first-kiss point. Nothing is projected ahead of the last sample.

## Vertical trail

Checked on the high loft (gate, yaw 0, elevation 74, 48%) at desktop address. The amber column rises through the aim picture. The cyan muzzle ring at the launcher stays visible on both k5 and k6. Adjust restores the same direction the trail already records, so the short muzzle spine lies inside that column rather than pointing somewhere else. The place the next shot starts is not concealed. No fade, and no automatic disappearance.

## Kept beside previous

The only view that shows both is Survey after Ghost. k5's kept line is still the faint cyan hairline. k6 draws a thinner dashed teal (radius 0.12 m, dash 4.5 m, gap 1.8 m) and, after the first capture showed it too dark to use, a brighter cool emissive. The second capture still does not read as a separate record at survey distance. The Shelf and Gallery were not redesigned. This distinction is not worth a further pass.

## Contact sheets

Columns are k5 then k6. All of these are SwiftShader frames: visual evidence only, not gameplay feel.

- `/opt/cursor/artifacts/k5-presentation/sheets/desktop-address.png`
- `/opt/cursor/artifacts/k5-presentation/sheets/phone-address.png`
- `/opt/cursor/artifacts/k5-presentation/sheets/survey.png`
- `/opt/cursor/artifacts/k5-presentation/sheets/kept-pair.png`
- `/opt/cursor/artifacts/k5-presentation/sheets/marker-detail.png`

Raw frames and per-shot JSON are under `/opt/cursor/artifacts/k5-presentation/raw/`.

### Capture conditions

- Chrome 148.0.7778.96, headless, fresh context per shot
- Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)
- Desktop 1440×900, phone 390×844, device scale 1
- fps: desktop 6–8, phone 19–22
- Yard luminance standard deviation on every kept frame was about 22–32. None was a blank canvas.

Receipts matched across k5 and k6. Contact labels at the result, before Adjust:

| id | setup | contacts |
| --- | --- | --- |
| gate-low | origin 0, yaw 0, elev 18, 62% | FIRST KISS |
| gate-loft | origin 0, yaw 0, elev 74, 48% | FIRST KISS |
| gate-bank | origin −4, yaw −1, elev 25, 94.5% | BANK A, BANK B, FIRST KISS |
| lumber-low | lumber, origin 0, yaw +6, elev 20, 58% | FIRST KISS |

On the phone survey of the loft, the landing sits on the left edge of the frame. The k6 ring is clipped there (`left` about −3 px). The k5 bead is on that same edge. The phone address ring is fully on screen, 20 px, on the contact.

## Tests

`npm test`: 435 passed, 0 failed. `npm run lint`: 0 errors, 2 pre-existing `react-hooks/exhaustive-deps` warnings in `app/manners-game.tsx`. New tests lock k6's tube to k5's numbers, require the screen ring instead of a pin and head, and check that kept dashes stay on the recorded polyline. k5's radius assertion is now the exact 0.15 m rather than a range. The a7 tube assertions are the same.

## Narrow integration onto main

Not made. If the ring is adopted later, the diff is the presentation only:

- The screen-space ring, positioned from the recorded first-kiss point, in place of a world-space bead.
- The k5 tube numbers only if the owner is also taking that tube. Those numbers already live on PR #40. This branch should not be merged in order to get them.
- No E1 arm router, no `linecraft-e1` route, no arm-prefixed storage, no shelf-contract copy.
- No kept-dash mesh. It did not read.
- No launch fade.
- Main already has the blank-canvas follow-camera fix. PR #40 carries a cherry-picked copy (`f8a8bf2`). Do not carry that fix again.

## What was not checked

- A physical phone, or any GPU other than SwiftShader. These frames are not feel, pacing, or motivation.
- The owner's profile, saves, or a hosted-preview login.
- Flight frames. Address and Survey are settled cameras, so the two arms match.
- Result-caption or ending-line copy. That work belongs to the E4 lane and was not touched.
- `/`, `/courtyard`, and `/practice` beyond the existing route tests, which still forbid `linecraft-e1` on those pages.
