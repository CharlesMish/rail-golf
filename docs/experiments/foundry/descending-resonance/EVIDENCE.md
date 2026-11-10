# Descending Resonance

One elevated arrangement, world `descending-resonance`, and one flat control, world `descending-resonance-flat`. Branch `lab/wc-exp-20261110-descending-resonance`, cut from `a003fbb9f04514980799b0d0d52970c4399c717c`, the head of draft PR #68 (Ricochet Garden — Loop). The geometry extension and both presets are fixed at `5301964e13561fe83b2af16733c5585b50a973d3`, which is each manifest's `sourceBuild`. The numbers on this page were produced on `43a9f2aa820db4664076c466749b48344a92de15`, which adds the manifests, the result view, and the scripts and does not touch physics. Seed `20261110` is provenance only. It is not applied to the solver. Ball mass, radius, gravity, charge mapping, friction, restitution, and first-ground termination are unchanged.

This page states contact orders and aims. The owner protocol does not. Read [OWNER-PROTOCOL.md](OWNER-PROTOCOL.md) first if you intend to play unspoiled.

Grid counts below are how many sampled setups produced something. They are not a probability that a person finds it, and they are not evidence that it is fun.

## The question

Ricochet Garden — Loop was good to play, but multi-contact lines were hard to find and hard to vary: a nearby aim usually dropped a three-note line to one or two. The proposal was height: let a ball meet staggered sounding surfaces as gravity brings it down. This experiment asks whether that helps, and how much of the help needs height at all.

## Short answer

Height helps, and a careful flat layout gets about half of the same gain without it.

On every slider detent in a block around the opening aim (17,325 setups), three to five beats came from 12.7% of setups in Loop, 29.7% in the flat control, and 55.0% in the elevated world. A phrase of three or more beats stayed at three or more on a neighbouring slider step 66% of the time in Loop, 80% in the flat control, and 90% in the elevated world. The elevated world was never silent on that block. Loop was silent on 20.9% of it.

Most of the stability comes from one flat idea: two parallel faces, the nearer one lower, so a ball that clears the first is caught between them. Loop's angled pocket does not have that. Height then adds a second such gap above the first, and a leaning tier turns the highest balls down into it. Lift without tilt was worth no more than the best flat layout on the three-to-five measure (31.0% against 29.7%). The lean is what moved it to 55.0%.

## Definitions

A note is one impact the resonance ear kept. It is what the player hears and what the note timeline draws. A beat is the notes that begin within 80 ms of each other: a ball on the seam between two pieces sounds two notes in one beat. Counts and phrases here are in beats, so a seam hit is not scored as a two-note sequence. A phrase is the pieces of each beat in order; a seam beat is written `a+b`.

The contact ledger merges consecutive callbacks on one body into one row, so two bounces on one piece are one ledger row and two beats. Loop's published counts used ledger rows. On Loop the two agree except for seam hits: this run reproduces its 47 ledger orders and 480 misses exactly.

Slider steps are 0.5° of yaw, 0.5° of elevation, and 0.01 of charge. For each lattice cell with at least three beats and all six neighbours on the lattice, each neighbour is one of: same (identical phrase), variation (a different phrase that still has three or more beats), thinner (one or two beats), silent.

## Phase 1. What the code allowed, and what was added

The v1 world document places a catalog box by `x`, `z`, and `yaw`. Its height comes from the catalog. Overlap is a 2-D footprint test. The only inclined piece is the ramp, at a fixed 20°. The scene builder, the runtime, the recorded-line snapshot, and the identity string all read the validated document, so geometry that is not in the document cannot be recorded or replayed.

Two routes were open: a separate scene with hand-built elevated colliders, or an opt-in field on the document. The separate scene would have needed its own aim controls, sound, timeline, recording, and gallery entry, and its shots would not have carried their geometry. The field is smaller and keeps shot records honest. It is what was built.

**The extension.** A `plate` may carry `lift` and `tilt`, together.

