# Linecraft Spine — candidate product hierarchy

Phase-0 authority: `8eb7ef65e6614176104df43d43b98fd98a83a093`.
Study route: `/lab/linecraft`. This is a design hypothesis and isolated prototype,
not a decision to rewrite production or a scoring commission.

## Director decision and disagreements

Proceed with a short authored-to-open study in the existing Timber Courtyard.
The owner's strongest observation is that **Keep is a player action available
throughout play**, not a sufficient reason to define a separate permanent mode.
The previous Intent conditions were useful experimental treatments; they should
not automatically become the product's top-level navigation.

There are two important qualifications to the owner's progression hypothesis:

1. Authored sentences are a possible route into fluency, not yet a justified
   mandatory ladder. Some players will prefer precision challenges indefinitely;
   others will arrive with enough physical intuition to explore immediately.
2. Completing three routes does not establish transferable fluency. Training may
   teach a vocabulary, or it may merely seed three answers that dominate later
   play. The subsequent Open block must distinguish those outcomes.

Keep also needs a useful return experience. A button that records a decision,
but loses its trail at reload or makes the line hard to view again, cannot test
Charlie's actual reason for keeping: preserving something worth showing later.

The original Nomad, Warden and Witcher consultation documents were not found in
the repository. This review uses the supplied summaries and the earlier Intent
director synthesis. Nomad's persistent spot, Warden's physical sentence and
Witcher's taught self-direction are compatible hypotheses about different
layers and horizons; their compatibility is not evidence that this progression
will work for a new player.

## Six Phase-0 answers

| Question | Conclusion |
|---|---|
| Are SENTENCE / KEEP / SCORE equivalent modes? | No. A sentence is authored content, Open is a play context, Keep is memory, and score is evaluation. Intent's mutually exclusive conditions deliberately separated these to study them. |
| Does the project support authored-to-open progression? | Technically yes: shared launch/physics, qualified events, exact restore, both stations and target-free Open Line already exist. Product progression does not yet establish it: a Delivery seat opens Gallery/Cascade, and their ordinary clears can bypass the mechanism sentence. |
| What remains for target golf? | Introductory control tasks, precision challenges, optional sentence endings and authored constraints. A missed seat need not erase the value of a line. Target punctuation is not tested by this slice. |
| What should players understand over time? | First control and evidence; then specific revision and self-authored intentions; eventually composition and a personal repertoire. The horizons below are goals, not observed learning results. |
| Is this yard enough? | Yes for a bounded transfer study. Real Havok fixtures already establish the required relationships. No geometry blocker has been demonstrated. Feature identification and control burden are more immediate risks. |
| What works against this hierarchy? | Exclusive Keep access; target-only winning memory; linear card/stamp statuses; score-only naming for Open; overlapping memory tools; and labels that call restoration replay. Details follow below. |

## A. Candidate product hierarchy

| Layer | Responsibility | Existing material |
|---|---|---|
| Core sport | Choose a launch, observe physical consequences, read evidence, revise intentionally. | Rail/station, aim, elevation, power, Havok rebounds, first-ground resolution, Survey and recovery. |
| Authored challenge/curriculum | Ask for a particular relationship or constraint and explain partial progress. | Delivery, Gallery, Cascade, practice lessons and sentence prompts. |
| Open/free play | Offer the same yard without requiring a sentence. | Open Line at Yard Gate and Lumber Walk. |
| Cross-cutting line memory | Preserve a player's chosen shot and make returning to it useful. | Previous Line, recent attempts, Line Shelf, Restore, historical Ghost and deliberate recorded-path playback. |
| Optional evaluation | Describe recognized events or apply an explicitly provisional scoring rule. | Stamps and frozen Open Line score, RUN and VARIETY. |
| Future content vocabulary | Add useful physical relationships when evidence justifies them. | Receiver, vertical returns, origin variation and mechanism studies. These are not automatically separate products. |

The core sport does not require every interesting line to be recognized. Keep
must accept a resolved line without a score, target, sentence-completion or
quality threshold. Recognition can describe what happened; the player decides
whether it matters.

## B. Existing production mapping

Scope correction: the current production courtyard has Cards **01–03**. Card 04
Open Line is appended by `lib/line-lab.js` for the lab. The separate `/practice`
range has its own four older cards. All were considered; none is changed here.

