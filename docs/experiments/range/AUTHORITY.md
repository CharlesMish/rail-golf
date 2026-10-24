# Worldcraft range — authority audit

Phase 0 branch `lab/wc-range-20261024` was created from `lab/wc-exp-20261024-resonant` at `236919e6c970c02aefac28c3ed272bd0e823bea5` (`Add resonant voices and a plate to the Orc Stand-in lab.`). SHAs below are `git rev-parse` / `git ls-remote` results on 24 October 2026. This audit does not merge, deploy, or move those branches.

## Branch heads

| Ref | SHA | Subject |
| --- | --- | --- |
| `main` and `origin/main` | `4a2be20984da4e50d7f87f37e59d7d61ff384e2c` | Merge pull request #50 from CharlesMish/fix/yard-legibility-review |
| PR #51 `feature/timber-courtyard-world` | `b24f036630ad24e963592c7f787307b1c57995bd` | Open. Not used as a base. |
| PR #52 `lab/worldcraft` | `092dc58a483f85efa09a2bea1e2eac67a1c8d93d` | Worldcraft lab: build, fire, observe and revise a physical arrangement |
| PR #53 `candidate/worldcraft-loop-20261015` | `5322b0c1529a5f1db528a35343a1bba081401c70` | Worldcraft comparison candidate: open experimentation and optional House Shot |
| `lab/wc-exp-20261020-orc-static` | `52cc8d10848231896d8ffcedf1c7fecee83f4478` | Add the Orc Stand-in challenge beside House Shot. |
| `lab/wc-exp-20261020-orc-loop` | `f6acf45715a74d4fc41e7293f9d2ebe70110f673` | Add Orc Loop, a fixed moving-target Worldcraft challenge |
| `lab/wc-exp-20261020-two-piece-pitch` | `4b3aaccf2414f0213b82ca411f2fad0d814b2195` | Add Two-piece pitch challenge beside House Shot. |
| `lab/wc-exp-20261024-resonant` | `236919e6c970c02aefac28c3ed272bd0e823bea5` | Add resonant voices and a plate to the Orc Stand-in lab. |
| `lab/wc-exp-20261024-bell-rail` | `eee0ac0aff3648410f2e1d81527c84777943832c` | Add a bell shuttling a short rail as a Worldcraft target. |

PR #52 and PR #53 are not the same commit. Only PR #53 is `candidate/worldcraft-loop-20261015`. `git ls-remote origin refs/pull/52/head` returned `092dc58a483f85efa09a2bea1e2eac67a1c8d93d`. `refs/pull/53/head` returned `5322b0c1529a5f1db528a35343a1bba081401c70`, matching that candidate branch.

## Corrected Worldcraft physics review

`docs/WORLDCRAFT-REPORT-REVIEW.md`, blob `6775a5523a07cef31c2ba9db63565149e057c62e`. The same blob is on `candidate/worldcraft-loop-20261015`. No later file on `main`, PR #52, PR #53, or the lab branches named above presents itself as a further correction of this review. The original library attachments (`space-1-backstop.json`, `space-2-back-pocket.json`, `space-3-house-shot.json`, and `evidence/originals`) are not in this checkout.

The review is the correction of the supplied report. Backstop and Back Pocket stay research evidence, not curated modes. All three supplied JSON files have `rules:null`, so pins and a locked launcher were assumptions rather than enforceable content. Sampled fractions are not human hit probabilities. The report's best Backstop power runs contain two versus six samples spaced 2 percentage points apart: endpoint spans are 2 versus 10 points, not measured continuous 4% versus 12% windows. The report's 154 m free ballistic range does not prove that every forward point is reachable in this bounded yard.

| Reproduced experiment | Result |
| --- | --- |
| Backstop, direct / block at back edge | 65 / 132 hits per 5,239 sampled setups |
| Backstop, block 2 m deeper | 96 / 5,239 |
| Back Pocket, near wall / far angled wall | 136 / 58 hits per 48,348 sampled setups |
| Bank rotated in 5° increments | Median landing shift 3.0 m, maximum 3.3 m |
| Ramp rotated in 5° increments | Median 3.4 m, maximum 3.5 m |

A nearby dull block can enlarge the sampled Backstop landing region. Placement matters; merely adding a block is insufficient. On Back Pocket the near-wall shortcut remains dominant; this is not ready as an unconstrained teaching challenge.

## Linecraft

| Path | Blob | Conclusion |
| --- | --- | --- |
| `docs/LINECRAFT-SPINE.md` | `ac134da94704e0ece0c43b9f3bbdcb36b0a98e6a` | Sentence, Open, Keep, and score are different layers, not equivalent modes. Shared launch and physics can host an authored-to-open study, but production progression does not yet establish transferable fluency. Keep has to preserve a line without requiring a score. |
| `docs/LINECRAFT-LAB.md` | `708b0521c0e8c0c3b5f4e3873c4267c69315eec5` | Linecraft can add a second visual pad and two timber return faces on the existing qualified-redirect vocabulary without new award weight, targets, or score rules. Historical Keep still restores the recorded trajectory; firing again in the new yard may differ. Phone comfort is an owner-play gate. |
| `docs/LINECRAFT-CLIP-FEASIBILITY.md` | `3ab370726998356c9018e192801132c097436e26` | A local clip export is feasible later and was not built. Restore plus an explicitly labeled sampled replay is the viewing contract. Canvas capture does not include the Web Audio graph, so a first clip should be silent. |
| `docs/LINECRAFT-RAIL-RAT-PROTOCOL.md` | `921cfc39048c53be85d163a57cb394754128abf8` | Design only: do not run it during the Linecraft commission. The question is whether a short sentence curriculum makes later Open play more specific, or only biases players toward the demonstrated routes. Keep stays available to both arms. |