- `tilt` pitches the box about its own width axis, after yaw, exactly as the ramp's catalog pitch does. −90° to 90°, in 5° steps. A negative tilt on a plate facing the tee leans its top toward the tee.
- `lift` is the height of the tilted box's lowest point above the ground. 0 to 20 m, in 0.5 m steps. No pair of values can sink a plate into the ground, and the tallest a plate can reach is 24 m.
- The pair `lift 0, tilt 0` is rejected. A standing plate is written without the fields, so each pose has one spelling.
- Banks, ramps, and blocks cannot carry the pair.
- A pair of pieces that includes an elevated plate is judged as two solid boxes (separating axes, touching allowed), so a plate can sit above a wall. Two standing pieces keep the v1 footprint rule unchanged.
- The launcher corridor and the yard edge still use the plan footprint, which widens with tilt.
- The scene draws a thin ground outline and a drop line under an elevated plate. They are lines, with no body, and are not in the muzzle-clearance list.

That is under a hundred changed lines in `lib/worldcraft-model.js`, `lib/worldcraft-model.d.ts`, and `lib/worldcraft-scene.js`. No new piece kind, no new collider shape, no new material.

**Camera.** A finished shot in either new world is shown from a low side survey orbit, because the follow camera ends between the two walls with a wall face filling the view. This is keyed on the two manifest ids in `resultFraming`, the same way the existing receipts are. Every other world keeps the camera it had. At 1280×800 and 844×390 that view shows the whole structure and the line. At 390×844 the canvas is about 250 px tall and the camera buttons cover its top third, so the hung rows sit behind them until the view is zoomed out or turned.

**Compatibility boundaries.**

- A document without the pair exports the same bytes as before. The pinned v1 export hash `127a0332…1389` is unchanged, and every registered v1 foundry preset round-trips to its own bytes.
- `WORLDCRAFT_CATALOG_VERSION` and `WORLDCRAFT_PHYSICS_CONTRACT` are not bumped. Bumping either would change the identity of every existing world and kept line. The identity string carries each object in full, so an elevated world cannot collide with a standing one.
- A build without the extension rejects an elevated document with `unsupported or missing fields`. It does not load it as a flat world.
- Kept lines, range shots, and imports accept the pair on this branch, so a shot fired here restores here.
- The foundry validator replays the tested shots of every registered v1 world, Loop's six included, to the recorded terminal, bit for bit, after the change.
- `docs/experiments/foundry/AUTHORING.md` still tells kit authors not to add a height field. That rule stands for the kit. This branch is the owner-directed exception, and nothing here is merged into the kit.

**What the general version would take.** Lift and tilt controls and a side view in Build. A camera that frames by height when a world has elevated pieces, in launch and in flight as well as on the result. A tier name in piece labels. A decision on whether banks may lean. A 3-D check against the bell rail and the stand-in, which still use the plan footprint.

## What was sketched first

Coarse numbers, one cell in eighty of the lattice block (1,105 setups) and the 875-shot Loop broad grid. All of it re-runs with `repro/explore.mjs`.

| Sketch | Uses | Broad: silent / 3–5 / 6+ | Coarse block: silent / one / two / 3–5 / 6+ |
| --- | --- | --- | --- |
| A 4 m row in front of a 7 m wall | v1 | 438 / 33 / 0 | 221 / 593 / 85 / 204 / 2 |
| The same, plates hung upright above the wall | lift | 333 / 36 / 0 | 0 / 807 / 75 / 221 / 2 |
| The front row hung at 3.5 m | lift | 547 / 25 / 0 | 238 / 776 / 29 / 62 / 0 |
| A lower tier leaning back 20° to kick low balls up | lift, tilt | 673 / 6 / 27 | 292 / 631 / 26 / 65 / 91 |
| A hung outer row in front of the gap | lift | 513 / 11 / 0 | 234 / 778 / 39 / 48 / 6 |
| Row, wall, then a wall with an upright tier | lift | 315 / 50 / 0 | 0 / 703 / 111 / 291 / 0 |
| The same with the tier leaning 10° toward the tee | lift, tilt | 315 / 65 / 0 | 0 / 603 / 124 / 378 / 0 |
| Two ramps, a row, two walls, one leaning tier | lift, tilt | 237 / 92 / 2 | 0 / 436 / 205 / 425 / 39 |
| Kept flat control | v1 | 295 / 42 / 1 | 156 / 461 / 156 / 314 / 18 |
| Kept elevated world | lift, tilt | 220 / 163 / 2 | 0 / 297 / 186 / 611 / 11 |
| Ricochet Garden — Loop | v1 | 480 / 24 / 0 | 252 / 373 / 339 / 139 / 2 |