| Existing concept | Candidate role | Possible overlap or tension |
|---|---|---|
| Delivery | Introductory precision task with optional route variations. | A far carry is not proven to be the best first control lesson. Its clear currently unlocks content without teaching the later sentence. |
| Gallery | An authored two-bank sentence, optionally constrained by an amber finish. | A direct clear is valid target play but is not evidence of understanding the banks. |
| Cascade | An authored three-stack relationship with strict tread and finish variants. | Ordinary clear, broader assembly relationship and strict top departures must not be presented as identical achievements. |
| Open Line | Free context in either established station; score can be shown or hidden. | The internal `score-only` name should not dictate the eventual product's identity. |
| Route Book | Catalogue of authored route challenges and earned achievements. | Its winning-line recall overlaps universal memory; its same-shot finish requirement need not govern Keep. |
| Stamps | Compact certificates for named authored constraints. | A stamp and curriculum badge become redundant if they certify exactly the same predicate. |
| Target seats | Simple goals, endpoint clauses and optional precision constraints. | A universal seat requirement suppresses meaningful journeys that end elsewhere. |
| Practice range | Optional onboarding/reference exercises for controls and physical primitives. | Two similarly named mechanism/practice destinations can obscure which one a novice should use. |

Likely future consolidation candidates are the standalone Keep mode, overlapping
recall surfaces, and duplicate completion badges. This is a mapping, not an
instruction to delete them. Existing labs, progress, earned Route Book entries
and production behavior remain recoverable and unchanged.

The current UI also deserves caution:

- TARGET / MECH / STAMPED and numbered cards suggest a single progression ladder.
- “Winning lines” automatically selects target clears; it does not express
  voluntary significance. Recent history and a voluntary Shelf serve different
  purposes even if they eventually share storage machinery.
- “Replay this line” currently restores for manual firing. Restore, historical
  Ghost and viewing a recording should have distinct labels.
- Session best makes score an implicit objective even when the copy calls it
  optional. Hiding score must hide that presentation too.
- Target-free Intent suppresses A/B labels through `requiredTags: []`, and tread
  labels are currently tied to the Cascade card. Learn needs truthful feature
  identification without revealing launch solutions.
- Retry retains current Kicker state; exact Restore/Recall uses the recorded
  starting environment. These are useful but different operations.

## The graduation slice

The three-challenge curriculum is intentionally narrow:

| Step | Required sentence | Station | Teaching question |
|---|---|---|---|
| 1 | BANK A → BANK B | Yard Gate | Can the player aim for and revise an ordered two-face relationship? |
| 2 | TREAD 1 → TREAD 2 | Lumber Walk | Can the player reorient and apply ordered departure language to a different physical relationship? |
| 3 | TREAD 1 → TREAD 2 → TREAD 3 | Lumber Walk | Can the player extend an understood relationship by one clause? |

The bank and full tread fixtures already run against real Havok on target-free
Open Line in `tests/intent-lab.test.mjs`; the pair is the strict prefix of the
proven tread traversal. Clause progress uses existing qualified departures, not
raw touches. Rejected contacts and chatter cannot complete a clause. Incidental
unrelated events do not invalidate the sentence. An earlier out-of-order event
does not satisfy a later clause retroactively.

Failed attempts report the deepest clause reached separately from why the line
ended. After an attempt, a deliberate Continue may leave a challenge incomplete;
exposure, success and skipping must remain distinct in the study record. Entering
Open does not award mastery. An explicit cold-Open path exists for comparison.

Open removes the required sentence without prescribing an invention. Both
stations remain available. SCORE ON and SCORE HIDDEN share physical and score
authority; the toggle changes presentation only. Existing claim values, gates,
precedence, RUN, VARIETY and score economy remain frozen. The local export joins
recognized events, the existing Open score receipt, score visibility at launch
and voluntary Keep by immutable attempt identity.

Bank reversal is deliberately untaught. It remains one possible transfer pattern
for the later study, not a hint in the Open prompt. Two relation families and an
extension cannot establish general fluency, and completing this slice cannot
establish the value of a second yard.

## Cross-cutting memory and revisit contract

The prototype uses a local four-slot Line Shelf in Learn and Open. It preserves
the exact launch setup/station, starting environment, build, ordered evidence,
terminal and sampled actual trajectory. There is no automatic replacement based
on quality or score. Local persistence makes a reload meaningful; it is not cloud
sync or protection from clearing browser data.

