# Integrated Mill Diverter lab

Entry: `/lab/courtyard-diverter`, linked from Practice Range. This is an experimental destination, not Card 04. It uses `buildCourtyard` and the existing courtyard ground, target, and station rendering, with an additive switch/floor overlay. Normal progression and the lab use separate record and shot-library keys.

## Frozen control and shared machinery

Cards 01–03 keep their authored records, geometry, launch rules, targets, and scoring. The deliberate exception is the existing Skip Pad: its original position, dimensions, recovery speed, and zero forward kick now apply to all courtyard cards and the integrated lab. Its geometry is rendered by the shared yard builder. The original swept descending-pad contact and vertical recovery impulse are retained; this pass does not replace them with a new passive collider or retune them. The impulse acts on the real Havok projectile. It has no destination input and does not turn a backwards shot around.

Only Delivery can earn Delivery routes. Other cards retain `boost` as mechanism/line evidence. Sky-token collection remains Delivery-specific. Existing bank, mill roof, corner, and lumber colliders are unchanged, including their restitution and friction. Extreme legitimate rebounds are not filtered.

## Physical overlay

The new timber sorting floor sits beyond the bank corridor, beside the mill's loading area, with Dispatch Bay farther into the working yard. One shootable switch connects visibly to the floor. A is level; B is a sideways tilt. This is intentionally different from the isolated lab's fore/aft tilt. Both use a static Havok box with the same material parameters. State changes replace the physical box after the current physics step, never during a contact callback. No scripted reflection, hidden target force, wind, or dynamic hinge is added.

Switch transitions require contact with the actual switch body and happen once per projectile. Floor evidence requires actual top-face contact transformed into the floor's local coordinates. The overlay records real bank/tread/mill contacts alongside floor state and pad events. The normal yard's contact rules remain intact; the experimental destination uses the successful isolated lab's actual target/ground/tee contact ruling. Contact with an inactive landing disk is a miss, not Dispatch Bay credit.

Retry keeps the current environment. Reset Card and fresh entry restore A. Saved successful and interrupted lines record both launch and ending state; Recall explicitly restores the launch state before the player fires again. Invalid/missing lab state cannot silently load as a valid recalled line.

The card says only: “The mill diverter can be switched. Land on Dispatch Bay.” A/B labels remain visible. Angle consequences and QA setups are not explained in the playable UI.

## HEADLESS authority

The integrated harness uses the same courtyard scene builder and the same switch/floor controller as the browser, with the production projectile and fixed Havok timestep. Coverage establishes:

- ordinary clears in both states;
- floor-assisted clear neighborhoods in A and B;
- the same launch producing different successful rebounds with the two actual collider transforms;
- real A→B and B→A switch hits over neighboring setups;
- retry persistence, reset/fresh-entry default, storage round trip, and reproducible state-aware recall;
- the unchanged Skip Pad acting on Gallery and reverse-direction Lumber Walk shots without Delivery route awards;
- production route isolation and build identity.

Reference setups live only in source/test fixtures for Rail Rat's Mode B. Do not include them in a Mode A handoff. Local browser preview could not start because of the environment's network-interface restriction; HEADLESS validation is not a browser visual/touch claim.
