# Refinement verification

## Automated and physical authority

| Check | Result |
| --- | --- |
| Unchanged PR84 production build and full tests | 677/677 pass |
| Integrated production build and full tests | 691/691 pass |
| TypeScript | Pass |
| ESLint | 0 errors; 5 inherited warnings |
| Foundry validator | 16 ordinary entries pass |
| Explicit capacity validator | Both 24-piece fixtures pass |
| Independent focused review | 16 spatial/shelf tests and 21 Counterline tests pass; final affected import/policy tests repeated |

The integrated build/full-suite source is
`a75517e7d4052a6cb61d896ab1298a74d5fd9db3`. Subsequent review/publication additions
are documentation. Final exact published CI is recorded in the draft PR.
TypeScript/lint were rerun after the last import/policy correction. No historical
test was weakened. The inherited lint warnings are two production React hook
dependency warnings and three unused variables in historical research scripts.

Commands: `npm run typecheck`, `npm run lint`, `npm test`,
`node scripts/foundry/validate.mjs`, and the same validator with
`worlds/foundry/capacity-24-passive worlds/foundry/capacity-24-active`.
The normal full test command includes the production build.

Actual Havok evidence and exact source hashes are in the spatial and musical raw
packets. Neither painted marks nor predicted trajectories count as physics.
Independent review confirms unchanged roof collision replay, v1/v2 Yard memory
separation, historical acoustic gain preservation and Contact Loops compatibility.

## Browser layout

The cloud browser again reports WebGL unavailable on the old pinned Yard and the
new actual Yard/Counterline routes. **No rendered roof, shadow, flight-camera,
live physics/audio feel, rendered frame-rate or physical-phone claim is made.**

At ordinary zoom, the actual shared YardControls component/CSS was exercised in
the clearly labelled `/lab/yard-viewport-check` fixture, with 35 synthetic receipt
rows and four synthetic Keeps. It does not simulate a shot or create a record.
Exact iframe CSS viewport sizes avoid changing browser zoom.

| Viewport | Scene size | Console size | Horizontal overflow | Keyboard access |
| --- | --- | --- | --- | --- |
| 1280×600 | 940×600 | 340×600 | 0 | Fire/Retry and last Keep reached |
| 1024×480 | 739×480 | 285×480 | 0 | Fire/Retry and last Keep reached |
| 390×844 | 390×379.797 | 390×464.203 | 0 | Fire/Retry and last Keep reached |
| 844×390 | 559×390 | 285×390 | 0 | Fire/Retry and last Keep reached |
| 1366×768 | 1026×768 | 340×768 | 0 | Fire/Retry and last Keep reached |

Scene and console rectangles do not overlap. Native range keyboard changes and
half-degree nudge buttons update displayed values. Ready/result/flight fixtures
exercise Stop, Keep and Next shot. The final flight guard hides mounted history
while watching: after scrolling to the last Keep at 844×390, entering flight
returns console scrollTop to 0, with Stop/Retry between y=143.578 and 183.578
inside the 390 px console. Disclosure state remains preserved when play resumes.

On the actual Yard fallback page, opening About and choosing Original changes
the URL to `?layout=original`, changes Freight to Service, and remounts a silent
world. The 40% power label, slider and Fire label agree even during loading/error.
These observations establish DOM and selection behavior, not physical play.

The actual Counterline route was checked at 390×844, 844×390 and 1024×480.
Document and main scroller have no horizontal overflow; footer/control access
works through keyboard scrolling. The source reveals all four world choices,
labelled curated setup and original-opening option. Physical actions remain
disabled in the WebGL fallback, so actual launcher/world switching, rendered
geometry and live-fire usability still require the owner's enabled browser.

## Browser audio

Actual OfflineAudioContext rendering and actual AudioContext/rAF scheduling were
run through the visible `?qa=1` controls on three rich-world pairs. These deliver
recorded actual-Havok notifications; they are **not live Havok in the browser**.

| Pair | Scheduled attacks | Combined offline peak | Largest measured rAF interval | Voices remaining |
| --- | ---: | ---: | ---: | ---: |
| Descending / Descending | 6 | 0.20263336599 | 33.3 ms | 0 |
| Terraces / Terraces | 7 | 0.40774446726 | 33.3 ms | 0 |
| Descending / Terraces | 7 | 0.25358784199 | 33.4 ms | 0 |

Every scheduled attack equals its original target time in these runs; none is
late. All pairs finish naturally. An explicit Stop test reports stopped and does
not later replace that state with a stale completion. All offline renders use
44.1 kHz, the fixed 0.45 layer gain and common 100 ms acoustic buffer.
[Concise raw audio evidence](browser-audio.json) includes each target, scheduled
time, observed clock and voice count. Offline peaks are not musical-quality or
device-loudness measurements. Actual output latency and owner listening remain
unmeasured.

## Performance and remaining limits

The Yard adds zero bodies, meshes or shadow casters over its original layout.
Both richer musical worlds retain their historical geometry costs. Measured
build/switch/reset CPU timings and ownership cleanup are in the lane reports;
NullEngine is not a rendered benchmark. GPU/heap reclamation is not proven by
zero owned-resource counts. No physical-phone benchmark was available.

The preserved Descending seam/construction-history discrepancy is a physical
replay limitation, not merely an audio difference. Stable selected families and
same-initialization comparisons pass; universal equality across all world-loading
histories is not promised. See `counterline-physics.md` and its numerical appendix.
