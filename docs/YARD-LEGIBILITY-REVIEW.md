# Yard legibility — director review

Starting authority: `cd9d41ddf6349b47e8d0035fd1707299ac255d55`.
Branch: `fix/yard-legibility-review`. Draft review only; no merge or production deployment.

## Diagnosis and scope

| Category | Finding | Decision |
| --- | --- | --- |
| Incorrect information | Target world Z was printed as metres; Cascade's three tags enabled a Bank B label and bank paint. Its hidden fallback said BREAK THROUGH. | Use station-centre plan distance and explicit feature identities for public courtyard cards. |
| Screen hierarchy | Every chip competed at the projected point; portrait Bell/Sky and the three treads collided. The always-open Route Book covered the phone's course. | Prioritize target and authored surfaces, show optional labels with route focus or Survey, move bounded callouts with world leaders, make Route Book a disclosure. |
| Physical readability | Dull support end grain competes with the lively top; the same wood presentation disguises that distinction. | Paint only the existing upward tread polygons, quiet the supports, brighten existing tally marks. |
| Framing | Lumber's opening camera is below Tread 1's top, and all three tread centres align. Receiving Bay is partially fogged and screened. | Raise the Lumber address by 4 m and lower its look target to keep the launcher visible; retain Survey for the complete arrangement. |
| Experimental design | Exposure to E8 did not establish ramp understanding; clearance can be useful intent. Adjust and Continue misrepresent recovery/state. | Advisory handoff only; Studio owns E8 changes and Q2. |

The public `/` and `/courtyard` cards are the correction target. Their distance
labels read 146, 62 and 108 m from tee. Distance means horizontal station-centre
to target-centre separation, not world Z, muzzle distance, arc length, or a
predicted landing solution. Invalid coordinates omit the number. Existing
historical lab and practice presentations are not migrated by this pass.

Required feature identity, rather than tag count, controls public challenge
labels and bank highlight paint. The card brief retains the authored order;
callouts identify the objects without repeating a numbered instruction chain.
Optional Skip/Sky/Mill callouts follow the selected Delivery route; Survey
includes physically available optional labels. Visibility does not award a
route or relax any recognition gate.

Callouts preserve their projected world anchor, search nearby screen space,
avoid occupied UI and each other, and hide when a safe position is unavailable.
Rear tread callouts are also hidden when another stack blocks the sightline; Survey shows all three. They disappear during flight and result. A hidden label is not an offscreen
arrow or evidence that its physical object disappeared. The Route Book's
collection and recall actions are unchanged inside its native disclosure.

The no-required-tag target result also stops claiming every Delivery clear was
a direct line; the existing Route Book still computes and names earned routes.

## Evidence reviewed

README, charter, hosting, current courtyard/Cascade/Route Book and Linecraft
contracts; supplied independent yard audit and annotated screenshots; Round 6
packet; E4 place-naming, k5 historical trail, E8 PR #49; Claude timber-yard polish
and the earlier visual-borrow branch.

E4's useful lesson is conservative, station-aware naming, not promotion of its
region classifier. k5 supports testing screen-space readability but provides no
human motivation evidence. The Claude branches change broader sky/ground
presentation and some branches include physical changes; none was merged.
The existing fog, exposure, lighting, atmosphere and yard geometry remain the
baseline for this pass.

See [E8 recovery handoff](E8-RECOVERY-HANDOFF.md) and the separate
[future experiment](YARD-LEGIBILITY-FUTURE-EXPERIMENT.md). The handoff was posted
to PR #49 as comment `6147593177`; no E8 code or tests were edited.

## Camera decision

The accepted Lumber-only address uses a height of 11.8 m rather than 7.8 m;
the horizontal setback and look distance are unchanged. Lowering the look target
by 3.2 m retains the visible launcher while exposing the first top. A height-only
trial was rejected because it put the desktop launcher behind the console.
This does not reveal every rear surface from Address. Occluded Tread 2/3 pins
are suppressed so their names do not appear to identify the front support.
Survey remains the view for inspecting the full descending sequence. Camera
comfort and whether players choose Survey still need human play.

## Verification and human review

The companion evidence records exact views, build identity, label bounds and
renderer. Screenshots use headless Chromium/ANGLE SwiftShader; they cannot
certify physical-phone touch comfort, real-GPU appearance, or human understanding.
No physics sweep is presented as evidence of enjoyment. Geometry/collider and
recognition-metadata equality is checked independently of the existing physical
regression shots. Local verification: 447/447 tests pass, including the bounded production build; TypeScript passes; lint reports zero errors and the two incumbent mount-only hook warnings. No existing tests were edited or weakened. Matched screenshots and per-view measurements accompany the draft PR; they distinguish removal of label collisions from unproven human comprehension.
