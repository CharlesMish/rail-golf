# Intent Lab v0 — reasons for the next shot

Route: `/lab/intent`. Starting authority: `15e7508c9c72b03253589e1b33e97edb250bf639`.

This is a reversible presentation/study layer on the incumbent target-free Open Line card. It is not a campaign decision or a scoring revision. See `INTENT-LAB-PHASE-0.md` for the pre-implementation critique.

## What is held constant

Timber Courtyard geometry, Kicker, stations, launcher, controls, MAX, exact power, RAIL ROUND, Havok, recognition thresholds, first-ground/long-flight termination, follow camera, Survey, Retry and exact Recall use the existing `MannersGame` authorities. No existing physics, score-rule or environment module changes. Production and every accepted lab route remain opt-out. The lab never awards production progress.

All three conditions use Open Line: no active target or required seat. TARGET was omitted to avoid another treatment and different target visuals. SCORE calls the exact existing `scoreLine` / `recordLineReceipt` functions and preserves the current **NON-CANONICAL PLACEHOLDER** values, RUN and VARIETY. SENTENCE and KEEP hide numeric receipts, totals, best and seasoning captions. They retain descriptions of genuine physical events.

## SENTENCE

| Prompt | Established station | Reason for inclusion |
|---|---|---|
| BANK A → BANK B | Yard Gate | A readable two-face relationship with current physical fixtures. |
| TREAD 1 → TREAD 2 → TREAD 3 | Lumber Walk | A different, three-clause relationship using strict qualified top departures. |
| BANK B → BANK A | Lumber Walk | Reverses an established traversal and asks the player to use the yard differently. |

All three have reproducible real-Havok fixtures on target-free Open Line. Exact QA setups are confined to tests; no player walkthrough is embedded.

Matching is an ordered subsequence of **qualified redirect** events from distinct features. Raw contacts, rejected contacts, side hits for the strict tread prompt, chatter and terminal ground do not satisfy clauses. Incidental unrelated contacts/qualified departures are ignored; they do not break a line. An early out-of-order visit does not count retroactively. Because the existing redirect authority pays/emits a feature once per launch, a later repeat of that same feature is not a fresh clause. This is a conservative vocabulary test, not unrestricted geometry-language parsing.

Live clauses check in order. The result retains `PROMPT COMPLETE`, `REACHED <last clause>`, or `NO CLAUSE YET`, with the terminal reason separately below. Retry starts clause progress at zero. It does not need a target finish.

## KEEP

A resolved shot can be kept without a recognition, quality or score requirement. Empty/unrecognized shots are eligible too. Keep pins the existing `packLine` record: exact rail/yaw/elevation/charge/speed, station, starting/ending environment, build, ordered ledger, terminal and at most 320 sampled **actual** trajectory points. Sampling is visual history, not physical replay authority.

Three slots per mounted session; the fourth Keep is disabled. No replacement editor, cloud save or naming system. Kept slots survive condition changes but not a page reload. The durable study log survives reload independently.

Quiet non-colliding ghosts appear only in KEEP + Survey and can be switched off in Shot Tools. Recall restores the kept origin, aim, starting Kicker state and exact power, clearing MAX as usual; it never fires. Use Retry to return to setup, then Survey to inspect ghosts. The incumbent Previous Line / Compare controls remain available equally across conditions and can overlap a kept trail; toggle them off if inspecting just the repertoire.

## Switching / study blocks

Initial condition is KEEP at Yard Gate. Suggested order selector offers KEEP → SENTENCE → SCORE or SENTENCE → KEEP → SCORE; changing this display order does not itself change conditions.

Changing condition retains the current station and starts a fresh authored setup: Kicker A, timed charge, MAX off, empty recent history/progress/total/caption. Kept slots remain stored but are hidden outside KEEP. SCORE best remains SCORE-only. Entering SENTENCE picks a station-compatible prompt if needed. Explicit prompt selection moves to its listed station and starts a fresh block. Explicit station selection also starts a fresh block. This differs deliberately from ordinary Open Line station changes; the UI states the reset contract.

Within a block, incumbent Retry preserves current Kicker/MAX behavior; Adjust/Recall restores the prior launch's starting environment and exact power. Reset restores A. All recovery continues through the shared lab lifecycle, without remounting the engine.

## Local record

The existing immutable survey tickets/archive are reused with a dedicated Intent namespace and IndexedDB database. They retain build, timestamps/session/order, setup/station, starting environment, terminal, raw/normalized recognition and fire-time condition/sentence/retry-recall relation. Existing limits stay 2,000 attempts / 64 MiB; interrupted launches are still recorded.

A small separate local decision journal joins Keep/Discard by immutable attempt ID at export. First decision wins; a kept line cannot become discarded through repeated clicks. It retains the latest 1,000 decisions and reports storage failures rather than silently claiming persistence. A Retry through the ordinary control without an explicit Keep/Discard leaves the choice null; it is not inferred as a psychological decision.

Shot Tools exports JSON or CSV. JSON preserves full normalized evidence; CSV summarizes events, deepest clause, complete/not complete, SCORE-only total and Keep/Discard. Numeric receipts are omitted from exported SENTENCE/KEEP study records. No telemetry leaves the browser. Session-only ghosts are not a durable collection feature.

## First manual comparison

1. Stay at Yard Gate for KEEP → SENTENCE (banks) → SCORE. Before every shot, say what you want it to do; afterward, say the specific reason for the next shot. Use roughly comparable shot/time budgets, without enforcing a success quota.
2. Repeat a station-matched block at Lumber Walk, including the tread/reverse prompts. Do not pool this with the Yard Gate comparison: the geometry and prior familiarity differ.
3. Export once per block/session. Note voluntary Keep, deliberate clause repair and score-induced changes of intention. Observe ghost clutter and result/control legibility.
4. For later independent players rotate the first two conditions. Sentence-first teaches vocabulary; Keep-first is the cleaner initial self-direction probe.

## Limits and verification

This experiment can expose behavior, not establish a winning game design. Familiarity/order effects, prompt difficulty, finite existing recognition vocabulary, irreversible learning between blocks, the three-slot cap and different station exposure remain confounds. The reverse prompt is not asserted to be harder for every player. A recorded Keep is not proof of lasting enjoyment.

Focused tests cover qualified ordered matching and negative controls, exact kept setup/trail/cap, condition reset/isolation, current-handler behavior, recorded-only ghosts, exact Recall/retry lineage, namespaced durable evidence/decision export and unchanged score receipts. Real Havok verifies all three prompts and repeatability through Retry. Existing fixture/test suites remain required without weakening them.

The available hosted cloud browser reports **WebGL not supported**, including on the accepted `/lab/lines` baseline. Hosted DOM/build delivery can be checked, but rendered interaction, ghost readability and actual mobile overlap are **NOT ESTABLISHED** here. Charlie should first check condition switching, one shot/result/Retry, Keep → Retry → Survey, Recall and SCORE before the behavioral study. No visual-playability claim substitutes for that check.

Local release verification: `npm test` (production build + **388/388** tests) passed; TypeScript passed; lint passed with zero errors and the two incumbent hook-dependency warnings. Twelve new focused Intent tests are included in the full count. Existing tests were not edited or weakened. The remaining rendered-browser limitation above still applies.
