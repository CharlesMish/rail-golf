# Travelling Tee v1 — origin track comparison

Route: `/lab/travelling-tee`.

Exact v0 experiment pack: `ca1cc8fa101dba04520b7930f8c0eae8e918cf04`. The accepted Mechanism Range, Timber Courtyard and Open Line remain unchanged. This variant continues to reuse the actual Mechanism Range world, materials and launcher presentation. No terrain, scoring, target or physical projectile rule changed in this lane.

## Four origin modes

| Mode | Origin authority | Movement |
|---|---|---|
| 3 RAILS | −4 / 0 / +4 m | Incumbent three rail positions. |
| 5 STOPS — default | −20 / −10 / 0 / +10 / +20 m | Wider discrete positions. |
| FREE / STOPPED CARRIAGE | −20 through +20 m, half-metre adjustment | Selected before firing, then stationary. |
| TOUR | Same track; exact captured position | Travels at 2 m/s, reverses at each end; 40 seconds for a full cycle. |

The origin controls show the signed current lateral position and the extent of the track, with a last-origin reference. **Return to last origin** restores the previous shot's origin context without replacing current yaw, elevation or power. **Recall last line** remains the complete setup/environment restore.

TOUR is a separate input experiment. Selecting it starts travel from the current origin. The player can aim and charge while travelling. Release captures the current world position, including elapsed time since the last rendered frame. No quantization to half-metre slider increments is applied to TOUR records. The projectile receives the incumbent impulse at that captured position, with **zero inherited carriage velocity**. Normal flight framing takes over and track movement freezes for the launched line.

## Recovery is deliberately exact

Retry and Recall park TOUR at the recorded launch origin and direction. The player can fire again from exactly that point, or explicitly **Resume TOUR**. This makes a repeatable attempt possible without racing a continuously moving recovery screen. Recall still restores starting Transfer state and exact power. Retry retains the current Transfer state and existing MAX semantics. Reset restores the center five-stop comparison and Transfer A.

Manual TOUR positioning pauses the carriage. Survey and window-focus loss do not accumulate hidden movement. The directional running/paused state is explicit in the origin controls. None of these controls changes projectile mass/radius/material, gravity, charge curve, yaw/elevation envelope or launch speed.

## Mechanical evidence

Seven new focused checks plus all nine v0 checks pass in real-Havok/NullEngine and pure setup authority:

- Tour endpoints, direction changes, speed and complete-cycle period.
- Equivalent elapsed time partitioned over different frame counts reaches the same origin to floating-point tolerance.
- Charging continues travel; launch captures release position rather than charge-start position.
- Flight, result, Survey and paused states cannot advance the origin.
- Return-to-origin preserves the player's current aim/elevation/power; Retry/Recall pause at the exact recorded origin.
- FAMILIAR framing translates with the exact origin without changing the aim vector or muzzle-relative equipment arrangement.
- A real TOUR fire spawns the actual Havok projectile at the recorded muzzle and has exactly the same first-step velocity as the equivalent stopped launch. Retry/Recall reproduce terminal time, position, contacts and qualified evidence, and can fire again.

Existing wider-origin bench/table/rack relationships and center-origin Mechanism Range equivalence remain green. All reference shot setups stay in source fixtures rather than player-facing copy.

## What remains a player question

Five stops remains the easiest deliberate comparison. FREE may supply useful fine origin choices or merely more search effort. TOUR tests the pleasure of choosing release position while aiming/charging; it does not establish that timing belongs in the core game. The platform does not contribute momentum, so a successful comparison isolates origin timing alone.

Human rendered review is still needed for track-control legibility, camera comfort during travel and whether holding charge while moving invites a new line idea rather than an input burden. No rendered-playability claim is made from NullEngine evidence.
