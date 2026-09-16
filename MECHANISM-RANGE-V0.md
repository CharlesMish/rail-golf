# Mechanism Range — spatial sketch v0

Isolated route: `/lab/mechanism-range`.
Frozen baseline: `a6f8a1fff2153e5f63a286ac075c4ad1e80da615`.
This adds new files only. Timber Courtyard, Open Line, Cards 01–04, their controls,
records, scoring, recognition rules, RUN/VARIETY, Kicker and progression are untouched.

## Spatial thesis

An open timber transfer yard with three different silhouettes around one useful
void. Short rebounds should invite an immediate second attempt; a visible machine
state should invite a different hypothesis; open air between zones should support
longer combinations without funneling every launch toward one landing disk.

One primary station, **Transfer Apron**, uses the existing three rail offsets,
aim limits, charge curve, launch speed, projectile mass/radius and gravity. Its
slightly raised trailing view frames the near bench on the left, table and control
in the middle/right, and the high return rack beyond. Survey provides a fixed
elevated oblique overview. No second station is justified yet.

## Three interaction zones

| Zone | Spatial role | Visible invitation |
| --- | --- | --- |
| Split bench | Immediate relationship, left and near | Two oblique timber faces, low enough to see beyond. Try a short reject or thread past the cheek. Amber top edges reveal orientation. |
| Transfer table | Meaningful state choice, central | A broad planked table with an adjacent shootable actuator, exposed drive connection and matching state-colored strips. Its raised state changes the silhouette, not just a label. |
| High return rack | Height and cross-space combinations, far right | Three separated descending timber stacks, a tall oblique return wall and an open loft frame. Tops, ends and sides are real solid geometry. Air between stacks permits several approaches. |

Dark straps, seams, low work rails and a sparse gantry make this one work yard.
There is no enclosing corridor, roof cavity, moving target or new destination.
Most scene copy stays in one short brief; only confirmed departures receive
transient captions. Decorative seams/bands are explicitly non-colliding trim;
large timber faces, ground, machine supports and gantry have physical bodies.

## One mechanism, two authored states

**A:** level transfer table. **B:** the far edge rises with a 22° pitch; the near
top edge keeps its height. These are two static transforms, not an animated or
uncontrolled hinge. Amber/violet strips match the actuator and the `TRANSFER A/B`
status. The exposed axle/drive pipe is a visual connection, not a second mechanism.

The existing `buildDiverterLab` supplies real projectile/switch contact authority,
one transition per launch, and static-body replacement after the physics step.
No destination-aware force, boost strip, wind or scripted reflection is added.

- Retry/interrupt preserves state and aim/MAX.
- Reset restores A; fresh entry also starts at A.
- Recall last setup restores its **starting** machine state and exact power,
  and clears MAX. It does not fire automatically.
- First ground contact ends the line. Spatial OOB and a separate 60-second
  safety cap/settled-ball rule remain distinct.

This sketch has one volatile last-attempt record, not a new durable archive or
ShareLine version. Leaving/reloading intentionally starts a fresh sketch. Existing
Timberyard archives and share payloads are never read or written here.

## Route hypotheses — not authored solutions

1. A near bench reject can become a cross-yard carry onto the transfer table.
2. Level and raised table entries may favor different rack heights or departure
   directions; B need not be universally better than A.
3. A high direct carry can use the return wall to revisit lower, earlier space.
4. A stack side could supply a different line from a top-face bounce, especially
   after a table departure.
5. Rail and power changes might open a bench cheek / table bypass rather than
   merely refining one winning coordinate.

HEADLESS has established physical examples for some pairs, including bench→table
and table→rack. This does **not** establish that a blind player will perceive or
enjoy those possibilities. QA setups live only in source tests, never in UI copy.

## Recognition and evidence

Existing generic redirect gates are reused unchanged for **captions only**:
real contact, sufficient incoming/outgoing speed, heading change, separation and
free-flight confirmation. Chatter is not captioned as a trick. No score table,
target bonus, thresholds, progression or route stamps are introduced.

Shot Tools exposes the last attempt's qualified departures, rejection reasons
and compacted raw contacts. Contacts/evidence each cap at 500 entries. A caption
means a qualifying departure, not completion of a prescribed route.

## Verification and remaining unknowns

Real Havok fixtures exercise A↔B switch contact, static-body transforms, deterministic
repeat, both-state table departures across all rails, bench/table/rack contact,
cross-zone pairs, interruption/reset/recall and ground/safety resolution. Projection
checks cover desktop, phone landscape and portrait; mesh rays check that the
actuator and table are not hidden by another physical face from the launch view.

Those are geometry checks, **not screenshots or a claim of visual playability**.
The available hosted browser reports WebGL unavailable. Actual lighting, perceived
scale, handheld aiming and flight-camera feel need Charlie's review.

Before any score/content pass, manually test:

1. Without reading this packet, what would you try first? Does the near bench
   suggest a relationship, or only a wall?
2. Can you spot the actuator and identify what it controls before hitting it?
   Is the changed table silhouette obvious from the launch and survey views?
3. Does changing state create a new idea, rather than just a longer/shorter version
   of the same line? Do both states feel worth revisiting?
4. After one useful rebound, can you imagine a cross-zone line? Are the rack gaps
   generous enough to experiment, without making every contact a guaranteed chain?
5. Do any sincere, visible departures remain silent? Preserve the contact evidence
   before deciding whether geometry or recognition needs work.

**Largest uncertainty:** whether the table's broad, tested physical usefulness
translates into a legible player choice. A working switch that no one notices would
repeat the Kicker lesson. Stop at this sketch; no scoring, polish, second station
or full second-level implementation is commissioned here.