What that taught:

- **Walls redirect. Only an up-facing surface adds time.** A ball's time in the air is set at launch. A vertical face turns it and leaves its fall alone. So a phrase has to fit in the fall that is left, and the gap between two walls has to be short enough to cross several times in that fall. Six to seven metres worked.
- **A gap catches a band about 2.5 m tall.** A ball must clear the front row and still meet the back wall, and must then have fallen below the row's top by the time it comes back. Hanging plates straight above the back wall added sound (no silent setups) but not phrases: the ball met them and flew back out over the row.
- **Raising the entry loses it.** Hanging the front row moved the band up to where few ordinary arcs are level.
- **Kicking up is unstable.** A leaning lower tier threw low balls upward and produced pile-ups (91 of 1,105 coarse setups at six beats or more, up to eight) with few three-to-five phrases. Steep up-facing surfaces amplify a small change in aim.
- **A second wall behind the first, carrying a tier, makes a second band.** That is the one place lift earned its keep, and leaning its tier toward the tee widened the band further by turning high balls down.
- **Low shots never clear a 4 m plate.** The existing ramp catches them and lifts them into the upper tier. No new piece was needed for that.

## Kept layout

Side view, tee on the left. Heights in metres.

```
15 |                                    ╲   top tier, leans 20°
11 |                                     ╲  high tier, leans 10°
 7 |                       ┌──┐          ┌──┐
   |                       │  │          │  │
 4 |          ___ ramps    │  │ near     │  │ far
   |      ___/             │  │ wall     │  │ wall
 0 |_____/_________________│__│__________│__│_____
        z 10.7 – 20.3       26            33
```

Launcher x 0. Opening aim yaw 0°, elevation 18°, charge 0.55, the same opening as Loop. Every piece is fixed. Seams are offset from the centreline so the opening yaw does not ride one.

| Id | Kind | x | z | Lift | Tilt | Voice |
| --- | --- | --- | --- | --- | --- | --- |
| ramp-w | ramp | −3.5 | 15.5 | | | timber C4 |
| ramp-e | ramp | 6.5 | 15.5 | | | timber D4 |
| wall-near-w | bank | −8 | 26 | | | timber D4 |
| wall-near-e | bank | 4 | 26 | | | timber E4 |
| wall-far-w | bank | −4 | 33 | | | metal C4 |
| wall-far-e | bank | 8 | 33 | | | metal D4 |
| high-w, high-c, high-e | plate | −4, 0, 4 | 32.5 | 7 | −10 | timber E4, G4, A4 |
| top-w, top-c, top-e | plate | −4, 0, 4 | 31.5 | 11 | −20 | metal G4, A4, E4 |

Twelve pieces, the existing limit. Six carry the pair. Voices fall with height on the widest lines: the centre hung plate, the near wall, then the far wall is G4, E4, C4.

**Flat control.** The same two ramps, a row of four standing metal plates at z 23 (x −5, −1, 3, 7), near wall at z 30, far wall at z 38. Ten v1 pieces. It is the strongest of about ten flat layouts tried on the coarse block. It is not a proven best.

## Aim sets

Three sets, fixed before any world was scored on them. All use origin x 0 except the wide set.

