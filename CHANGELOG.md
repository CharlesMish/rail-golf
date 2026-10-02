# Changelog

Notable changes to Rail Golf are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The package version stays 0.3.1, and this file is the change record. Tags are not used for now.

## [Unreleased]

### Added
- Charter (`docs/CHARTER.md`), MIT license (`LICENSE`), and this changelog.

### Changed
- License changed from `UNLICENSED` to MIT in `package.json`, the README, and `THIRD_PARTY_NOTICES.md`.
- The README uses public-facing terms and defines the game's vocabulary. Existing game UI text is unchanged.

### Fixed
- `docs/HOSTING.md` no longer says that rail-golf.cmish.dev is not attached.

## [0.3.1] - 2026-09-28

This entry covers `8655b7d` through `825bbe9`. Version 0.3.1 was set at import and has not changed since.

### Added
- Initial import of Rail Golf 0.3.1: a Babylon.js and Havok range with four cards (Open Seat, Timber Bank, Hot Skip, Ruckus Line), the tests, and CI (`829b79b`).
- Opt-in Timber Bank address lab, reached by a query parameter (#6, `0e11add`).
- Cloudflare Worker deployment config and hosting notes (#7, `9f8a84d`).
- Timber Courtyard: a long carry to the Mill Bell and the two-wall Switchback Gallery (#9, `94b9d84`).
- Deployment marker at `/deploy-target.txt` (`469d915`).
- Route Book: four optional routes for Across the Yard, each saving its winning line (#11, `9ad0642`).
- Immediate retry, optional Set power, and clearer landing feedback (#12, `b5ad608`).
- Lumber Walk station and the three-tread Lumber Cascade challenge (#13, `8cd397d`).
- Diverter Floor lab at `/lab/diverter`, and a build SHA shown on every route (#15, `845c2cd`).
- Courtyard diverter lab at `/lab/courtyard-diverter`. The Skip Pad now stays in place across all three courtyard cards (#16, `77d4016`).
- Line lab at `/lab/lines`, with lab-only receipts and shareable setups (#17, `583a47e`), line recognition v0.2 (#18, `7889fad`), Open Line at Saw Bay (#20, `d9aabe4`), and Kicker Pallet with survey archive (#23, `8e3bb46`).
- Mechanism Range lab at `/lab/mechanism-range`, a three-zone spatial sketch (#26, `d95c533`).
- Four spatial labs: Timber Receiver, Fan & Paddle Works (`/lab/mechanism-vocabulary`), Travelling Tee, and Vertical Yard (#30, `ca1cc8f`).
- Intent Lab at `/lab/intent`, which compares Sentence, Keep, and frozen Score on the same yard (#32, `8eb7ef6`).
- Linecraft study at `/lab/linecraft`: Learn then Open lessons, a four-slot Line Shelf, and dual pads with return faces (#33, `825bbe9`).

### Changed
- In-world breach gate made clearer, and the active landing destination is marked (#4, `bae27ba`).
- Range presentation polished (#8, `25503ee`).
- The courtyard became the front door `/`. Winning lines are saved across the yard, and the charge and aim ranges are wider (#14, `0d2aa96`).
- Open Line play feel and RUN refined (#21, `49bdb12`). RUN adjusted, and Cascade departures recognized in the lab only (#22, `5d6a715`).
- Mechanism Range v0.1 to v0.3: shared controls, a reversible Survey view, visible qualified events, and terminal recovery (#27 `ce7d143`, #28 `57a0f46`, #29 `354c408`).
- The four spatial labs refined for player evaluation (#31, `15e7508`).

### Fixed
- Range destination sightlines (#5, `f7f4dd3`).
- Shot timing and contact order (#8, `25503ee`; `12e7037`).
- Duplicate `nodejs_compat` flag in the Cloudflare config (#10, `feeed92`).
- Line lab physics, recognition, and live score HUD, as v0.2.1 (#19, `2f22edf`).
- Line lab controls and launch records (#24, `e5842a7`), and separate document and mount records (#25, `a6f8a1f`).
