# Foundry authoring contract

Phase 0 only. This file is the starting kit for a later lane. It does not add a creative world beyond one converted range preset.

## Baseline

`lab/wc-foundry-20261109` is cut from `46e59a781722081546457086e1d87a7d2e8f7453`, the tip of PR #58 (`lab/wc-polish-20261027`).

That commit already contains the integrated range, the lean musical workshop, and the phone polish. PR #57's lean tip is `c59c454909487c7602a41a94af992d229c7ccd00`. The integrated range is `6cf951576d29cd051109d119e1d11381aeae0450`. Starting here keeps the current placeable vocabulary and leaves the large wav history on the earlier music branches.

`main` at `4a2be20984da4e50d7f87f37e59d7d61ff384e2c` does not have this lab. Cutting from main would drop the presets this contract compiles. The clockwork branch is not merged in. What it would take to add the turntable is in [VOCABULARY.md](VOCABULARY.md).

Physics is unchanged from that baseline. Manifest `sourceBuild` names `46e59a781722081546457086e1d87a7d2e8f7453` because the terminals were reproduced on this contract, which does not retune mass, radius, gravity, charge mapping, restitution, or first-ground termination.

## Files

| Path | Role |
| --- | --- |
| `worlds/foundry/<id>/preset.json` | A `rail-golf-worldcraft-range-preset`, version 1. Validated by `validateRangePreset`. |
| `worlds/foundry/<id>/manifest.json` | The design manifest. It is not a world and it is not imported as one. |
| `worlds/foundry/_template/` | A copyable pair. It is not registered in the gallery. |
| `worlds/foundry/soft-landing/` | The one gallery seed. It is the Soft Landing range preset, converted, not a new arrangement. |
| `lib/worldcraft-foundry.js` | Loads the registered pairs. The gallery reads `listFoundryWorlds()`. |
| `scripts/foundry/validate.mjs` | Checks a pair, then fires its tested shots through `scripts/range/run.mjs`. |

Do not put a script, a function, or a remote address in either file. Strings are rejected if they contain `://` or `//`. Keys named `script`, `src`, `url`, `href`, `asset`, or `remote` are rejected. Import size for a preset stays 32 KiB. A manifest stays 16 KiB.

`customCode` is required. `null` means the preset and the manifest are enough. An object `{ "module", "reason" }` is an explicit dependency on a local module. A gallery registration refuses a pair whose `customCode` is not null. The template and the seed are both null.

## Manifest fields

`format` is `rail-golf-worldcraft-foundry-manifest`, `version` is 1.

`id` and `name` must match the preset. `kind` is `shot-study`, `workshop`, or `authored-world`.

`invitation` is the sentence the gallery shows. It must not state a solution. `physicalQuestion` is for the author and the validator. The gallery does not show it.

`editable.launcher` must match a free launcher. `editable.geometry` must match a preset that has a movable piece or a non-zero allowance. The validator checks the flags. It does not trust them.

`challenge` is `null`, or `{ "id", "label" }`. The id is a different identifier from the world id, and it must not appear inside the preset. The physical layout is the preset. The challenge is this separate id. Phase 0 does not store a completion flag. A later completion record, if one is added, keys on `challenge.id`, not on a saved-world slot.

`sourceBuild` is the commit the terminal was measured against. `seed` is an integer recorded on the Havok run. The range runner does not apply that seed to the solver.

`testedShots` holds 1–8 shots. Each shot has `id`, `setup` (`railIndex`, `originX`, `yaw`, `elevation`, `charge`), `launchPhase` (`null` unless the world has a bell), `terminal` (`reason`, `elapsed`, `position`), and `outcome` (`kind`, `status`). The validator fires the setup with real Havok and requires the same terminal and the same outcome kind and status.

`validationEvidence` and `knownLimitations` are plain text.

## Remix

`foundryRemixWorld` copies the physical document, including the rules the runtime needs, under a new world id and a new name (`Copy of …`). The new id is neither the preset id nor the challenge id. `saveWorld` stores that copy in a new local slot. It does not replace a slot, it does not write a line, and it does not change the registered preset. Reset loads the registered preset again.

The gallery shows name, invitation, kind, whether the launcher and the geometry are editable, whether an optional challenge exists, Play, Reset, and Make a copy. It does not show tested shots.

## Check

```
node scripts/foundry/validate.mjs
```

That reads `worlds/foundry/_template` and `worlds/foundry/soft-landing`. A failing shot prints the terminal Havok returned. `tests/worldcraft-foundry.test.mjs` runs the same check, rejects a remote string, checks that a remix leaves the authored preset and the kept-line list alone, and repeats load, reset, and remix while collider and mesh counts stay flat.

The v1 export hash of house, orc, starter, and empty stays `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389`.

Local screenshots of the list and of Soft Landing in play, at 1400×900 and 390×844, are in `screenshots/`. They are SwiftShader stills, not a phone-GPU measurement.
