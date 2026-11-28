# Independent exhibition player integration

Base: `8278fee69fb1bd0c196c2d6fa258faaaaec452e6` (published PR92).
Branch: `research/exhibition-player-20261127`.
Measured implementation: `db8b846a6c7a2f530100960fb0e3f8dc9cd9b8fe`.
The director owns independent physical admission, rendered browser checks and
publication. This lane does not repeat author evidence as its own measurements.

## Temporary collection, existing performance system

`/lab/instrument-exhibition` supplies the two exact reference documents plus
Exchange, Hairpin and Antiphonal Arc to the existing Counterline component.
`lib/instrument-exhibition.js` is a separate, code-owned exhibition list. It
validates all five through the same bounded instrument admission functions.
`lib/instrument-catalog.js` remains unchanged, so the original Instrument Foundry
still contains its two references and visit imports; the four-world Counterline
route also remains unchanged.

The page supplies its collection once, as initial state, and has a distinct
React key from the ordinary Foundry page. The component keeps its existing
world-selection, launch, Stop, Retry, Keep, Restore, two companion selections,
recording, export and saved-ensemble implementations. The effect still depends
only on instrument mode; the optional collection is not a command to replace an
active world on rerender. A future route changing collections must remount the
player with its own key, as these two routes do.

No shared physical runtime, collision, synthesis, audio scheduling, voice budget,
physical identity or storage format changed. Selecting another live instrument
still uses the existing `restoreWorld` path, which preserves both companions.
Restoring a companion's physical setup remains a separate deliberate action.

## Original author data

Instrument and probe files are copied byte-for-byte under
`worlds/instruments/exhibition/<original-id>/`. Their declared kit source remains
`3c67ceb9de1739c23092f6fdd8680b9047536a9f`. Original ids, ordered pieces, profiles,
curated starts, authored original starts, invitations and camera settings remain
unchanged. The three new tests pin all six raw file hashes to the original intake.
Root's intake archive preserves the full author evidence; this integration does
not rewrite or reattribute it.

The selector shows original instrument names. No model attribution is guessed
for Exchange or Antiphonal Arc. Hairpin's explicit Fable attribution remains in
its original id and preserved submission documentation. No numerical probes or
suggested successful trajectories enter the ordinary exhibition interface.

The original opening buttons remain accessible through the existing player.
The header identifies this as a temporary exhibition, not permanent repertoire
selection. The three submissions occupy three of the existing six additional
instrument slots; visitors can still import three more files during the visit.
Reload returns this route to the same five exhibited instruments. Any extra
session imports clear as before; historical physical Keeps retain snapshots.

A presentation-only clarification states that the H profile has an even contact
response, with the tuned timber-bank voice where present. The profile's existing
gain curve applies to all voiced contacts; its timber-bank timbre treatment has
a narrower scope. This wording correction changes no acoustic behavior.

## Verification

- All three unchanged documents pass the authoritative instrument envelope.
- `node --test tests/instrument-exhibition.test.mjs tests/instrument-foundry.test.mjs tests/instrument-restore-policy.test.mjs`: **10/10 pass**, including three new tests.
- `npm run typecheck`: passed.
- Targeted ESLint on the new route, shared component, catalog and tests: passed,
  zero warnings or errors. ESLint was invoked through its installed Node entry
  because invoking the binary outside npm did not add `node_modules/.bin` to PATH.
- `git diff --check`: passed.

The tests check byte-preserved originals/probes, both openings and acoustic
metadata, underlying physical identity, exact reference preservation, isolation
from the generic catalog, idempotence and the shared admission bound. These are
admission and provenance checks, not additional claims of musical quality.
The director's full repository/build checks and the other independent physics,
ensemble and browser lanes complete the integration evidence.
