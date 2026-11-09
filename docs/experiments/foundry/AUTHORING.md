# Foundry authoring kit

You are adding worlds to Worldcraft. This file is the whole brief. You do not need a previous conversation.

Worldcraft is the lab at `/lab/worldcraft` in the Rail Golf repository. A player aims, charges, and fires. Havok runs the shot. The line ends at the first contact with the ground. Foundry is a short list on that page. Each entry is two JSON files: a preset the game already knows how to simulate, and a manifest that says what the world is for. You fill in those files. You do not write a new physics model.

## Cut a branch

The kit branch is `lab/wc-foundry-20261109`. Cut yours from its tip. Do not cut from `main`. Do not commit on `lab/wc-foundry-20261109`. Do not force-push. Do not merge. Do not deploy.

```
git fetch origin lab/wc-foundry-20261109
git checkout -b lab/wc-foundry-<short-name> origin/lab/wc-foundry-20261109
git rev-parse HEAD
```

The SHA that command prints is the kit you started from. Record it in your notes. `sourceBuild` in a new manifest stays that SHA when you do not change physics. After you commit your files, run the validator again. If the recorded terminal still matches, leave `sourceBuild` alone.

`main` does not contain this lab. The physics baseline under the kit is `46e59a781722081546457086e1d87a7d2e8f7453`. Piece sizes and the placeable list are in [VOCABULARY.md](VOCABULARY.md). Read that page before you invent a shape. It also says what a vertical world would take, and why the clockwork turntable is not on this branch.

## Rules

- Pieces you may use: `bank`, `ramp`, `block`, `plate`. At most 12. Their sizes, friction, and restitution are fixed. A plate needs a voice. A block cannot have one. Voice is sound only.
- Position is a 0.5 m grid. x is −30 to 30. z is 10 to 96. Yaw is a 5° step, from −180° to 175°. Launcher x is −10 to 10, step 0.5 m. The carriage stays at z 0.
- Aim, when the launcher is free, stays inside yaw −70° to 70°, elevation 5° to 85°, charge 0 to 1. The sliders step yaw and elevation by 0.5° and charge by 0.01. A result that exists only between those steps is not a player route.
- Do not add a prefab, a height field, a scale field, a new pitch, or a new motion kind.
- Do not change ball mass, radius, gravity, charge mapping, restitution, collider behaviour, or first-ground termination. Do not edit `lib/rail-golf-v02.js` for a world.
- Do not edit Timber Courtyard, Free Play, historical labs, or the v1 worlds. The v1 export hash of house, orc, starter, and empty stays `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.
- Preset and manifest are data. No scripts, no functions, no remote addresses. A string that contains `://` or `//` is rejected. Keys named `script`, `src`, `url`, `href`, `asset`, or `remote` are rejected.
- The invitation must not state a successful aim or a successful placement. Tested shots, the sensitivity note, and limitations stay in the manifest. The gallery does not show them.
- `customCode` is `null` for every world you register. If a world truly needs code, set `{ "module", "reason" }` and do not register it. The module path is a relative file in this repo, with no `..`.

## Where the files go

```
worlds/foundry/<id>/preset.json
worlds/foundry/<id>/manifest.json
```

`<id>` is the preset id: lowercase letters, digits, and hyphens, 1–64 characters. Copy `worlds/foundry/_template/` and replace both files. Leave the template registered nowhere.

A preset must be at most 32 KiB. A manifest must be at most 16 KiB.

## Preset

`format` is `rail-golf-worldcraft-range-preset`. `version` is 1. This is the format `validateRangePreset` already accepts. Do not invent a second world schema.

Required keys: `format`, `version`, `id`, `name`, `environment`, `launcher`, `objects`, `rules`.

`environment` is `{ "preset": "forest-clearing-v1", "seed": 1 }` only.

`launcher` is `{ "x": <number> }`.

Each object is `{ "id", "kind", "x", "z", "yaw" }` and, when it rings, `"voice": { "material": "metal" | "timber", "degree": 0 to 4 }`.

`rules.launcher` is one of:

- Fixed: `{ "fixed": true, "yaw", "elevation", "charge" }`. The player cannot change the shot.
- Free: `{ "fixed": false, "yaw", "elevation", "charge" }`. Those numbers are the starting shot. The player can change origin, yaw, elevation, and power inside the stops above.
- Windowed: the free shape plus `"originFixed": true or false` and `"window": { "yawMin", "yawMax", "elevationMin", "elevationMax", "chargeMin", "chargeMax" }`.

`rules.fixed` is the list of piece ids Build cannot move. `rules.allowance` counts how many movable pieces of each kind are allowed. Locked pieces do not count against the allowance.

`rules.goal` is `{ "kind": "none" }`, or a first-ground circle `{ "kind": "first-ground-zone", "x", "z", "r" }` with radius 0.5–5 m. Other goal kinds exist for the bell and for a contact phrase. Copy one from `lib/worldcraft-range.js` if you need it. Do not invent collider numbers.

The filled reference is [worlds/foundry/soft-landing/preset.json](../../../worlds/foundry/soft-landing/preset.json). It is the Soft Landing range preset, converted, not a new arrangement.

## Manifest

`format` is `rail-golf-worldcraft-foundry-manifest`. `version` is 1. Every key below is required.

