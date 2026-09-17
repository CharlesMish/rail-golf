# Mechanism Range v0.2 — visible qualified events

Baseline: `ce7d1439875702282aea3da0d92a01779f6c31eb`.
Scope: `/lab/mechanism-range` only. No scoring, targets, progression, new mechanism
or station. Physical definitions and recognition predicates remain unchanged.

## Evidence and repair

The former result handler unconditionally replaced the live caption with the
ending reason. In the baseline default Split Bench fixture, qualification occurs
at 1.492 s and ground at 1.783 s: the nominal 2.2-second caption survived only
0.292 seconds. The table fixture loses its caption after 1.633 seconds. This is
a demonstrated presentation confound, not proof about every reported player's
camera view. No blanket camera or recognition tuning was justified.

The final Line Result now lists qualified redirects and actual switch transitions
in their original evidence order, with a separate `LINE ENDED — …` row. It remains
through RESULT (including Survey) until Retry/Reset/Recall or a new line. A line
without qualifying events displays only its ending reason. No inferred trick is
created from raw contacts/rejections. The detailed forensic evidence is unchanged.

Live qualified captions last up to 3.2 seconds; a newer event may replace the live
caption, but cannot erase the ordered final receipt. Each qualified redirect also
places a cyan expanding/fading ring at the authority's recorded contact point for
3.2 seconds. The ring is nonphysical/nonpickable and clears on a new launch or
restore. Raw contacts, rejected candidates and switch touches do not create rings.
No slow motion, timestep, projectile scale, camera or collision changes.

## Machine linkage

Replace the two thin grey drive-pipe pieces with a continuous 0.46 m casing:
actuator foot to right-angle drive, then to the existing hinge. Three steel collars
articulate the joints. The pipe inherits the actuator's amber/violet state material.
A thin dark face frame stays inside the actuator's existing shootable footprint.
All of these are untagged, nonpickable display meshes with no physics bodies.
The actuator location/volume and table body replacement remain unchanged.

The 22-degree B silhouette and discovered `TRANSFER B · RAISED` badge are retained.
The initial neutral brief and hidden pre-discovery state badge remain unchanged.
Retry preserves state, Reset restores A, Recall restores starting state.

## One far-zone sightline treatment

The existing Return Wall's inward broad face gets a pale timber finish (diffuse
RGB 0.78/0.60/0.38), dark edge bands and three restrained grain seams. The finish
is 17.6 m high × 28.8 m long, just outside the existing face at local x=-0.722.
The wall remains at (38,10,83), yaw -25 degrees, dimensions 1.4×20×32 m.
No rack is moved, rotated, resized or given a new collider. The upper face has a
clear launch-camera ray sightline; lower parts still sit behind the nearer stacks.
The intent is to make the existing tall return surface read as usable timber
across the void. Whether the contrast is sufficient remains a human-study question.

## Verification

`tests/fixtures/mechanism-range-v01-authority.json` freezes baseline whole-record
hashes for 14 actual Havok bench/table/cross-zone/rack/switch shots in A and B.
The new version produces byte-identical physical records for all 14. This preserves
several distinct rack approaches, table-only departures and silent misses as well
as positive rebounds; nothing is funnelled toward the far wall.

Additional tests cover rapid rebound→ground retention, ordered receipts, raw-contact
silence, ring expiry/cleanup and absence of colliders, mechanism-color linkage,
unchanged static bodies, blind-copy wiring and far-wall sightline. Existing A↔B,
Retry/Reset/Recall, Survey, projectile visual equivalence and production fixtures
remain required. Hosted rendering availability and full gate results are reported
at handoff; headless projection is not a claim of rendered visual approval.

Next manual questions: does the final receipt let a player connect the caption to
what they saw, does the pipe invite a mechanism hypothesis without text, and does
the tall face invite a cross-space attempt? Do not add scores or another level here.
