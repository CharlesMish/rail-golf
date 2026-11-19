# Worldcraft Horizons — director handoff

19 November 2026. **Preserve three general prototypes and one separate radial
feasibility study. Prioritize bounded elevated surfaces and one predictable
periodic reflector. Do not broaden every editor variable.**

The owner entry is `/lab/horizons` on the pinned non-production build. Its three
links contain no numerical solutions. Radial Return has a separate build and
draft PR [#79](https://github.com/CharlesMish/rail-golf/pull/79). The integration
draft PR records its exact published SHA, pinned preview and final check results;
the branch is `research/worldcraft-horizons-20261119`.

## A. Executive design assessment

Worldcraft has established more than technical world-file validity. The existing
parts can support a receiving place, a return, a high crossing, and several
different relationships in one compact court. This session adds a convincing
comparison between upper and lower routes through one structure, and a moving
face that can be intentionally used as well as avoided. Neither needs a larger
world, more than twelve ordinary pieces, or a new projectile law.

The important unit of authorship is a **relationship with alternatives**: above
or below, passage or contact, cross the screen or revise it, receive the inward
return or skip a shelf. A collection of individually interesting objects is not
enough. The alternatives must survive normal control increments, and the opening
view must help the player see a reason to attempt them.

Three limits remain. A headless fixture is not evidence that someone will find
the route. A robust prefix does not make every later contact forgiving. An
enjoyable short study does not establish an hour-long environment. These limits
are explicit in the comparisons below; no new human enjoyment evidence was
collected.

Crossing House matters to the recommendation as much as the new moving study:
an independent author produced two credible families and one useful editing
lever without adding an engine feature. Better authorship and presentation can
be as valuable as vocabulary expansion.

## B. Capability inventory and smallest worthwhile extensions

The bounded pre-implementation audit is [PHASE-0.md](PHASE-0.md). It reads actual
code and the historical Vertical Yard, Travelling Tee, Fan & Paddle Works,
Mechanism Range, Linecraft and Foundry documents. Older September project files
were context, not runtime authority.

| Status | Capability | What it does and does not establish |
|---|---|---|
| Ordinary Foundry kit, not production main | Fixed bank/ramp/block/plate sizes, x/z/yaw placement, stopped carriage, optional challenge rules, bounded data imports, Keep/Restore | A small dependable physical catalog. No arbitrary assets, scripts, scale or coefficients. |
| Already on neutral experimental baseline | Plate lift/tilt, 3D overlap, optional 24-piece capacity; special travelling bell | Existing lift/tilt suffices for Overpass. Neither extra capacity nor the bell is needed by the new authored worlds. Generic bell Keep still has an inherited phase gap; range-shot export is the phase-aware path. |
| Specialized amphitheater branch | Curved convex terraces and launch-station z/yaw | Radial Return needs the station subset, not the curved architecture. The general build does not inherit this branch. |
| Historical code-authored labs | Elevated tee, broad multiheight solids, larger bounds, origin modes, ANIMATED reflector, bounded crossflow, stateful transfer | Strong implementation assets; they are not ordinary imported-world fields. |
| Newly demonstrated with existing data | Upper carry versus lower return; independent five-piece court; clean radial top reception with optional continuation | New authored relationships, not newly invented physics or a terrain system. |
| New specialized playable assembly | Swing Gate with set-power timing, captured release ticks, held Recall and four bounded phase-aware Keep slots | Real periodic passage/deflection and exact recovery. Not yet generic Foundry authoring. |
| Proposed, deferred | Broad contiguous elevated solid; bounded declarative gate; force box; wider or reoriented stations where needed | Each requires another clear authored need, not an all-at-once schema expansion. |
| Unnecessary for this evidence | Unrestricted scale/mesh imports, terrain sculpting, 200 m bounds, general motion scripts, random weather, physics sliders, thin fast blades | They add search, implementation and verification cost without a demonstrated better next shot. |

**Smallest static step:** document and deliberately expose the existing validated
plate pose contract to selected authors, with clear height preview and suitable
opening cameras. It carries low engine cost but real seam/edge/readability risk.
Do not add a new slab solely for this one tiled deck. If independent authors
repeatedly spend most of their part budget assembling the same surface, test one
bounded, code-owned broad solid with matched collision geometry.

**Smallest moving step:** retain one slow, broad periodic reflector template.
Generic promotion needs swept-volume placement validation, code-owned speed and
thickness limits, and a phase-aware line contract. Cost is moderate and recovery
risk is higher than static placement. A full animation authoring system is not
justified. Set power keeps timing from becoming an additional charging burden.

Layout/challenge separation remains partial: Foundry manifest challenge IDs are
separate, but the historical world hash still includes rule state, locks and
goals. This session preserves those identities and v1 bytes. A future optional
physical-layout fingerprint should be additive; do not rewrite old kept-line
provenance to claim a separation that never existed.

## C. Experimental results

### A — Overpass: preserve

Hypothesis: the same occupied footprint can support distinct upper and lower
routes. Eleven existing pieces make an honest supported crossing; eight lifted
horizontal plates form its roof.

The upper shot hits the actual roof top at **1.8333 s**, changing vertical
velocity from **−9.196 to +7.845 m/s**, clears the far wall and lands at
**z70.4476 m**. Without the roof, the identical setup meets that wall and lands at
**z41.9363 m**. The lower return passes beneath the roof both ways and is exactly
unchanged without it, with at least **0.4788 m** roof clearance including ball
radius. Both principal families survive all **eight immediate axial control
neighbors**. This is local robustness, not a probability of discovery.

Negative: a real underside route becomes a sharp edge strike after one elevation
detent. More power can miss the roof and make the journey shorter. Neither is
hidden or promoted as a fair precision challenge. This is a small over/under
study, not a substantial multilevel world or seamless terrain primitive.

[Report](spatial/REPORT.md) · [Unspoiled visit](spatial/OWNER-PROTOCOL.md) ·
[Numerical appendix](spatial/APPENDIX.md) · [Raw evidence](spatial/evidence.json)

### B — Swing Gate: preserve as a specialized lab

Hypothesis: a readable periodic face can offer a choice between passage and
deliberate deflection. A **14 × 12 × 1.4 m** gate oscillates through ±78° over
**12 seconds**, using the existing ANIMATED Havok target-transform authority.
No projectile velocity is scripted.

Identical launches at different phases either pass with a path exactly matching
the no-gate control, or rebound to different destinations. Passage and near
return survive **42 local aim/power/phase combinations**. A kept release phase
reproduces after reload into a fresh runtime and four seconds of idle stepping,
and under **30/60/144 Hz and mixed render partitions** of the same fixed physics
cadence.

A longer far-wall → gate return is real: wall contact at **1.525 s**, moving-gate
contact from behind at **2.542 s**. A **+0.5°** elevation change instead clips the
far wall's top and leaves the yard high. It remains a secondary discovery, not
the opening promise. PAUSED holds the starting phase only; the gate moves after
fire. Restore holds the recorded phase and requires manual fire.

The shared reflector helper retains all historical Fan & Paddle behavior.
Storage acquisition is isolated in the opt-in gate shelf module; historical
routes never access it. A new regression checks even the storage getter remains
untouched without the exact opt-in. The older shared-shell assertion is retained.

[Mechanism report and visit](B-MECHANISMS.md) · [Solutions](gate-solutions.md) ·
[Raw evidence](gate-evidence.json)

### C — Bounded wind: reproduce and defer

The old bounded volume applies **±6 m/s²** only inside its authored box, by
mass × acceleration × 1/120-second impulse. OFF/LEFT/RIGHT reproduce first-ground
x positions **−15.3093 / −20.2213 / −10.3972 m**, with identical z **53.3898 m**
and time **2.125 s**. The ±4.912 m displacement repeats; outside-volume invariance
and saved environment are retained.

That proves a force, not a new reason to fire. No new wind world was built.
Prioritize it only when a visible volume supplies distinct exposure routes that
players can explain and choose. This commission provides no basis for random
weather or a generic force editor. [Assessment](C-WIND.md).

### D — Crossing House: preserve the independent world

The author chose the geometry independently using five existing unvoiced pieces.
A ramp-assisted carry survives **8/8** immediate neighbors; removing the ramp
eliminates its reach. A screen → west route also survives **8/8**; four continue
to east. Removing the screen eliminates the lateral interaction. One editable
screen offers a bounded construction question after launch exploration.

The lateral wing contacts are on **narrow bank ends**, not broad front faces.
A longer repeated-ramp route survives only **3/8** neighbors and touches ramp
rear/side faces; it is a documented curiosity. Do not present this as a solution
to edge fragility or new terrain. Its value is an authored set of alternatives
using existing capability. [Report, owner protocol and separate numerical
section](CROSSING-HOUSE.md) · [Raw evidence](crossing-house-evidence.json).

### E — Radial Return: bounded success, stop optimizing

The proposed station and all three pieces work **without geometric adjustment**.
The original hypothesis gives wall → middle **top** → skip inner; all **8/8**
immediate neighbors retain that clean two-surface relationship. A different
ordinary detent setup gives wall → middle **top** → inner **top**, retained by
**5/8** neighbors. Other neighbors yield an edge hit, a detour or a clean skip.

The original wall contact at **1.100 s** reverses forward velocity from
**+13.233 to −11.298 m/s**. Its middle top at **1.392 s** receives downward motion
and produces an upward departure. The all-three case has top receptions at
**1.342 and 2.542 s**, with vertical normals and downward arrival/upward departure
at both. It ends at **3.975 s**, inward of the station. Raw normals, bracketing
velocities, callback episodes and free-flight gaps are preserved.

No-wall controls touch neither shelf; wall-only controls finish sooner. The
native-facing Stone Circle comparison is contextual, and a separately derived
matched-heading control verifies identical global launch with no course contact.
Neither demonstrates that Stone Circle has no other longer routes.

Preserve the simple physical relationship. It does not justify another concentric
step optimization or a full amphitheater redesign. Its report and unspoiled visit
are on [the separate return branch](https://github.com/CharlesMish/rail-golf/tree/00110e6890a0cc9541c9047a20c91d9670b206ee/docs/experiments/horizons/return).

## Performance and verification limits

Counts below are runtime/world-only **NullEngine** measurements. They exclude
shared app scenery, launcher, UI and cameras. Casters are builder registrations,
not measured shadow draws. No SwiftShader rendering was used.

| Prototype and control | Static / animated bodies | Projectile while active | Actual world meshes | Caster registrations | Warm build/rebuild median |
|---|---:|---:|---:|---:|---|
| Overpass | 13 / 0 | +1 | 21, including 8 guides | 12 | Rebuild 3.72 ms |
| Overpass without deck | 5 / 0 | +1 | 5 | 4 | Rebuild 1.41 ms |
| Swing Gate | 6 / 1 | +1 | 18 | 6 | Build 1.61 ms |
| Historical Fan & Paddle | 14 / 1 | +1 | 62 | 46 | Build 3.19 ms |
| Crossing House | 7 / 0 | +1 | 7 | 6 | Rebuild 1.48 ms |
| Return Address | 4 / 0 | +1 | 4 | 3 | Rebuild 1.51 ms |
| Radial Return | 5 / 0 | +1 | 7, including 2 guides | 4 | Rebuild 4.35 ms |
| Wall-only radial control | 3 / 0 | +1 | 3 | 2 | Rebuild 0.90 ms |
| Stone Circle | 25 / 0 | +1 | 28, of which 24 hidden collider meshes | 3 | Rebuild 44.07 ms |

These shared-host timings are noisy, sequential within each harness and not
cross-lane performance rankings. Crossing House's control had large allocation
outliers; five pieces have not been shown faster than two. Gate phase reset
rebuilds only its one body: median **0.022 ms**, max **0.213 ms** over 100 resets.

Repeated load/fire/reset/switch audits retained expected counts. Disposal
released all owned bodies, meshes and caster registrations; static-world
harnesses also returned their owned materials/textures/geometries to zero.
Heap samples are retained, but neither full JS heap reclamation nor GPU memory
is established. Gate saves are bounded to four records of at most 200 kB and
602 trajectory samples each.

The supported browser reports **WebGL unavailable**. Desktop and a 390 × 844 CSS
pixel iframe show the entry page and control-shell layout; the observed
Worldcraft canvas is 390 × 260. Disabled error-state controls cannot verify active
interactions. No scene visibility, motion readability, rendered draw calls,
frame timing, sound listening or physical-phone performance is claimed.

Pure Babylon camera projection prompted two bounded fixes: Overpass gets a closer
entry/Center frame retaining its launcher and crossing; Radial Return gets its
own side frame to reduce a probable phone overlay conflict. These are geometric
checks, not visual certification. [Reproduction and limits](CAMERA-AUDIT.md).

## D. Director comparison

| Experiment | Technically possible | Authorable | Discoverable | Expressive | Enjoyable |
|---|---|---|---|---|---|
| Overpass | Actual separated top/under routes | Existing validated pose data | Invitation/camera plausible; not player-tested | Strong local alternatives; fragile underside demoted | Unknown |
| Swing Gate | Real moving contact, phase replay, lifecycle checks | Specialized code only | Predictable cycle and pause; visual timing unverified | Passage and intentional contact, not just delay | Unknown |
| Wind | Reproduced bounded force | Historical specialized adapter | Direction cues exist; new route question absent | Displacement established, route agency unproven | Unknown |
| Crossing House | Two robust primary families | Ordinary data-only authoring | Screen/ramp understandable hypothesis; bank ends need review | Launch families plus one editable screen | Unknown |
| Radial Return | Verified top receptions and skips | Existing station/pose dependency | Smaller layout improves hypothesis; owner review pending | Robust skip, more sensitive continuation | Unknown |

Independent review was separate from the authors. It reran Overpass validation,
Radial physical tests and Gate plus historical paddle tests. It endorsed preserving
all four studies while rejecting claims of seamless terrain, universal edge
robustness, generic motion authoring or enjoyment. Its Stone Circle heading
critique led to the additional matched-global-launch control.

## E. Spoiler-free owner protocol

The first three are on one Horizons index. No required order or score.

- **Overpass:** inspect the space above and below the crossing. Vary one launch
  control at a time; compare where a low and high line can go. Keep one you want
  to change. Survey/Center and zoom are available.
- **Swing Gate:** watch one cycle, retain one launch setup and change release
  timing. Try using the face deliberately. PAUSED holds your starting phase;
  motion resumes on fire. Keep, take another shot, Restore and manually refire.
- **Crossing House:** explore above, around and across the screen. Then move or
  turn only that screen in Build and refire the same setup. Restore returns the
  original world and launch; Make a copy preserves a separate layout.
- **Radial Return, separate preview:** inspect the upper wall and lower receiving
  surfaces. Explore an inward return, then try changing its later destination.
  A skipped shelf is a legitimate outcome. Use Survey to watch the full relation.

For each, the useful feedback is: **What did you want to try next? What helped you
choose? What was hard to see? Did you return to a kept line later?** Stop a study
when it offers no new intention. Numerical fixtures live in the linked technical
appendices, not the invitations or entry page.

## F. Repository authority and handoff

Verified production start is `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.
General lanes start at neutral `0b151c5c94849b78ccda6c41a1755b66471e3fa2`.
Return alone starts at `6ebb2f2b370656c7e70b108ad04d0369b78cf89c`.

| Lane branch | Local authored end | Published end, identical Git tree |
|---|---|---|
| `research/horizons-spatial-20261119` | `ff82528bc5a0d36bba2e41fb8a7be14d86ffd169` | `ef4830cf84a4c4f46a42061d889e6ae484b54982` |
| `research/horizons-mechanism-20261119` | `1253450cb5dd993005f105fe0d02cee2890553a5` | `0366e847321910e9dab693722e6436ba1f6e8690` |
| `research/horizons-authored-20261119` | `637113defc2d7693cf6407a60728d6e323125bb5` | `973e9c83cf2bec72703e7ee6b6fda83b3bbe06db` |
| `research/horizons-return-20261119` | `de86b8754e84f26af37d8c3f1476e1323b066d0b` | `00110e6890a0cc9541c9047a20c91d9670b206ee` |

The integration branch contains A/B/D, isolated entry framing, portable camera
audit and this handoff. Its reviewed runtime checkpoint is `e254b7606ccd54e45ba2535f5c1319a2a786cd6d`; its exact
published/deployed SHA is recorded in the integration draft PR and owner handoff.
Lane snapshots were published through repository Git-object operations, which
assign new commit metadata; tree hashes were verified equal rather than claiming
those new SHAs were the local authored commits. The integrated published graph
retains the three published lane commits in its ancestry. No force push is used.

The neutral untouched baseline passed 555 tests, TypeScript, lint, production
build and all 16 Foundry directories. The final integrated source passed
**570/570 tests, TypeScript, lint, production build and all 18 Foundry directories**
(16 default directories plus the two explicit capacity fixtures). One concurrent
build process was killed with exit137; the serial retry after stopping the dev
preview completed successfully. This was not a test waiver. New gallery/rules
expectations explicitly include the added worlds;
the historical v1 hash, physical assertions and shell storage boundary remain.
Radial physical candidate `24fd7c7` passed all 569 tests; final presentation
candidate passed fresh TypeScript/build and 10 station/panel checks; GitHub CI
run169 passed on published return head `00110e6890a0cc9541c9047a20c91d9670b206ee`.
Lint retains
five pre-existing warnings, no new warnings.

Physics and data reproduction commands are in each lane report. The general
aggregate commands are `npm run typecheck`, `npm run lint`, `npm test`, and
`node scripts/foundry/validate.mjs`; the two existing capacity fixtures can be
passed explicitly as directories. Camera auditing accepts separate neutral and
return checkouts. Raw evidence is textual and bounded; no binary archives are
required.

Unmerged dependencies: neutral Foundry gallery/pose/capacity history for general
experiments; the existing station/amphitheater history for Radial Return only.
Production and foundation branch refs and PR #78 remain unchanged. Historical
lab behavior is preserved and regression-tested; the experimental branch shares
a small reflector helper and adds opt-in shell support for Swing Gate. No
production merge or deployment is part of this commission.

## G. Recommendation: at most two capabilities

1. **Bounded height-aware receiving surfaces.** Start by making the existing
   validated lift/tilt contract and good author preview dependable. Upper/lower
   occupancy and receiving tops are supported by two distinct studies. Test a
   single contiguous architectural solid only if multiple authors demonstrate
   repeated need; no arbitrary scaling or terrain editor.
2. **One predictable periodic reflector.** Preserve the slow broad envelope,
   fixed-tick authority, visible phase, set-power release and held Restore.
   It deserves research priority because contact and avoidance both change the
   shot's intention. It does not yet deserve unrestricted importable motion.

Invite another independent model to author **a compact split-level transfer
yard**: two visibly different receiving places with more than one physical way
between them. Give it validated elevated surfaces and, optionally, one periodic
reflector. Do not prescribe a successful chain, music, a target or the geometry;
let the author decline the mechanism if the place works better without it.

Change this recommendation if owners cannot read upper/lower relationships,
if useful routes repeatedly depend on thin edges or sub-detent settings, or if
the gate mostly makes them wait. Wind would move up if a small OFF-controlled
world produces understandable exposure choices and deliberate revisiting. Larger
bounds would move up only when a compelling authored route demonstrably cannot
fit. The deciding evidence is a player's next intended shot and later voluntary
return, not a larger sweep count or another passing implementation.