- **Broad.** Loop's own grid, unchanged: yaw −24° to 24° step 2°, elevation 8°, 12°, 16°, 20°, 24°, 30°, 40°, charge 0.35, 0.45, 0.55, 0.65, 0.80. 875 setups.
- **Lattice.** Every slider detent in a block around the opening aim all three worlds share: yaw −6° to 6°, elevation 10° to 26°, charge 0.45 to 0.65. 17,325 setups. This is the set that can speak about neighbours.
- **Wide.** Carriage stops −8, −4, 0, 4, 8; yaw −30° to 30° step 5°; elevation 10° to 50°; charge 0.30 to 0.90. 2,275 setups.

Five arrangements were fired at all three: the elevated world, the flat control, Loop, and two derived ablations of the elevated world that are not registered. **Lift only** sets every tilt to 0 and stands the tiers directly above the far wall. **No tiers** removes the six plates.

## Results

### How many beats

Lattice, 17,325 setups each.

| | Silent | One | Two | Three to five | Six or more | Most |
| --- | --- | --- | --- | --- | --- | --- |
| Elevated | 0 (0.0%) | 4,882 (28.2%) | 2,708 (15.6%) | 9,536 (55.0%) | 199 (1.1%) | 14 |
| Flat control | 2,086 (12.0%) | 7,176 (41.4%) | 2,589 (14.9%) | 5,141 (29.7%) | 333 (1.9%) | 9 |
| Loop | 3,622 (20.9%) | 5,805 (33.5%) | 5,662 (32.7%) | 2,207 (12.7%) | 29 (0.2%) | 11 |
| Lift only | 0 (0.0%) | 6,623 (38.2%) | 5,246 (30.3%) | 5,374 (31.0%) | 82 (0.5%) | 9 |
| No tiers | 3,080 (17.8%) | 10,323 (59.6%) | 1,606 (9.3%) | 2,298 (13.3%) | 18 (0.1%) | 8 |

Broad, 875 setups each.

| | Silent | One | Two | Three to five | Six or more |
| --- | --- | --- | --- | --- | --- |
| Elevated | 220 | 332 | 158 | 163 | 2 |
| Flat control | 295 | 380 | 157 | 42 | 1 |
| Loop | 480 | 288 | 83 | 24 | 0 |
| Lift only | 231 | 384 | 136 | 124 | 0 |
| No tiers | 330 | 410 | 90 | 45 | 0 |

Wide, 2,275 setups each.

| | Silent | One | Two | Three to five | Six or more |
| --- | --- | --- | --- | --- | --- |
| Elevated | 1,183 | 595 | 303 | 188 | 6 |
| Flat control | 1,400 | 648 | 152 | 74 | 1 |
| Loop | 1,675 | 490 | 75 | 35 | 0 |
| Lift only | 1,179 | 727 | 230 | 135 | 4 |
| No tiers | 1,368 | 680 | 153 | 74 | 0 |

More than half of the wide set misses everything in every world. Those are high lobs, hard shots, and wide yaws that pass a 24 m structure. The elevated world does not change that much.

Loop makes many two-beat lines on the lattice (32.7%). That is the wide back-bank-then-hook return its own evidence describes. The new worlds make fewer two-beat lines and more three-to-five.

### How many different phrases

Distinct phrases with three or more beats: lattice 672 elevated, 504 flat, 198 Loop; broad 72, 26, 18; wide 101, 54, 22. Distinct ledger orders on the broad grid: 114, 53, 47.

Read these with care. A seam beat makes a phrase of its own, and seam beats are common in the new worlds because their pieces abut (2,043 lattice setups in the elevated world had one, 1,480 flat, 223 Loop). The count of phrases a person would call different is lower than 672.

One voice also dominates the block around the opening. The east near wall sounds in 11,254 of the 17,325 elevated lattice setups, and 3,815 setups are that wall alone. Most phrases there are built around its E4.

### Neighbours

Lattice cells with three or more beats, and what their six neighbours became.

