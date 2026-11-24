# Browser and integrated checks

## Viewport checks — 2026-11-23

The cloud Chrome browser explicitly reports WebGL unavailable when opening
`/lab/playability-cistern`. No rendered 3D architecture, camera comfort, live
browser Havok/audio synchronization or physical-phone performance is certified.
The browser can render ordinary DOM and Web Audio. Headless Havok evidence is
reported separately from this browser limitation.

The director tested the actual route CSS in the explicit
`/lab/places-viewport-check` fixture. It labels itself **synthetic, no physics**:
four populated Keep rows, five long attempt receipts and a 35-event spatial
receipt are layout stress content, not invented physical records. A local iframe
wrapper sets exact CSS-pixel viewports at 100% browser zoom; it does not emulate
phone hardware or mobile Safari.

At every row below, clicking the last-row control scrolled it into view. Shift-Tab
then moved keyboard focus to the adjacent prior control, with its complete bounds
inside the viewport. Returning to Fire also scrolled the actual firing area into
view. Body width matched viewport width throughout: no horizontal page overflow.

| Fixture / viewport | Focused lower control | Control y / height (px) | Scroll owner / total height (px) |
| --- | --- | --- | --- |
| Repeater 1280 × 600 | Use result 4 | 391.88 / 42.08 | Console / 3044 |
| Repeater 1024 × 480 | Use result 4 | 271.88 / 42.08 | Console / 3044 |
| Repeater 390 × 844 | Use result 4 | 640.58 / 42.08 | Page / 3001 |
| Repeater 844 × 390 | Use result 4 | 181.88 / 42.08 | Console / 3044 |
| Spatial 1280 × 600 | Raise, after Fire then Tab | 484.64 / 27 | Console / 807 |
| Spatial 1024 × 480 | Raise, after Fire then Tab | 393.41 / 21 | Console / 729 |
| Spatial 390 × 844 | Raise, after Fire then Tab | 729.47 / 27 | Console / 941 |
| Spatial 844 × 390 | Raise, after Fire then Tab | 303.20 / 21 | Console / 729 |
| Loops 1024 × 480 | Load pair | 290.44 / 44 | Page / 1150 |
| Loops 390 × 844 | Load pair | 687.34 / 44 | Page / 2209 |
| Loops 844 × 390 | Load pair | 209.16 / 44 | Page / 1346 |

The spatial result receipt independently exposes overflow:auto and a bounded
height (103–234 px in these views), while the complete console scrolls. The
production document remains overflow:hidden. No global scrolling policy changed.

These measurements establish reachable controls under stress. They do not
establish that small inherited 21–27 px fine-aim buttons are ideal touch targets;
larger-scale control redesign remains outside this corrective pass.

## Counterline audio and preserved Contact Loops

The actual browser OfflineAudioContext rendered the two bundled, previously
Havok-verified source histories separately and together at 44.1 kHz. The combined
six attacks used 28 oscillator/noise sources, with floating sample peak 0.165815
and RMS 0.011242. This is headroom evidence for these sources, not a subjective
musical-quality judgment or a bound on every possible import.

A separate visible QA action exercised the actual AudioContext and
requestAnimationFrame clock using recorded notifications. Across 544 frames,
the maximum observed frame interval was 33.4 ms and the maximum step budget was
three 120 Hz ticks. All six attack schedule times equaled their intended targets;
no late event was reported. Both ledgers finished all 14 owned sources and had
zero active sources. [Exact raw output](counterline-browser-audio.json).

This probe **does not run live Havok in the browser**. Fixed-step equivalence with
actual Havok is checked separately in the lane tests. The common 100 ms acoustic
delay is deliberate scheduling headroom, on top of device output latency; it is
not zero-latency audio/visual synchronization. Physical-phone timing and whether
the delay feels musically connected require owner play.

The unchanged Contact Loops activity was also opened at 390 × 844, restored its
prior saved pair silently, entered “Listening · pass 1 of 8” after Start, and
stopped via its explicit Stop. The direct-repeat route displayed its new controls
and explicit WebGL-unavailable fallback without a script error.

Counterline's real interface was also checked at 390 × 844, 844 × 390 and
1024 × 480. Page widths exactly matched those viewports. Keyboard Tab from
Import reached the footer link fully inside the viewport (y=716.95, 323.78 and
414.70 px respectively); its lower controls remained scroll-reachable. Choosing
a recorded companion stayed silent. The final QA Start/Stop action displayed
“Recorded timing probe stopped.” after a clean reload.

A local hot-update briefly preserved the old numeric import-generation ref while
new code expected an object, causing a development-only cleanup exception. A full
reload cleared that stale state; the clean-load cancellation check passed. This
was not an observed hosted runtime failure.

Exchange Yard's real 390 × 844 interface showed both station choices and its
explicit WebGL fallback. The selector was 237 × 36 px inside a 330 px container,
with no horizontal page overflow. Launch, recovery and shelf controls remained
inside the scrolling console. Rendered geometry visibility remains unverified.

## Integrated repository gates

Local integrated runtime `c031c60` passed the complete production build and
**677/677 tests**, no failures, skips or cancellations (47.689 s test phase).
TypeScript passed. Lint passed with zero errors and the same five inherited
warnings. Foundry validation passed all 16 standard and two capacity fixtures.
No earlier test was weakened. Later additions are reports/review artifacts and a
standalone navigation correction; the exact published candidate's CI result is
recorded in the integration PR.

The preview daemon was stopped before the complete build to avoid contention.
No failed build or weakened build policy was needed in this commission. Final
diff checks and published/local source-tree comparisons accompany publication.
