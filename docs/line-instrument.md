# Line instrument — preparatory experiment

The current lab uses [recognition v0.2](line-recognition-v2.md). Its qualified redirect vocabulary and placeholder table supersede the v0.1 scoring details below. ShareLineV1 remains unchanged.

**NON-CANONICAL PLACEHOLDERS.** These numbers and qualifications are scaffolding for design review. They do not define a final scoring economy, tiers, progression, career, or leaderboard.

Entry: `/lab/lines`. This uses the real courtyard with all three existing objectives and both stations available from entry. The score receipt is lab-only. `/lab/courtyard-diverter` retains the simpler switch experiment. Production Cards 01–03 retain their objectives, scoring, progression, records, launch rules and physics. The persistent Skip Pad remains unchanged.

## Yard cleanup

There is no new Dispatch Bay cylinder. The lab uses the existing destinations. The experimental surface now replaces the mill's existing loading-platform body in its original footprint; it does not add a standalone slab, supports, or another landing disk. The shared scene builder omits that original body only when the experimental overlay is requested. Normal courtyard builds still create the original platform.

The switch controls two authored static Havok transforms of this loading dock. A is level. B tilts it sideways, raising the center to keep its lower edge above ground. Both experimental states retain the diverter's passive contact material. Production platform material remains unchanged. The physical box and visible timber share their transform. Real switch contact changes state once per projectile, after the physics step. Retry preserves state; Reset Card and fresh entry restore A; Recall restores the recorded starting state. The Skip Pad is independent and still uses its original powered vertical recovery, including on backward shots.

## Evidence → qualification → receipt

`lib/line-score.js` contains the entire replaceable rule table and deterministic receipt reducer.

| Placeholder family | Qualification within one projectile | Dummy points |
|---|---|---:|
| Target seat | Actual lab target landing ruling | 1000 |
| Skip activation | The existing powered pad actually activates | 100 |
| Ordered banks | Physical Bank A then Bank B contacts | 250 |
| Ordered treads | Qualified top contacts: tread 1 then 2 then 3 | 300 |
| Switch use | A real switch contact changes the environment | 50 |

Each family awards at most once per shot. Ordered families use the recorded order; unrelated intervening evidence does not automatically invalidate the sequence. No chain multiplier, timeout bonus, speed threshold, or minimum total exists. A miss or interrupted attempt can retain a qualified event already performed; target-seat credit requires its actual landing ruling.

The raw ledger includes body identity, surface classification, contact position, and consecutive-callback count. Qualification reads that ledger without modifying it. Consecutive contacts on the same body/surface are represented with a count, so roof dragging remains visible without becoming a stream of scoring tricks. Ordinary roof, corner, dock-floor and other solid contacts, and the existing sky token, do not earn points in this deliberately small first vocabulary. The receipt lists contributed events and explains unscored or incomplete/repeated evidence.

The line lab uses separate progress/history keys and does not write the production Delivery Route Book. Its totals are never supplied to progression or canonical hole records. The cleaned diverter uses new experimental storage keys so old additive-slab setups are not silently recalled onto different geometry. Previous records remain in their old keys.

## ShareLineV1

One compact base64url JSON payload in the URL fragment `#line=…`:

```ts
{
  v: 1,
  build: string, // observed build identity, or explicitly "unknown"
  world: "timber-courtyard",
  route: "/lab/lines" | "/lab/courtyard-diverter",
  card: string,
  station: "gate" | "lumber",
  rail: number,
  yaw: number,
  elevation: number,
  speed: number, // authoritative exact launch speed, not rounded display percent
  environment: { floor: "A" | "B" }
}
```

The validator requires the exact schema, supported version/world/route/card/station mapping, integer in-range rail, finite in-range aim/speed, valid state, and a bounded canonical encoding. Unknown fields, including claimed score or trajectory samples, are rejected. A link cannot provide arbitrary destinations, fire instructions, or result claims.

Opening a valid link on its correct lab route restores the card, station, aim, exact Set Power and starting environment. It never fires or awards progress. A different or unknown build shows a provenance warning; it is not an assertion of historical replay. Local saved attempts retain their creation build when copied. Old records with no provenance are explicitly unknown. Current-setup sharing requires Set Power; selected-shot sharing works for both originally timed and set-power shots.

Copy buttons live in lab shot tools. If clipboard permission is unavailable, a selectable link field remains available. Trajectory samples and the raw contact ledger remain local; neither is packed into the link.

## Verification and open decisions

Tests establish deterministic receipts, once-per-family behavior under repeated chatter, unscored raw contacts, replaceable weights, share round trips and malformed rejection, exact-speed restoration, build warnings, lab-only state/history, real switch and dock contacts in both states, and reproducible physical recall. Actual Havok ledgers yield the placeholder switch/seat awards while dock-and-roof rebounds remain unscored. Existing production yard, Delivery, Gallery, Cascade and control tests remain unchanged and pass.

The prior additive-destination fixture neighborhoods are retired with that experimental layout, not presented as proofs of the new dock layout. Both dock states have real contact fixtures and ordinary target clears; this pass does not claim score balance or map-wide completeness.

Open for the design review: what makes a trick worth recognizing, qualification strictness, finish requirements, weights, chain economy, broad route families, what to retain as memorable misses, dock composition/play feel, historical replay/version migration, and any eventual social feature. No final tiers, career, unlock economy or leaderboard are implemented.

Local interactive visual/touch verification remains limited by the available browser's lack of WebGL. Production route/render checks and HEADLESS physics do not substitute for the forthcoming human/Rail Rat playtest.
