# Across the Yard: route collection

This iteration responds to playtesting: a legal first mechanism contact should
lead into a readable and rewarding second arc, and discovered shots should be easy
to repeat. The original four-card range remains a reference. Work is concentrated
on the shared courtyard.

## Rules

- Normal target clears still unlock the gallery immediately.
- Direct: no solid/mechanism contact and no other route collected before landing.
- Sky: enter the gold token's visible spherical halo, then land on Mill Bell.
- Skip: descend onto the violet pad, receive its physical kick, then land on Mill Bell.
- Mill: physically collide with the mill wall, structural columns or roof, then land on Mill Bell.
- Collect the four routes over separate shots for Yard Explorer. Multiple route
  events may be banked together if that same shot lands. Misses bank no routes.
- The route book is separate from best-stroke scoring and challenge unlocking.
  Historical clears are not retroactively assigned an unknown route.

Saved winning lines contain rail, yaw, elevation and power. Recall restores the aim
and displays the saved charge marker; the player still charges and fires. It does
not fabricate a historical trail. The most recent success updates that route's line.
Records are validated on load and stored under `rail-golf-delivery-routes-v1`.

## Physical authorship

Mill Bell radius increases from 6 m to 8 m. Existing bank and mill geometry, their
restitution and the projectile's mass/speed mapping remain unchanged.

The new pad occupies x ±6 m and z 78–90 m. Its visible top matches its y=0.5 contact
volume. The swept sphere meets that surface just before the existing first-kiss
plane. A descending hit resets vertical velocity to +10.5 m/s and adds no horizontal
kick. Incoming horizontal direction/speed remain the player's; there is no homing
or destination-dependent impulse. Ascending flyovers do not activate it.

The gold token is centred at (0,40,110), with radius 6 m. Continuous segment–sphere
intersection uses the same sphere shown by its halos. Token and terminal events
are ordered on the physics step. The token is visual/evidence only and never
alters the projectile velocity. Each new attempt restores the token.

Mill evidence comes from actual Havok contact callbacks on tagged building bodies,
not from an expanded box around the building. The roof rebound found by the player
is preserved. Readouts report route events immediately and bank them on landing.

## Verification references

These examples are QA fixtures, not prefilled powers or a player walkthrough.
All rails below are zero-based.

| Route | Rail | Yaw | Elevation | Charge |
|---|---|---|---|---|
| Direct | 1 | 0 | 42 | 0.89 |
| Skip | 1 | 0 | 20 | 0.70 |
| Sky | 1 | 0 | 54 | 0.95 |
| Mill | 1 | −14 | 65 | 1.00 |

The full-yard Havok fixture checks six skip angle/power pairs, six sky pairs and
three neighboring roof-rebound yaws, alongside the existing direct carry and
gallery neighborhoods. Additional checks cover save validation, same-shot landing,
ascending pad rejection and swept token/first-kiss ordering.

Rendered phone layout, touch recall and subjective feel require a browser/device
playtest; these are not established by the headless checks.
