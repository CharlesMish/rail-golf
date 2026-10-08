# E3 maker report — Gate yard pallet carry-over

Draft PR [#42](https://github.com/CharlesMish/rail-golf/pull/42). Do not merge.

- Branch: `studio/e3-gate-yard`
- Final SHA: `bd360500d12c9479fa367302b53358f683391f31`
- On-screen BUILD: `bd360500d1` (matches that SHA)
- Base: `d385b6da9b97cd73945c770cb01a6bc4d308b747`
- Code diff against that base: 12 files, +572 / −97. This report is an additional file.

## Blank-canvas cherry-pick

`5211bbe439540d4cd9dc0fc9b3ad105899efced7` (draft PR #41) is on this branch as its own commit `3eeca9d`. It touches only `lib/flight-framing.js` and `tests/line-feel.test.mjs`.

Cause: `followHeading` returned `{...direction}` on a Babylon Vector3 when horizontal speed was under 0.1 m/s. That dropped x/z and left the follow camera with NaN for the rest of the session. Both Gate arms get the fix. A rendered flight frame on this SHA stays framed (`ROUND DOWNRANGE`, ball in view). I did not fire a separate near-vertical kick to re-create the old failure.

## What changed

| File | Role |
| --- | --- |
| `app/lab/gate-yard/page.tsx` | `/lab/gate-yard?k=m4\|t9`. Any other `k` refuses to load. |
| `lib/gate-yard.js`, `lib/gate-yard.d.ts` | Lab-only pallet and lever, carry/reset rules, names, storage, export, stop record. |
| `app/manners-game.tsx` | Gate route on the Open Line card. Shared linecraft source contracts left intact. |
| `app/globals.css` | Amber/violet chip and the End session / Export study row. |
| `tests/gate-yard.test.mjs` | Route, DOM identity, lifecycle, storage, reference flip, 1,848-shot grid. |
| `tests/helpers/diverter-physics.mjs` | Harness can build the Gate pallet. Existing callers unchanged. |
| `lib/browser-provenance.js`, `.d.ts`, `tests/lab-lifecycle.test.mjs` | Gate tab identity uses `rail-golf:gate-yard:<arm>:tab-id`. Other labs keep the old key. |
| `lib/flight-framing.js`, `tests/line-feel.test.mjs` | Cherry-pick above. |

Shared `KICKER_PALLET` / `KICKER_SWITCH`, rail rules, Havok setup, pad impulse, first-ground-contact ruling, the once-per-launch switch rule, RUN, VARIETY, score, and `REFERENCE_SHOTS` are unchanged. `/`, `/courtyard`, `/practice`, `/lab/lines`, `/lab/linecraft`, `/lab/linecraft-e1`, and `/lab/yard-sessions` were not given a new route behavior. Rendered boots of `/`, `/lab/lines`, and `/lab/linecraft` still reach ready: courtyard shows Across the Yard with the gallery locked, lines still shows `SHOOT SWITCH` and the LINE score, linecraft still opens on its lesson strip.

## Placement and locks

Lab-only geometry, same slab as the shared pallet (10 × 0.8 × 8) and the same lever size (2.4 × 3.4 × 0.7). States still come from `KICKER_STATES`.

- Pallet: x 0, y 0.5, z 28
- Lever: x 6, y 4.2, z 16

Coarse Gate grid, 1,848 shots (yaw −50…+50 step 5, elevation 10…60 step 5, power 30–100% step 10, rail 1, origin 0):

| Lock | Result |
| --- | --- |
| Lever struck by 2–6% | Met. 65/1848 = 3.52%. That rate sits between the skip-pad rate and the bank rate. |
| Skip-pad line in both states | Met. 12 shots in A and 12 in B. |
| Reference flip A→B and B→A | Met in the headless test. The rendered yard also flipped on both arms. The striking setup stays in the test file. |
| ≥15% of shots change landing by >2 m or change contact set | Not met. 177/1848 = 9.58%. Not loosened into a passing assertion. The test requires the rate to stay above 5% and below 15%. |
| Per-arm lifecycle | Met. See the table below. |

A 10 × 8 × 0.8 slab cannot cover 15% of this grid. Balls are already past a ground pallet, or wide of it, on most shots. Floating the same slab tops out near 9.4% geometric overlap. The measured Havok ceiling with this lever is 9.58%. I did not enlarge the pallet, edit `KICKER_STATES`, or change physics.

The headless harness still uses the 13 m tee. The rendered Open yard uses the linecraft 23 m tee. Center launches still flip in the browser.

## Lifecycle

Names are `PALLET` and `LEVER` in either state. The chip is amber for A and violet for B. Lessons, the station picker, score, lifecycle copy, and previous-shot captions are not shown. Reset Card restores A in both arms.

| | m4 (carry) | t9 (reset) |
| --- | --- | --- |
| Before any lever contact | A | A |
| During the flight that hits the lever | B, live | B, live |
| Adjust | B (rendered) | A (rendered) |
| Retry, Recall | keeps current state | A |
| Reset Card | A | A |
| Reload | session key `rail-golf:gate-yard:m4:pallet` | A, and that key is never read or written |

Rendered confirmation on this SHA: after a lever contact and Adjust, m4 shows `PALLET B` (violet) and t9 shows `PALLET A` (amber). t9's session storage has no pallet key. m4's does. End session writes `rail-golf:gate-yard:<arm>:session-stop` (`kind: stop`, per-arm attempt count). The result line is `LINE ENDED` with `PALLET A` or `LEVER · PALLET B`.

The two arms share one DOM. The only rendered difference before a lever contact is the BUILD suffix.

## Tests

`npm test`: 435 pass, 0 fail (426 on main). `npm run lint`: 0 errors, 2 warnings. Those warnings are the existing `react-hooks/exhaustive-deps` notes in `app/manners-game.tsx`. They do not name the Gate keys.

## Rendered checks

Headless Chrome 148.0.7778.96, `--use-angle=swiftshader --use-gl=angle --enable-unsafe-swiftshader`, fresh empty profile each arm.

- Renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`
- About 5 fps at 1440×900 under SwiftShader
- Viewport 1440×900, and one address frame at 390×844
- Both address frames are Open Line, `PALLET A` amber, with `LEVER` and `PALLET` projected. Skip-pad label stays. No roost disc, no `LAND HERE` marker, no `SHOOT SWITCH`, no score, no lesson strip.
- A raw pixel subtract of the two address frames differs by about 1% (13,542 of 1,296,000 pixels). That residue is idle scenery motion plus the BUILD suffix, not a second control or a different mesh.
- One flight frame: ball in the air, `ROUND DOWNRANGE`, follow camera still aimed at the shot.
- Phone address frame shows the same chip and the same three projected labels.

Storage on a fresh profile, before any shot:

- `localStorage` `rail-golf:gate-yard:<arm>:rail-golf:line-actions:<id>`
- `sessionStorage` `rail-golf:gate-yard:<arm>:tab-id`
- IndexedDB `rail-golf-gate-yard-survey`

After shots and End session, local storage also has `rail-golf-gate-yard-v1`, `rail-golf-shot-library-v1-gate-yard-v1`, and `rail-golf:gate-yard:<arm>:session-stop`. Nothing outside the `rail-golf:gate-yard:` / `rail-golf-gate-yard` namespace was written.

The frames taken after Adjust show the restored setup. They are director evidence for the carry rule. They are not player material.

## Preview

Workers Builds on PR #42 passed for `bd36050`.

- Commit preview: https://d14d9007-rail-golf.charlesmish.workers.dev
- Branch preview: https://studio-e3-gate-yard-rail-golf.charlesmish.workers.dev

The PR comment bot was still showing the previous commit's link (`20d8549`, https://fa32eb3a-rail-golf.charlesmish.workers.dev) when this was written. The check run for `bd36050` is the source of the commit preview above.

## Known limits

- The 15% outcome-change lock is unmet at 9.58%. Reported, not weakened.
- SwiftShader holds the rendered yard at about 5 fps. That is the software renderer, not a gameplay timer change.
- Address screenshots are not pixel-identical; idle motion moves foliage, dust, and the round.
- Mill bell and saw stay, because this is the linecraft Open yard. Roost discs and the landing marker do not.
- Retry, Recall, Reset, and reload were checked in the lifecycle test. The browser pass checked address, one flight, Adjust on both arms, End session, and storage.
