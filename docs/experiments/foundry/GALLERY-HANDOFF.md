# Foundry gallery handoff

Branch `lab/wc-foundry-gallery-20261109`, cut from kit `1ad3166d0839ea042379f5a861ed7523cb46d47e`. One draft pull request into `lab/wc-foundry-20261109`. No pull request against `main`. Physics, prefabs, and the six author branches are unchanged.

Presets were copied byte-for-byte from the author commits. Each manifest records that commit as `sourceSha`. `sourceBuild` is the kit SHA the author recorded. Soft Landing was already in the kit and has no `sourceSha`.

## Per world

| World | Source | Preset sha256 | What changed |
| --- | --- | --- | --- |
| Bell Loft | `8c2df88b4f5b7ea81dcf3ce3a59ba5c95aefec2b` | `4faba8fecdce3e59358565ad096752cba541daaf39b3676d5a8e217da987abb4` | Presentation only. After a raised settle, Survey looks down into the loft from in front of the walls, and the receipt names the block that encloses the ball. A shot still in the air after three seconds says it is still settling. One closed-door pose is a tested shot with a layout override. |
| Return Address | `4041bb67cd9051a3b7e265ed6512e88c6ac2e5b0` | `ca3537f60481e8ff7bc7e3b7be6d1aeec66fbd314356e43e60280275b4a748b8` | Presentation only. The serve's contact order is checked. The receipt reads the tee contact x from the ledger and the nearest carriage stop inside −10 to 10, and says the next launch starts there. The carriage is not moved. |
| Right Angle | `57b82bd95d3d726ebb559e7f8533fab52e58ba32` | `6f4f6156431f9b46c1eec4ed2f0f4a93a14b3f81c2969e37224bfdf800a5c649` | Presentation only. The two-face return is checked. Survey frames both faces and the ball. The receipt names both faces and the distance back to the carriage. The author panel patch was not copied. |
| Open Contacts | `a3c719c5ba660d48f8ee954855a038508dc4fecc` | `b4f8211f1d020cfe3f7cbc9cb507006e3b1ddc5330ef23813acdae93be022c17` | Presentation only. The manifest opts in to the existing normal-speed dynamics, the H bank voice, and the existing note timeline. The rattle's contact order is checked. The card heading stays Open Contacts. |
| The Carry | `5b8244389bde44ffbd8ee2d553cbefa0f4b6ea37` | `293e8a03d95894da2b27c4e23e8af4693e3ad20a7ecb438f3ef4f6e2420b0b87` | Presentation only. The card names the locked shot and the ramp. It does not name a block or a bank. One ramp pose down the clearing is a tested shot. |
| The Other Way | `40e805546277e9b328db280374f5957dfac99936` | `42d131e8fab5e5729a44c659b13bd1e4bfcc08b467c372674e0950554c2b6f5b` | Presentation only. After a locked shot the status uses the derived sentence. It does not say to revise a piece. The author panel patch was not copied. |
| Soft Landing | kit, `sourceBuild` `46e59a781722081546457086e1d87a7d2e8f7453` | unchanged | No file change. Listed under Short studies. The card names the block and the bank, and the gold circle. |

Musical Workshop is still keyed on preset id `musical-workshop` unless a manifest sets `presentation`. Its card text is unchanged. The v1 export hash `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389` is unchanged.

## Validator

`scripts/foundry/validate.mjs` and `tests/worldcraft-foundry.test.mjs` replay every tested shot through Havok, including the new layout and contact shots. A shot may carry `layout` (same pieces, new transforms, then the existing preset check) and `contacts` (ordered piece ids or `worldcraft-tee`, ground ignored). There is no neighbour search and no new goal kind.

Fresh process, Bell Loft first, then the other worlds. Every recorded terminal matched with `Object.is`.

- Bell Loft: opening, opening-charge-up, lob, slam, stock-aim, door-shut. Door-shut settles on the block.
- Return Address: eight shots. The serve contacts are west, east, then `worldcraft-tee`.
- Right Angle: opening, both-faces. Both-faces contacts are side face, then back face.
- Open Contacts: opening, two-note, rattle, lob. The rattle contacts are timber bank, right return plate, timber bank.
- The Carry: opening, ramp-down-the-clearing. The ramp pose lands in the circle.
- The Other Way: opening, left, right, carry.
- Soft Landing: opening. Repeated load, reset, and remix do not grow colliders.

Pass and fail cases for overlap, an unknown body, an empty contact list, ground ignored, and a wrong order are in `tests/worldcraft-foundry-panel.test.mjs`.

## Tests

`npx tsc --noEmit` passed. ESLint on the edited sources passed. `npm test` is the verified build plus `node --test tests/*.test.mjs`. The run that included this gallery passed 542 tests. The panel sentences for all six worlds, Soft Landing, and Musical Workshop are asserted exactly.

## Screenshots

Played in headless Chrome with the `?qa=1` hooks, SwiftShader, viewports 1280×800, 390×844, and 844×390. Files are under `docs/experiments/foundry/gallery/screenshots/`.

Gallery: `gallery-desktop-1280x800.png`, `gallery-portrait-390x844.png`, `gallery-landscape-844x390.png`.

Featured openings and successes:

- `bell-loft-opening-{desktop,portrait,landscape}-*` and `bell-loft-success-*`. The success frames the loft from above the walls. The ball is on the block. The receipt says it came to rest up on the block. Portrait keeps the invitation with the fire control (`display: block`). Desktop and landscape leave that duplicate hidden.
- `return-address-opening-*` and `return-address-success-*`. The success stays on the follow view. The receipt says deck contact at x 3.98, nearest carriage stop 4, and that the next launch starts from here.
- `right-angle-opening-*` and `right-angle-success-*`. Survey shows both faces and the ball back by the carriage. The receipt says both faces were touched and the ball came back 6.1 m.
- `open-contacts-opening-*` and `open-contacts-success-*`. The heading stays Open Contacts. The bank-sound control shows H · G, grazes lifted. The note timeline is present. It is not the Musical Workshop card.

Also played at 1280×800: `the-carry-desktop-1280x800.png`, `the-other-way-desktop-1280x800.png`, `soft-landing-desktop-1280x800.png`. The Carry names the locked shot and the ramp. The Other Way does not say to revise a piece.

## Known limits

Physical geometry is unchanged: the loft floor is dull and a catch takes about 12 to 18 seconds to settle; banks have no height offset; the Carry ramp pitch stays −20°; blocks are 4 m with no height control; plates are 4 m tall and first ground still ends the line.

Authoring tooling: no goal kind reads a settled terminal, so the loft sentence is not a clear. One door pose and one ramp pose are recorded. The validator does not search neighbours. Return Address checks contact order on the serve only. The Other Way has no goal, because any one landing would mark the other finished lines as misses.

Presentation: the follow camera can still sit in a wall during flight. Survey does not label the Right Angle corner. A saved copy drops the invitation, because it is not stored on the world file. The Carry palette still shows disabled bank and block buttons. Listening on a real speaker was not checked.

## CI and preview

GitHub Actions on this repository runs lint, typecheck, and `npm test` for a pull request. `.github/workflows/ci.yml` has no deploy job, so that workflow does not print a `*.workers.dev` URL. The pinned preview, when this repo produces one, comes from a Cloudflare Workers Builds comment on the pull request: a hash-prefixed version URL, not the branch alias.

This section is updated after that check.

## Unverified

Whether any of these worlds is fun. Audio quality on a real speaker, including the Open Contacts H voice. Real touch on a phone. The pinned Workers preview, until a Cloudflare comment actually publishes one.