| | Cells | Same | Variation | Thinner | Silent | Cells where no neighbour dropped below three |
| --- | --- | --- | --- | --- | --- | --- |
| Elevated | 7,546 | 56.2% | 34.2% | 9.6% | 0.0% | 5,028 (66.6%) |
| Flat control | 4,614 | 45.9% | 34.4% | 19.7% | 0.0% | 1,670 (36.2%) |
| Loop | 1,790 | 37.4% | 28.8% | 33.8% | 0.0% | 344 (19.2%) |
| Lift only | 4,198 | 52.5% | 30.9% | 16.7% | 0.0% | 1,916 (45.6%) |
| No tiers | 1,923 | 50.3% | 27.1% | 22.6% | 0.0% | 583 (30.3%) |

This is the owner's complaint in numbers. In Loop a third of the steps away from a three-beat line fall to one or two. In the elevated world a tenth do, and a third become a different line of three or more. No world's three-beat line fell silent on a single step.

With the floor at two beats the three registered worlds are close: 95.2% elevated, 92.8% flat, 91.8% Loop kept two or more. Loop's two-beat return was already stable. What it lacked was stable lines of three.

### Tested shots

Each centre was fired with its six slider neighbours. Notes are what the ear kept.

| World | Id | Aim | Phrase | Notes | Neighbours exact | Seconds |
| --- | --- | --- | --- | --- | --- | --- |
| Elevated | opening | yaw 0°, elevation 18°, charge 0.55 | near wall east | E4 | 6/6 | 1.67 |
| Elevated | descent | yaw −1°, 24°, 0.56 | high centre, near wall east, far wall west | G4 E4 C4 | 6/6 | 1.97 |
| Elevated | west-descent | yaw −5°, 24°, 0.56 | high west, near wall west, far wall west | E4 D4 C4 | 6/6 | 1.91 |
| Elevated | skip-to-crown | yaw −1°, 11.5°, 0.57 | west ramp, top centre, west ramp | C4 A4 C4 | 6/6 | 2.92 |
| Elevated | west-crown | yaw −5°, 12°, 0.56 | west ramp, top west, west ramp | C4 G4 C4 | 6/6 | 2.95 |
| Elevated | wall-and-ramp | yaw −2.5°, 15°, 0.55 | near wall east, west ramp, near wall east | E4 C4 E4 | 6/6 | 2.52 |
| Elevated | four | yaw −2.5°, 18.5°, 0.46 | near wall east, west ramp, twice | E4 C4 E4 C4 | 6/6 | 2.84 |
| Flat | opening | yaw 0°, 18°, 0.55 | near wall east, row plate | E4 G4 | 3/6 | 4.31 |
| Flat | wall-and-row | yaw 4°, 17°, 0.52 | near wall east, row plate, near wall east | E4 A4 E4 | 6/6 | 1.83 |
| Flat | four | yaw −2°, 14°, 0.63 | near wall east, row plate, twice | E4 G4 E4 G4 | 6/6 | 1.77 |

Walked outward one slider step at a time, the descent holds for 11 yaw steps, 8 elevation steps, and 9 charge steps, and the skip to the crown for 9, 9, and 15. The wall-and-ramp line is thin in elevation (12, 3, 6), and the four-beat line is narrow in elevation and charge (11, 4, 4). In the flat control the three-beat line holds for 13, 7, and 6, and the four-beat line for 8, 3, and 4.

### Timing

Lattice.

| | First sound, median (10th–90th) | Gap between beats, median (10th–90th) | Gaps over 1 s | Flight, median / 90th / longest |
| --- | --- | --- | --- | --- |
| Elevated | 0.80 s (0.48–1.10) | 0.35 s (0.23–0.97) | 1,959 of 26,154 | 2.49 / 4.05 / 16.11 s |
| Flat control | 0.92 s (0.48–1.18) | 0.33 s (0.25–0.58) | 703 of 17,271 | 2.93 / 4.07 / 11.91 s |
| Loop | 1.08 s (0.86–1.28) | 0.28 s (0.17–0.59) | 58 of 11,139 | 1.88 / 2.83 / 15.75 s |

