# Centre Stage — phase 3 appendix

Technical record for the play guide in [PHASE3.md](PHASE3.md). The playable world is **Centre Stage** (`chime-bowl-centre`) in Foundry, under Amphitheater sketches. Down the Aisle and From the Stage were not edited. Their files hash the same as on `2a9d09640c9443d75ec419521a529a3f0214903e`. The v1 export hash stays `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

Restitution, friction, gravity, the projectile, launch and charge mapping, the committed-shot rule, first-ground termination, and the synthesis, limiter, and levels were not changed. Railyard, Timber Courtyard, Free Play, Terraces, and Descending Resonance were not edited. No predicted trajectory was added. The aim mark is still the short muzzle spine.

Seed `20261114` is recorded and not applied. Dynamics are face speed. The grid is the same 875 shots as phase 2: yaw −24° to 24° step 2°, elevation 8, 12, 16, 20, 24, 30, 40, charge 0.35, 0.45, 0.55, 0.65, 0.8, origin x 0, rail 1. An audible event merges onsets within 150 ms. A family is the first three distinct sounding pieces after immediate repeats collapse; a shorter family is labeled `short:a>b`. Each world used a fresh Havok runtime. Six nudges, when a base exists: yaw ±0.5°, elevation ±0.5°, charge ±0.01.

## What was wrong with the station

The launch already read `launcher.z` and `launcher.yaw`. From the Stage was firing from (0, 32) at yaw −180. The picture did not. The rail mesh, the muzzle spine, the flight heading, and the address camera were drawn at the apron: carriage x, z 0, yaw equal to the aim slider alone. The survey orbit stayed on the yard centre. Save, the world-JSON export, and Make a Copy built `launcher: { x: originX }` and dropped z and yaw. A preset export through `retargetRangeOpening` already kept them. A kept line already required `launch.station` to match the world, and failed closed if the station was stripped.

`lib/worldcraft-station.js` is the one pose. The rail, the spine, the heading, and the address camera read `stationRailPosition`, `stationAim`, and `stationMuzzle`, the same calls the launch uses. A moved station (z or yaw present) puts the survey camera behind that facing, looking at the rail. An apron world still gets the old yard orbit, and an apron export still omits z and yaw. Save, export, Make a Copy, and the kept-line row use that stored launcher. The kept-line list prints the station when the snapshot has z or yaw.

Tests in `tests/worldcraft-station.test.mjs` fail if the drawn pose ignores station yaw, if the survey camera is not behind the facing, if a save, export, copy, or kept line drops z or yaw, or if the bowl files or the v1 hash change.

## Where Centre Stage aims

The pieces are the phase 2 bowl: six steps, centre (0, 32), terrace facing −180, span 228°, 12° gap, tops 0.5–3.0 m. The station is x 0, z 32, yaw −120. Terrace-local angle is world aim minus −180. Local 60° is the middle of one seating lobe. The solid arc is about ±6° to ±114° local; the gap is only the centre facet. Grid yaw −24° to 24° around station −120 is local 36° to 84°, all on the seating, and at least 30° from the aisle at world −180. The player's ±70° stops can still reach the aisle near the end of the slider. Station −180, the old From the Stage facing, aims through the gap. A coarse 40-shot probe before the grid gave −120 the most multi-body contacts of the facings tried (−180, −150, −120, −90, −60).

The opening aim (yaw 0, elevation 18, charge 0.55) still leaves the yard and touches nothing. It leaves over the seating, not down the aisle.

## Return, and riser versus tread

The stage centre in these counts is the terrace centre (0, 32), on every bowl.

- **inward:** after the first tier contact, some later sample is at least 0.25 m closer to (0, 32) than that contact point was.
- **lower:** a later contact is on a smaller step index.
- **stage:** a later ground or tee contact lands inside the 8 m inner radius.
- **returns:** inward or lower or stage.

A tier contact is a body named `worldcraft-object-step-N`. The face comes from the contact normal's y, on those bodies only. A strike is a tread when |ny| ≥ 0.7, a riser when |ny| ≤ 0.35, and oblique otherwise. A shot is that single kind, or mixed when more than one kind occurs. Strikes are an optional third argument on the harness and are not written into the kept contact.

## The grid

| | Terraces | Descending Resonance | Down the Aisle | From the Stage | Centre Stage | Shallow risers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Audible 0 / 1 / 2 / 3+ | 159 / 170 / 335 / 211 | 220 / 332 / 158 / 165 | 603 / 252 / 16 / 4 | 715 / 160 / 0 / 0 | 675 / 200 / 0 / 0 | 800 / 75 / 0 / 0 |
| Raw notes 0 / 1 / 2 / 3+ | 159 / 153 / 268 / 295 | 220 / 331 / 156 / 168 | 603 / 232 / 30 / 10 | 715 / 122 / 38 / 0 | 675 / 150 / 50 / 0 | 800 / 75 / 0 / 0 |
| Two or more tiers | 0 | 0 | 40 | 38 | 50 | 0 |
| Inward / lower / stage landing | 0 / 0 / 0 | 0 / 0 / 0 | 88 / 18 / 24 | 60 / 34 / 60 | 75 / 45 / 75 | 0 / 0 / 0 |
| Returns | 0 | 0 | 88 | 60 | 75 | 0 |
| Leave the yard / tee | 57 / 39 | 98 / 86 | 59 / 24 | 535 / 165 | 608 / 0 | 577 / 0 |
| Faces: tread / riser / oblique / mixed | — | — | 114 / 104 / 26 / 28 | 76 / 2 / 20 / 62 | 96 / 0 / 25 / 79 | 75 / 0 / 0 / 0 |
| Strikes: tread / riser / oblique | — | — | 330 / 264 / 68 | 292 / 88 / 72 | 383 / 116 / 95 | 208 / 0 / 0 |
| Steps with no contact | none | none | none | 0, 1, 2 | 0, 1, 2 | 0, 1, 2, 3 |
| Families / lone families | 87 / 43 | 47 / 23 | 8 / 0 | 6 / 0 | 6 / 0 | 2 / 0 |

Terraces and Descending Resonance are the unchanged controls. Their audible splits match the phase 2 fresh run (Terraces 211 at audible 3+, Descending Resonance 165). Bowl face counts are zero there because those pieces are not named `step-N`. Down the Aisle still has 4 shots at audible 3+. From the Stage still has no shot with two audible notes, 535 leaving the yard, and 165 hitting the tee.

Centre Stage puts the same ±24° grid on the seating. Tee contacts go from 165 to 0. Shots that touch two tiers go from 38 to 50, and returns from 60 to 75. All 50 of those two-tier shots are one audible event. The richest pattern is two outer steps whose onsets are the same solver time, or 50 ms apart. Both are inside the 150 ms merge, so the ear gets one knock. There is no audible 2 and no audible 3. The inner three steps still get no contact. The 200 sounding shots are families of at least three aims (`loneFamilies` 0). They are not lone aims.

Nudge bases are the two-tier or audible-2 shots, up to 36, with at most 24 of the one-note two-tier shots. Centre Stage and From the Stage each had 24 such bases, all one-note. `audible2Stay` is the share whose six nudges keep at least `min(base audible, 2)` notes. For these bases that floor is 1, so 1.00 means the nudge still makes one note. It does not mean two notes survive. `allSixSameFamily` is 0 on both. `anyNudgeSameFamily` is 1. `loneAim` is 0. A half-degree or one-percent nudge does not keep the piece order.

## The shallower copy, and why pitch was not added

The corrected stage is still one audible note on every shot that sounds. The one geometry comparison is a copy, `docs/experiments/chime-amphitheater/variants/chime-bowl-shallow.json`. Same radii, span, gap, voices, station, and facing. Risers and tread tops are half: 0.25, 0.5, 0.75, 1.0, 1.25, 1.5 m. The terrace grid now allows a 0.25 step so that copy can load. The 0.5 bowl values stay on the grid. Friction and restitution are unchanged. The copy is not in Foundry.

On the same 875 shots it is quieter. Audible notes fall from 200 to 75. Two-tier contacts, inward samples, lower steps, and stage landings are all 0. Every sounding shot is a single tread on step 4 or step 5. Step 3, which Centre Stage does reach, is untouched. No base qualified for the nudge set, because nothing had two audible notes or two tiers.

A tread pitch was the allowed second change, only if this copy showed the ball on a tread traveling outward in a way a slope would change. It does not. The contacts that remain are single tread strikes with no return. Centre Stage already has more tread strikes than riser strikes (383 against 116) and still one audible note, including the two-step grazes, which are mixed faces at one instant rather than a roll down a slope. Pitch was not added. The geometry stops here.

Centre Stage is the playable world because it is the better of the two stage-facing arrangements on the owner's counts: more two-tier contacts, more returns, no tee hits, and the grid is on the seating. It does not make a second separate note.

## Camera

Play from Foundry opens the survey. For a station with z or yaw, that orbit sits behind the facing and looks at the rail. Down the Aisle still uses the yard orbit, and its rail stays at z 0. Address, one toggle from that overview, eases to the station address pose: 15 m behind the rail at y 7.8, looking 34 m ahead at y 3.6.

In the headless lab (1280×800, SwiftShader), the one-lip shot and the silent opening were sampled during flight. All 6 samples of the one-lip shot and all 3 of the opening had the ball in front of the camera and inside the frame (normalized screen at most 0.95 and 0.91). That is a sparse sample, not every frame.

## Cost

Harness numbers are one fresh runtime per world. Browser numbers are the lab at 1280×800 on SwiftShader, median of the idle frame samples after the world was open. Dispose is the physics body count after `runtime.dispose` and before the scene is disposed.

| | Harness rebuild | Browser rebuild | Median frame | Max frame | Draws | Static bodies | Facets | Dispose after runtime |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Terraces | 20.4 ms | not re-measured | — | — | — | 23 | 0 | 0 |
| Descending Resonance | 2.7 ms | not re-measured | — | — | — | 14 | 0 | 0 |
| Down the Aisle | 67.4 ms | 112 ms | 24.1 ms | 34.3 ms | 236 | 110 | 108 | 0 |
| From the Stage | 59 ms | 112 ms | 30.4 ms | 48.6 ms | 236 | 110 | 108 | 0 |
| Centre Stage | 57.4 ms | 140 ms | 31.4 ms | 35.9 ms | 236 | 110 | 108 | 0 |
| Shallow risers | 90.1 ms | 108 ms | 28.9 ms | 31.9 ms | 238 | 110 | 108 | 0 |

The shallow harness rebuild is the first world in its own process. Centre Stage's 57.4 ms was after the other bowls in the same process. Both load 110 bodies and 108 facets. Grid time was 4.2 s, 3.3 s, 160.2 s, 148.3 s, 149.1 s, and 127.7 s in the table's order.

The five rendered shots peak at 0.060, 0.409, 0.281, 0.471, and 0.530. The ceiling used by the render is 10^(−1/20), about 0.891. None are marked clipped. Synthesis was not changed.

## Recordings

`renderResonanceWav` at the stored face-speed gain, timber voices, mix 1, 44100 Hz. The files are artifacts, not committed. Rendered while HEAD was still `2a9d09640c9443d75ec419521a529a3f0214903e`; this branch does not change the synthesis path. Times are onset seconds.

| File | SHA-256 | What it is | Peak |
| --- | --- | --- | --- |
| `chime-bowl-centre-one-lip.wav` | `256e5668fd81a682ce8a3d21059c191735acc355574198e2ea51a0b87b887215` | yaw 0, elevation 12, charge 0.35. step-4 A4 at 0.575 s. | 0.0597 |
| `chime-bowl-centre-same-instant.wav` | `3663833fa5873c379fea497b69781ef92189efc7852692a4d0337fe43bb78fef` | yaw 0, elevation 8, charge 0.45. step-3 G4 and step-4 A4 at the same 0.458 s. | 0.4095 |
| `chime-bowl-centre-closer.wav` | `4ada677f52dff6eb8f6ae92499f74c05067bf935caf5390c330c18bd58baab75` | yaw −24, elevation 8, charge 0.35. step-3 G4 at 0.442 s, then closer to the stage centre. | 0.2810 |
| `chime-bowl-centre-outer-tread.wav` | `39f33c3a675ac366de2d431ffc9a920f8318f99b9c6152243679a1d2ef6acd71` | yaw −24, elevation 8, charge 0.8. step-5 C4 at 0.350 s, a tread, then out of the yard. | 0.4715 |
| `chime-bowl-centre-two-lips.wav` | `836cadcd3f333bb0c7b448c7af270bbc9e48e77404e51426b1339b9a2cfbfd79` | yaw −24, elevation 8, charge 0.65. step-5 C4 at 0.408 s and step-4 A4 at 0.458 s, one knock. | 0.5298 |

## Seating, as a recommendation only

The line that would justify a different seating did not show up, so the facets were not merged and the steps were not redrawn. Each step is already one named piece: 18 hulls share `worldcraft-object-step-N`, and the ear treats them as one voice. A merged hull would be a physics change, not a paint change, and this measurement does not say it would separate the notes. The 12° facets stay.

## What this pass did not verify

- A phone, or any viewport other than the 1280×800 lab window.
- A player GPU. Frames were SwiftShader in headless Chrome.
- Every frame of a flight. The follow check is 6 samples and 3 samples.
- Listening. The peaks are measured. Nobody heard the files in this pass.
- Terraces and Descending Resonance frame time and draws. Their physics counts were re-run; the browser cost was not.
- Production. Nothing was deployed to the production host.
- A tread pitch. The shallow copy did not justify it, so it was not built.
