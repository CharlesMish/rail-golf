# Horizons camera projection audit

This is Babylon NullEngine projection of actual validated box corners and drawn launcher mesh bounds. It does **not** establish rendered visibility, occlusion, material clarity, draw cost, or human usability. The available browser could not render WebGL. A phone-width DOM check at 390 × 844 measured a 390 × 260 yard canvas in the error state; the other dimensions below are aspect probes.

Run from the integrated neutral checkout, with the separately checked-out return branch and installed dependencies:

```sh
node scripts/horizons/camera-audit.mjs --neutral-root . --return-root ../horizons-return > /tmp/horizons-camera-audit.json
```

The script reads the presets, model/launcher modules, radial station helper and selected numeric orbit literals from those checkouts. It validates presets, records source HEAD/dirty state and source hashes, and emits compact pixel bounds for 1000 × 700, 390 × 260, 390 × 300 and 390 × 600 canvases. No scripts from imported world files are evaluated. The Address formula and FOV switch mirror the existing UI; this is a settled-camera comparison, not a simulation of camera easing.

## Selected changes

| World | Selected entry/Center orbit, radians and metres | Evidence at 390 × 260 |
|---|---|---|
| Overpass | angle .6, elevation .38, radius 78, x 0, z 35 | Opening projects **28.0 px**, versus **16.1 px** in the generic yard home. Architecture width grows **66.4 → 89.7 px**. All architecture and drawn launcher bounds fit. Launcher occupies x13.3–22.5%, y61.1–76.9%. |
| Crossing House | Existing yard home: angle .5, elevation .70, radius 112, x 0, z 43 | All physical box corners and launcher fit. No clipping result justified a special frame. |
| Radial Return | angle .55, elevation .38, radius 46, x 0, z 46 | Wall moves to **y77–133 px**, middle shelf **106–119 px**, inner shelf **129–147 px**. Full launcher remains in frame at x110–159, y125–181 px. |

Overpass's closer result orbit remains separate: it frames the architecture but excludes the launcher to the left. It is unsuitable as the entry home. At the 390 × 300 aspect probe, the selected entry increases the projected opening from 18.5 to 32.3 px; at 1000 × 700 it increases 43.3 to 75.3 px. The frame does not attempt to include every metre of empty ground.

Radial Return's former station-centred home put the wall at y41–78 px and the middle shelf at y65–76 px. The phone Survey-control row begins at 43 px, with 44 px minimum button height. Those projected rectangles overlap the control band. The selected frame moves both shelves below it and most of the wall below it; the wall's upper edge can still overlap the band. This is a source/geometry warning and mitigation, not proof of rendered occlusion or a complete phone usability pass. Keep the change specific to this world.

## Limits

Every architecture corner in all three worlds fits the compared initial Survey and settled Address frustums at all four aspect probes. That is only a clipping finding. Muzzles remain inside Address; the bottom of the launcher carriage falls below the landscape-shaped canvas in the existing shared Address frame. No generic camera or historical world defaults were changed by this audit.

The owner still needs to judge height, supports, opening clarity, contact observation and touch controls on a rendering device. Physics evidence cannot answer those questions.
