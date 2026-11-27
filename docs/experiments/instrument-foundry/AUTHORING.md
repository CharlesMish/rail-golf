# Counterline Instrument Foundry — authoring contract v1

Create one physical musical instrument: a place where aiming, firing, listening
and making a small change suggest another performance. A single interesting
strike, a short answer, a chord-like encounter or a longer journey can all be
valuable. Invent the spatial and musical idea yourself. Descending Resonance
and Chime Terraces are working references, not layouts you must imitate.

This contract is current for the Instrument Foundry kit. Older Foundry documents
describe earlier branches and narrower capabilities. The code validators below
are the final data authority. Do not change physics or audio code to make an
instrument pass.

## Start and audition

Use the exact kit commit in `SOURCE.json` from the starter packet, or the published
Instrument Foundry draft's source receipt. Do not branch from production main or
from an unrelated experiment. Create your own branch and record its starting SHA.

```sh
git clone https://github.com/CharlesMish/rail-golf.git
cd rail-golf
git switch -c instrument/your-name KIT_SHA
npm run install:ci
```

Replace `KIT_SHA` with that actual 40-character SHA. Node 22.13 or later is
required. With an existing checkout, fetch the kit branch before switching.
The two exact references live at:

- `worlds/instruments/descending-resonance/instrument.json`
- `worlds/instruments/chime-terraces/instrument.json`

Copy a reference into `worlds/instruments/your-name/instrument.json`; assign a
new preset id/name before changing it. The audition page at
`/lab/instrument-foundry` imports your JSON locally. No registry edit or server
upload is needed to try it. Run `npm run dev` for local play, or use the published
audition preview and its import control. The installed player already supplies
one live Havok shot, impact sounds, actual trajectories, Keep/Restore and up to
two independent recorded companions. Do not rebuild those systems.

There are at most six additional slots beside the two references, shared by
reviewed registrations and session imports. Imported instruments last for the
visit. Reload clears session imports, not registered instruments or saved performances. Reimporting
identical data is idempotent; a conflicting instrument id is refused. Give each
revised instrument a new id. Selecting accompaniment never changes the live
world; restoring its physical setup is a separate deliberate action.

## The complete document

The JSON has exactly these required keys. No comments or additional keys:

| Key | Contract |
| --- | --- |
| `format` | `rail-golf-counterline-instrument` |
| `version` | `1` |
| `preset` | Existing `rail-golf-worldcraft-range-preset` v1 document, described below |
| `profile` | `{ "version": 1, "dynamics": "normal-speed", "bankVoice": null }`, or the alternatives below |
| `invitation` | 1–600 printable characters; spoiler-free, no successful numerical recipe |
| `sourceBuild` | Full lowercase 40-character kit/source commit measured against; provenance declaration, not proof |
| `opening` | `{ "railIndex": 1, "originX", "yaw", "elevation", "charge" }`, all on ordinary controls |
| `camera` | `null`, or the bounded overview orbit described below |

Whole document: at most 48 KiB UTF-8; embedded preset: at most 32 KiB. These are
data only. No scripts, functions, URLs, remote assets, arbitrary meshes or
physics coefficients. Validation occurs before replacing the active world.

The preset has `format`, `version`, `id`, `name`, `environment`, `launcher`,
`objects`, `rules`, and optionally `capacity: 24`. Its format is
`rail-golf-worldcraft-range-preset`, version 1. Ids use lowercase letters, digits
and hyphens, at most 64 characters; names are 1–64 printable characters.
`environment` is `{ "preset": "forest-clearing-v1", "seed": 1 }`.
`launcher` is `{ "x": 0 }` with x adjustable in the range below.

An ordinary piece has `id`, `kind`, `x`, `z`, `yaw`, and optional `voice`.
Plates require a voice; blocks cannot have one. `voice` is
`{ "material": "metal" | "timber", "degree": 0 | 1 | 2 | 3 | 4 }`.
The table below describes the fixed physical catalog; dimensions and contact
coefficients are not authored fields.

| Kind | Dimensions width × height × depth | Placement / role |
| --- | --- | --- |
| `bank` | 12 × 7 × 1 m | Upright, centre 3.5 m high; optional voiced reflector |
| `ramp` | 10 × .8 × 10 m | Fixed −20° pitch, ground-supported; optional voice |
| `block` | 6 × 4 × 5 m | Dull, unvoiced obstruction |
| `plate` | 4 × 4 × .35 m | Upright by default; required voice; optional lift/tilt pair |

There are 12 pieces by default. Opt into the existing 24-piece ceiling by adding
`capacity: 24`; extra pieces are not inherently more useful. x is −30…30 m,
z 10…96 m, both on a .5 m grid. Yaw is −180…175° in 5° steps. Actual projected
footprints must fit the bounds and avoid the launcher corridor; real oriented
boxes must not penetrate one another. Touching faces are legal but can create
solver-sensitive seams, so separate pieces when contact order matters.

A plate may include **both** `lift` and `tilt`. Lift 0…20 m in .5 m steps is the
lowest point of the tilted box above ground, not its centre. Tilt is −90…90° in
5° steps about its width axis; yaw then places that local axis in the world.
For an ordinary standing plate, omit both fields: an explicit zero/zero pair is
not accepted by the historical world validator.
No other piece has a height, scale or pitch control. Visual and collision boxes
are the same physical form. The optional barrel study is not an imported v1 kind.

