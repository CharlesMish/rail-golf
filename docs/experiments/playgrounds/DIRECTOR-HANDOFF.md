# Rail Golf — The Next Playgrounds

Director research handoff · November 2026

**Preserve three different experiments: Two-Shadow Theatre, Gallery Cistern and
Guest Stone. Preserve the Saddle as a qualified physical proof, and the outcome
atlas as an author aid. No production promotion is recommended by this packet.**

Owner entry: **`/lab/playgrounds`** on the pinned non-production build linked
in the integration draft PR for `research/next-playgrounds-20261121`. The PR
description carries the exact deployed SHA and preview URL; the page displays
its build identity. All three routes belong to that same reviewed packet.
Spoiler-free visit: [OWNER-GUIDE.md](OWNER-GUIDE.md).
Exact launch recipes are in the separate lane appendices; this entry does not
ask the owner to reproduce a preselected successful angle.

## 1. What changed, and why these experiments

The owner's Horizons playtest changed the question. Swing Gate was entertaining,
but its consequences needed a larger place. Overpass was an architectural
ingredient. Crossing House was too sparse and familiar. Radial Return was too
small to sustain the imagined exploration. Those are actual owner observations;
they take precedence over the earlier reports' then-unknown enjoyment entries.

This portfolio therefore varies the **activity**, not merely the obstacle:

- Theatre asks a player to compose and compare two appearances of one flight.
- Gallery Cistern asks them to learn several regions of an enclosing place.
- Guest Stone lets one shot alter the starting conditions of the next.

The eighteen originals were read before implementation. The full selection,
rejected assumptions and different proof/prototype/platform costs are in
[PHASE-0.md](PHASE-0.md). None of the 90–160 m worlds, 30–55 m climbs or
50–60-piece architectural assemblies was accepted as ordinary Foundry data just
because its individual shapes sounded simple. No arbitrary terrain, assets,
scripts, materials, hinges or world physics controls were added to imports.

Ringwell's enclosing relationship was selected over completing a roof village.
The roof proof succeeded for some orientations, so this is not a finding that
roof neighborhoods are impossible. It is a choice to develop a place where
several ordinary misses can remain informative. Guest Stone was selected over
a constrained carriage after a small physical comparison, rather than assuming
the more constrained mechanism must be preferable. Theatre keeps its unusual
premise but uses two fixed schematic projections instead of simulated lighting.

No new owner playtest has established enjoyment for these candidates. The
available evidence supports physical possibilities and specific opportunities
to revise a shot. It does not establish that three attractive demonstrations
have become satisfying finished worlds.

## 2. The portfolio and its evidence

### Two-Shadow Theatre — preserve as a visual instrument

A small physical stage contains an upright flat and a sloping rostrum. One actual
Havok flight is projected onto front `(x,y)` and wing `(z,y)` panes, with a stage
plan for orientation. The same fixed metric scale and time cursor apply to both.
A saved trajectory is visibly historical; no predicted path is shown as physics.

The broad-flat fixture reverses x velocity from **+5.9177 to −5.0124 m/s** while
z stays forward. One view turns and the other continues. The rostrum changes
vertical velocity from **−10.9991 to +17.5134 m/s**, making an upward departure
in both views. Removing the corresponding object removes the interaction. Each
fixture retains its main contact under all six local aim/elevation/power changes.

Two open flights form a measured near-rhyme: their vertical positions differ by
at most **.4523 m** at sampled common times, while depth differs by **10.4122 m**.
This is an example of why open flight itself can matter here. It is not a claim
that any desired silhouette can be matched. Wider or steeper shots can strike a
corner or clear the flat; those negatives are retained.

Six voluntary Keeps, original-state Restore, shared-time scrubbing and paired
comparison give the prototype more to do than repeat one collision. The physical
engine is Babylon NullEngine plus Havok; SVG displays the actual output. This is
an intentional presentation choice, not an analytical replacement simulation.
Theatre ran actual Havok in the available browser; it does not require WebGL.

Continue if the owner invents another visual intention or returns to a kept pair.
Stop adding theatrical presentation if divided attention is tiring, or if the
comparison remains a diagram they inspect once.

[Lane report](theatre.md) · [Numerical appendix](theatre-solutions.md) ·
[Evidence](theatre-evidence.json)

### Gallery Cistern — preserve as the developed spatial candidate

The Cistern turns the ingredients into a room: broad galleries at different
heights, a low receiving area, enclosing walls and a connected side chamber.
Fifteen static code-owned box bodies, including terminal surfaces, provide the
whole physical architecture. An elevated station uses existing spatial-lab
support; no amphitheater dependency was imported.

