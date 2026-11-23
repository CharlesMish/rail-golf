# Verification and its limits

## Browser checks

The cloud Chrome browser reports WebGL unavailable on the original pinned PR81 Cistern and on the three new 3D routes. Their explicit fallback was observed. No rendered 3D scene, flight-follow camera comfort, visible rolling, live 3D control operation, GPU draw calls, rendered frame timing or physical-phone performance is certified.

Desktop and 390×844 iframe checks covered the new index, revised Cistern, Rolling Yard, Shot Repeater and Contact Loops. Each document measured 390 px client and scroll width in the phone frame: no horizontal overflow. The 3D fallback and visible inactive controls were inspected. During-flight Cistern controls and Repeater cancellation were source/geometry/lifecycle tested; unavailable WebGL prevented activating them in the browser. The phone wrapper was temporary and removed before publication.

Contact Loops does not require WebGL and ran in the browser. Checks observed: loaded actual example sources, explicit Start→Listening state, layer mute, Stop, the second-layer entrance choice, Save pair, reload with the same sources/entrance and no playback, and phone-sized Start/Stop. The source selectors, timing diagrams and buttons fit the phone frame. Browser interaction is not a claim of subjective listening quality. Import parsing/races, cancellation, scheduling limits, delayed/suspended audio, repeated disposal and source restoration were covered by focused tests and independent review.

The page's explicit QA diagnostic rendered two passes through the actual shared synthesis and mix limiter using **browser OfflineAudioContext at 44,100 Hz**. The aligned pair scheduled 12 attacks / 56 oscillator-or-noise sources across the render; its floating peak was 0.138045 and RMS 0.010515. The delayed pair peak was 0.123695 and RMS 0.008954. Neither sampled render clipped. Six complete measurements (solo A/B and combined, aligned/delayed) are in [loops-browser-audio.json](loops-browser-audio.json). These are output/scheduling observations, not loudness-comfort, speaker, auditory-quality or real-time-performance measurements.

Local dev displayed the build identity fixed at server startup; it is not evidence that later loaded code has that older Git identity. Final hosted build identity is verified separately in the draft PR. All kept provenance strings preserve the build actually displayed by their executing application.

## Automated and independent checks

The clean PR81 control passed 617 tests. Integrated new runtime passed 655 tests, including 38 new cases, without weakening historical tests. TypeScript passes; lint has zero errors and the same five inherited warnings; the standard16 and explicit capacity2 Foundry fixtures pass. Production build passed in the integrated run. A later repeat build was killed with exit137 during SSR bundling while the preview was active; the preview was stopped and the final serial build/test result is recorded below. No code or test was weakened in response.

The individual physical reports record ordinary-detent neighbors, unsuccessful cases, exact restoration, fixed-step render partitions, repeated reset/switch/disposal and source identities. [Independent review](INDEPENDENT-REVIEW.md) challenged the lifecycle and interpretation; it caught recoverability and provenance issues before publication. A separate audio reviewer reproduced both bundled sources against untouched PR81 and reran all thirteen audio tests.

NullEngine timings are shared-host CPU observations. Owned-resource counts returning to zero are useful cleanup evidence, not proof of complete JavaScript/WASM heap reclamation. The new audio listener has no physics bodies; the 3D environments' rendering cost remains unmeasured in this browser.

Final serial verification at integrated source `cdcd6093ea810db41a3c25e9ba9fdcae013db9f3` (later packet changes are documentation only): **`npm test` passed its complete production build and 655/655 tests**, no failures, skips or cancellations; test phase22.569s. Final TypeScript and lint also passed with the same five inherited warnings. Logs remain in the workspace as `playability-release-serial.log`, `playability-release-typecheck.log` and `playability-release-lint.log`. Foundry16+2 validation logs are `playability-final-foundry.log` and `playability-final-capacity.log`.
