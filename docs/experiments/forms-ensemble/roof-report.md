# Roof rendering: diagnosis remains open

Base: PR86 `21f18bec3286c6c63d094cb1a8ea2135081bdef6`. Branch:
`research/roof-study-20261126`. The owner reports missing/transparent-looking
faces, black patches, stripes and flicker after the earlier winding correction.
The screenshots and inspiration illustration were not present in this turn's
accessible attachments. Their contents were not inferred.

## What is established

The previous corrected roof buffers still have outward normals and culling.
All three flat bases meet their building tops exactly: store and hall at y=13,
signal house at y=7. This is an internal coplanar overlap. With correct culling,
the downward roof base is hidden from above. It is a plausible eave/underside
conflict but does **not** establish why broad pitched faces flicker from above.
No roof uses thin instances or an alternate visible mesh transform.

SpatialLab uses a 1024 blurred exponential shadow map, blur kernel 12, Babylon's
default depth bias 0.00005 and zero normal bias. Its directional shadow
projection inherits camera near/far .1/650 because explicit bounds are absent.
Those settings are a concrete self-shadow/depth-filter risk on broad slopes.
They do not prove the owner's artifacts are shadow acne. The original material
is opaque StandardMaterial with back-face culling enabled and low specularity.

The direct physical roof and its visible hull are the same mesh. Changing its
vertices to hide a presentation defect would unnecessarily risk successful
physics. No vertex, face index, normal, dimension, collision shape or physical
material was changed in this lane.

## Selected bounded candidate

The Yard alone now uses the same 1024 PCF / low-quality recipe already used by
Counterline: depth bias .001 and normal bias .03 m. It retains all shadow casters,
receivers and roof culling. It bypasses exponential blur and offsets the shadow
comparison a little along the surface normal. Babylon explicitly falls back to
Poisson sampling when shadow samplers are unsupported. The comparator displays
the actual selected filter, not merely the requested one.

This is a **candidate rendering correction**, not a verified complete repair.
The research browser still cannot initialize WebGL. PCF softness, residual
artifacts, shadow detachment, overhang lighting and physical-device performance
remain owner observations. No global production renderer setting was changed.

## Controlled owner comparator

`/lab/roof-comparison` reuses exact registered geometry and offers fixed above,
eave, gable and underside views, plus slow orbit. It can show the isolated
hall/roof or all original PR86 architectural solids: a full-world shadow-frustum
problem might disappear in isolation.

| Variant | Controlled change from PR86 |
| --- | --- |
| PR86 | Corrected winding, original exponential shadows |
| Bias only | Same filter, .001 depth / .03 normal bias |
| Filter only | PCF, original bias and zero normal bias |
| Candidate | PCF with both bounded biases |
| Roof shadow reception off | Roof still casts; no received shadow |
| Two-sided roof | Roof culling disabled |
| Building cap removed | Only coplanar building-top render triangles omitted |

The last three are diagnostics, not shipped normal-play settings. Every variant
retains original vertex positions and static collision bodies. No shot or Keep
is created here. On an unsupported browser the controls and explanation remain
readable, the orbit is disabled, and the page explicitly says no image was
rendered. All geometry/material/engine ownership is disposed on variant change
or navigation; this is not proof of driver/GPU memory reclamation.

If bias-only suppresses stripes, normal/depth bias becomes the stronger
explanation. If filter-only suffices, the exponential path is implicated. If
only culling-off restores a surface, orientation needs further examination.
If cap removal changes only eaves, internal overlap does not explain slope-wide
artifacts. Please compare the same viewpoint/context before drawing conclusions.

## Physics and cost

The committed measurement compares **23 full actual-Havok shot histories**:
13 historical original-yard fixtures and 10 Freight fixtures, including
unsuccessful/fragile endings. All complete records, every step of the path,
collision callbacks and incoming/outgoing velocities hash identically between
incumbent and candidate presentation. Six checks across two physical identities
confirm byte-identical position, normal and index buffers for all three roofs.

All seven diagnostics retain 21 original static bodies and exact physical
materials. Cap removal removes precisely six render triangles across the three
buildings, without moving vertices or removing collision surfaces. Each
headless load/dispose cycle leaves zero owned bodies, meshes, materials,
textures, geometries, casters and submeshes. The ordinary candidate adds zero
meshes, triangles, static/dynamic bodies or shadow casters. The shadow map size
remains 1024. PCF avoids the exponential blur pass, but no rendered draw-call,
GPU-memory or frame-rate improvement is claimed. NullEngine chooses Babylon's
Poisson fallback and cannot establish the actual WebGL2 PCF image.

Run `node scripts/forms/roof-measure.mjs` for concise hashes/raw authority and
`node --test tests/roof-presentation.test.mjs tests/exchange-refinement.test.mjs`.
The source commit in `roof-evidence.json` is the implementation measured; reports
and that evidence are committed afterward. Full build and browser observations
belong in the director packet.
