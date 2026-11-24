# Control access and direct finite repeats

Lane C branches from PR82, `ddeed5b688ae8c15166c42a0302bf768bb11be70`, on `research/places-usability-20261123`. Runtime checkpoint: `93ce58b90f83220d7a9598720cb1f2a70b99b7a8`. Remeasured source: `5a24225ef5540f5527f603f895146c861a8c0b7a` (clean tree). The director publication packet records final integrated and remote SHAs.

## What changed

`/lab/places-repeater` offers **Fire once** or **Repeat × 3/4/5** immediately from a valid held world. N means N total new shots; there is no preparatory shot. This is an explicit commitment, never an automatic action on page entry, restore or reload. Each subsequent attempt waits for the actual prop settling condition, then the existing 90-tick observation pause. One ball is active at a time. Cancel prevents future launches; an already committed blow finishes naturally. Every attempt has its own original, ball-terminal and settled environment.

The original manual-trial study remains at `/lab/playability-repeater`. Both use one shared UI component and the same queue; `requireTrial` defaults to true. The new route explicitly sets it false and uses a separate local shelf. The physical layout, coefficients, identity and recorded attempts are unchanged. Download now states the commitment policy separately from the individual physical records. A direct batch clears the displayed prior single-shot association, rather than implying it was a required trial.

The design benefit is a simpler choice about how long to watch the same experiment continue. It adds no physical capability. Owner comparison is still needed to establish whether the manual-trial step is useful caution or unnecessary friction.

## Actual cause of clipped controls

Production intentionally sets `html, body { height:100%; overflow:hidden }`. Several document-style experimental pages only declared `min-height:100vh`, so content grew outside the locked document with no scroll owner. Rolling/Guest/Repeater had an independently scrolling desktop console, but their mobile breakpoint removed its height bound without giving the whole route a scroller. Their 600px stage minimum also exceeded short desktop viewports. Separately, the spatial console placed a nonshrinking firing block inside `overflow:hidden`; when that block exceeded the console's available height, scrolling its sibling could not reveal it.

Corrections are local to the affected experimental CSS:

- Playability, Playgrounds, Horizons, Theatre and Contact Loops document pages own a `100dvh` vertical scroller.
- Guest/Rolling/Repeater use a bounded desktop grid, no desktop stage minimum, and a whole-route mobile scroller with a visible-content console.
- The spatial console itself scrolls, including the firing block. Its full-screen world, camera and result overlay remain intact. Opening a long shelf can require scrolling back to Fire; controls are accessible rather than clipped.
- Keyboard focus outlines include links and summary elements, and scroll padding leaves room for focused controls.

No global body overflow or production full-screen CSS changed. Ordinary Worldcraft already owns its viewport and tool-panel scroll containers; no indiscriminate change was applied there.

`/lab/places-viewport-check` is an explicitly labeled **synthetic layout fixture**, with the actual CSS and four shelf rows, five attempt receipts, and a 35-event spatial receipt. It creates no physics, audio, saved records or claims of real collisions. It exists so short-window, mobile and keyboard access can be tested even where WebGL is unavailable. The director's browser report records the actually inspected sizes and results; this lane does not claim a rendered-world inspection or phone performance.

## Physical evidence and limits

Reproduce with `node scripts/places/measure-repeater.mjs`. Raw concise evidence: [repeater-evidence.json](repeater-evidence.json). Numerical launch settings are isolated in [REPEATER-SOLUTIONS.md](REPEATER-SOLUTIONS.md).

Five distinct five-shot programs exactly match five manual continuations, including every serialized path sample, contact, setup, environment and terminal field. The queue does not reset the world between attempts. Complete record hashes accompany the bounded contact receipts. The new direct program is deliberately compared with five manual shots, not the old trial-plus-five program's six shots.

| Program | Stone contact pattern | Total simulation time including pauses | Final horizontal displacement |
| --- | --- | ---: | ---: |
| Steady push | hit × 5 | 11.492 s | 4.837 m |
| Reach exceeded | hit × 4, miss | 11.167 s | 2.375 m |
| Strong push | hit × 5 | 11.975 s | 12.182 m |
| Banked approach | hit × 5 | 13.575 s | 6.422 m |
| Reverse approach | hit × 5 | 19.483 s | 5.649 m |

Each of six nearby control variations retains five contacts for the steady and banked programs. Four of six reach-limited variants still miss the fifth shot; a half-degree elevation increase or one-percent power increase reaches it. These are ordinary control changes, and illustrate an intelligible reach boundary, not a numerical-contact-count objective.

All three shots of a direct batch reproduce exactly under equivalent 30, 60, 144 Hz and uneven render partitions. The physics remains 120 Hz. Stop during flight, settling and the inter-shot pause preserves the first completed record and prevents all later shots. A test-only sustained Havok spin forces blocked settling: the incomplete receipt remains non-keepable, no second shot launches, exact Undo recovers, and a subsequent explicit batch works. The forced spin is recovery testing, not a naturally authored physical outcome.

## Costs and lifecycle

The queue adds no meshes, colliders, shadow casters or physics callbacks beyond its existing wrapper. Held world: 11 static bodies, 30 world meshes, 10 shadow casters. Active shot: 10 static and two dynamic bodies (stone plus ball); terminal scene: 12 static bodies / 31 meshes, followed by removal of the retired ball before the next launch. Same geometry as original Guest Stone; no new rendering capability is claimed.

Ten NullEngine lifecycle samples returned bodies, world meshes and casters to zero after disposal. Median scene build was 2.357 ms versus 2.502 ms for the manual control. Five queued shots plus observation pauses took 27.976 ms CPU versus 23.879 ms for five manual continuations without pauses; the queue includes 360 extra physics ticks and record summaries. Reset median was 0.361 ms. These small host timings are noisy CPU measurements, **not rendered frame rate**. Draw calls, GPU frame time and heap memory were not measured. Five serialized full-record arrays ranged from 44,000 to 85,161 bytes. Runtime retains only the latest single/batch plus the bounded four-entry shelf.

18 focused tests pass: 13 unchanged manual-trial tests and five new direct-commitment tests. TypeScript passes. Lint: zero errors, five inherited warnings. Full-suite, build and Foundry checks are the director's integration checks.

## Persistent-object direction

Preserve Rolling Yard and Guest Stone. The next substantial persistent-object world should give rolling a destination or constraint: a broad sloping delivery channel with a receiving bay is a stronger question than further damping changes in the flat garden. First test whether an impact can send the sphere into a useful route while leaving room for corrective blows. Do not add that geometry here simply to fill a lane: this commission's new architecture and live musical pairing have stronger immediate evidence needs.

## Spoiler-free entry

Choose **Fire once** when you want one intervention, or **Repeat** when you want to observe a short commitment. Aim and power remain fixed during that sequence; the stone's position does not. Afterward, inspect a blow, use its result, undo the last intervention or reset the garden. Try the linked manual-trial version if you want to compare the extra preparation step. Keep or download anything worth retaining before starting a new program.
