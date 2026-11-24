# Repository handoff and publication ledger

This packet is recoverable independently of the chat. The integration branch is
[`research/places-counterlines-20261123`](https://github.com/CharlesMish/rail-golf/tree/research/places-counterlines-20261123).
Its [draft PR](https://github.com/CharlesMish/rail-golf/pulls?q=is%3Apr+head%3Aresearch%2Fplaces-counterlines-20261123)
is the authoritative location for the **exact final published candidate SHA,
identical tested source tree, pinned preview URL and deployment/CI result**.
This avoids a self-referential commit hash inside the commit that records it.

Owner entry on that preview: `/lab/places`. Routes are
`/lab/places-architecture`, `/lab/places-counterline` and `/lab/places-repeater`.
The index links preserved Cistern, Rolling Yard, manual-trial Repeater,
Contact Loops and Worldcraft controls. The synthetic layout stress fixture at
`/lab/places-viewport-check` is explicitly labeled and is not an owner activity.

## Exact authority

All independent lanes start from PR82
`ddeed5b688ae8c15166c42a0302bf768bb11be70`, tree
`5c0aa01a1c47a0c6db2886a5e798317d8d49a6ff`. Main is its exact merge-base with
production; PR81 and Horizons are exact respective merge-bases. Neutral Foundry
is an ancestor. No amphitheater-only foundation was substituted.

| Protected reference | Verified starting SHA |
| --- | --- |
| main | `4a2be20984da4e50d7f87f37e59d7d61ff384e2c` |
| PR82 / research/playability-persistence-20261122 | `ddeed5b688ae8c15166c42a0302bf768bb11be70` |
| PR81 / research/next-playgrounds-20261121 | `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054` |
| PR80 / research/worldcraft-horizons-20261119 | `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb` |
| PR79 / research/horizons-return-20261119 | `00110e6890a0cc9541c9047a20c91d9670b206ee` |
| Foundry / lab/wc-exp-20261114-chime-compare | `0b151c5c94849b78ccda6c41a1755b66471e3fa2` |
| Amphitheater / experiment/amphitheater-place | `6ebb2f2b370656c7e70b108ad04d0369b78cf89c` |

These refs were read before edits and checked again during publication. The work
uses new branches only; no production merge/deployment or force-push. Existing
draft PRs, pinned previews and historical identities remain preserved. PR82 and
its earlier experimental ancestry are unmerged dependencies, not production.

## Independent durable lanes

[PUBLISHED-LANES.json](PUBLISHED-LANES.json) maps full local source endpoints to
published endpoints and exact identical Git trees. Native publication assigns
different commit metadata; tree equality, not a misleading same-SHA assertion,
establishes identical source. Exchange Yard additionally retains five published
checkpoints, including the obstructed service court and rejected roof pocket.

| Lane branch suffix | Published endpoint |
| --- | --- |
| places-architecture-20261123 | `43ae24c1ce5b64ec98d8dd65e8d1f26e8c7f8713` |
| places-counterline-20261123 | `35e9c2d5b8edcdf504e969d86a70f570504f919f` |
| places-usability-20261123 | `19fa56ce2520d5dd324dad7f8b8a70272b48ec84` |
| places-review-20261123 | `7ab367e1ea97973e5c6fcd634130140dcbeba718` |

Each branch has the `research/` prefix. Architecture and review are recoverable
source archives; the integrated preview supplies their shared owner index.
Counterline is independently reviewable in [draft PR83](https://github.com/CharlesMish/rail-golf/pull/83).
Its standalone pinned preview is
[Counterline](https://de2e3ce2-rail-golf.charlesmish.workers.dev/lab/places-counterline),
Cloudflare version `de2e3ce2-6b63-487f-8e1d-439a43a051b0`, build
`fba48891-f2fc-42da-b72e-453e962652f0`. The PR carries the final CI status.

## Checks and evidence

- Unchanged PR82: production build, 655/655 tests, TypeScript, lint and Foundry
  16 standard + 2 capacity fixtures pass. [Baseline](BASELINE-CHECKS.md).
- Integrated runtime at local `c031c60`: production build and 677/677 tests pass;
  no failures/skips/cancellations. TypeScript, lint (five inherited warnings,
  zero errors), Foundry 16+2 and diff checks pass. Later changes are evidence,
  reports and the standalone Counterline navigation correction; the final
  published candidate's automated CI is recorded in the integration PR.
- Architecture: final measured source `319ef3e60701cecc394d1275024730c9f555bf73`,
  published equivalent `7f824a3ea24c7217e40ce456021af96c9997aa8a`.
- Counterline: measured physics source `ec510f6e77274f7b09b9988095e46c8f1e98d4a2`,
  published equivalent `dd1d0a86bce03b5a3853975f03f462e2709cf5c1`; later source
  changes add immediate QA cancellation and standalone navigation.
- Direct repeats: measured source `5a24225ef5540f5527f603f895146c861a8c0b7a`;
  final lane tree preserves that runtime and its evidence.

Reproduce with `npm run install:ci`, `npm run typecheck`, `npm run lint`,
`npm test`, `node scripts/foundry/validate.mjs`, and explicit validation of
`worlds/foundry/capacity-24-active` and `capacity-24-passive`.
Lane scripts: `scripts/places/architecture-measure.mjs`,
`architecture-camera.mjs`, `architecture-plan.mjs`, `review-architecture.mjs`,
`measure-repeater.mjs`, and `scripts/counterline/measure.mjs`.

The cloud browser lacks WebGL. DOM control access, real Web Audio rendering and
recorded-clock scheduling were inspected; rendered live physics/audio feel and
phone performance were not. [Browser details](BROWSER-AND-CHECKS.md).
Numerical solutions remain in lane appendices, separate from the owner guide.
