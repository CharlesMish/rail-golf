# Places & Counterlines: baseline authority

Independently inspected on 2026-11-23 (America/Chicago). All checks below use unchanged PR #82, before any new experiment was integrated. Historical September project handoffs are context, not the current runtime authority.

| Protected remote branch | Verified SHA |
| --- | --- |
| `main` | `4a2be20984da4e50d7f87f37e59d7d61ff384e2c` |
| `research/playability-persistence-20261122` | `ddeed5b688ae8c15166c42a0302bf768bb11be70` |
| `research/next-playgrounds-20261121` | `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054` |
| `research/worldcraft-horizons-20261119` | `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb` |
| `research/horizons-return-20261119` | `00110e6890a0cc9541c9047a20c91d9670b206ee` |
| `lab/wc-exp-20261114-chime-compare` | `0b151c5c94849b78ccda6c41a1755b66471e3fa2` |
| `experiment/amphitheater-place` | `6ebb2f2b370656c7e70b108ad04d0369b78cf89c` |

Baseline commit: `ddeed5b688ae8c15166c42a0302bf768bb11be70`.
Baseline tree: `5c0aa01a1c47a0c6db2886a5e798317d8d49a6ff`.

Main, Next Playgrounds and Horizons are each the exact respective merge-base with this baseline. Neutral Foundry is an ancestor. The baseline has 61 commits after current production main, and one after Next Playgrounds. No amphitheater-only foundation was substituted. All lanes may depend on accepted experimental infrastructure while preserving these source refs.

The independent check worktree was clean before verification. Installed locked dependencies were shared from the director's checkout; no source, lockfile, test policy or dependency was changed.

## Verification

| Check | Baseline result |
| --- | --- |
| `npm test` (includes production build) | PASS — 655/655 tests; no failures, skipped or cancelled tests; test phase 44.337 s |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 errors, 5 inherited warnings |
| `node scripts/foundry/validate.mjs` | PASS — 16 standard fixtures |
| Explicit `capacity-24-active` and `capacity-24-passive` validation | PASS — 2 fixtures |
| Source status after checks | Unchanged; this new report is the only added file |

The inherited lint warnings are two exhaustive-dependency warnings in `app/manners-game.tsx` and unused variables in `docs/experiments/chime-terraces/a-terraces/measure.mjs`, `docs/experiments/foundry/gallery/browse.mjs`, and `scripts/sweep-orc-static.mjs`. Build reports its inherited large-chunk warning. No check was weakened or skipped.

Raw command logs remain outside Git in the task workspace as `places-baseline-test.log`, `places-baseline-typecheck.log`, `places-baseline-lint.log`, `places-baseline-foundry.log`, and `places-baseline-capacity.log`. Durations reflect this shared host and concurrent checks, not a performance benchmark.

NullEngine and headless Havok establish the tested physical/code contracts. They do not establish rendered frame rates, physical-phone performance, camera comfort or owner enjoyment. The director's integrated checks supersede these baseline counts for the new candidate.
