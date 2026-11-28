# Independent ensemble and acoustic review

Base and measured engine source: `8278fee69fb1bd0c196c2d6fa258faaaaec452e6`
(PR92), branch `research/exhibition-audio-20261127`. Original instrument bytes
are read unchanged. Their common declared kit is
`3c67ceb9de1739c23092f6fdd8680b9047536a9f`; that declaration is not substituted
for independent physical measurement. `ensemble-evidence.json` records source
file hashes, original JSON hashes, ordinary settings and actual event parameters.

## Evidence authority

This lane independently creates 22 fresh actual-Havok source records: selected
submitted phrases and negatives from all three originals, three additional Arc
relationships found by the independent spatial review, one ordinary Hairpin
neighbor and both unchanged reference openings. It does not use the authors'
physical or surrogate trajectory outputs as replay authority. No submitted
geometry, voice setting, pitch, fixed-step rule or engine coefficient is edited.

The source-generation and solo/duet/trio comparisons use Babylon NullEngine and
120 Hz Havok. Audio scheduling initially uses an explicit deterministic fake
AudioContext/node-ledger fixture: it establishes scheduled parameters and cleanup,
not sound, real device latency or listening. The optional browser harness below
uses the existing actual Web Audio functions separately. Owner musical enjoyment
is not inferred from any of these numbers.

## Different useful material, without assigning fixed musical roles

| Independently reproduced material | Actual phrase relationship |
| --- | --- |
| Exchange near ramp | One short timber C4 contribution |
| Exchange ramp then middle | Timber C4, then tuned timber-bank A4 after a 2.275 s gap |
| Exchange continued exchange | Three contacts across metal/timber/metal, spanning .875 s |
| Hairpin centre swell | G4/E4 alternating five impacts in .792 s, but two sport redirects |
| Hairpin hard centre swell | Same five-note order in .408 s, with stronger intervening metal impacts |
| Hairpin west roll | Nine alternating timber/metal impacts in 1.367 s, two sport redirects |
| Hairpin single lid | One metal E4 strike rather than a compulsory roll |
| Arc ramp to canopy | Two contacts .783 s apart; western and eastern versions retain different authored material/pitch relationships |
| Arc independently found wing reply | Tuned timber D4, then metal G4 .967 s later |
| Arc canopy centre / throat | Separate accessible single metal strikes, reproduced at the independently found ordinary settings |

These observations support potential ensemble contrast. Exchange can leave a long
space after its first contribution. Hairpin can produce a compact accelerating
and slowing alternation, while also allowing a single strike. Arc offers material
contrast and vertical exchanges. They are not claims that the instruments have
fixed musical roles or that the recorded combinations sound satisfying.

Negatives remain audible-history evidence rather than removed exceptions.
Exchange's wide low miss is silent. Arc's submitted throat recipe is also silent;
its submitted west-to-east opening gives one bank strike, not the predicted reply.
The separately measured Arc settings do not overwrite those original recipes.
Hairpin's underpowered example gives five progressively softer G4 strikes over
3.942 s before reaching ground at 4.792 s. That slower repetition may simply make
a player wait. The successful compact roll does not redeem every repeated-contact
ending, and contact count alone cannot select between them.

## Acoustic parameters: the profile name is narrower than its behavior

All three originals explicitly capture `normal-speed` plus `tuned-even`. Physics
records retain the original normal-speed smoothstep gain and measured face speed.
Playback applies the captured interpretation to a copy; it never rewrites the
contact ledger, timestamps or pitches.

In the current engine, `tuned-even` applies an 18 dB even-decibel gain curve to
**all** impacts, including metal and timber ramps/plates. It gates face speeds
at or below 1 m/s and fades between 1 and 2 m/s. Only a **timber bank** receives
the longer tuned timber voice, trim 1.36, strike colour and narrower 12 dB range.
A metal bank remains metal. Hairpin has no banks, so it retains canonical timber
and metal timbres while its softer contacts still use the changed gain curve.
The author's description of lifted soft contacts is consistent with that code.

At 4 m/s into the face, stored smoothstep gain is .042969, ordinary H-profile
playback is .191767, and a timber bank is .332544 before its voice-specific trim.
At 16 m/s these values are .5, .528436 and .653625. This explains why physical
gain alone is a poor relative-loudness comparison. The gate also means a tiny
positive physical impact need not schedule an audible attack in this profile.
Actual reported phrases retain both raw and playback gain per contact.

The independent Hairpin spatial review separately reproduced all 158 full physical
histories exactly. Its recomputed playback gains differ from submitted final-bit
values in 64 runs, by at most `1.1102230246251565e-16`; pitches, timing, event
structure and recorded physical gains match. This is floating-point recomputation,
not evidence of a changed acoustic interpretation or an audible difference.

## Physical independence, memory and lifecycle

