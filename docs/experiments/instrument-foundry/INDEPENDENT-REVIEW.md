# Independent review — Instrument Foundry & Expressive Geometry

This review began from owner-played PR89
`10b09baafc9d85eef0d87a630b55600d623dcde0`, on
`research/instrument-review-20261127`. The unchanged baseline production build
and all 709 tests passed before implementation. No existing tests were weakened.
This is source, physical-contract and author-workflow review. The director owns
browser observations and publication; these are not duplicated as independent
rendering or listening evidence here.

## Roof: stored triangles were not submitted triangles

The independent review read the installed Babylon 9.23.0 draw implementation,
then reproduced the old gables under an actual `Mesh._draw` dispatch spy. All
three old gables submitted eight inward triangles via `drawArraysType`, even
though their stored index buffers described eight outward triangles. Flat
shading had left the mesh marked unindexed; the subsequent face reversal changed
indices that triangle drawing ignored. The barrel's 40 actual submitted triangles
were already outward because it corrected order before flattening.

Changing only the public `isUnIndexed` property to false made the three gables
use `drawElementsType` and their eight outward triangles. Position, normal and
index buffers remained byte-equivalent. The independent probe preserves this
contrast in `review-roof-dispatch.json` and is reproducible with
`node scripts/instrument-foundry/review-roof-dispatch.mjs`.

The reviewed author implementation is
`4e0f16867050a86289f0ea0d3e28b5cf30839af1`, with report/evidence
`47ddb81a24e32b1cae10a60e7d5f2eeb3d26f2f8`. Its broader regression runs actual
`Scene.render()` and `ShadowGenerator` under NullEngine and observes the corrected
index dispatch in both main and shadow passes. The 32 complete actual-Havok
histories and all physical geometry buffers remain exact. The combined new draw,
old roof, Exchange refinement and canopy suites independently passed 10/10.

This supports a concrete render-dispatch repair, while correcting the previous
index-only tests' incomplete interpretation. It does not establish that every
reported black patch or flicker disappears. The two-sided owner observation is
consistent with the defect; cap and shadow effects could also remain. Keep the
old comparator recipes intact and require owner/rendered confirmation before
calling the complete visual issue resolved. No further Freight construction is
needed to justify this repair.

## Instrument foundation: acceptance and remaining limits

Reviewed runtime checkpoints are `c0cb9af56507d9ed1e69812d2b3b124998fac7c6`,
`f6f54b267e0d9489f06bf811d252d48845bd8749`,
`84e070e7e6b6bdcb1f8d815b07ef932d8a2a100f`,
`fa19198f0af10af9eba3be23870196f09a9c0a25` and
`be1f86d03f4715432c8b965f158a075dbfddbab4`. The author-validator and evidence
checkpoints are `859762a2ba7c21a205f92ba482f304d30c65aecf` and
`9f55003bf33af73c92c20706183ba36e5d600911`.
The local review branch replays these dependencies; raw evidence identifies its
exact replayed HEAD as well as the measured kit source. These are source checks,
not independent rendered browser observations.

The small envelope is appropriate for this commission. It adds an invitation,
explicit acoustic interpretation, ordinary opening and bounded overview to the
existing validated preset. It does not authorize arbitrary mesh/code/asset input,
change the physical identity format, or install another runtime. Admission checks
complete before the active world is replaced. Exact duplicate imports are harmless;
changed content under an admitted identity is refused. Two fixed references plus
six additional registered/imported entries keep the visit bounded. Registration
remains a reviewed data-list change in `lib/instrument-catalog.js`.

The independent review challenged three important boundaries:

- **Historical acoustic policy:** explicit null must retain historical canonical
  playback and total-speed behavior for a newly restored performance, even if a
  matching current instrument has an H profile. The inherited registry fallback
  was removed, a pure helper is tested, and the UI states the original timbre is
  unknown. Captured sidecars still take their explicit validated interpretation.
- **Physical equality:** reference arrays are preserved in original order.
  World identity sorts pieces, while Havok body construction uses supplied order;
  equal identities alone cannot prove equal trajectories. The evidence compares
  full histories in equivalent fresh scenes and keeps the older Descending
  construction-history sensitivity visible.
- **Musical independence:** the resonance ear groups nearby same-body callbacks
  into one impact; later returns can sound again without another qualified sports
  redirect. The validator reports both ledgers. The supplied owner source's five
  musical impacts and three redirects are a concrete reason to preserve this.

The final independently rerun instrument, author-validator, restore-policy,
Counterline, repertoire and ensemble suites passed **46/46**. They include actual
Havok comparison under equivalent stepping and historical record compatibility.
These targeted results supplement the director's full repository checks; they
do not substitute for them.

## External-author workflow, exercised from the actual starter packet

