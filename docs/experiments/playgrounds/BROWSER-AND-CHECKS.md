# Next Playgrounds — verification boundaries

## Integrated automated gates

The final runtime source is present at local commit
`38fec06` on `research/next-playgrounds-20261121`. Subsequent packet changes are
reports and whitespace compaction of JSON evidence. Compaction was checked for
identical parsed values. No historical test was weakened.

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero errors; same five baseline warnings |
| `npm test` | Production build passes, then 617 tests pass; none skipped or cancelled |
| `node scripts/foundry/validate.mjs` | All 16 standard manifests pass exact recorded terminal/outcome/contact checks |
| `node scripts/foundry/validate.mjs worlds/foundry/capacity-24-active worlds/foundry/capacity-24-passive` | Both capacity fixtures pass |
| `git diff --check` | Pass |

The five inherited lint warnings are two React dependency warnings in
`app/manners-game.tsx`, and unused variables in the historical Chime Terraces
measurement, Foundry gallery browser script, and ORC sweep. The build retains
the existing bundler chunk/static-analysis warnings. These were not suppressed.
Baseline at Horizons had 570 passing tests; the final packet has 47 additional
tests covering physics, lifecycle, recording, audio and bounded author analysis.

Separate reviewers reran Theatre (10), Guest Stone (12), Cistern (4), and Saddle
(4). The audio and shared-shell review checked actual incoming normal speed,
startup mute, recovery view, malformed provenance and exact dirty-build identity.
The Guest review used an adversarial collider control: after terminal retirement,
the stone matches a fully removed projectile collider; deliberately restoring
that collider produces a different path. This test-only imposed stone velocity
is absent from gameplay evidence.

## Browser observations

Local Chromium desktop viewport: approximately 1364×936. Narrow check: an actual
390×844 same-origin iframe, not a physical phone or mobile Safari. The temporary
QA wrapper was removed before publication.

- Theatre initializes Havok, fires actual trajectories and ends on first ground.
  Both an open flight and a reflector-contact flight were completed and Kept.
- A normal keyboard aim detent changes the displayed setup. A second flight can
  be compared with the first; Restore restores the original setup without firing.
  The shared scrub control changes both recorded views. Keeps survive reload.
- Fire now scrolls both cloths into view before the first physics frame. At
  390×844, both cloths and the time control are visible after release. Mobile axis
  labels were enlarged without changing coordinates or metric scale.
- Cistern and Guest Stone display explicit WebGL-unavailable messages in this
  browser. Their 390 px shell widths match their scroll widths, and controls are
  present, but disabled 3D shells do not establish working camera or input flows.
- Cistern's frustum/occlusion checks use real geometry in NullEngine and are
  documented separately. They do not establish pixel legibility, lighting,
  overlay clearance or successful rendered phone play.

An initial local WASM fetch failed because `node_modules` pointed outside Vite's
allowed project directory. Localizing the existing dependencies resolved it.
No loader workaround, remote dependency, browser security change or production
runtime patch was introduced. The subsequent explicit WebGL limitation is a
separate fact, not another WASM failure.

## Audio and performance limits

New routes opt into familiar charge, launch, actual-contact and terminal voices.
Muted audio stops immediately; historical playback and scrubbing do not invent
new contact sounds. Unit tests and event wiring were checked. No subjective
audible-quality or loudness approval is claimed from this browser session.

All reported scene construction, rebuild and cleanup numbers are NullEngine CPU
measurements on a shared host. Theatre uses SVG, not GPU scene rendering. No
rendered 3D frame timing, draw-call trace, GPU memory measurement, physical-phone
benchmark or cross-browser/cross-Havok-version reproducibility is established.
Owned-resource counts returning to zero are narrower than proof of complete heap
reclamation. None of the automated evidence establishes human enjoyment.

## Publication authority

The pinned owner preview and hosted CI results are recorded in the associated
integration draft PR. New lane snapshots are listed in `PUBLISHED-LANES.json`;
their Git trees were compared exactly against the reviewed source trees.
The integration is based on Horizons, not main or the amphitheater branch.
No production/foundation ref or previous draft PR was modified.
