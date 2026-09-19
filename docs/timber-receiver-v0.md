# Timber Receiver v0 — isolated geometry study

Route: `/lab/timber-receiver`. Accepted baseline: `354c4084fcf12cfed037ba3d341989edef61d07e`.

This is the **real Timber Courtyard / Open Line**, with one opt-in static return wall. It opens on Open Line; both existing stations and all incumbent controls remain available. No new station, objective, landing disk, wind, launch authority, score rule or recognition predicate was introduced. All values remain NON-CANONICAL PLACEHOLDERS. The only new qualified COMMON caption is `TIMBER RETURN`, using the unchanged generic gate and 100-point rule.

## Spatial decision

A short timber retaining structure sits behind the far east lumber bays, canted into the yard. Centre `(43, 7, 148)`, length 26 m, height 14 m, thickness 1.2 m, yaw −25°. Its bounds remain inside the original authored play volume. No ground or OOB boundary was extended. It covers one segment, leaving the near east edge, west edge, far end, and air above it open.

The physical face uses the existing bank material authority: static Havok box, restitution .86, friction .18. Wood courses, dark straps and cap reuse the existing yard materials; they have no extra collider. There is no target-aware reflection or force. The launcher, rail round, follow camera, MAX, charging, exact-power, Retry/Recall and physical projectile are the incumbent `MannersGame` implementation, not a copy.

## Candidate evidence

Exploratory sweeps were coarse deterministic samples, not player-frequency estimates or proofs of balance. The initial grid fired 648 Gate and 756 Walk shots for each of three candidates. A finer Gate sweep used 2,970 launches; the final canted candidate used that Gate sweep plus 1,260 Walk launches. Only real qualified receiver departures were counted.

| Candidate | Initial Gate / Walk departures | Later evidence | Decision |
|---|---:|---|---|
| Straight side segment: x46/z140, 36 m, yaw0 | 4 / 60 | Finer Gate: 26; many useful Walk returns, fewer Gate approaches | Plausible but comparatively flat backboard |
| Mild splay: x44.5/z148, 32 m, yaw−12 | 10 / 46 | Finer Gate: 39; 17 already involved existing geometry | Better cross-yard invitation |
| Far-end backstop: x26/z184, 36 m, yaw70 | 0 / 0 | No tested family reached it | Rejected as another remote object |
| **Short canted receiver: x43/z148, 26 m, yaw−25** | — | **45 / 46** on finer grids; 21 Gate shots had prior existing-feature redirects; 25 Walk shots continued to a later existing-feature redirect | Frozen playable candidate |

The selected shorter wall turns travel across the right edge toward the existing yard. Real-Havok paired baseline/variant fixtures establish:

- Gate → qualified middle tread → RETURN → ground on the existing Lumber Walk apron. The identical baseline attempt exits spatial OOB.
- Gate → existing lumber redirects → RETURN → ground inside the far yard. Again, the same baseline attempts are OOB.
- Walk → RETURN → existing lumber → low tread → ground nearer the front half of the yard.
- Walk → RETURN → low tread → near-gate ground at another power.
- Multiple rail/power samples support useful returns. The wall does not turn all high or far shots into continuations; OOB remains reachable.

**Not established:** a complete existing collider → RETURN → different existing collider chain in one shot. The tested Gate lines return into an existing *region*, then end on ground. The Walk lines do produce receiver → existing collider chains. Do not describe these as a proven three-feature Gate combo. Whether players see and enjoy the new choice requires Charlie's manual pass.

## Isolation and evidence

`timberReceiver` is false by default and only the new route enables it. Original courtyard scene data, stations, physics, line scorer and recognition modules are unmodified. The experiment has separate progress/saved-line keys, separate action-trace/pending-journal namespace, and a separate IndexedDB survey archive. Clearing receiver evidence cannot clear accepted Open Line receipts. The archive reuses the exact established 2,000-attempt / 64 MiB implementation; only its database name is parameterized.

ShareLineV1 recognizes `/lab/timber-receiver`; copied links retain the variant rather than replaying in the original yard. Exact speed, station, aim and starting pallet state are retained; no automatic firing. Existing `/lab/lines` links keep their original behavior.

## Focused verification

`tests/timber-receiver.test.mjs` covers one static overlay body and visual-only trim; paired real-Havok baseline/receiver returns from both stations; multiple rails/powers; unchanged no-contact trajectories and open OOB; ordinary once-per-feature COMMON recognition; pallet-state independence of receiver fixtures; separate survey/trace stores; and variant-preserving share links. Winning setups live only in source fixtures, not player UI.

The hosting browser currently has no WebGL authority. Headless physics establishes the listed contacts and outcomes; it does not establish player-facing visual quality or discoverability. The first manual question is whether the angled timber face reads as an intentional return opportunity from Walk and as a distant receiver from Gate, without swallowing the useful void.
