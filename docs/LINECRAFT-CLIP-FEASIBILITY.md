# Linecraft local clip feasibility

Decision for this slice: document feasibility; do not add an Export Clip button. Restore and explicitly labeled sampled replay establish the viewing contract first. No accounts, uploads, platform APIs or social integrations are needed for a later local exporter.

## Concrete later implementation

A deliberate Export Clip action can render the kept historical path, capture the Babylon canvas with `canvas.captureStream(30)`, send that MediaStream into MediaRecorder, collect Blob chunks, then offer a local preview and download. Capture only a short fixed-camera replay at modest resolution initially. Stop tracks, revoke object URLs, restore the camera and handle cancellation or recording failures explicitly.

Canvas capture and MediaRecorder are broadly available. Runtime feature detection and actual recording validation remain necessary: a positive `MediaRecorder.isTypeSupported()` result does not guarantee sufficient resources to encode. Canvas capture requires an origin-clean bitmap. This is a feasibility finding, not a tested browser-support certification for Rail Golf.

| Browser family | Candidate encoding | Required checks |
|---|---|---|
| Desktop Chrome/Edge and Firefox | WebM/VP8; optional VP9 | Detect the exact MIME, catch construction/start/runtime errors, verify nonempty playable output. |
| Safari on macOS/iOS | H.264/MP4 when supported; WebM on newer Safari | Detect rather than assume. WebKit added WebM VP8/VP9 recording in Safari 18.4, so “Safari only records MP4” is obsolete. |
| Mobile browsers | A detected supported format | Validate on device; cap duration, resolution and memory; require foreground rendering; stop or cancel on page hiding. |

The file extension must match the actual recorder MIME/container. Renaming WebM to `.mp4` does not transcode it. A later exporter should try supported candidates, use `recorder.mimeType` for the output, and avoid promising one universal codec.

## HUD, camera and audio

The Babylon canvas contains the selected 3D camera image. React's DOM HUD is outside that canvas and is excluded from direct canvas capture. A clean clip can therefore omit controls naturally. To include a title, provenance label or event captions, draw the game canvas plus a deliberately small HUD into a separate compositing canvas; arbitrary page/DOM capture is unnecessary. A fixed or explicitly controlled replay camera is simpler than reproducing the original camera, whose transforms are not currently recorded.

Begin with silent video. Canvas capture does not include the Web Audio graph. Audio would require a combined audio stream and replay-time sound events; live shot sounds are not historical audio recordings.

## Authority and determinism

The Linecraft replay helper walks the sampled historical polyline by distance over a fixed six-second viewing interval. Existing samples have no timestamps. This is approximate-time visual reconstruction, not a new physics run, a timing-faithful recording or proof of deterministic physics. Interpolated segments may visibly cut corners between samples. Original projectile rotation, camera motion, moving world events, sound and debris are not captured by the current trail.

For a richer faithful recording, capture aligned physics-time trajectory samples, projectile orientation, timed environment events and desired camera transforms. Preserve the ordered event ledger and original score independently; replay and export must never award or recompute game outcomes.

MediaRecorder captures in real time and may drop frames under load. Its chunk delivery interval is not a dependable replay clock. Browser backgrounding and mobile screen locking introduce additional interruptions; cancel or pause the exporter with an explicit visible state instead of treating elapsed wall time as captured footage. Do not claim support for seamless background export.

## Primary browser documentation checked

- [MDN: HTMLCanvasElement.captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream) — canvas video stream, frame-rate parameter and origin-clean requirement.
- [MDN: MediaRecorder.isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) — MIME detection and possible resource-related failure even when supported.
- [Chrome Developers: Capture a MediaStream from a canvas](https://developer.chrome.com/blog/capture-stream/) — canvas recording composition, captured dimensions and frame-rate limits.
- [WebKit: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/) — recording streams generated from Canvas/Web Audio, including H.264/MP4 support.
- [WebKit: Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) — WebM VP8/VP9 recording and expanded codec/container support.
- [MDN: MediaRecorder dataavailable](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event) — delayed chunk delivery, mobile locking behavior and why chunk count is not elapsed-time authority.

Checked 2026-09-22. No browser recording or mobile codec qualification was performed in this commission.