The main families are a low top reception followed by a far-wall return, a
shallow gallery/wall circuit, and a side-chamber visit returning inside. They
retain **8/8, 7/7 available, and 8/8** tested nearby variations respectively.
The middle fixture starts at the elevation minimum, so a lower-elevation
neighbor is unavailable, not silently counted as a pass. A more ambitious
opposite-gallery top transfer retains **5/8**; it remains a secondary possibility.

The roof comparison settled an early dependency before the room grew. Flat and
downhill first roofs reach a second roof; the tested uphill and crosswise
orientations do not, and removing the first roof leaves a ground landing. Exit
velocity direction and receiving geometry matter, not retained speed alone.
This preserves the roof-village insight without claiming its full town works.

The enclosure has costs in experience as well as geometry. In a bounded 270-shot
grid, **224** shots reached actual ground, **43** left bounds and **3** settled.
Fourteen lasted more than fifteen seconds; the longest was **40.625 s**. One
nearby side-chamber variation also takes about 39 seconds. Longer survival can
be dead clatter. The prototype is not advertised as an endlessly forgiving room,
and the two-gallery route is not promoted as its sole reason to play.

A merged-floor control kept the three settled endings and fourteen long shots;
a sloped-floor control removed settled endings but increased long shots to 21
and reduced chamber-end reach. Neither was accepted as a cure. This remains a
real design limitation, not a seam diagnosis or a reason to change termination.

This is the strongest candidate for testing whether architecture gives the
player another region they want to investigate. It is not proof that enclosure
by itself creates sustained interest. Continue if the owner chooses a new region
or route after observing a miss. Reduce or abandon parts that mainly hide the
ball or prolong an already uninteresting outcome.

[Lane report](architecture.md) · [Unspoiled visit](architecture-owner.md) ·
[Numerical appendix](architecture-appendix.md) · [Evidence](architecture-evidence.json)

### Guest Stone — preserve a purposeful multi-shot experiment, with a caution

The Guest is one passive convex prop. An ordinary projectile moves it; the next
shot starts with the stone where it settled. A north cradle and an eastern
alcove provide two possible projects, while a bank supplies access to a different
face. Neither destination is scored or compulsory.

The opening central strike moves the stone about **.976 m**. Opposite flank
strikes give opposite lateral changes. A bank-to-stone line moves it about
**1.32 m**. Actual sequences deliver the stone toward the north cradle in eight
shots and to the eastern alcove mouth in eleven. Those recipes are evidence,
not an instruction to spend a required number of shots moving a prescribed item.

The physical comparison's constrained carriage moves, but takes about **5.2 s**
to settle in a representative case and tends toward an end stop under a strong
strike. It was deferred rather than packaged as an extra weak playground. The
selected stone has its own code-owned mass/damping contract; those values are
not offered as imported-world sliders and the projectile remains unchanged.

**The discoverability concern is real:** a broad 273-cell map contains only
fourteen stone interactions—seven direct, six through the west bank and one
far-bank return. This is an aimed delivery task, not hit-anywhere architectural
play. Twenty-four adjacent control changes preserve the central, flank and
west-bank families. The six far-bank neighbors retain the return in five cases;
one elevation step misses, and one power step substantially reduces movement.
That return moves the stone toward the launcher but does not establish broad
reverse access. These local variations and successful sequences do not erase
the sparse coarse map. Owner
feedback should establish whether arranging the next shot feels like a project
worth pursuing or repetitive work.

The lifecycle is explicit. First ground still ends the projectile. Its retired
collider stops influencing the prop. The stone continues in real Havok until
sixty quiet ticks, then its measured pose is held between shots. A ten-second
post-ball settling limit blocks further fire and offers Undo/Reset rather than
silently inventing a settled state. Records distinguish the state **before** the
blow, the pose **when the ball ends**, and the **settled result**; the middle
snapshot is not claimed as a complete dynamic restart state.

Keep saves up to four chosen blows. Restore before repeats original conditions;
Use result prepares the settled arrangement for a new intention. Both require
manual firing. Undo last blow and Reset garden are separate from those controls.

[Lane report](persistence.md) · [Numerical appendix](persistence-solutions.md) ·
[Evidence](persistence-evidence.json)

### Vesper Saddle — useful surprise, stop at the proof

A closed static ridge can sustain several seconds of near-surface travel with
unchanged bank and projectile coefficients. A representative line has a
**3.7667 s** near-face run, and all six adjacent aim/elevation/power changes retain
more than **3.1 s**. An identical left-rail setup finishes on opposite sides of
the ridge versus a matched flat BOX. Curvature genuinely changes its route.

