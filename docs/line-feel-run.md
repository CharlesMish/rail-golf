# Open Line play-feel / recognition pass

**NON-CANONICAL PLACEHOLDERS.** This supersedes the default layout and accounting in `open-line-saw-bay.md`. `/lab/lines` remains experimental. Production Cards 01–03, objective/progression/record rules, scene colliders and launcher physics remain frozen. The only production input addition is the MAX latch and explicit saved-power authority when recalling a line.

## Open Line stations

Card 04 remains one `mode: 'score-only'`, `target: null` card. Its `allowedStations` are Yard Gate and Lumber Walk. The primary control strip offers the two stations; choosing one retains Open Line rather than selecting a golf card. Each uses its existing real station transform and appropriate authored opening aim. Retry retains the chosen station. Recent lines name their station; Recall and ShareLineV1 restore that station and exact launch power. The Open Line session best spans its two viewpoints.

Saw Bay is parked from default station controls and default scene decoration. Its definition, physical fixtures and explicit historical `/lab/lines` share links/saved-line recalls remain supported. An old Saw Bay link deliberately restores Saw Bay; a fresh Open Line starts at Yard Gate. No ground extension, new roost, new switch or scenery relocation was added. No production station changes.

## RUN and VARIETY

Weights are still centralized in `lib/line-score.js`: COMMON 100; existing NAMED/Direct claims 250; directed Bank sequences 500; Tread Run 600; FINISH 500. No multipliers or new progression.

`lib/line-run.js` contains the **NON-CANONICAL** RUN parameters:

**RUN = min(250, 25 × floor(D / 20))**. The small follow-up seasoning patch raises the cap and decreases milestone spacing; eligibility is unchanged.

D is accumulated three-dimensional path length at the existing 120 Hz physical step, starting only after the first non-FINISH claim has actually been established. No retrospective launch or pre-confirmation path is included. The segment must be free of solid contact, at least 0.10 seconds after the last contact callback, and moving at least 3 m/s. The sampling origin still advances on rejected steps, so distance during contact cannot leak into the next free segment. Scraping, settling, callback frequency and time alive add nothing. Safety/OOB/ground resolution stops accumulation. Retry banks earned claims and eligible RUN before ending the old shot.

The live ledger emits only discrete RUN milestones, plus a final distance snapshot. A milestone gets a brief `+25 · RUN` caption. The receipt separates RUN and its eligible metres from VARIETY and claim points. Saved receipt snapshots include `run` and `runDistance`; older snapshots load with zero for these new fields. ShareLineV1 retains its version and deterministic setup contract, without trajectory samples.

**VARIETY = min(200, 50 × max(0, N − 1))**, now counting distinct non-FINISH qualified claim IDs only. FINISH never adds variety. A simple Direct + seat therefore totals 750. RUN and VARIETY do not count themselves or recursively generate claims. Receipt rule set: `placeholder-v5` (instrument provenance, not a semantic game version).

## CASCADE LINE recognition follow-up

**CASCADE LINE = 400 NON-CANONICAL points**, once per shot, for qualified departures from three distinct Cascade assemblies in authored order 1 → 2 → 3. Both tread-body side redirects and timber-support departures can supply assembly evidence. Identity comes from the existing authored tread/support body IDs in confirmed redirect records, never from raw contacts, caption text, duration or callbacks. Each assembly contributes to this relationship only on its first qualified departure; revisiting a stack cannot repair a wrong-order sequence. Unrelated yard geometry may appear between those departures.

The strict top-face `TREAD RUN 1 → 2 → 3` remains 600 and retains its exact predicate. It supersedes the broader 400-point caption on a strict traversal, so the same three-stack journey does not receive both relationship awards. COMMON components and the existing non-FINISH VARIETY formula remain unchanged. The weights and this precedence are declared in the same rule table. Production `cascadeContactTag`, Card 03 stamp authority, objectives and physics are untouched.

Focused follow-up checks cover the 200 m RUN cap threshold and 267 m saturation, a real empty MAX lob with RUN 0, the existing strict physical top/top/top fixture, a real reproducible Lumber Walk top/side/top line earning CASCADE LINE without TREAD RUN, wrong order, duplicate assemblies, chatter and source-config replacement. No wind, diverter, camera, station or geometry change accompanies this patch.

## Assembly contact episodes

The generic speed, turn, duration, separation and free-flight gates are unchanged. A pending candidate can continue across explicitly tagged bodies within the same short contact episode:

- mill exterior wall, columns and roof panels → `MILL REBOUND` when multiple bodies participate;
- saw carriage and blade → existing `SAW ASSEMBLY REJECT`;
- an individual Cascade tread and its timber support → `LUMBER REBOUND` when both participate; other lumber bundles have their own assembly identity.

The first incoming velocity and episode start remain authoritative. Switching bodies does not restart the duration clock. The last outgoing velocity/contact point supplies departure evidence. Confirmation still requires at least 4 m/s incoming speed, 3 m/s outgoing speed, 25° turn, no more than 0.12 seconds total contact episode, 0.10 seconds free flight and 1 m separation, within the existing 0.65-second confirmation window. Both the aggregate claim and its participating member IDs are marked paid. Continuous multi-body rattles cannot mint claims. Separate free-flight departures from distinct parts may still score those parts independently. Unrelated solids interrupt; rejection diagnostics remain in the forensic ledger.

The ordinary physical loading platform was already tagged. A new real Havok regression confirms its `LOADING PLATFORM REBOUND` COMMON caption. No diverter semantics were reintroduced. Roof interior safety fill stays unscored; decorative trim, fences and other untagged geometry remain unscored. No automatic global grouping or threshold lowering.

## Camera and MAX

The lab follow rig transports camera and target by the projectile's frame displacement, then eases their offsets. High/fast vertical shots pull the rig farther back and higher with less forward target bias. Screen displacement can smoothly widen the lens toward a generous framing region; the lens eases back during descent. Heading uses wrapped angular interpolation, including exact reverse-yard returns. Existing landing focus remains. This is presentation-only: no timestep, launch speed, Havok state, time scaling or scoring samples change. Production camera behavior is unchanged.

`MAX · 100%` is a primary toggle in both production and lab; **X** toggles it outside text inputs. With MAX on, orange reads `FIRE MAX · 100%` and pointer/keyboard press fires immediately at the same `chargeToSpeed(1)` as a completed manual charge. Release cannot fire a second shot. Retry retains MAX. With it off, the existing selected hold/set mode resumes. Explicit Recall/import chooses exact Set Power and clears MAX; changing precise power controls also clears it. The mobile control is a normal tap target. A copied current MAX setup contains exact full launch speed.

## Verification and remaining human review

Focused regressions cover target-free physical completion from both stations, identical Retry/share outcomes, parked Saw Bay compatibility, RUN start/contact/settling/milestone/cap rules, FINISH exclusion, duplicate resistance, synthetic and real mill multi-body departures, prolonged assembly chatter, distinct departures, actual platform rebound, a real roof line's post-contact RUN, exact MAX speed and latch authority, and extreme camera framing plus reverse heading. Existing Yard/Gallery/Cascade route/claim, roof closure, long-flight safety, share and production fixtures remain required.

No score balance matrix, new named gap, third-station redesign or scoring economy is established. Camera comfort and the relative feel of RUN remain Charlie's manual playtest questions. The available automated browser has previously lacked WebGL, so deterministic camera math and Havok checks do not substitute for a rendered flight review.