`rules` has exactly `launcher`, `fixed`, `allowance`, `goal`:

- `launcher`: `{ "fixed": false, "yaw": 0, "elevation": 18, "charge": 0.55 }`
  is the original opening. A window additionally supplies both `originFixed`
  (boolean) and `window` with `yawMin`, `yawMax`, `elevationMin`, `elevationMax`,
  `chargeMin`, `chargeMax`. Keep useful freedom; a window is optional.
- `fixed`: every authored piece id, each once. This kit authors static instruments;
  players vary the launch rather than editing the structure during performance.
- `allowance`: `{}` (zero allowances are also accepted).
- `goal`: `{ "kind": "none" }`. No musical correctness target or score.

Origin is −10…10 m in .5 m steps, yaw −70…70° in .5° steps, elevation 5…85° in
.5° steps and charge 0…1 in .01 steps. Both openings and any window endpoints
must respect these detents. A trajectory existing only between them is not a
playable reference. There is no elevated/second tee or steering after launch.

## Musical interpretation

| Degree | Pitch |
| --- | --- |
| 0 | C4 |
| 1 | D4 |
| 2 | E4 |
| 3 | G4 |
| 4 | A4 |

Canonical metal is inharmonic and ringing; canonical timber is shorter.
`profile.dynamics` may be `normal-speed` (incoming speed into the contacted face)
or `total-speed` (the established post-contact speed mapping). `bankVoice` may
be `null`, or `tuned-even` with `normal-speed` only. The latter applies the
existing H tuned timber-bank interpretation. It does not retune every wooden
piece. No custom frequencies, transposition, synthesis scripts or new timbres
are accepted in this first kit. Acoustic choices never change restitution.

**Musical impacts are not qualified sport redirects.** The resonance ear groups
same-body solver callbacks separated by at most 5/120 seconds into one impact.
A later return to the same surface may create another musical impact even when
sport recognition earns no additional redirect. Preserve that distinction.
Do not split callbacks, invent contacts, quantize times or add artificial impulses.
Some recorded impacts have negligible or zero audible gain; report them honestly.

The ensemble plays original timings once on its shared 100 ms clock. Its bounded
budget is 36 attacks with overlapping conservative 2.4-second lifetimes. Default
levels are 30%, capped 45%. Unsupported density stops explicitly. Do not design
around exhausting the budget or mistake overlapping tails for separated notes.
The physical line and captured acoustics remain independent; historical records
without acoustic sidecars cannot promise their original live timbre.

## Camera and identity

`camera: null` preserves registered reference framing only for the exact reference
document; custom instruments get ordinary fallback framing. A renamed template
should usually provide an explicit orbit:

```json
{"target":{"x":0,"y":3,"z":28},"radius":75,"yaw":45,"elevation":30}
```

Target bounds: x −30…30, y 0…30, z 0…96 m; radius 12…160 m; yaw −180…180°;
elevation 10…80°. It affects Overview only, not physics or the launch camera.
Inspect tall structures and short/phone viewports yourself where WebGL works.

The underlying existing Worldcraft v1 snapshot remains physical identity.
The wrapper's acoustic profile, invitation, starting setup and camera are
separate authoring metadata. A new layout needs a new preset id, and imports
also refuse changed wrapper content under an already present id. Do not rewrite
old references or historical performances to rename your revision.

## Measure and submit

```sh
node scripts/instrument-foundry/validate.mjs worlds/instruments/your-name/instrument.json
node scripts/instrument-foundry/validate.mjs worlds/instruments/your-name/instrument.json --probes worlds/instruments/your-name/probes.json --output /tmp/your-name-evidence.json
```

Without probes the validator measures the curated and original openings. The
probe file format is `rail-golf-instrument-probes`, version 1, with 1–32 `cases`.
Each case has exactly `id`, `family`, `kind` (`family` or `negative`) and `setup`
in the opening format above. Follow the reference `probes.json` files. The tool
validates inputs before physics, then measures the centre and eight ordinary
neighbors: origin±.5 m, yaw/elevation±.5°, charge±.01. Neighbors outside valid
controls are reported as rejected, never silently clamped.

Describe several physically distinct possibilities and why the next adjustment
makes sense. Include an unsuccessful ending and sensitivity near each family.
A changed note is not automatically failure: distinguish exact note sequence,
broader physical relationship and rhythmic variation. There is no minimum contact
quota. Keep numerical recipes in probes/evidence, not the entry invitation.

Submit your instrument JSON, probes JSON, concise design/evidence note, exact
base/end SHAs and a short spoiler-free owner protocol. State what was actually
rendered/listened to. Headless Havok demonstrates physical results; NullEngine
timings do not establish GPU or phone performance. Imported records establish
internal consistency, not cryptographic authenticity.

Before handoff run TypeScript, lint, focused instrument tests and `npm test`.
Do not weaken older tests. Do not modify mass, radius, gravity, charge mapping,
120 Hz stepping, first-ground termination, resonance grouping, scoring,
recording/ensemble formats or historical world files. Propose missing capabilities
separately. A director can review and register your data after owner audition.
No merge, force push, production deployment or foundation-branch edit.