- **Restore:** reinstate exact setup and starting environment; the player fires.
- **Ghost:** show sampled recorded history, isolated from physics and prediction.
- **Play Replay:** deliberate viewing animation over sampled recorded positions.
  It is recorded-path playback, not new Havok physics or a fresh scored attempt.
- **Share setup:** the existing setup payload restores without automatically
  firing. It does not contain the original sampled trajectory and must not be
  presented as a recording of the original shot.

The durable survey archive and the Shelf have different jobs. Survey records
retain setup, build, environment, immutable score receipt, normalized ordered
evidence and compacted contacts; their forensic retention does not itself retain
the full sampled trail. The Shelf retains the packed trajectory. Preserve a Keep
decision in the study evidence even if its Shelf representation is later removed.

Clip export is a separate engineering feasibility question. A successful viewing
animation is not proof of reliable video export or cross-device deterministic
re-simulation. The implementation handoff must report that boundary explicitly.

## C. Five minutes, thirty minutes, five hours

| Horizon | Desired understanding or behavior | What would count against it |
|---|---|---|
| Five minutes | Know how aim, elevation and power differ; find named features in Survey; understand ordered clauses and first-ground ending; use Retry and Keep. | Random control changes, inability to locate named faces, or interpreting a ghost as a predicted shot. A new player may still need a short control warmup. |
| Thirty minutes | Explain which clause failed, revise one cause, use both stations, restore exact state, and name an Open intention beyond “more points.” | Only reproducing taught routes, choosing MAX without a physical reason, or relying on score to explain every next shot. |
| Five hours | Compose, shorten, reverse or finish relationships intentionally; choose challenges or Open voluntarily; revisit a personal repertoire. | Keep becoming a forgotten export button, no reasons to return, or every useful new intention requiring another authored prompt. |

These are learning/product targets, not timed promises or observations from a
fresh-player experiment. The graduated Rail Rat protocol is specified separately
in `LINECRAFT-RAIL-RAT-PROTOCOL.md` and is not run by this commission.

## D. Unresolved decisions

| Question | What remains open |
|---|---|
| First-ground termination | It gives an unambiguous end but excludes ground recoveries and some potentially interesting continuations. Keep the rule fixed here; evaluate that separate design choice later. |
| Target role | Introductory clarity and endpoint precision may remain valuable. This target-free slice does not establish how often finish clauses should appear. |
| Score role | Score may explain, distract, or distort intention. Record its relationship with voluntary Keep; do not tune values from this prototype. |
| Curriculum size | Three challenges test exposure and limited transfer, not a sufficient universal syllabus. More content is not automatically the remedy for poor feature legibility or controls. |
| Durable Keep value | Initial keeps do not prove return value. Later voluntary restore/view/share behavior and a delayed revisit matter. |
| A second yard | The current yard can test transfer. A second yard becomes useful when a specific vocabulary or transfer limitation is demonstrated, not merely when three prompts end. |
| Recognition language | Qualified departures are conservative and can omit enjoyable shallow/rapid contacts. Player memory must remain independent of recognition; this study does not relax gates. |

The largest unresolved question is whether taught sentences create **new,
player-authored intentions after prompts disappear**, rather than a stronger
habit of repeating demonstrated routes. A functioning prototype, higher scores,
or more kept lines cannot alone answer it.

## Source evidence reviewed

Production/objectives: `lib/courtyard.js`, `lib/rail-golf-v02.js`,
`docs/timber-courtyard-slice.md`, `docs/lumber-cascade.md`,
`docs/delivery-route-book.md`, and `README.md`.

Open/Intent: `lib/line-lab.js`, `lib/intent-lab.js`, `app/intent-tools.tsx`,
`app/manners-game.tsx`, `docs/INTENT-LAB-PHASE-0.md`, `docs/INTENT-LAB.md`,
`docs/line-feel-run.md`, and the existing Intent tests.

Memory/evidence: `lib/shot-library.js`, `lib/share-line.js`,
`lib/survey-ledger.js`, `docs/shot-tools.md`, `docs/survey-kicker-pass.md`,
and `docs/line-lifecycle-provenance.md`.

Future vocabulary only: `docs/PARALLEL-LABS-V0.md` and
`docs/LAB-REFINEMENT-V1-DIRECTOR.md`. Physical existence fixtures are not
rendered-playability, discoverability or enjoyment evidence.
