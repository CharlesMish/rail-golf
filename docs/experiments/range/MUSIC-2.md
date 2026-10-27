# Musical Workshop — bank dynamics

Branch `lab/wc-range-music2-20261025`, from `lab/wc-range-music-20261025` at `6ac83e3ff73c9cf72f47f0b5009aa9036557c5e4` (draft PR #54).

`lab/wc-range-clockwork-20261025` at `3aede12c35154352b444ec65d41395011b9b8b1b` was not modified and is not an ancestor of this branch. The merge-base of this branch with that commit is `6cf951576d29cd051109d119e1d11381aeae0450`. Clockwork stays a sibling.

Route `/lab/worldcraft`. No merge, no production deploy, no pull request against `main`. The pinned non-production preview for `e5af421625ed5835832094a03d64acc1d3eb6940` is [https://900e1d9c-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://900e1d9c-rail-golf.charlesmish.workers.dev/lab/worldcraft). It is not `rail-golf.cmish.dev`.

The sitting that omits the measurements is [PROTOCOL-MUSIC-2.md](PROTOCOL-MUSIC-2.md). The parent record is [MUSIC.md](MUSIC.md).

## What changed

Musical Workshop now takes gain from the projectile's speed along the contact normal, measured before the solver step, instead of from the projectile's total speed after the step. The knee is 32 m/s. The old total-speed knee stays 22 m/s and is still what every other preset uses, including Back Pocket, Soft Landing, Resonant Phrase, and Travelling Bell.

There is no dynamics control in the panel. The timeline needs the phone width. `setDynamics` selects `normal-speed` only when Musical Workshop fires, and `total-speed` otherwise. A shot that is already in flight cannot change mapping.

On the amber (previous) trail, Musical Workshop draws a marker at each recorded piece contact, labeled with the note and the contact time. **This shot** and **Previous shot** list the notes and the elapsed time between them. Markers and the timeline are in memory. They are not written into a kept line. Leaving the preset disposes the marker meshes.

No piece was added. Restitution, friction, mass, radius, gravity, charge mapping, first-kiss, and first-ground are unchanged. The opening terminal on the parent shot is still `[0, 0.43, 91.884]`.

## Two jobs for this workshop

A free sound playground wants the open movable trio and the surprise of a flight that rings whatever it actually hits. That job does not need another piece, and it does not need a rehearsal shot. The interface for it is the existing impact line plus the velocity-sensitive gain.

A composition instrument wants a person to place a phrase on purpose and see the last attempt while aiming the next one. The interface for that job is the amber trail, the contact markers, and the note timeline. Another pitch would eventually let a phrase pass three notes. That is a layout experiment, not this one. One more plate would be a single static body and an existing prefab, and it was not added: it would change the known opening, crowd the yard, and it would not make the bank easier to hit.

## Contact callback

The Havok plugin steps the world, syncs transforms, then notifies collisions. `getLinearVelocity()` inside the callback is the post-step velocity. The projectile observable on this plugin delivers `COLLISION_STARTED` and `COLLISION_CONTINUED`. `COLLISION_FINISHED` was not observed. The event fields seen on every traced shot were `collider`, `colliderIndex`, `collidedAgainst`, `collidedAgainstIndex`, `type`, `point`, `distance`, `impulse`, and `normal`.

`point` and `normal` are reused vectors. The runtime copies the components during the callback. On the traced piece contacts the normal length stayed within about `1e-7` of 1. The other body's speed was 0. Impulse is one scalar shared by both bodies.

The runtime copies `getLinearVelocity()` into `flight.acousticIncoming` at the start of `beforeStep`, before the step. Face speed is the absolute value of that copy dotted with the unit normal from the opening callback. Gain is fixed then. Later callbacks inside `5/120` s only increment the callback count, as before.

That opening impulse is not a stable measure of the strike. Across 51 grouped piece impacts, 16 had a later impulse more than 5% above the first. On the square bank at charge 0.5 the first callback reports 3.86 N·s while the face speed is still inward (`signed` normal +24.01 m/s before the step, +21.43 after). One frame later, `COLLISION_CONTINUED` reports 62.97 N·s and the signed normal goes to −20.63 m/s. On the same bank at charge 0.55 the first callback already has post-step speed 2.91 m/s and impulse 38.66 N·s. Post-step speed along the normal is often ~0 after a resolved hit, so it was not used as gain.

Max impulse over the hold, divided by mass 1.5 and passed through the same 32 m/s knee, separates a graze from a square hit on this grid and its bank median sits next to the face-speed median. It was not selected. The large impulse is sometimes one frame late, and the live note is scheduled from the opening callback. Waiting, or revising a gain after the sound has started, is a different ear.

## Level distributions

Real Havok, NullEngine, 120 Hz, substep `1000/120`, gravity 12, mass 1.5. Seed `20261025` is provenance only. The grid is in [appendix/music2/contacts.json](appendix/music2/contacts.json): bank yaw and lateral offset at charge 0.5, a square-bank charge sweep, four ramp yaws, and a plate yaw/offset lattice. Hits with post-step speed under 1 m/s are excluded. dBFS uses a Chrome `OfflineAudioContext` calibration: one timber impact at gain 1 peaks at −5.22 dBFS, one metal impact at −6.19 dBFS. Halving the gain dropped timber by 5.96 dB and metal by 6.01 dB. Reported levels are that unity peak plus `20 log10(gain)`. They are single-note peaks, not a mix of overlapping partials.

| Piece | Mapping | n | min dBFS | median | max | spread |
| --- | --- | --- | --- | --- | --- | --- |
| Bank (timber) | total speed | 33 | −33.34 | −5.35 | −5.22 | 28.11 |
| Bank (timber) | face speed | 33 | −43.43 | −9.50 | −5.22 | 38.20 |
| Bank (timber) | first impulse | 33 | −52.76 | −20.97 | −6.13 | 46.63 |
| Ramp (metal) | total speed | 4 | −12.07 | −6.50 | −6.20 | 5.88 |
| Ramp (metal) | face speed | 4 | −15.41 | −12.40 | −8.24 | 7.18 |
| Plate (metal) | total speed | 9 | −20.72 | −9.73 | −6.19 | 14.53 |
| Plate (metal) | face speed | 9 | −16.18 | −9.07 | −7.66 | 8.52 |

Bank misses on this lattice: 6. Plate misses: 3. Ramp misses: 0. The ramp and plate lattices are small.

Total-speed bank gain runs from 0.039 to 1.00, median 0.985. The loud end is saturated: a graze and a square hit at similar total speed both sit on the knee. Face-speed gain on the same hits runs from 0.012 to 1.00, median 0.611. Fast square hits still reach 1. Grazes stay quiet and audible. The mapping was not flattened to a constant.

The pair the test locks is charge 0.5, elevation 12, bank at z 24. Square, yaw 0, x 0: post-step speed 21.78 m/s, face speed 24.01 m/s, total-speed gain 1.000, face-speed gain 0.844. Graze, yaw 85, x 1: post-step speed 24.40 m/s, face speed 2.09 m/s, total-speed gain 1.000, face-speed gain 0.012. The total speeds differ by about 11%. Under total speed the graze is the louder of the two. Under face speed it is the quieter. Repeating either mapping, and swapping mapping, matched every sample with `Object.is`.

Charge 0.55 on that square bank is the inversion the owner heard from the other direction. Post-step speed is 2.91 m/s, so total-speed gain is 0.048. Face speed is 25.82 m/s, so face-speed gain is 0.903. The ball has already given its speed to the wall, and the old ear reads what is left.

The opening, elevation 18, charge 0.55: ramp face speed 16.99 m/s (total-speed gain 0.987, face-speed gain 0.546), then plate face speed 17.49 m/s (0.357 and 0.570). Total speed makes the ramp loud because the tangential speed remains, and the plate quieter because the hit is more head-on. Face speed puts those two notes near each other.

Unity peaks are already under −3 dBFS, and live gain does not exceed 1, so a single note stays under that ceiling. The rendered phrases below were checked on the file: no sample reached the 16-bit rail, and no saved peak passed −3 dBFS.

## Level-matched renders

Same shot, both mappings, Chrome `OfflineAudioContext` at mix 1. Each pair is scaled so the RMS matches, then one shared factor puts the hotter peak near −6 dBFS without passing −3. The contour inside a file is unchanged. A one-note shot then has the same envelope; its raw peaks are the level difference. Listening was not done. These files are not a claim that the result is musical.

| File | Shot | Mapping | Raw peak | Saved peak |
| --- | --- | --- | --- | --- |
| [graze-bank-total.wav](audio/music2/graze-bank-total.wav) | graze bank then ramp | total speed | −5.41 dBFS | −6.00 dBFS |
| [graze-bank-normal.wav](audio/music2/graze-bank-normal.wav) | graze bank then ramp | face speed | −9.64 dBFS | −7.94 dBFS |
| [square-bank-total.wav](audio/music2/square-bank-total.wav) | square bank, charge 0.55 | total speed | −31.40 dBFS | −7.65 dBFS |
| [square-bank-normal.wav](audio/music2/square-bank-normal.wav) | square bank, charge 0.55 | face speed | −6.14 dBFS | −6.00 dBFS |
| [opening-total.wav](audio/music2/opening-total.wav) | opening ramp then plate | total speed | −7.09 dBFS | −6.00 dBFS |
| [opening-normal.wav](audio/music2/opening-normal.wav) | opening ramp then plate | face speed | −11.92 dBFS | −8.62 dBFS |

The graze pair is two notes. Total speed plays a loud C4 then a D4. Face speed plays a quiet C4 then a D4. The square pair is one note, so after matching the files are the same knock at a similar level. The raw peaks, −31.40 and −6.14 dBFS, are the mapping. The opening pair keeps a relative balance: total speed leans on the ramp, face speed brings the plate up beside it.

Sidecars record branch, git SHA, both parent SHAs, preset, setup, objects, seed, both gains, raw and matched peaks, the RMS scale, and the ceiling. `gitSha` is `fe5955825f5948dd2971def24e19c7a3c849cc18`, the commit that contains the mapping, the shots, and these wav bytes. The renderer had read the parent `6ac83e3ff73c9cf72f47f0b5009aa9036557c5e4` because that commit did not exist yet. The solver does not read the git SHA. A later sentence that only records the preview URL does not change the wav bytes.

## Browser

Headless Chrome, SwiftShader, local dev server. Desktop 1400×900 and a 390×844 viewport.

Musical Workshop, two fires of the opening, then one **Survey**. **This shot** and **Previous shot** both read `D4 1.42s`, `3.03 s`, `E4 4.46s`. Two amber markers sat on the previous trail, at the ramp contact and the plate contact, labeled with the note and the time. A second survey click was not made: leaving survey from a result clears the round.

The phone viewport was 390×844. Both timelines fit (344 px wide) under **Ready again**, and a contact marker remained in the view. Switching to Fixed Shot Workshop left contact markers at 0, note timelines at 0, live bodies at 0, and active audio voices at 0.

Screenshots: [desktop-timeline.png](screenshots/music2/desktop-timeline.png), [desktop-amber-markers.png](screenshots/music2/desktop-amber-markers.png), [phone-timeline-markers.png](screenshots/music2/phone-timeline-markers.png).

## Rehearse — not built

An opt-in Rehearse would run the deterministic Havok step as an audition. It would be distinct from a committed shot and from history, and it would never appear in Back Pocket, Soft Landing, Resonant Phrase, or Travelling Bell.

It is not worth building on this pass.

The cost is a second headless sim, or a fire that must not latch the amber trail, the kept line, or the previous-shot markers. The determinism risk is real if that sim reuses the live Havok world and fails to restore it. Musical Workshop is static, so a duplicate would match a commit only while nothing else moves. The travelling bell is the counterexample already on this route: a second sim at the wrong phase would not be the shot the player is about to commit. UX separation has to be obvious, because a trail left by an audition would be read as the previous shot.

What it would show is the note timeline of an aim before that aim is committed. The timeline and the amber markers already show the last committed shot while the next one is aimed. A later experiment could play recorded impacts, the way **Hear** does, without drawing a committed trail. That would stay out of the sporting presets. It was not built here.

## Preview

Pinned non-production version for `e5af421625ed5835832094a03d64acc1d3eb6940`: [https://900e1d9c-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://900e1d9c-rail-golf.charlesmish.workers.dev/lab/worldcraft).

Workers build `c7c884e5-891d-4203-a355-62a1cde7e6ef`. Version `900e1d9c`. That version's bundle contains `Musical Workshop`, `normal-speed`, and `e5af421`. `/lab/worldcraft` returned 200. The branch alias [https://lab-wc-range-music2-20261025-rail-golf.charlesmish.workers.dev/lab/worldcraft](https://lab-wc-range-music2-20261025-rail-golf.charlesmish.workers.dev/lab/worldcraft) follows later commits on this branch. The `900e1d9c` URL stays on `e5af421`. A later commit that only names this URL does not change the workshop, the shots, or the wav bytes. Its own per-version preview is recorded on the draft pull request when Workers Builds publishes that commit. This is not `rail-golf.cmish.dev`.

## Not established

- No one listened. Musical quality, pleasure, and whether the face-speed contour is the one a person wants were not judged.
- The browser pass is headless Chrome with SwiftShader, not a handset GPU and not a person holding the phone.
- The dBFS columns are single-note peaks inferred from gain after a two-point linearity check. Overlapping partials in a real phrase can sit above or below that sum. The six saved files are the measured phrase peaks.
- The ramp lattice is four yaws and the plate lattice is twelve aims. They compare the two mappings. They are not a search of the yard.
- Listening on the pinned preview was not done. The preview was fetched: `/lab/worldcraft` returned 200, and the worldcraft bundle contains `Musical Workshop`, `normal-speed`, and `e5af421`.