For one meaningful live phrase from each new instrument, zero, one and two
companions were tested under 30 Hz, 144 Hz and mixed frame partitions while the
physics cadence stayed 120 Hz. All **27 complete physical payloads** equal their
fresh solo controls: world, setup, launch, contacts, full sampled path, redirects,
terminal and resonance history. The recorded companions never add a body or a
contact. Ready body counts are seven for Exchange and fourteen each for Hairpin
and Arc; only one additional dynamic projectile exists during a shot.

All measured fire/reset cycles return to their ready counts. Runtime disposal
leaves zero physics bodies; scene disposal leaves zero meshes/materials. These
are runtime-only resources, excluding rendered presentation, shadow maps and real
Web Audio allocations. They do not establish GPU or phone performance.

All 22 captured sources round-trip their complete physical snapshot and validated
acoustic sidecar. Explicit Restore selects the captured profile, even without a
catalog entry. Four complete arrangements round-trip through the existing bounded
library in 208,141 serialized characters; a fifth is refused without modifying
the prior bytes. The four-Keep shelf does not erase sources already copied into
an ensemble. No library or format expansion was necessary for this exhibition.

The deterministic scheduler preserves every original timestamp +100 ms, with no
late events in the physical comparisons. Stop, suspension, a long scheduling
stall, a late live notification, mute/unmute and a new Prepare each retire their
timers/owned nodes and close each context once. The existing historical focused
suite covers further cancellation and recording contracts; 35/35 tests pass.
The fake ledger counts cannot stand in for a real browser audio-node audit.

## Density and the 36-attack bound

The four preserved recorded-only fixtures use actual physical sources:

| Fixture | Positive attacks | Maximum overlapping conservative 2.4 s lifetimes | Scheduled source nodes* |
| --- | ---: | ---: | ---: |
| Sparse replies, three new instruments | 5 | 5 | 24 |
| Rhythmic trio, three new instruments | 14 | 14 | 65 |
| Three copies of a real dense Hairpin neighbor | 30 | 30 | 132 |
| Two references answering Hairpin | 12 | 12 | 56 |

\* Total oscillator/noise-source starts inferred from the unchanged voice recipe
in the scheduling fixture; not peak concurrent nodes or a real rendered-node cost.
All four finish with complete scheduled attacks, no late events, no active ledger
nodes and no timer. Natural tails are allowed to finish after the physical ending.
The repeated-Hairpin trio is a stress comparison, not a new physical instrument,
three simultaneous balls, or a recommended musical arrangement.

All 280 selected cross-instrument combinations have at most 15 overlapping
attacks. The three-copy Hairpin test reaches 30, below 36. This bounds the sampled
material, not all possible launches or imported records. There is no evidence
here that the shared budget needs expansion. Lowering a positive layer level does
not reduce its attack count; muting or setting it to zero does.

A separately labelled **synthetic notification** guard test submits 37 same-time
live notifications. The existing engine schedules 36 then interrupts explicitly,
stopping all previously scheduled sources; it never silently drops the excess
while pretending playback succeeded. This is not a measured playable phrase or
fabricated saved physical line. The existing repository test also verifies
recorded preflight rejection. No actual selected trio exceeded the bound.

## Reproduction and browser measurement boundary

```sh
node scripts/exhibition/measure-ensemble.mjs worlds/instruments/exhibition docs/experiments/instrument-exhibition
node --test tests/counterline-ensemble.test.mjs tests/counterline-repertoire.test.mjs tests/counterline.test.mjs
```

The first script independently generates sources, comparisons, arrangements and
resource/lifecycle assertions; it requires the exact original files in those
three instrument directories. `ensemble-audio-fixtures.json` preserves four
complete actual-Havok arrangements solely as technical evidence. It contains
numerical setups and is separate from the owner's ordinary invitation.

For explicit browser measurements without modifying the production interface:

```sh
node scripts/exhibition/install-audio-check.mjs
# Run local dev preview, open /lab/exhibition-audio-check, use explicit buttons.
node scripts/exhibition/install-audio-check.mjs --remove
```

The temporary route calls existing `measureEnsembleAudio` and `measureEnsembleClock`.
Offline renders measure individual layers and the combined mix at the same case
window and 44.1 kHz; the selector compares default 30% and permitted 45% levels.
The clock probe plays recorded notifications, not live Havok. Root's browser
verification owns any resulting actual audio measurements and their limits.
The installer and fixtures are reproducible; its temporary app/public files must
be removed before publication. TypeScript and targeted lint pass for the generator,
measurement script and generated page. No shared runtime source is changed.

RMS/peak from these fixtures would describe specific phrases, timings, registers
and levels. They cannot establish perceived loudness, relative instrument quality,
listening comfort, physical-phone behavior or how the owner will arrange a trio.
No automatic normalization or acoustic revision is proposed before owner listening.
