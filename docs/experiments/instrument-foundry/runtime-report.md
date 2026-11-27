# Instrument audition foundation

Base: `10b09baafc9d85eef0d87a630b55600d623dcde0` on
`research/instrument-runtime-20261127`. Pure data/reference checkpoint:
`c0cb9af56507d9ed1e69812d2b3b124998fac7c6`; shared-player checkpoint:
`f6f54b267e0d9489f06bf811d252d48845bd8749`. The final director receipt records
the published endpoint and exact source-tree mapping.

## Small authoring boundary

An instrument is an explicitly versioned JSON envelope around the existing
Worldcraft range preset. It adds a spoiler-free invitation, a declared source
commit, a control-detent starting setup, a validated Counterline acoustic profile
and an optional bounded Overview orbit. None becomes an executable capability.

The preset still owns physical identity. The wrapper's presentation and sound
interpretation do not rewrite that identity or any historical performance.
Instrument v1 accepts the existing static bank/ramp/block/plate catalog, plate
lift/tilt, ordinary or 24-piece capacity, an adjustable launcher, fixed pieces
and no challenge goal. A voiced surface is required; a contact-count quota is not.
It does not admit curved geometry, arbitrary meshes, physical coefficients,
remote resources, scripts, new pitches or synthesis code.

The envelope is limited to 48 KiB UTF-8 and its embedded preset to 32 KiB. Exact
keys, all existing world limits/overlap checks, both opening detents and window
endpoints are validated. The source SHA is a provenance declaration; data
validation alone is not evidence that a physical measurement occurred.

## Reference identity and integration

The two reference envelopes contain the original Descending Resonance and Chime
Terraces presets without changing geometry, pitches, rules, capacity, physical
identity, acoustic profiles or curated/original starting setups. Their null
camera retains the original Counterline Foundry framing. A custom file should
normally author an explicit bounded orbit; a renamed reference is no longer the
registered original and receives fallback framing when its camera is null.

`lib/instrument-catalog.js` is the deliberately small permanent-registration seam.
A reviewed data-only submission needs one local JSON import and one `REGISTERED`
entry. It goes through the same bounded validation as session imports. The exact
two references remain separate and reserved. Initially there can be six
additional instruments, whether registered or imported, for eight in the live
selection list. This is an explicit initial collection bound, not a platform
designed for an unbounded gallery.

## One player, one physical authority

`/lab/instrument-foundry` renders the same Counterline client component in an
explicit keyed mode. The original `/lab/places-counterline` keeps its four-world
repertoire. Both use the same Havok runtime, 120 Hz stepping, resonance event
handling, physical recording, kept-line storage, acoustic sidecars and ensemble
scheduler. The new route does not copy any of those implementations.

The author panel is collapsed during ordinary play. Authors can load a local
file or paste JSON, download the selected instrument, and follow the contract,
brief and starter package. Parsing and list admission happen before stopping
audio or replacing the physical world. An invalid/conflicting import leaves the
active world and companions intact. Identical reimports are idempotent; a changed
file under an already admitted id is rejected. The two reference ids cannot be
overwritten even if a caller omits them from its submitted list.

Imports last for the visit. Reload discards that audition list, not existing
performances. A saved physical source contains its full historical world snapshot;
Restore can therefore recover it independently of whether its author file is
still imported. Companion selection remains musical source selection and does
not restore a physical world. Loading another instrument stops stale playback
but retains selected companions. Loading never fires automatically.

The new metadata adds no body, mesh, shadow caster or simultaneous projectile.
Only the selected world's existing runtime geometry is instantiated. Optional
camera data affects Overview only, not launch, collision or audio timing.
Headless reference adaptation/equivalence and resource evidence are documented
by the separate measurement lane; rendered browser/device evidence belongs to
the director packet.

## Historical Restore clarification

Source inspection found an inherited ambiguity: an explicit historical-null
acoustic policy could fall back to today's registered world's profile when
restoring its setup. That could imply a known original timbre where the saved
record supplied none. The extracted `counterlineRestoreProfile` helper now uses
the explicitly selected captured policy, or a byte-identical captured shelf copy
when no selection policy was supplied. Otherwise a new shot uses canonical
voices with total-speed dynamics, and the UI says the historical timbre is unknown.

This changes the interpretation selected for a **new** physical performance,
not the stored old line, stored gains, historical recorded audition or projectile
physics. A focused test retains one physical id simultaneously as an explicitly
historical source and a captured source, verifies each Restore policy, and checks
that the source bytes and canonical historical playback remain unchanged.

## Verification boundary

Six initial instrument contract tests and one Restore-policy test pass. Together
with the historical Counterline/pair/repertoire/ensemble suites, the shared-player
checkpoint passes 42 focused tests. TypeScript and targeted ESLint pass. Tests
cover exact reference worlds/profiles/openings/camera authority, frozen round trips,
unsafe/unknown fields, unsupported goals/motion/build access, both opening and
window detents, bounded/idempotent admission, identity collisions and camera limits.

Actual phrase-family measurements, owner-record inspection and author CLI evidence
are separate from those contract assertions. Source validation is not a certificate
of discoverability, enjoyable sound, rendered camera comfort or phone performance.