But the flat surface also carries; higher arrivals remain separated rebounds;
and a front edge can launch a sharp upward departure. The measured near-face run
includes short rebounds and is not pure rolling. Tessellation changes precise
exits by metres, although the frozen geometry reproduces exactly in tested fresh
scenes. A single body with thousands of collision triangles is not a cheap or
stable general terrain vocabulary by definition.

Preserve the proof for a later receiving-basin/open-exit experiment. Do not call
this two-body fixture a completed Vesper world, or expose arbitrary mesh imports
because it runs. No fourth entry was made simply to fill the planning allowance.

[Report and other wildcard assessment](wildcard-report.md) ·
[Numerical appendix](wildcard-solutions.md) · [Evidence](wildcard-evidence.json)

## 3. Author outcome atlas

The atlas is the most immediately reusable authoring result. An explicit bounded
grid runs the actual Havok session and records surfaces touched, terminal
positions, contact normals, step-bracketing velocities and sampled paths. It
rejects unrecognized fields and off-detent launch inputs; it cannot import an
arbitrary script. The CLI whitelist and code-owned adapters are engineering
interfaces, not expanded user-world execution privileges.

A forty-shot gate example and matched absent-gate control expose a useful blind
spot: neither sample touches the far receiver, even though earlier verified
shots prove that receiver reachable. The correct conclusion is **this sampling
region misses a part of the world**, not “the receiver is unreachable.” Nineteen
paths match the absent-gate control exactly; twenty-one contain real gate contact.
Post-only shots also show why every altered destination should not be credited
to the moving mechanism.

The atlas does not rank worlds, optimize geometry or reward contact totals. Its
plots show actual terminal positions at matched world scale. They are not a
finished Raked Court, and an automatic batch is not evidence that a human would
want to compose forty marks. Persistent worlds need an explicit post-terminal
settling adapter before this sampler can describe their full lifecycle.

[Author tool contract and examples](AUTHOR-ATLAS.md)

## 4. What the evidence establishes

| Candidate | Physical feasibility | Authorable today | Discoverability / expression | Owner enjoyment |
|---|---|---|---|---|
| Theatre | Real recorded flights and tested projection differences | Bespoke code-owned stage and bounded recorder | Multiple visual intentions and comparison controls; divided-attention risk remains | Unmeasured for this candidate |
| Gallery Cistern | Multiple regions and genuine top/side contacts; negative long outcomes retained | Bespoke solids using accepted static physics and elevated station support | Broader physical context; secondary transfer sensitive, long clatter and occlusion remain risks | Unmeasured |
| Guest Stone | Passive motion, explicit settling and restorable pre/post arrangements | One specialized dynamic template and lifecycle | Two projects and bank access; broad aiming map is sparse | Unmeasured |
| Saddle | Curved near-surface routing under existing physics | Frozen bespoke mesh only | No receiving destinations or completed world; tessellation-sensitive exits | Not playtested |
| Atlas | Actual bounded measurements with matched controls | Author CLI/code adapter | Helps reveal assumptions; not a player experience or quality score | Not applicable |

A local sensitivity test is evidence about a neighborhood of a fixture. A broad
grid is evidence about its sampled settings. Neither is a human success rate.
Exact fresh-scene or frame-partition reproduction on this engine is not a
cross-platform or cross-version guarantee.

## 5. Costs, audio and presentation

World-only NullEngine counts below exclude shared equipment/UI unless the lane
report explicitly includes them. Active shots add a projectile body and mesh.
Caster registrations are not measured shadow draw calls. Timings come from
separate noisy shared-host fixtures and should not be ranked across lanes.

| Candidate / control | Resting bodies | World meshes | Caster registrations | Warm builder observation |
|---|---:|---:|---:|---|
| Theatre / empty stage | 3 / 1 static | 3 / 1 | 0 in SVG presentation | .491 / .263 ms median |
| Cistern / walls-only / receivers-only | 15 / 8 / 5 static | 15 / 8 / 5 | 13 / 6 / 3 | 3.475 / 2.273 / 1.715 ms median |
| Guest garden / bare prop proof | 11 / 3 static, including held prop | 30 / 22 | 10 / 2 | 3.977 / 2.388 ms median |
| Saddle ridge / matched BOX | 2 static each | 2 each | 1 each | 9.34 / .426 ms median |

During a Guest shot the held stone becomes dynamic: ten fixed bodies plus stone
and projectile are active in the full garden. Its resting-body count must not be
reported as eleven fixed bodies plus two dynamic ones. The final lane report
owns the complete resource accounting and cleanup evidence.