The elevated world has two rhythms. Between the walls a beat comes every 0.25 to 0.35 s. A ball lifted by a ramp is in the air about 0.85 s before it meets the top tier and about as long coming back, so those lines are long-short or long-long. One gap in thirteen is over a second.

### Long shots and settling

Elevated lattice: 16,503 ended on first ground, 822 left the yard, none settled, none timed out. 33 setups made eight or more beats. In 31 of them a ramp sounded three or more times: the ball went back and forth between the high end of a ramp and the near wall, or between a ramp and the top tier. In the other 2 the ball landed on the level 1 m top of a wall and bounced in place, each bounce shorter than the last, for 14 beats; the longer took 16.1 s. The flat control had 24 setups of eight or more beats, and Loop 5. Loop's own longest lattice shot was 15.75 s.

One piece sounded twice in a row in 148 elevated setups (262 flat, 6 Loop). Counted by kind, 130 of those were on a ramp, 20 on a wall, and 1 on a plate. A ramp is 10 m long and a ball can skip along it.

### Pieces that add little

Every piece in every world sounded on all three sets. Least used:

- Elevated, wide set: the far walls (52 and 56 of 2,275 setups) and the high tier (37 to 40 each). On the lattice the east far wall sounded in 1,007 setups and the outer plates of both tiers in 1,125 to 1,326, against 11,254 for the east near wall. The outer plates sit at the edge of a ±6° block, so that is partly the block.
- Flat control: the outer row plate at x 7 sounded in 9 lattice setups and 35 wide ones.
- Loop, lattice: `plate-west` 52, `bank-flank` 113.

Nothing is dead weight. The far walls and the high tier are the most expensive pieces per beat, and they are what make the second gap.

### Camera, audio, and cleanup

Headless Chrome with SwiftShader on `?qa=1`, from `repro/browser-check.mjs`. Report and screenshots are in `screenshots/`.

- Every tested shot in both worlds gave the manifest's contact order and the manifest's terminal, bit for bit, in the page.
- Every piece centre projects inside the canvas in the address view and the survey view, at 1280×800, 390×844, and 844×390.
- Twenty load-fire-leave cycles, alternating with Loop: static bodies, meshes, materials, and textures returned to the same counts each time. No page errors.
- In headless tests a runtime disposed after an elevated world leaves zero physics bodies and the scene's mesh and material counts where they started. The height guides leave with it.
- Audio. The live path runs through the existing mix limiter, which cannot pass −1 dBFS. An upper bound on the level entering it (every partial in phase, H timber-bank voice) passed the limiter knee of 0.85 in 21 of 17,325 elevated lattice setups, 111 flat, 0 Loop. The worst bound was 1.16. So the limiter would lean in on about one elevated setup in 800. Metal tails last up to 1.85 s and beats are 0.25 to 0.35 s apart, so tails overlap in every phrase; that is the existing metal voice, not new.

## Phase 4. Judgment

**Does the concept improve the improvising?** On what can be measured, yes. Ordinary nudges of yaw, elevation, and power around one aim produce a three-to-five-beat line more than half the time, a step in any direction usually keeps a line of three or more, and a third of those steps change it to a different one. That is the property the brief asked for: neighbours that vary without collapsing. Whether it is more fun than Loop is the owner's call and was not measured.

**Is it an open-ended instrument, or just harder geometry?** Closer to an instrument with a small range than to an open-ended one. The useful vertical vocabulary turned out to be narrow: a tier hung above a wall, leaning toward the tee. Free placement in three dimensions was not the gain. The sketches that used height more freely (a hung front row, a hung outer row, a kicking lower tier) were worse than the flat gap or broke into pile-ups. So the evidence is against "more vertical freedom" as such, and for one constrained use of it.

