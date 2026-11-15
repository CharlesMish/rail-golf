# Chime Amphitheater — phase 2, curved terrace

Lab experiment, continued on `lab/wc-exp-20261114-chime-amphitheater`. The bowl and this measurement are commit `454d1cf8a4fa43dc67e84641515c96fddb4474ac`. Phase 1 (Two Tiers and the other plate sketches) is unchanged. Physics, restitution, friction, gravity, the projectile, charge-to-speed, elevation mapping, first-ground termination, and the synthesis engine were not changed. Chime Terraces, Descending Resonance, Railyard, Timber Courtyard, and Free Play were not edited. The v1 export hash stays `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

Seed `20261114` is recorded and not applied. Dynamics are face speed. The grid is the same 875 shots: yaw −24° to 24° step 2°, elevation 8, 12, 16, 20, 24, 30, 40, charge 0.35, 0.45, 0.55, 0.65, 0.8, origin x 0, rail 1. An audible event merges onsets within 150 ms. A family is the first three distinct sounding pieces after immediate repeats collapse. A nudge is yaw ±0.5°, elevation ±0.5°, charge ±0.01. Each world used a fresh Havok runtime.

## Step 0 — a tread is not first ground

`lib/mechanism-range-session.js` sets `flight.ground` only when the contacted node's `metadata.rangeGround` is true (the collision callback), and the next `afterStep` then finishes with reason `first-ground-contact`. In `lib/worldcraft-scene.js` only `worldcraft-ground` and `worldcraft-tee` set that flag. A piece mesh does not. The worldcraft contact adapter does not set it either.

A real shot onto a horizontal timber plate (`docs/experiments/chime-amphitheater/gate.mjs`, and the terrace test) records the piece first and ends later on the ground or the tee. The line is not closed by the piece. This was not a reason to stop, and the rule was not changed.

## The piece

One lab-only kind, `terrace`. It is not in `WORLDCRAFT_CATALOG`, so the palette cannot place it, and `validateWorld` rejects it unless its id is locked. An annular sector: inner radius, tread depth, riser, arc span, elevation, centre (`x`, `z`), and facing (`yaw`). Local angle 0 is the facing direction. The solid runs from `elevation - riser` up to the tread.

Facets are 12°. The chord sagitta is `R * (1 - cos(6°))`. At the outer radius used here, 18 m, that is 0.099 m, about an eighth of the 0.86 m ball, so the inner corner is not a pocket the ball can fall into. Tread tops of one step are coplanar, so a joint is not a lip. Facets meet on a shared face (`seamOverlapM` is 0). A radial overlap pushed one step's chord through the next step and failed validation, so the seam is not overlapped.

Each facet is one convex hull with the resonant plate's friction 0.18 and restitution 0.86. Voice is timber or metal from the existing scale. Every facet of one step is named `worldcraft-object-<id>`, so the ear treats the step as one piece. No `rangeGround`.

A station may set `launcher.z` (10..90) and `launcher.yaw` (−180..175). Omitted, the station stays the apron at z 0 facing downrange, and those keys are absent from the export. A recorded line must match that station. Existing worlds still require z 0 and yaw 0.

## The bowl

Six concentric steps, centre (0, 32), facing −180 so the aisle points back at the apron. Span 228° (one facet wider than a semicircle on each end). Tread depth 2 m. Exposed lip 0.5 m. Each step is filled down to the ground (`riser` equals `elevation`), so the hill is solid rather than a floating ring. Tops are 0.5, 1.0, 1.5, 2.0, 2.5, 3.0 m. Inner radii 8, 10, 12, 14, 16, 18 m. A 12° gap drops the centre facet: about 1.7 m at the inner edge and 4.2 m at the outer rim. Timber, degrees C D E G A C. Outer rim near the apron is z ≈ 12, outside the launcher corridor. Side extent is about ±20 m.

Span 228° is 19 facets. The gap removes one. Six steps are 108 hulls, plus the ground and the tee: 110 static bodies.

Two foundry worlds use that same object list.

| World | Station | What the grid is aimed at |
| --- | --- | --- |
| Down the Aisle | apron, z 0, facing downrange | down the aisle, toward the stage |
| From the Stage | x 0, z 32, yaw −180 | from the stage, back up the seats |

The ±24° cone is the existing aim limit, measured from whichever station the world sets. Charge and elevation mapping are the existing ones.

## Havok, one step and the bowl

Contacts register per facet. Different aims on a single low step hit different facet indexes. Two solver callbacks on one facet collapse to one note. Speeds stayed finite (the fastest piece contact in the samples was under the launch speed, itself capped at 43 m/s). Disposing the runtime returned the physics body count to 0. Bodies with the bowl loaded and no ball in flight: 110.

The three-note aisle shot (yaw 8, elevation 8, charge 0.45) touched three facets, one per step: step 5 facet 8, step 2 facet 9, step 1 facet 8. Each normal was horizontal or within about 0.1 of horizontal, and the contact point was on the vertical face, not on the tread top. No shot in the probe crossed two facets of the same tread. There was no speed spike and no body left behind. The seam was not shown to snag, and it was also not shown to be slid across.

## The grid

Fresh runtime. Terraces reproduced the published audible split and the six-nudge stay rate, so the station fields did not move the control.

| World | Audible 0 / 1 / 2 / 3–5 / 6+ | Raw 3+ | Audible 3+ | Long families | Six-nudge stay (raw 3+) | One note then stop | Tee in the ledger |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chime Terraces | 159 / 170 / 335 / 211 / 0 | 295 | 211 | 83 | 0.5424 | 153 | 39 |
| Descending Resonance (fresh) | 220 / 332 / 158 / 163 / 2 | 168 | 165 | 42 | 0.4940 | 331 | 86 |
| Down the Aisle | 603 / 252 / 16 / 4 / 0 | 10 | 4 | 3 | 0.2000 | 232 | 24 |
| From the Stage | 715 / 160 / 0 / 0 / 0 | 0 | 0 | 0 | — | 122 | 165 |

Descending Resonance's published comparison was taken after other worlds on one runtime. This column is the fresh runtime: raw 3+ 168, audible 3+ 165, families 42. The published contaminated run was 166 / 164 / 41.

Down the Aisle, 875 shots: 603 never touch a step. 232 touch one step and then the ground or the tee. 4 shots make three audible notes. The clean line is yaw ±8, elevation 8, charge 0.45: step 5 C4, then step 2 E4, then step 1 D4, gaps 0.392 s and 0.167 s, then the ground. It skips two steps. A yaw of 8.5° at the same elevation and charge keeps only the outer lip. Two of the ten raw-3 shots survive all six nudges, and those two are yaw ±24, elevation 16, charge 0.35: a repeat on step 3, then step 4. Not the descent. The opening aim (yaw 0, elevation 18, charge 0.55) is silent and lands on the stage ground.

From the Stage: 715 silent, 535 of all shots leave the yard, 165 meet the existing tee. No shot makes two audible notes. 38 shots record two bodies inside 50 ms (median gap 0.008 s). The second gain on the recorded graze is about 10⁻¹⁸, so the ear's ledger has a second row and the sound is one knock. The inner three steps (tops 0.5, 1.0, 1.5 m) receive zero contacts. The opening aim leaves over the back of the yard with no contact.

Every one-note ending that was inspected continues to `worldcraft-ground` or `worldcraft-tee`. The first lip does not close the line. The line stops because the next thing the ball meets is the yard, or because the ball never meets a second lip.

## What the contacts are

On the three-note shot the normals are horizontal and the points sit on the riser, below the tread top. The ball is hitting the stone lip, then leaving. Restitution is still 0.86, so the lip kicks the ball off instead of dropping it onto the next tread. The 3 m hill sits under the higher elevations in this grid: elevation 18 at charge 0.55 from the apron goes down the aisle and lands on the stage without a touch. From the stage, the same aim clears the rim and the aisle and leaves the yard. That is the launch envelope and the low geometry together. It is not the termination rule, and it is not a seam.

The voice is the existing timber knock (decay 0.16 s). The WAVs are that knock. None of the six files reach the limiter ceiling (about 0.891). Peaks are 0.146, 0.299, 0.324 on the aisle and 0.024, 0.322, 0.281 on the stage.

## Cost

| | Down the Aisle | From the Stage | Terraces | Descending Resonance |
| --- | ---: | ---: | ---: | ---: |
| Static bodies | 110 | 110 | 23 | 14 |
| Meshes | 110 | 110 | 23 | 14 |
| Rebuild | 132–145 ms | 56–118 ms | 22 ms | 3 ms |
| Grid time | 138 s | 126 s | 11 s | 6 s |

In headless SwiftShader, idle frames on the bowl were a median 22 ms (aisle) and 24 ms (stage), max 28 ms and 41 ms, 236 draws. That is this machine's software GL, not a phone and not a player's GPU. No claim about a phone.

## What you hear, and why the runs stay short

Most contacts are one timber knock on a lip, then the ground. The few longer aisle lines are also lip contacts, and they do not survive a half-degree yaw step. From the stage the ball does not climb. The cause is the geometry plus the launch envelope: vertical lips, restitution 0.86, a 3 m hill, and a ±24° cone that either goes through the aisle or over the rim. The termination rule is not the cause. The camera is a separate limit: the result view is the existing side orbit, and the drawn rail stays on the apron even when the station is on the stage. The flight line is the real shot. The tools did record the contacts; they are not hiding a longer line.

## WAVs

Artifacts, not committed. Rendered by `render-bowl.mjs` through `renderResonanceWav` at the stored face-speed gain. Ceiling 0.8913. None clipped.

| File | Shot | Sequence | Peak | SHA-256 |
| --- | --- | --- | ---: | --- |
| `chime-bowl-aisle-descent.wav` | yaw 8, elev 8, charge 0.45 | step-5 C4, step-2 E4, step-1 D4 | 0.146 | `f3716ce0837b64f245e6925f9b35b2a0ca316c835311681f50398efa03c7ca55` |
| `chime-bowl-aisle-descent-yaw.wav` | yaw 8.5, elev 8, charge 0.45 | step-5 C4, step-5 C4 | 0.299 | `c67c140dd34189cff74334186935e29ffc0995dbc4e29a1d5302e915f18100a1` |
| `chime-bowl-aisle-outer-lip.wav` | yaw −24, elev 8, charge 0.45 | step-5 C4 | 0.324 | `451ba0986d97f8be4f2d312347b751bb7690ede7d0d512185b4b6360ee5e9f1d` |
| `chime-bowl-stage-outer-lip.wav` | yaw −24, elev 16, charge 0.35 | step-5 C4 | 0.024 | `0a22556a960a4ba9ffe31e679bbbf584a1870e84013eaf8f47056a317a85cdfc` |
| `chime-bowl-stage-step-four.wav` | yaw −24, elev 8, charge 0.55 | step-4 A4 | 0.322 | `e0de465542326f0f745f2403e5b7c44d6b291c253661e36706e5fe17f30df3b8` |
| `chime-bowl-stage-step-three.wav` | yaw −24, elev 8, charge 0.35 | step-3 G4 | 0.281 | `b8f50b78fb5db0501ad2e53d345202c9942f54ffd58a35a4e9ae7ed31a622ed0` |

## Not verified

Phone playback. A player's GPU frame time. Listening on speakers. A shot that lands on a tread and rolls across more than one facet. Horseshoe end walls. An owner guide.
