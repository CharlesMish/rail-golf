# Shot retry and evidence

Timed charging remains the default: 0–80% in two seconds, then a slower final second
to 100%. Speed is 6–43 m/s (formerly 22–43). Shot tools
above the aim console exposes optional Set power (half-percent slider steps; keyboard
arrows also work). Press/release orange or Space to fire. Recall preserves the exact
saved power; moving the slider chooses a new stepped value. Power readouts now show
one decimal where necessary. No predicted trajectory or assisted reflection added.

Retry now / R is available during flight and skips directly back to the launcher,
restoring that shot's setup. It disposes the projectile and flight sound and rebuilds
the current card's mechanisms. An interrupted shot counts as an attempt, but has no
landing ruling and earns no route or stamp. Retrying after a ruling preserves the
already recorded outcome and does not count the attempt twice. Blur/pointer cancellation
still cancels charging rather than firing.

Each card saves its last three attempts in this browser, including interrupted shots.
The history buttons recall a specific attempt; optional comparison shows three real
trails and first-kiss crosses. Selected evidence is amber, other attempts cyan.
Interrupted paths stop at cancellation; no invented landing pin is added. Winning lines also keep the latest six distinct recorded contact sequences,
independent of misses or interruptions. For example, three treads plus Bank B is
kept separately from three treads alone. These are observed families, not a claim
to enumerate every possible geometric route. Repeating a family updates its line.

Saved lines include station, aim, speed and up to 320 sampled trail positions plus
actual contact points. Loading reconstructs historical evidence; it never grants a
clear or runs a simulated shot. Old Delivery Route Book power values migrate once
from the v1 key to v2, preserving their original launch speeds and earned routes.
Pre-update session-only trails cannot be recovered. New records store speed so later
power-scale tuning need not change a discovered shot. The archive is local to the
browser, not yet a shared community library. Previous Line controls visibility for all historical trails.

The target scoring rule and dimensions are unchanged. The formerly green decorative
apron extends 2.2 m beyond the disk: it is now neutral bark so it does not look like
additional scoring area. The coloured rim follows the disk edge. At a ruling, the
projectile visual holds at the recorded ruling position rather than continuing to
bounce/slide after the decision. A small footprint marks first kiss, and the result
reports distance inside/outside the accepted centre limit (disk radius + projectile
radius). This addresses identifiable visual ambiguities, not a proven reproduction
of every previously reported edge miss. The existing horizontal first-kiss plane
remains authoritative; elevated landing surfaces are a separate future change.

The gallery's ordinary-clear message now explicitly describes its extra trick stamp
as optional. Mechanism-only misses also report the short/long/left/right displacement.

Validation: TypeScript and production build; complete headless test suite, including
real Havok route fixtures and edge readout/scoring agreement across every target.
Browser interaction/phone layout remain unverified: the available browser blocked
access to the local preview. Review quick retry, tools panel and pointer controls
on a phone before merging. The expanded aim limits are yaw ±70° and elevation 5–85°. World colliders,
landing authority, maximum launch speed and unlock conditions are unchanged. The
courtyard now opens at `/`; `/courtyard` remains an alias, and the old range lives
at `/practice` with its original browser progress key.