What it plays is also narrower than 672 phrases suggests. The lines are families: wall and ramp alternating, a fall from the hung tier through both walls, a ramp skip to the crown and back. One wall's note is in most of them around the opening aim. A player will hear variation inside a family resemblance.

It reads as one structure: two ramps, a wall, and a second wall with a crown. The cost is in the tools, not the shape. Build cannot place it, the launch and flight cameras were not designed for 15 m, and labels do not name a tier.

**Would a careful flat field do as well?** It does about half. The flat control more than doubles Loop's three-to-five share (29.7% against 12.7%) and cuts the collapse rate on a step from 34% to 20%, with pieces the editor already has. That is available now, with no schema change. It does not reach the elevated world (55.0%, 10%), and it is still silent on an eighth of the block.

Two things in the brief's premise did not hold up:

- *A distant wall first, then a descent.* Half right. The hung rows on the far wall do start the descent lines, and pitch falls with the ball on the widest of them. But most lines around the opening aim start on the near wall or a ramp, and the far wall itself is the least-used surface.
- *Gravity as the engine.* Gravity is the clock that ends the line. It is not what makes it. What makes it is two facing walls close enough to cross several times before the clock runs out. Height matters because it puts a second pair of faces where the higher arcs are, and a lean matters because it sends a ball that would escape back down. Lift alone was not worth more than rearranging the flat pieces.

**Recommendation.** Play the flat control and the elevated world side by side before deciding anything about the schema. If the flat control already feels like the improvement, keep it and leave the document format alone. If the crown is what makes it, the extension to keep is small: lift and tilt on plates only, as built here, plus the Build controls and camera work listed above. Either way, the parallel-gap idea is worth carrying back into Ricochet Garden.

## What is not verified

- Enjoyment, and whether the lines sound musical. No one has played it.
- A physical phone, touch aiming, and playback on a real speaker. The browser pass was headless Chrome with SwiftShader.
- Legibility in flight. The follow camera passes between the walls before the result view takes over.
- The result view on a portrait phone. In the 390×844 capture the hung rows are behind the camera buttons.
- Aims outside the three sets: yaw beyond ±30°, charge below 0.30 or above 0.90, elevation above 50°, and origins other than the five sampled.
- Whether the flat control is the best flat layout. About ten were tried.
- Whether a different tuning of the same pieces would vary more. Voices are sound only and were set once.
- The audio figure is a bound, not a measured peak.
- Build mode with an elevated plate that is not fixed. The model keeps the pair through an edit and a layout merge, and tests cover that, but no one has dragged one.

## Reproduce

```
node docs/experiments/foundry/descending-resonance/repro/reproduce.mjs
node docs/experiments/foundry/descending-resonance/repro/reproduce.mjs --only families
node docs/experiments/foundry/descending-resonance/repro/explore.mjs
node scripts/foundry/validate.mjs worlds/foundry/descending-resonance worlds/foundry/descending-resonance-flat
node docs/experiments/foundry/descending-resonance/repro/browser-check.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
```

The first command takes about six minutes and rewrites `repro/results.json` and `repro/shots-broad.json`. `results.json` holds every table above, the preset hash and world-identity hash of each arrangement, and a SHA-256 of each sweep's reduced rows, so a re-run can be compared without storing 100,000 shots. `shots-broad.json` holds every broad-grid shot for all five arrangements: aim, ledger order, phrase, and terminal.

| Arrangement | Preset SHA-256 | World identity SHA-256 |
| --- | --- | --- |
| Elevated | `c6cb821fce4a…a53a72` | `5d230f89f21e…1f8e4e` |
| Flat control | `b0b048e2b4a6…0509d7` | `31a5133741c6…10d09d` |
| Loop | `14f443d0bafd…806210` | `7080477ee51f…307a27` |
| Lift only | `2683e03eb476…b21cbb` | `60c9f9a15563…ffaa1a` |
| No tiers | `6b05c4c2798d…209b73` | `968ba295bcec…b2cc15` |