The review unpacked the 12-file starter ZIP from source
`a2cc86c7677477a0dfd376319c429c5617680753`, verified all 11 checksum entries, and
read its README, contributor brief and contract. The ZIP fingerprint was
`1ede921a2cd794a2a6cf43b1a40485c1837957d2719d8f590f79a41ad0e6b544`.
This is the reviewed prepublication packet; the final publication may regenerate
the same package format from a later documented source after review corrections.

Following its data-only path, the reviewer edited the supplied template: a unique
identity, six retained lower surfaces, canonical total-speed acoustics, explicit
camera and three ordinary-control probes. No engine or registry edit was needed.
The fixture is preserved under `review-fixture/` only to reproduce this audit.
It is **not** a proposed new instrument or an independently creative design result.

The documented validator was run from a detached checkout of the exact kit SHA,
using the installed locked dependencies. Three central cases and their valid
neighbors completed **26 actual Havok shots**. The left and right central cases
gave different single notes; the outward negative gave silence and exited bounds.
There were 8 static bodies ready and one added live projectile. Every reset
returned to ready counts; final bodies, meshes and materials were zero. A boundary
neighbor was rejected rather than silently clamped. A sparse result passed valid
engineering checks without being mislabeled a rich or enjoyable instrument.

A separate acceptance probe then imported/exported that file, checked idempotence
and conflicting-id/script/off-detent rejection, captured a real line, discarded
the session catalog, and successfully round-tripped its complete physical snapshot
and an ensemble with two prior reference sources. In three equivalent fresh
scenes, solo, duet and trio produced the **same complete physical payload hash**.
Only one projectile was added in each case. The deterministic fake audio-clock
sink scheduled 1, 4 and 8 attacks respectively, all at original time +100 ms,
with zero late events, stale timers or retained bodies. This tests scheduling
isolation; it is not audible Web Audio or listening evidence.

Reproduce the data-only CLI and follow-up acceptance probe from a checkout with
this review:

```sh
node scripts/instrument-foundry/validate.mjs docs/experiments/instrument-foundry/review-fixture/instrument.json --probes docs/experiments/instrument-foundry/review-fixture/probes.json --output /tmp/review-author-cli.json
node scripts/instrument-foundry/review-author-workflow.mjs docs/experiments/instrument-foundry/review-fixture/instrument.json /tmp/review-author-cli.json /tmp/review-author-workflow.json
```

The compact committed `review-author-workflow.json` retains the exact original
kit execution and acceptance results. Both independent probe scripts pass lint.
Review found one small contract omission: standing plates must omit both lift and
tilt; explicit zero/zero is rejected by the established validator. The director
is incorporating this clarification with the final catalog filename/slot wording.

The package honestly requires the pinned repository for physics and the shared
player; it is not an offline game. It is nevertheless sufficient for a model to
edit JSON, obtain a local/hosted audition, and submit measured data without
learning the audio scheduler or writing a custom physics integration.

## Optional crown study: preserve the proof, defer generic geometry

The bounded review read implementation `f7058e084ff95134a08454232c111898ca007520`
and report checkpoint `95f9ebeaede6e98281fe3cfcc6796815916dc904` in the geometry lane. It checked
the existing barrel construction, shape creation, rotated camera planes, raw
normal/velocity measurement and the flat control. The visible 10-facet crown is
one real convex hull with a flat underside. It is not a hollow arch, smooth
visual surface over a flat box, or compound strip construction with hidden seams.
The flat control shares footprint, base, maximum height and physical coefficients;
its greater filled volume is acknowledged.

The stronger findings are a low carry whose destination changes and a return to
the same crown after substantial free flight. Near return and high carry also
work in the flat control, so those alone do not justify a curve. The flat study
has broader sampled coverage; the report also retains long, diminishing receiver
repetition and a fragile neighboring case. Normal alignment uses absolute dots
and explicitly retains edge interactions, rather than claiming a smooth normal
field. Whole-step velocity brackets are correctly distinguished from isolated
collision impulses. The geometry lane's three focused tests were independently
rerun and passed **3/3**; no broad sweep was added during review.

Its separate spatial identities and rejected Counterline import are appropriate.
The page offers ordinary impact feedback; analytical onset opportunities are not
presented as a portable ensemble instrument. The first authoring round should
use the small validated stock vocabulary. A bounded barrel could be considered
later if owner play shows that contact-position choice and spaced repeated
impacts are expressive enough to justify collision identity, snapshot validation,
camera and export work. Concavity or unrestricted meshes are premature.

## Review decision

No blocking source or author-workflow issue remains in the reviewed instrument
foundation or roof draw repair. Preserve the two reference instruments, the
data-only submission boundary and the separate crown proof. Give independent
authors the same kit with creative freedom; do not assign artificial instrument
roles or admit submissions by note count. Distinct physical intentions, useful
neighboring variation and owner desire to make another shot remain the selection
criteria. Rendering/listening comfort, the complete roof symptom resolution and
new instrument enjoyment still need the director/owner's corresponding evidence.
