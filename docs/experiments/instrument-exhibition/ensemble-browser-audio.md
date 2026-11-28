# Exhibition: actual browser audio measurements

This appendix adds real browser audio results to `ensemble-report.md`; it does
not replace that report's separate actual-Havok, storage and injected-clock
checks. The director operated the temporary diagnostic page and supplied the
unaltered capture in `ensemble-browser-audio.json`. The audio reviewer inspected
its numerical results and the existing measurement implementation independently.
No shared physics or acoustic implementation was changed.

## Authority and method

- Physics/acoustic baseline: PR #92, `8278fee69fb1bd0c196c2d6fa258faaaaec452e6`.
- Diagnostic generator, actual-Havok sources and fixture commit:
  `dbb4877092541b1590786929cd71d0bf6b56c6d6`.
- Measured exhibition player: `ff982702ee600452570d0c4ef98dcb23543a35bb`,
  plus the temporary diagnostic installer from the fixture commit above. The
  shared audio engine is unchanged from PR #92.
- Browser surface: cloud Chrome through CDP; exact browser version and OS were
  not measured.
- Fixture: `ensemble-audio-fixtures.json`, SHA-256
  `1f101026a62fd0644c4240f73716ccc3e27966a4e7bf8e0e90e38432ac3d0606`.
- Raw browser capture, SHA-256
  `4641cd7a91a1b2e235f279fada66ca4876c986584a9b7b3566428bb61381b6c6`.

The generated `/lab/exhibition-audio-check` page invokes the existing
`measureEnsembleAudio` and `measureEnsembleClock` exports. No replacement
synthesizer or standalone audio engine is involved. Each source is an independently
validated actual-Havok recording with its own captured acoustic sidecar. The
third part is also historical material for these diagnostics, including when
notifications are supplied through the live scheduler entry point.

`OfflineAudioContext` rendered each layer separately and then all three together,
mono at 44,100 Hz. Each case uses one common window: the latest recorded physical
ending plus the existing 100 ms start buffer and 2.4 s tail allowance. Peak and
RMS cover that entire window. Node counts below are total oscillator/buffer
sources created, not simultaneous voices or total Web Audio graph nodes.

## Offline rendering results

| Actual recorded case | Every layer level | Attacks | Source nodes | Window, s | Mixed float peak | Peak, dBFS | Mixed RMS | Render, ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Space between: Exchange / Hairpin / Arc | 30% | 5 | 24 | 5.500 | .133499 | −17.49 | .012412 | 16.6 |
| Three independent: Exchange / Hairpin / Arc | 30% | 14 | 65 | 5.358 | .219661 | −13.16 | .017641 | 25.6 |
| Dense stress: the same Hairpin phrase three times | 30% | 30 | 132 | 5.608 | .342935 | −9.30 | .027881 | 50.8 |
| Dense stress: the same Hairpin phrase three times | 45% | 30 | 132 | 5.608 | .509766 | −5.85 | .040206 | 46.3 |
| Reference answer: Descending / Terraces / Hairpin | 30% | 12 | 56 | 6.583 | .169677 | −15.41 | .011236 | 25.5 |

None of these rendered mixed buffers reaches full-scale magnitude 1. The
three-copy dense case is intentionally a phase-aligned stress comparison using
one real phrase; it is not evidence that three independent instruments usually
line up this way. Its output is approximately three times the individual-layer
peak and RMS. Raising its permitted layer level to 45% increases the observed
peak to .510 without clipping this specific buffer. This is not a guarantee for
every possible record or combination. It does not justify raising the existing
36-attack budget or the 45% level ceiling.

Within each case's identical measurement window, individual-layer RMS was:

| Case, 30% | Layer 1 | Layer 2 | Layer 3 |
|---|---:|---:|---:|
| Sparse Exchange / Hairpin / Arc | .004632 | .008167 | .008169 |
| Rhythmic Exchange / Hairpin / Arc | .011454 | .009353 | .010030 |
| Descending / Terraces / Hairpin | .007538 | .006729 | .005881 |

In these specific examples a one-note Hairpin metal hit has more whole-window
energy than the sparse two-note Exchange source, while the nine-note Hairpin
source has less than the three-note Exchange source in the rhythmic case. This
is a useful warning against balancing by contact count or raw physical gain.
Phrase timing, strike speeds and captured timbre remain relevant. These are
unweighted signal measurements, not perceived-loudness measurements, judgments
of musical balance, or a reason to normalize the instruments automatically.
Different case windows also prevent a simple instrument-wide RMS ranking.

Render times are one browser's offline computation times. They are neither
rendered game frame rates nor real-time audio CPU guarantees; the lower time in
the 45% pass is ordinary run variation, not evidence that louder audio is cheaper.
The measurement includes the tail window but does not separately report its
final-sample amplitude or a perceptual tail-cut test.

## Actual AudioContext and requestAnimationFrame runs

These two runs use a real browser audio clock, existing source voices, the
100 ms common buffer, and recorded impact notifications delivered against
120 Hz tick accounting. They do **not** execute Havok in the browser.

| Recorded case | Scheduled attacks | Third-slot notifications | Frames | Longest frame, ms | Most due ticks | Late events | Started / naturally finished / active source nodes |
|---|---:|---:|---:|---:|---:|---:|---|
| Three independent, 30% | 14 | 2 | 256 | 16.8 | 3 | 0 | 65 / 65 / 0 |
| Dense Hairpin, 30% | 30 | 10 | 338 | 16.8 | 4 | 0 | 132 / 132 / 0 |

Both reached `finished`. For all 44 scheduled attacks, the requested target is
exactly `audioOrigin + recordedImpact.time`, and the scheduled time equals that
target in the captured double values. Notification-to-target headroom was
61.38–85.88 ms for the independent trio and 48.15–90.79 ms for the dense case.
All 197 created source nodes naturally ended; no active source remained in the
returned ledgers. The two runs recorded no cleanup-forced sources. These findings
support the existing scheduling buffer for the measured notification load and
frame conditions; they do not measure acoustic output-device latency, live
Havok/audio synchronization, or behavior on a slow phone.

The final raw entry records the explicit Stop UI receipt, `Stopped explicitly.`
It does not include a post-stop source ledger or context-state snapshot, so this
appendix does not upgrade that receipt into an independent measured cleanup
claim. The injected-clock lifecycle checks and existing tests in the companion
report establish separate cleanup evidence. No real browser suspension or
long-stall run is contained in this capture.

## Boundaries and next owner test

The director separately confirmed that the research browser could not obtain a
WebGL context. Offline Web Audio and recorded-clock checks remain valid without
WebGL; they cannot substitute for rendered instrument play. There is no listening
verdict in these numbers. The raw audio capture contains no browser/device
identification or WebGL diagnostic payload; those belong in the director's
browser verification record.

Retain the existing voices, gain limits and attack budget for this exhibition.
Owner listening should try a sparse companion against a rhythmic one, then
change which instrument is played live. Listen for masking, whether the gaps
invite a new gesture, and whether repeated contacts remain satisfying. These
questions require human listening and live rendered play.

To reproduce, install the temporary diagnostic with
`node scripts/exhibition/install-audio-check.mjs`, open
`/lab/exhibition-audio-check` in a browser with Web Audio, select each case and
press the explicit measurement buttons. The dense case additionally compares
30% and 45%. Remove the temporary route/public fixture with
`node scripts/exhibition/install-audio-check.mjs --remove` before publication.
Numerical launch recipes remain only in the technical fixtures and prior
measurement report, not the ordinary exhibition invitation.
