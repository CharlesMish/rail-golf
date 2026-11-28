# Exhibition publication and recovery

The exhibition is developed on new branch
`research/instrument-exhibition-20261127`, from the exact published PR92 source
`8278fee69fb1bd0c196c2d6fa258faaaaec452e6` on
`research/instrument-foundry-20261127`. Its declared author kit
`3c67ceb9de1739c23092f6fdd8680b9047536a9f` is a verified ancestor. Production
main remains `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.

The route is `/lab/instrument-exhibition`. It contains the unchanged two
references plus the original Exchange, Hairpin and Antiphonal Arc submissions.
The ordinary Foundry route and registry remain unchanged. Roof/crown studies
PR90/91 are independent dependencies that were not added to this exhibition.

The draft PR's external receipt records the exact published ending SHA, matching
local tree, final hosted checks and immutable preview URL. Keeping that final
receipt outside the commit lets it name its own exact ending source truthfully.
The publication checkpoint and preview will also be recorded below once issued.

## Tested source and evidence

- Tested integrated source: `3361e5e4ace14688179831cf2157a83fb2802e6b`.
- Tested tree: `c116009f33eb36db284813cf87e8a0938604298d`.
- Player/browser UI source: `ff982702ee600452570d0c4ef98dcb23543a35bb`.
- Later changes: measurement scripts, reports and compact browser evidence only;
  no runtime, dependency, physical world or acoustic delta after integrated tests.
- Build + 723 tests, TypeScript, lint (zero errors/five inherited warnings),
  Foundry 16/75, capacity 2/11 and 318 fresh original instrument shots pass.

The [final verification](FINAL-VERIFICATION.md) distinguishes original-author
comparisons, independent-lane measurements and the final reviewer's reproduction.
The original intake's exact bytes are retained with its SHA256 in [AUTHORITY](AUTHORITY.md).

## Independent local lane provenance

Every lane began at the same PR92 source. The published exhibition includes their
reproducible scripts and complete reports. These local source SHAs identify the
measured work; the final published tree is the durable integrated recovery point.

| Lane branch | Final local author/reviewer commit |
| --- | --- |
| `research/exhibition-player-20261127` | `7534ef07351a2a86e279748e693e010e54c24daf` |
| `research/exhibition-exchange-20261127` | `8d214ecaa2ef16a8341f93be144986a261725678` |
| `research/exhibition-hairpin-20261127` | `8e5bab5a0e35720066e6dab40edb93fa99352658` |
| `research/exhibition-arc-20261127` | `65cce22eb5ac6245b29249548b0de517e16ba711` |
| `research/exhibition-audio-20261127` | `5351ceb21034aa93f718dd523399871d9892f234` |
| `research/exhibition-review-20261127` | `f66be6f29d33fdc353ed226ff0b3b143952b2e7a` |

Native repository publication can produce different commit metadata/SHAs from
the local sequence. Publication verifies the complete Git tree, creates only the
new branch and uses expected-head updates with `force:false`. Existing branches,
PRs, previews and stored world/line identities are not replaced. No production
merge, promotion or deployment command is authorized or performed.

## Recovery and owner entry

1. Open the pinned exhibition preview in this branch's draft PR.
2. Read [OWNER-PLAY.md](OWNER-PLAY.md) before the numerical reports.
3. If cloning, check out the exact published source from the PR receipt. The
   original intake is under this folder; importable originals are under
   `worlds/instruments/exhibition/`.
4. Reproduce automated checks with [FINAL-VERIFICATION.md](FINAL-VERIFICATION.md).
   The musical/physics reports include focused commands and raw measurements.

WebGL is unavailable in the research browser; actual audio/HTML checks do not
certify rendered owner play. Arc's near-gap construction-history limitation stays
explicit. None of these boundaries changes the original admitted data.