The Cistern's same-fixture Vertical Yard control has 23 static bodies, 85 meshes
and caster registrations, and an 8.258 ms warm median. This is a useful cost
comparison, not evidence that the Cistern is more enjoyable. Guest's measured
median Reset/Fire rebuilds are .315/.997 ms in the garden. Explicit dispose
cycles returned the owned objects counted by each lane to zero; this is not a
heap or GPU-memory measurement.

The Theatre uses SVG for rendering and actual Havok for physics; it ran in the
available browser. The 3D previews encounter WebGL unavailable in this browser.
Shell layout and geometric camera checks do not establish rendered scene
readability, active 3D control behavior or phone performance. No GPU memory or
physical-phone frame-rate result is claimed. Desktop Theatre checks and a
390×844 iframe check passed for actual firing, readable paired views, and
ordinary controls. Keep, reload, comparison, scrubbing and Restore were checked.
Cistern and Guest shells have no horizontal overflow at 390 px, but their 3D
scenes could not run in this browser. See [BROWSER-AND-CHECKS.md](BROWSER-AND-CHECKS.md).

The audio audit found that the older shared spatial interface did not create
charge/launch/contact audio at all. New prototypes use opt-in familiar cues for
real charge, fire, collision and terminal events. Scrubbing history does not
pretend to produce new physical contacts. Sound wiring/tests and actual audible
listening remain separate claims; the final verification section records which
were completed. Historical scoring and music behavior are not redesigned.

## 6. Authoring boundaries and fusion decision

| Capability | Status after this session | Smallest justified next commitment |
|---|---|---|
| Catalog banks/ramps/blocks/plates and experimental plate pose | Existing validated Foundry data remains intact | Better examples and explicit pose/readability guidance |
| Broad box architecture and elevated launch | Accepted code-authored lab mechanisms, newly composed here; not generic imports | A small bounded solid/station catalog with clearance and placement validation |
| Two-plane history | New specialized presentation/recorder | Preserve tool; generalize only after useful owner comparisons |
| One persistent convex prop | New specialized physical/lifecycle contract | Harden one template after owner evidence; no arbitrary rigid-body editor |
| Contiguous curved carrying face | New qualified bespoke geometry proof | One frozen surface with useful destinations and seam tests |
| Outcome atlas | New bounded author-only diagnostic | Explicit world-region labels and a reviewed persistent-lifecycle adapter |
| Adjustable waterline, earned lie, hinges, breakage, buoyancy | Unimplemented proposals | Separate minimal proofs with their actual state/physics dependencies |

No combined playable world was built. Theatre plus Cistern could offer a useful
view of a trajectory, but that does not yet create a new physical choice; the
large room also requires a different projection/readability treatment. A moving
gate or persistent prop inside the Cistern could change access, but collision
clearance, camera legibility, recovery and recorded state would need a new
comparison. Successful independent pieces did not automatically earn that cost.
This is a deferred fusion decision, not a failed-fusion physics result.

Low Water remains a particularly worthwhile separate proposal. Raising both the
terminal level and floating tee changes the global initial position. Repeating
control settings is not replaying the same global launch. A useful proof must
show a high-level reach advantage as well as low-level access, with level and
station restored together. Otherwise low water merely dominates every choice.
Its minimum lifecycle and control comparison are described in the wildcard report.

## 7. Repository authority, checks and publication

Verified remote starting refs:

