# Rail Golf charter

This page says what Rail Golf is for and what it is not. How to play, build, and test it is in the [README](../README.md). Hosting rules are in [HOSTING.md](HOSTING.md), and notable changes are in [CHANGELOG.md](../CHANGELOG.md).

## 1. Purpose

Rail Golf is a single-player artillery trick-shot game that runs in the browser, built with Babylon.js and Havok physics. You aim a launcher **rail**, hold to charge it, and fire a **round**. A shot is ruled on its **first kiss**, meaning its first ground contact, not on where the round comes to rest.

The project looks for the most fun ways to explore a developed course. The first world, the **Timber Courtyard**, is developed, along with a couple of spots and gaps inside it. Current work explores play within them.

- The front door `/` opens the Timber Courtyard: two stations in one mill yard, with three challenges (Across the Yard, Switchback Gallery, Lumber Cascade).
- `/practice` keeps the four early Mechanism Range **cards**.
- Routes under `/lab/` are isolated experiments with different ways to play the same yard. They do not change courtyard progression. Each lab is built on its own branch and reviewed before it merges to `main`.

## 2. What it deliberately is not

- **Not a release.** It is a playable development demo, with no compatibility or stability promise.
- **No aim assist.** The muzzle spine shows direction only. There is no predicted landing, no trajectory preview, and no auto-aim. Havok handles every reflection.
- **No accounts or server saves.** Progress is kept in the browser's local storage, and no database or bucket is provisioned.
- **Not a static site.** It is a Vinext app on a Cloudflare Worker. The separate single-file offline build is a different thing.
- **Lab scores are not canonical.** Scores in the line labs are placeholders and unlock nothing.

## 3. Audience

- Players at https://rail-golf.cmish.dev/ on desktop or phone. Phones need iOS Safari 16.4 or later for Havok.
- Developers and reviewers who run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm test`.
- Lab playtesters. The lab docs call a fresh playtester, human or agent, a **Rail Rat**.

Rail Golf is released under the MIT License (see [LICENSE](../LICENSE)).

## 4. Voice

- Write plain, short sentences. Say what a change establishes and what it does not.
- Give numbers with units, such as a 146-metre carry or a 6 m/s starting charge.
- The README tagline is the one joke. Everything else stays plain.
- Rail Golf's own words are *rail*, *round*, *first kiss*, *card* (one challenge), *station* (a launch position), *trick stamp* (earned when a mechanism and its target are hit in the same shot), and *line* (a recorded setup and trail you can recall or share). Define each one where it first appears, and don't pile them up.
- Lab names (Linecraft, Route Book, Open Line, and the rest) are proper nouns. Use them as they are written.
- The README, this charter, and the game's text don't use internal review-role words such as "director" or "owner". Leave archival wording in older lab records as it is.
- Cite baselines by commit SHA, as the lab docs already do.

## 5. Versions and change record

- `main` is the playable baseline, and it is what runs at rail-golf.cmish.dev. Changes arrive by pull request from `feature/`, `experiment/`, `fix/`, or `lab/` branches.
- The package version stays `0.3.1`, the version of the Aug 30, 2026 import (`829b79b`). The version number is not the change record.
- Notable changes are recorded in [CHANGELOG.md](../CHANGELOG.md), in Keep a Changelog style, with PR numbers and commit SHAs.
- Tags and releases are not used for now.
- Every route shows a `BUILD` commit SHA. That SHA is how a build is identified.
- Labs have their own version labels, such as Mechanism Range v0.3 or Line Recognition v0.2.1. Those labels are not the game's version.

## 6. Relationship to other repos

- Rail Golf stands alone. It shares no code, assets, or version pins with Quarto, Hush Basin, or any other project repo.
- The cmish.dev Workshop lists it and links to the public game.
- Vendored shadcn and Tailwind files keep their own MIT license. See `THIRD_PARTY_NOTICES.md`.