| Key | What it is |
| --- | --- |
| `id`, `name` | Must match the preset. |
| `kind` | `shot-study`, `workshop`, or `authored-world`. |
| `invitation` | The sentence the gallery shows. No solution. |
| `physicalQuestion` | Why someone would fire again. The gallery does not show it. |
| `editable` | `{ "launcher": boolean, "geometry": boolean }`. The validator checks these against the preset. A free or windowed launcher sets `launcher` true. A movable piece, or an allowance above zero, sets `geometry` true. |
| `challenge` | `null`, or `{ "id", "label" }`. The id is not the world id, and it must not appear inside the preset. The preset is the physical layout. The challenge id is separate. This kit stores no completion flag. |
| `sourceBuild` | Full commit SHA the terminal was measured against. See the branch section. |
| `seed` | An integer recorded on the Havok run. It is not applied to the solver. |
| `testedShots` | 1–8 shots. See below. |
| `nearbySensitivity` | One plain note about a change the player can actually make, next to a tested shot. |
| `validationEvidence` | What you ran, and what you did not run. |
| `limitations` | 1–6 typed entries. See below. |
| `customCode` | `null`, or `{ "module", "reason" }`. Gallery worlds are `null`. |

A tested shot has `id`, `setup`, `launchPhase`, `terminal`, and `outcome`.

`setup` is `{ "railIndex": 1, "originX", "yaw", "elevation", "charge" }`. `launchPhase` is `null` unless the world has a travelling bell. `terminal` is `{ "reason", "elapsed", "position" }` with a 3-number position. `outcome` is `{ "kind", "status" }`. The validator fires the setup and requires the same reason, the same elapsed time, the same position, and the same outcome kind and status.

`nearbySensitivity` is not replayed. Write what you fired. For a free launcher, the useful neighbour is one editor step: 0.5° of yaw, 0.5° of elevation, 0.01 of charge, or 0.5 m of a piece. For a fixed launcher, say that the neighbour was rejected. Do not hide a solution in this note and then paste the note into the invitation.

A limitation entry has exactly these keys:

| Key | Meaning |
| --- | --- |
| `category` | `physical-geometry` (a missing piece, shape, or mechanism), `authoring-tooling` (a missing validator, search, or editor capability), or `presentation` (camera, Survey, labels, or the gallery). |
| `concept` | The idea you are keeping. |
| `missing` | The specific capability that is absent. |
| `extension` | The smallest change that would unlock it. Do not build that change unless a later brief says so. |

## Reference: Soft Landing

This is the one worked example. It is complete, the validator passes it, and the gallery shows it.

| | |
| --- | --- |
| Preset | `worlds/foundry/soft-landing/preset.json` |
| Manifest | `worlds/foundry/soft-landing/manifest.json` |
| Kind | `shot-study` |
| Tested shot | `opening`. Origin 0, yaw 0, elevation 18, charge 0.55. First ground, miss. |
| Nearby note | Yaw 0.5° and yaw −0.5°, same elevation and charge, still miss, about 17.86 m from the circle centre. |
| Limitation | One `physical-geometry` entry. The repeatable landing stays. Height, scale, and ramp pitch do not exist. The smallest extension named there is one height offset on the existing block. It is not implemented. |
| Gallery | Header **Foundry** on `/lab/worldcraft`. The card shows the name, the invitation, Shot study, Launcher editable, Geometry editable, Optional challenge, Play, Reset, and Make a copy. |

Play loads that preset and opens Survey. Reset puts the preset back. Make a copy writes a new saved world with a new id. It does not change the files, the challenge id, or any kept line.

## Run the validator

From the repository root, with Node 22:

```
npm ci
node scripts/foundry/validate.mjs worlds/foundry/<id>
```

No arguments checks the template and Soft Landing. Exit 0 prints `{ "ok": true, "reports": [ ... ] }`. A mismatch prints the terminal Havok returned. Put that terminal into the manifest only after you have read it, then run the command again. Do not invent the numbers.

The same check, plus the remix and leak checks, is:

```
node --test tests/worldcraft-foundry.test.mjs
```

`npm test` builds the app and runs the full suite. Use it before you hand the branch over.

## Register the world

Edit `lib/worldcraft-foundry.js` only to add your pair.

1. Import `preset.json` and `manifest.json` with `with { type: 'json' }`.
2. Add `{ id: '<id>', preset, manifest }` to `REGISTERED`. The id matches the preset id.
3. Leave `_template` out of `REGISTERED`.
4. `customCode` must be `null`. The loader rejects a gallery world that names a module.

`listFoundryWorlds()` is what the page renders. Do not pass tested shots, `nearbySensitivity`, or `limitations` into that card.

Open `/lab/worldcraft`, choose **Foundry**, and confirm your card. Play, Reset, and Make a copy. The copy appears under Worlds & lines as its own world. The foundry card still opens the authored preset.

## Deliver

- The branch name and its tip SHA.
- The kit SHA you cut from (`git rev-parse` before your commits).
- The paths of your `preset.json` and `manifest.json`.
- The validator stdout for that directory.
- One sentence on what the invitation says, and that it does not state a solution.
- The limitation entries you wrote, and confirmation you did not build the extensions.

Do not merge. Do not deploy. If you were asked for a pull request, open a draft against `lab/wc-foundry-20261109`. Never against `main`.