- Production main: `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.
- Neutral Foundry: `0b151c5c94849b78ccda6c41a1755b66471e3fa2`.
- Horizons / PR80: `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb`.
- Amphitheater: `6ebb2f2b370656c7e70b108ad04d0369b78cf89c`.
- Radial Return / PR79: `00110e6890a0cc9541c9047a20c91d9670b206ee`.

Every new lane starts at the verified Horizons SHA. It supplies the accepted
spatial session/recording foundations; custom stations already work there.
The older curved amphitheater/station branch is unnecessary for these labs.
No new import schema, arbitrary script field or production physics authority is
introduced. Original v1 identities and previous experimental worlds are retained.

Publication uses one coherent integrated draft PR and one pinned owner index.
All lanes are included in that draft. The separately published lane branches
preserve author snapshots; the Cistern snapshot requires the integration
branch's optional UI, shelf and audio support. Use the integrated preview for play.

GitHub Git-object publication gives each snapshot new commit metadata. Its
published tree was checked equal to the entire local source tree, not merely
a copied file list. [PUBLISHED-LANES.json](PUBLISHED-LANES.json) records both
SHAs and exact tree hashes. Local measurement SHAs in reports identify the
original author workspace; the published equivalent is the durable checkout.

| Lane / branch | Reviewed local snapshot | Published snapshot |
|---|---|---|
| Theatre · `research/playgrounds-theatre-20261121` | `8044bd22f15843ed88949fcf5a0a707bef28e895` | `bf6271530d7bfb40a7753f0d247ea3dd1b63d5a7` |
| Cistern · `research/playgrounds-architecture-20261121` | `e20fc60c4b2f27ef07fbb42e9924335a3b947427` | `891ee9d052339740fe8fc6675003ef7115dc7f0c` |
| Guest · `research/playgrounds-persistence-20261121` | `93fbe3ae0f4fe68bbfceaac8169c935a539b8604` | `c034c7471a7b1a65466c3a8e480a20e28ea76fb0` |
| Saddle proof · `research/playgrounds-wildcard-20261121` | `e2d5e50a140a77c686065b5474f614b55d8ef228` | `10dd23693f08bc5cab2a0da89d4cbdbf2c532aa7` |
| Author atlas · `research/playgrounds-atlas-20261121` | `65e20159d1ebdd9ec8222b666d0bf78562b40b82` | `9ddf816f7130eac967344607f4595af16142fb26` |

Integrated branch: `research/next-playgrounds-20261121`, based on Horizons.
The enclosing published commit and integration PR identify the final packet;
the PR description records its exact preview SHA/URL and hosted checks.

**All local gates pass:** TypeScript; lint with zero errors and the same five
inherited warnings; production build; **617/617 tests**; all sixteen standard
Foundry manifests and both 24-piece capacity fixtures. Independent reviewers
reran the new physical contracts and challenged saved-state validation,
terminal collider retirement, actual top-face contacts and camera assumptions.
Detailed commands, scope and browser limits are in
[BROWSER-AND-CHECKS.md](BROWSER-AND-CHECKS.md).

Focused lane checks and regeneration commands live in their reports. Historical
tests are not weakened. Physical evidence is bounded text with explicit sampling
and truncation policies, not a binary archive. A callback's velocity bracket can
include gravity and multiple contacts in one fixed step; it is not a measured
single-contact impulse. Original physics is used wherever the lane is not
explicitly defining a new passive prop; no trajectory is scripted to force a win.

Final remote verification found main, neutral Foundry, Horizons/PR80,
amphitheater/PR78 and Radial/PR79 at the exact starting SHAs listed above.
No foundation ref, historical PR, production merge or production deployment
was changed by this commission.

## 8. Director recommendation

Prioritize at most two capabilities for further Worldcraft authoring work:

1. **Bounded architectural solids and elevated receiving places.** Cistern is
   the next owner test of spatial composition. Start from dependable broad
   surfaces, station clearance and readable views; do not jump to a terrain
   modeler or 160 m worlds. The critical observation is a player's chosen next
   region, not the longest shot or highest contact total.
2. **One passive persistent prop, conditionally.** Guest Stone deserves owner
   testing because a shot can prepare another shot. Generic promotion waits on
   whether purposeful repositioning is enjoyable, legible and recoverable.
   The sparse hit map and repetitive-delivery risk are reasons for caution.

Preserve Theatre as a distinct visual instrument even if it does not become a
universal world feature. Preserve the Saddle proof and constrained-carriage
comparison as research, without filling the gallery with unfinished fixtures.
The atlas is the strongest immediate reusable aid: it can show an author where
its assumptions lack evidence while leaving it free to value simple or unusual
experiences.

The surprise is that continuous-looking travel needed no new terminal rule, and
that the most reliable new tool is observational rather than another mechanism.
The disappointments are the sensitivity of precise mesh exits, the cost of long
architectural clatter, and the gap between “a prop moved” and broad accessible
stateful play. None is repaired by adding a score.

For a future independent whole-world author, provide a small validated catalog
of broad elevated solids, a few clear station options, preserved Keep/Restore,
and the author atlas. Offer one reviewed persistent prop only if this owner
playtest supports it. Leave arbitrary meshes, physics coefficients, force
scripts, automatic earned origins, fracture, buoyancy and general constraints
unavailable. Ask the author for a place with at least two physical intentions,
without prescribing geometry, music, targets or a successful contact chain.

Change this recommendation if Cistern's extra regions mostly cause occlusion or
waiting, Guest Stone feels like work rather than preparation, or Theatre provokes
more voluntary revisiting than either. Those are reasons to redirect the next
commission, not to reinterpret the current automated evidence as enjoyment.
