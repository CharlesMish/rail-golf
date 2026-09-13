# Line Recognition v0.2.1 — integrity and HUD repairs

**NON-CANONICAL PLACEHOLDERS.** Play `/lab/lines`. This is a hardening pass, not scoring balance. Production Cards 01–03, progression, records, launch parameters, geometry and known physics fixtures remain frozen. The persistent Skip Pad is unchanged. No Station 3, new target, multiplier or score economy was added.

## Spatial ruling versus safety

`lib/line-lifecycle.js` owns the score-lab lifetime rule. Spatial OOB is x outside ±50, z outside −15…198, or y below −8. There is no upper sky plane and no 13-second semantic OOB timer in this route.

Separate safety dispositions are a 60-second hard cap, or speed below 0.6 m/s sustained for three seconds after at least five seconds of flight. An ordinary ballistic apex does not meet the sustained-settling condition. Non-finite physical state receives a safety disposition too. The UI says SAFETY STOP or SHOT SETTLED; the saved receipt records the reason. These endings retain qualified claims, record an interrupted attempt and award no target finish. Production and dedicated diverter timing is unchanged.

## Saw assembly

The blade now has its own COMMON feature, SAW BLADE REJECT; the chassis keeps SAW CARRIAGE REJECT. Each independently confirmed free-flight leg can pay 100 once per part. Closely coupled contacts involving these two specifically tagged bodies may form a single SAW ASSEMBLY REJECT, worth 100 total. It preserves the first incoming velocity, total contact-episode duration and final outgoing velocity, then requires the same real free-flight confirmation as any redirect. This consumes both members for that launch. It does not pay 200 for two callbacks.

Independent qualified legs can pay 200 total. The compound exception applies only to this physical assembly. Sustained alternating chatter still fails the unchanged duration/speed/turn/separation gates.

## Roof envelope

The score-lab roof retains both original exterior panels, their normals and material. An invisible, closed triangular-prism convex hull fills the interior underneath those panels and closes the open gable approaches. Its lower face overlaps the mill wall and its ends sit inside the existing roof silhouette. This safety body is untagged for scoring. It may produce raw evidence but cannot claim COMMON, Mill Route or Mill Return itself.

The production roof is intentionally unchanged under the freeze. Positive-control fixtures demonstrate entry into the old cavity; front/rear and both eave approaches cannot enter the repaired interior, terminate promptly, and do not produce a long rattle. All three existing authored roof-return clear fixtures survive in the repaired lab.

## Directed claim and diagnostics

Bank B → A is now an explicit `banks-reverse` SIGNATURE worth the same placeholder 500 as Bank A → B. A real Lumber Walk fixture establishes the reverse relationship. Each direction pays once, and repeated copies of a redirect ledger cannot invent another direction. Tread Run remains its authored 1 → 2 → 3 relationship; reverse individual tread kicks can still be COMMON. Routes were not indiscriminately mirrored.

Expanded evidence includes reason-coded rejection records with body/feature identity and available velocity, turn, contact duration, separation and free-time measurements:

- incoming-speed-low / outgoing-speed-low
- turn-too-small / contact-too-long
- interrupted-before-free-flight
- insufficient-separation / insufficient-free-flight
- feature-already-scored
- shot-ended-before-free-flight

These are diagnostic events, never score tokens or live captions. Repeated diagnostic chatter is bounded by reason and feature/body for the shot. Raw contacts remain available separately. Thresholds and existing placeholder weights have not been widened or retuned.

## Live score and parked diverter

A lab-only additive LINE number occupies the top HUD and remains visible at mobile breakpoints. New claim captions show `+100 · LUMBER REBOUND` style increments. No multiplier, combo deadline or input was added. The detailed receipt remains post-shot accounting.

The score yard no longer creates a diverter floor, switch, supports or cable. It uses the ordinary loading platform with its original collider/material. `/lab/diverter` and `/lab/courtyard-diverter` retain their proven machinery and state behavior. The score yard retains only the shared real body-contact landing authority, not hidden switch machinery.

ShareLineV1 stays compatible. Legacy A/B fields remain in saved/shared provenance; importing or recalling them explicitly says dock state is inactive in this score yard. Build mismatch warnings still apply. Links restore aim/exact power without auto-firing. New geometry is not claimed to reproduce historical shots exactly.

## Verification scope

218 tests pass, including focused safety ruling, saw part/assembly/chatter, closed-roof approaches with old-geometry vulnerability control, forward/reverse Bank claims, reason-coded diagnostics, high Cascade flight and original Gallery/Cascade/Yard fixtures. Render tests check the lab LINE HUD and absence of switch UI while production retains its previous interface. Share round trips and provenance/state tests remain intact.

The available browser lacks WebGL, so HEADLESS physics and hosted build checks do not replace Charlie's manual playtest. No scoring-balance matrix or Station 3 work is included.
