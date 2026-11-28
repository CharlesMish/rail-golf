# Final integrated engineering verification

All requested automated checks pass on the integrated player source:

- Commit: `3361e5e4ace14688179831cf2157a83fb2802e6b`.
- Tree: `c116009f33eb36db284813cf87e8a0938604298d`.
- Tested worktree: the director's `research/instrument-exhibition-20261127`
  checkout, not the review lane's older checkout.
- Foundation: PR92 `8278fee69fb1bd0c196c2d6fa258faaaaec452e6`.

The root was clean when checks began. Temporary browser/audio diagnostic routes,
fixture copies and the browser iframe helper were removed before the build.
The reviewer did not modify or commit root. Later director documentation and
measurement-script additions are separate from this exact tested source; compare
their source delta before transferring these results to a published checkpoint.

The reviewer subsequently checked root
`b2809cc3262ab1951e035126200a39dd7a475bf7`: its only additions after the tested
commit are Arc/browser-audio reports and the independent Arc measurement script.
No app, library, world, test or dependency source changed. The added script matches
the hash in its measured evidence and passes targeted lint with zero warnings or
errors. No production rebuild or full-test repetition was needed for that delta.

| Check | Result |
| --- | --- |
| `npm test` | Production build and **723/723** tests pass; zero failures, skips or cancellations |
| `npm run typecheck` | Pass |
| `npm run lint` | Zero errors, **five inherited warnings** |
| `node scripts/foundry/validate.mjs` | **16 entries / 75 actual-Havok probes** pass |
| Existing capacity fixtures | **2 entries / 11 actual-Havok probes** pass |
| Three original instrument/probe validators | **318 actual-Havok shots** pass; fifteen out-of-range neighbors remain explicitly rejected |

The five lint warnings are unchanged: two hook-dependency warnings in
`app/manners-game.tsx` and unused variables in the historical Chime Terraces
measurement, Foundry browse script and static sweep script. The build retains its
bundle-size advisory. No earlier test, validator assertion or rejection was
weakened. Compact results, source hashes and complete command-log fingerprints
are recorded in `final-verification.json`.

## Fresh original-submission comparison

This final reviewer independently reran the authoritative CLI against the six
files actually served by the exhibition. Each new report records the exact tested
root commit above. Results were compared with the other independent lanes' data,
not merely accepted because the CLI exited successfully.

| Original instrument | Central cases | Fired settings | Rejected boundary neighbors | Exact full physical/path/terminal comparisons | Exact interpreted musical arrays |
| --- | ---: | ---: | ---: | ---: | ---: |
| Exchange | 9 | 79 | 2 | 79/79 | 79/79 |
| Hairpin | 19 | 158 | 13 | 158/158 | 158/158 |
| Antiphonal Arc | 9 | 81 | 0 | 81/81 | 81/81 |

The complete physical hash includes actual contacts, sampled trajectory,
recognition, terminal and resonance history. The separate path/terminal checks
also match. Final interpreted musical arrays are bit-exact against this session's
independent lane measurements. This does not replace the reported Hairpin
comparison against *author-supplied* gains: 64 of those author comparisons differed
only in final floating-point bits. Both findings remain true.

Arc's exact final validator reproduction preserves its unsuccessful surrogate
predictions. It does not turn them into successful crossings. These ordinary probe
cases also do not erase the separately measured construction-history differences
at targeted simultaneous canopy contacts. That limitation remains in
`INDEPENDENT-REVIEW.md` and the Arc report.

## Independent source and identity checks

The preserved intake archive has SHA256
`991c18bb23d195db28517a54098bc759bed6ba6b01dabd8e07a36aadcacd3323`.
The reviewer opened its nested original author archives as data and compared each
original `instrument.json` and `probes.json` directly with the integrated files.
All six are byte-identical. This is stronger than comparing only the copied intake
manifest or reserializing accepted JSON; raw author order and formatting survive.

All **306 preexisting files under `lib/`, `worlds/` and `tests/`** remain exactly
unchanged from PR92. Every source hash emitted by the fresh instrument validators
matches the foundation. The only modified preexisting repository file is the
reviewed Counterline component, whose exhibition-seeding and presentation changes
reuse the existing runtime. The new collection, route and tests are additive.
Dependencies and physics/audio/recording implementations remain unchanged.

The actual tested worktree bytes were also checked against the tested Git tree
for app, library, world, test, script and public assets, plus package/config files;
there were no mismatches. The two historical reference documents, existing world
records and earlier tests are included in the unchanged-file audit. Remote branch,
PR and preview preservation is a separate publication check, not implied by local
file equality.

## Reproduction and evidence boundaries

From the final exhibition checkout, with its locked dependencies installed:

```sh
npm test
npm run typecheck
npm run lint
node scripts/foundry/validate.mjs
node scripts/foundry/validate.mjs worlds/foundry/capacity-24-passive worlds/foundry/capacity-24-active
node scripts/instrument-foundry/validate.mjs worlds/instruments/exhibition/exchange/instrument.json --probes worlds/instruments/exhibition/exchange/probes.json --output /tmp/exchange-final.json
node scripts/instrument-foundry/validate.mjs worlds/instruments/exhibition/hairpin-fable-v1/instrument.json --probes worlds/instruments/exhibition/hairpin-fable-v1/probes.json --output /tmp/hairpin-final.json
node scripts/instrument-foundry/validate.mjs worlds/instruments/exhibition/antiphonal-arc-v1/instrument.json --probes worlds/instruments/exhibition/antiphonal-arc-v1/probes.json --output /tmp/arc-final.json
```

These final checks do not rerun every coverage grid, seam fan, browser interaction
or acoustic render. Their results complement those separately sourced reports.
NullEngine physics, a passing build and test counts do not establish rendered
WebGL reliability, musical enjoyment, perceived balance or physical-phone frame
timing. Owner listening and exploration remain the intended next decision point.
