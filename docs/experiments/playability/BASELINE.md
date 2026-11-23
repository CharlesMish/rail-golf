# Playability baseline authority and checks

Inspected remote refs on 2026-11-22 (America/Chicago; host date 2026-11-23 UTC). No remote write was performed.

| Protected reference | Verified SHA |
| --- | --- |
| main | `4a2be20984da4e50d7f87f37e59d7d61ff384e2c` |
| lab/wc-exp-20261114-chime-compare | `0b151c5c94849b78ccda6c41a1755b66471e3fa2` |
| research/worldcraft-horizons-20261119 | `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb` |
| research/next-playgrounds-20261121 | `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054` |
| experiment/amphitheater-place | `6ebb2f2b370656c7e70b108ad04d0369b78cf89c` |
| research/horizons-return-20261119 | `00110e6890a0cc9541c9047a20c91d9670b206ee` |

Exact new-commission baseline: PR81 `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054`, tree `484903be00ebfc21d96ef6f5846c39fcf4e16d6a`. Main is its exact merge-base with main, and Horizons is its exact merge-base with Horizons. Neutral Foundry is an ancestor of Horizons. PR81 consists of three commits after Horizons (71 changed files), and the baseline contains 60 commits after current production main. No amphitheater-only foundation was substituted.

Baseline commands ran in an isolated detached worktree, with unchanged source and shared installed dependencies. These baseline results establish regression authority, not validation of the new candidates.

| Check | Baseline result |
| --- | --- |
| `npm test` (includes production build) | PASS — 617/617, no skipped/cancelled tests; test duration 26.455 s |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 errors, 5 inherited warnings |
| `node scripts/foundry/validate.mjs` | PASS — 16 standard fixtures |
| Explicit capacity-24-active and capacity-24-passive validation | PASS — 2 fixtures |
| `git status --short` after checks | Empty; unchanged baseline source |

Inherited lint warnings are two exhaustive-deps warnings in `app/manners-game.tsx` (lines613,2877), and unused variables in `docs/experiments/chime-terraces/a-terraces/measure.mjs` (impacts), `docs/experiments/foundry/gallery/browse.mjs` (id), and `scripts/sweep-orc-static.mjs` (details). No lint policy was weakened. Build reports its inherited large-chunk warning; no build errors.

Logs are retained in the task workspace as `playability-baseline-test.log`, `playability-baseline-typecheck.log`, `playability-baseline-lint.log`, `playability-baseline-foundry.log`, and `playability-baseline-capacity.log`. NullEngine/Havok tests do not establish rendered WebGL presentation or physical-phone performance.
