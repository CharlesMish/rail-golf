# Open Line / Saw Bay — experimental balance and layout

Historical authoring record. The current default station selection and accounting are described in [line-feel-run.md](line-feel-run.md); Saw Bay is now parked.

**NON-CANONICAL PLACEHOLDERS.** This pass changes `/lab/lines` only. There are no score gates, leaderboards, career tiers, multipliers or canonical goals. The production front door, Cards 01–03 definitions, launch rules, objectives, progression and records remain unchanged.

## Station and target-free card

`lib/line-lab.js` appends Card 04, Open Line, at Saw Bay. The station occupies an existing clear patch at x = −8, z = 138, facing down the yard (yaw −180°), behind the saw work tracks and beside the far end of the mill. Its three rails use the existing station transform math. Low visual workshop planks and markers compose it into the yard; no ground extension, OOB enlargement, scenery removal or physics retuning was needed. The lab aim fan exposes the saw, mill, Cascade-side machinery and routes back into the yard.

The experimental `ScoreCard` has `mode: 'score-only'` and **`target: null`**. Existing destinations remain passive scenery/physical landing surfaces; none becomes a hidden objective. Ground/landing contact, spatial OOB, sustained dead ball and the lab safety cap resolve the line. The receipt banks established claims without calling it a golf clear. The result reads LINE BANKED. There is a session-only BEST LINE, with no numeric goal and no unlock. Session best survives card changes/retries but resets on page reload. Saved recent attempts persist through the existing local library.

Production `Hole` still requires its real target. Shared scene and pad helpers accept only the properties they actually need, and the lab landing authority explicitly accepts a null target. No dummy roost was introduced. No new station or controls appear in production.

## Placeholder accounting

Weights remain centralized in `lib/line-score.js`:

| Claim | Points |
| --- | ---: |
| COMMON qualified feature | 100 |
| Direct, Sky, Skip, Mill Route, Mill Return | 250 |
| SAW → MILL relationship | 250 |
| Bank A→B / B→A | 500 each |
| Tread 1→2→3 | 600 |
| Target FINISH | 500 |

The parked switch rule remains 250 in experimental infrastructure, but no diverter/switch is created in the score yard.

**VARIETY = min(200, 50 × max(0, N − 1))**, where N is the number of distinct awarded claim IDs in this launch. Components and signatures are distinct claims and can both count. VARIETY itself is not a claim and cannot count recursively. No distance, airtime, launch samples, raw contacts, rejection diagnostics or settling events add variety. Repeated copies of a qualified feature/family do not add claims. The configurable `VARIETY_RULE` sits beside the weights. The receipt rule set is `placeholder-v3`, not a semantic game release.

Thus Direct + seat is 750 in claims plus 50 variety = 800. Three qualified treads plus Tread Run is 900 plus 150 variety = 1050 without a seat. Comparable lines with a finish gain its 500 bonus (plus any remaining variety increment). A real Saw Bay saw/mill/return/blade fixture also exceeds the dull clear. These are qualitative demonstrations, not a balance survey.

The live HUD includes variety in LINE. Claim captions explain the additional VARIETY increment. Detailed receipts separate claim subtotal, secondary contribution and qualified feature count.

## Local SAW → MILL authority

A separate, lab-only directed tracker observes real saw blade/carriage contacts followed by one tagged exterior mill body and subsequent free flight. It does not change COMMON tracker gates. Either saw part can begin the relationship; a legitimate coupled saw assembly may participate.

The provisional local gate requires:

- incoming speed ≥4 m/s at the saw and mill;
- saw deflection ≥12° from pre-solver to post-solver velocity;
- saw and mill contact episodes each no longer than 0.12 s;
- mill contact within 1 s of the saw episode and the entire relationship confirmed within 1.5 s;
- outgoing mill speed ≥3 m/s, mill turn ≥25°, then ≥0.10 s free of contact and ≥1 m separation;
- no intervening unrelated solid; no continued mill scraping; once per launch.

Sustained saw chatter blocks the candidate until real free flight re-arms it. The closed interior roof fill is untagged and cannot qualify as the mill feature. Independent COMMON features may coexist with this NAMED relationship. `MILL → SAW` has not been authored or assumed symmetric.

Physical reference setups live only in tests, not in card prose or this handoff. Three distinct real Havok saw→mill lines are established. Synthetic adverse controls check reverse order, a brushing saw contact, sustained chatter, an intervening solid and missing departure. The existing COMMON tracker still reports interruption on a tightly coupled synthetic saw→mill episode while the local relationship can qualify honestly.

## Evidence, recall and sharing

Saved lab shots now retain `lineReceipt` with the rule set, final total, constituent claim IDs, unique qualified feature count, VARIETY points and ending reason. The enclosing saved shot already supplies build, card, station, rail, yaw, elevation, exact speed, starting environment, trajectory and raw ledger. Expanded evidence displays setup/build/ending and recorded total; current accounting remains separately recomputable from the ledger. Older saves without a snapshot remain readable.

ShareLineV1 adds the allowed `open-line` / `saw` pair without changing payload version or fields. It still validates exact setup, restores station/state, warns on build mismatch and never auto-fires. The legacy floor state remains explicitly inactive in `/lab/lines`. Dedicated diverter experiments remain available.

## Verification and limits

Focused checks cover the new weights and qualitative inequalities, hard secondary cap, chatter immunity, no airtime/distance reward, target-null ground resolution from every rail, actual saw sightlines and distinct launcher transforms, deterministic Retry/Recall/share reproduction, forensic persistence and directed saw→mill claims. Existing Yard/Gallery/Cascade, roof hardening, long-flight safety, pad and production isolation tests remain in the suite.

This is not an exhaustive score distribution or farm survey. Browser visual play remains Charlie's next pass; the available automated browser cannot initialize WebGL. No persistent personal-best system, reverse saw gap, diverter reintegration, FLOW metric or additional map was added.