## Physical-mechanism research

| Path | Blob | Conclusion |
| --- | --- | --- |
| `MECHANISM-RANGE-V0.md` | `a9e8ecac3e2042adb0a52157e417a291c1d4bdf0` | One transfer apron and three silhouettes around a useful void. The table's two states are static transforms, not a live hinge. No new destination, score, or second station. |
| `docs/mechanism-range-v01.md` | `f5cedd8cee12a921f92fafdb0c5038c5064608d5` | Normalization of survey, controls, and the familiar address camera. Shared envelope stays rails −4/0/+4 m, yaw ±70°, elevation 5–85°, launch about 6–43 m/s, mass 1.5, radius 0.43. No spatial redesign. |
| `docs/mechanism-range-v02.md` | `be4238437bde1b749411b50435e48be5d81d4fd0` | Qualified captions were being replaced by the ending reason after a fraction of a second (0.292 s in the default fixture). The ordered receipt now survives RESULT. Recognition predicates were not retuned. |
| `docs/mechanism-range-v03.md` | `9b89728e7a523d2f5af096a8e53c0ffd1a8802b8` | The hosted browser could not reproduce the reported out-of-bounds lock because WebGL was unavailable. Recovery is one ordered transaction, and the address camera is brought closer to the incumbent rail framing. No layout or impulse change. |
| `docs/mechanism-vocabulary-v0.md` | `d9433d0769dc199729db65a5ba7879a51d0aef61` | A bounded crossflow (±6 m/s² inside one box) and one swinging reflector can share the accepted shot session. Wind is not global weather, and exposure is not automatically a rebound. |
| `docs/mechanism-vocabulary-v1.md` | `637b3d7f22a3e9bcb647fb6b0e1e3538c0a39480` | The v0 opening looked inert because wind defaulted off and the paddle waited for launch. SYNC still reconstructs phase zero at fire; LIVE records the visible 120 Hz tick. The force and the paddle body are unchanged. |

## Related experiment logs

These are not the corrected Back Pocket / Backstop review. They were not copied onto this branch. An older note calls two-piece pitch "Experiment A"; the range index uses Experiment A for Open Workshop only.

| Path | Commit | Blob | Conclusion |
| --- | --- | --- | --- |
| `docs/experiments/wc-exp-20261020-orc-static.md` | `236919e6` (file also on `52cc8d10`) | `654f040e486211a5ccb88c28a212fba800b2bba5` | Stationary orc, fixed rail. Hit fraction 23 / 343 = 0.06705539358600583, in two contact orders (`bank>ramp>orc` and `ramp>bank>orc`). The supplied layout misses. Players were not measured. |
| `docs/experiments/wc-exp-20261020-orc-loop.md` | `f6acf457` | `c8efdc5d08c71fa4ea348e177327656b57e18751` | A circling stand-in plus a launch delay. Hit fraction 449 / 6153 = 0.072973. 444 of those hits are ramp-then-orc; delay alone does not solve the supplied layout. The supplied world misses at every delay. |
| `docs/experiments/wc-exp-20261020-two-piece-pitch.md` | `4b3aaccf` | `dd5a4cc9dd17430ec97d025be824251db85a2bb7` | Two movable pieces and a ramp pitch control, gold circle off the open shot. 4 / 1296 = 0.0030864197530864196 clear, in two mirror clusters. Opening miss distance 29.85245132446289 m. |
| `docs/experiments/wc-exp-20261024-resonant.md` | `236919e6` | `5fb038c8e1c0bb260a45f1ad238b7f84555e1a68` | Ramp, bank, and plate can ring without changing Havok coefficients. On this branch's fixed rail, 73 / 309 shots hit two or more resonant pieces. Voice does not write friction or restitution. |
| `docs/experiments/wc-exp-20261024-bell-rail.md` | `eee0ac0a` | `a277a561abc607e3f5e89b986a2d8a68da779006` | A bell shuttling a 4 m rail. Hit fraction 350 / 10059 = 0.03479471120389701, and every hit touched both the ramp and the bank. Delay alone does not solve the supplied layout. Not imported here. |

`docs/WORLDCRAFT-DIRECTION.md` (`18e68c090d63cfb481a4277ec518684b5ff00704`) and `docs/WORLDCRAFT-LAB.md` (`4e6cd196e669c9a78dd5c4f870bdb208fb0fb1c4`) are the lab contract, not the sweep correction. The direction keeps Free Play, score, and production progress out of this route.
