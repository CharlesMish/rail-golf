# Verification and interpretation boundaries

Baseline owner-played source `10b09baafc9d85eef0d87a630b55600d623dcde0`
passes its production build and 709 tests. The primary final code source
`33e9383eaf316c876d291c66b89a1cc1329a3375` passes the following checks;
later changes are director documentation and the deterministic starter package.
No earlier test was weakened. `automated-checks.json` and
`verification-output.txt` retain counts, outputs and command-log fingerprints.

| Check | Result |
| --- | --- |
| `npm test` | Production build plus 720/720 tests; no failures/skips/cancellations |
| `npm run typecheck` | Pass |
| `npm run lint` | Zero errors, five inherited warnings |
| `node scripts/foundry/validate.mjs` | 16 entries, 75 actual recorded shots pass |
| Capacity fixtures | Two entries, 11 shots pass |
| Instrument validator: Descending probes | Seven central +51 valid neighbors; five boundary neighbors explicitly rejected |
| Instrument validator: Terraces probes | Seven central +52 valid neighbors; four boundary neighbors rejected |
| Independent author fixture | Three central +23 valid neighbors; one boundary neighbor rejected |
| Imported solo/duet/trio replay | Identical complete physical payload; independent source snapshots, record round-trip, catalog reset, no retained bodies |

The focused independent review also passed 46 instrument/audio tests, ten roof
checks and three geometry checks. The separate roof publication passes 710 tests;
the separate geometry publication passes 712. Those counts belong to independent
branches, not an imagined combined implementation. Their own reports retain
full reproduction details. Hosted verification is recorded in the publication
receipt for each exact remote commit.

The wrapper adds no physical bodies, meshes or materials. Reference runtime-only
ready counts are 14/23 static bodies, 20/41 meshes and 13/25 materials; firing adds
one live body/mesh. Repeated fire/reset returns ready counts; disposal returns
zero counted resources. Presentation, trails and shadow resources are excluded
from those harness counts. Scene construction measurements are noisy NullEngine
CPU observations, not rendered FPS or phone performance.

## Browser observations

Cloud Chromium cannot initialize WebGL in this environment. The existing baseline,
new audition and published roof comparator show an explicit unsupported-renderer
message. An installed native Chromium attempt did not provide an independent
working renderer. No rendered roof repair, camera comfort, listening result,
Web Audio timing measurement, GPU memory or physical-phone frame timing is claimed.
The real page remains useful for checking author-file behavior and interface flow.

The new route was inspected through actual controls: unsupported format and
conflicting ids rejected, valid import admitted, exact reimport idempotent, and
two companions retained across another instrument import. Import stays silent
and explicitly says no physical shot ran when rendering is unavailable. Reload
clears session instruments while the populated saved-ensemble shelf remains.
The original Counterline route retains its four authored worlds.

A temporary same-origin iframe harness tested 1280×720, 1024×600, 390×844 and
844×390 CSS viewports. Each page has vertical scrolling, equal scroll/client width,
and no horizontally clipped button/select/textarea/input. The phone view included
the expanded paste panel and four saved ensembles; keyboard focus scrolled to the
bottom Stop control and following link. These are layout observations, not mobile
hardware rendering. `browser-checks.json` retains exact measurements. The temporary
harness was removed before the production build.

The three genuine owner ensemble sources validate and replay exactly in equivalent
fresh 120 Hz scenes. Fake-clock acceptance probes establish unchanged timing and
source isolation, not audible musical quality. The existing 100 ms shared clock,
voice budget, acoustic sidecars and recording formats are reused. No new scheduling
algorithm was introduced. Owner enjoyment remains the owner's reported evidence.

## Known inherited boundary

Descending has documented construction-history sensitivity at shared surfaces.
Exact replay statements compare equivalent fresh scenes and ordered documents;
they are not a guarantee under every previous world-switch history. See
`reference-evidence.md` and the prior refinement physics report. Musical onsets,
raw solver callbacks and qualified sport redirects remain distinct measurements.
