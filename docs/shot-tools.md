# Shot retry and evidence

Timed charging remains the default, with the original 1.55-second curve. Shot tools
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

Each card keeps three attempts in session memory, including interrupted shots.
The history buttons recall a specific attempt; optional comparison shows three real
trails and first-kiss crosses. Selected evidence is amber, other attempts cyan.
Interrupted paths stop at cancellation; no invented landing pin is added. These
histories are not saved across page reloads. The persistent winning Route Book is
unchanged. Previous Line controls visibility for all historical trails.

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
on a phone before merging. No yard-layout, physics-tuning, progression or hosting
changes are included.
