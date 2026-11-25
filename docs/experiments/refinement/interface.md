# Exchange Yard playing interface

Start: `8b02b8ceab95f28383f607cc4e891fe7e31dfc7a` (PR #84), branch `research/yard-interface-20261125`. First reviewable interface checkpoint: `ec1b70742fbbdcfeaff487443d7cf565bfb2d804`. Exact published endpoint and preview belong to the director's publication ledger.

The inherited spatial lab showed Keep tools before the firing controls, hid set power and exact aim inside Shot Tools, and placed a tall console over the camera canvas. Its scrolling fix made controls reachable, but did not make ordinary play immediate.

The new presentation is explicitly selected by the Exchange Yard page. Other Spatial Lab pages and production keep their existing interface. It reuses the same SpatialLab session, setup adapter, charge mapping, recognition, markers, recorded paths and shelf; there is no new physics or save format in this lane.

## Primary play

- Horizontal aim and elevation have immediately visible sliders, half-degree nudge buttons and values, using the ordinary half-degree control steps. Scene dragging and keyboard aim remain available.
- Launch station and left/centre/right position are visible beside the primary controls. Station selection still captures the player's current setup before session cleanup; it does not reinstate the previous attempt accidentally.
- Set power is the authored default, with its own orange slider, numerical value and Fire label. Timed hold and MAX remain explicit choices using the unchanged charge authority.
- Launch view and Survey are direct choices. During flight, Follow ball, Survey, Stop and Retry remain visible while aiming controls retire. Every new shot begins in Follow as before.
- A result is a compact receipt beside the scene with Keep and a collapsed rebound list. Next shot is prominent; the player is reminded to Keep before moving on. Exact evidence and all local shelf Restore/Download/Remove actions remain in separate disclosures.
- Qualified redirect rings are unchanged. The interface explains that they show real qualified rebounds, with no score or collection requirement.

The production Timber Courtyard informed the recognizable Fire/charge meter, direct aim feedback and short continuation loop. Its own Shot Tools disclosure was not copied: the owner specifically requested first-class access to power and station controls here.

## Viewport and lifecycle

The canvas and control panel occupy separate grid regions, so even an expanded receipt or shelf cannot cover the launcher or aim indicator. On desktop/landscape the panel is a bounded independently scrolling column; portrait places a 45dvh scene above the scrolling controls. Body scrolling and historical full-screen routes are unchanged. A scoped ResizeObserver resizes Babylon and updates camera framing against the actual canvas aspect, including panel-driven viewport changes.

Controls use native range/select/button elements, focus-visible outlines and ordinary keyboard navigation. Timed charge cancellation, blur/visibility cancellation, pointer capture release and session cleanup remain in the existing runtime. Camera/station selection is disabled while charging. Changing the physical world remounts the runtime and clears the old live scene; it never starts a shot or sound automatically.

`/lab/yard-viewport-check` is an explicitly synthetic DOM fixture using the exact real YardControls component and CSS. It offers ready/result/flight views, 35 long illustrative receipt labels and four shelf rows. It never constructs a scene, physical record, projectile or sound. The fixture can establish scroll reachability and panel separation when WebGL is unavailable; it cannot establish rendered camera comfort.

TypeScript and focused ESLint pass at the initial interface checkpoint. All 35 inherited spatial runtime/refinement, charge, recovery/framing and qualified-marker tests pass. Director browser findings are recorded in the integrated verification report. Browser checks must distinguish the real disabled/WebGL fallback from this populated synthetic fixture.

## Remaining owner judgment

The sidebar prioritizes a clear scene and stable controls over a floating console. The camera sees a narrower desktop canvas, so rendered framing and comfort need owner inspection if the research browser cannot provide WebGL. In portrait, the player scrolls the control region to reach expanded history; reducing browser zoom should never be necessary. Set power remains available without opening any disclosure.
