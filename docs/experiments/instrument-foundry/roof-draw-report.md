# Gabled roofs: the earlier correction was not reaching the draw call

The owner's comparison supplied a useful distinction: two-sided roofs improved
the image, while the new barrel canopy looked correct. Inspection now identifies
a concrete error in the gabled-roof draw path. The earlier winding correction
changed an index buffer that the renderer was not using.

Base: owner-played PR89 `10b09baafc9d85eef0d87a630b55600d623dcde0`.
Branch: `research/gable-repair-20261127`.
Measured implementation: `4e0f16867050a86289f0ea0d3e28b5cf30839af1`.
Published endpoint and rendered-browser observations belong in the director
receipt. This lane does not expand Freight, alter the canopy or depend on the
Instrument Foundry implementation.

## What was missed

In the installed Babylon.js 9.23.0 implementation:

1. `Mesh.convertToFlatShadedMesh()` invokes `_convertToUnIndexedMesh(true)`.
   This expands the vertex buffer in the current triangle order, writes
   sequential indices and sets `_unIndexed=true`.
2. The old gable code then calls `flipFaces(true)`. Babylon reverses each index
   triplet and negates its normals. It does **not** reorder the expanded position
   buffer or clear the unindexed draw flag.
3. With that flag true, triangle-fill `Mesh._draw()` calls `drawArraysType`,
   ignoring the corrected index buffer. The actual submitted triangles remain
   inward. The main view and ShadowGenerator share this mesh rendering path.

The previous tests measured stored indices and normals, so they correctly found
outward indexed triangles but did not check whether those indices controlled the
draw call. Their conclusion about actual rendered face orientation was therefore
incomplete. This report corrects that interpretation without rewriting historical
evidence files.

The barrel roof differs at precisely this step: it corrects triangle order
**before** flattening. Its expanded vertex sequence is already outward, so its
unindexed draw is correct. The stock Babylon box supplies a further positive
orientation control.

## Narrow repair

After the existing gable `flipFaces(true)`, set `mesh.isUnIndexed=false`. Babylon
then binds and submits the corrected index buffer. This uses the public property;
no dependency source is patched. Its setter marks submesh attributes dirty.

Every roof position, its order in the vertex buffer, index, normal, transform,
material, culling flag and convex-hull input remains identical to PR89. The fix
does not require separate hidden colliders, new triangles, double-sided material,
shadow disabling, changed restitution or a new physical identity. The previous
Yard-scoped PCF/bias setting remains unchanged to isolate the draw correction.

The old path remains available through an internal comparator option, not as a
new player-authored field. Original and Refined physical layouts keep their
identities and shelves. The maintenance canopy keeps its geometry and draw path.

## Verified evidence

The new regression runs actual Babylon `Scene.render()` and
`ShadowGenerator` under NullEngine, intercepting their engine draw dispatch. It
does not merely infer the dispatch from the flag or invoke `_draw` in isolation.

| Geometry | PR89 main / shadow dispatch | Corrected main / shadow dispatch | Submitted winding |
| --- | --- | --- | --- |
| Each of three gables | `drawArraysType`, 24 vertices | `drawElementsType`, 24 indices | 8/8 inward → 8/8 outward |
| Barrel canopy | `drawArraysType`, 120 vertices | Same | 40/40 outward, unchanged |
| Stock box orientation control | Indexed | Same | 12/12 outward |

For each old gable, submitted face normals oppose the stored outward normals.
With the indexed draw they agree. All source position, index and normal buffers
compare exactly before/after, including all other architectural solids.

**32/32 complete actual-Havok histories match exactly**: 13 original-yard
fixtures, ten Freight fixtures and nine canopy cases. The equality covers the
physical record, full sampled path, raw collision callbacks, whole-step incoming
and outgoing velocity brackets, ending and step count. Unsuccessful and fragile
fixtures remain included. This is presentation isolation, not a new physics rule.

Ready-world resource counts remain exact:

| Layout | Static bodies | Meshes / submeshes | Materials | Casters | Solid triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original / Refined | 21 | 24 / 24 | 17 | 20 | 240 |
| Canopy | 26 | 29 / 29 | 17 | 25 | 328 |

Before/after worlds and all nine comparator variants dispose counted bodies,
meshes, materials, textures, geometries and shadow casters to zero. No new buffer
or body is needed; the existing index buffer is now bound for three gables.
The dispatch count per pass is unchanged. This is not a measurement of GPU
draw-call cost, memory reclamation, frame rate or physical-device performance.

Ten focused tests passed across new draw-authority, historical roof presentation,
Exchange refinement and canopy suites. TypeScript and targeted lint passed.
The root handoff records full-suite/build/Foundry checks. Reproduce:

```
node scripts/instrument-foundry/roof-draw-measure.mjs
node --test tests/roof-draw-authority.test.mjs tests/roof-presentation.test.mjs tests/exchange-refinement.test.mjs tests/architectural-forms.test.mjs
```

`roof-draw-evidence.json` contains exact source hashes, dispatch records,
triangle orientation, physical-history hashes, resource counts and cleanup.
Numerical control shots are technical evidence, not part of the owner invitation.

## Interpretation of the owner observations

Disabling culling permits the old inward submitted triangles to remain visible.
That is consistent with the strongest reported improvement. The shadow pass also
used the incorrect triangle sequence, giving a concrete reason to expect changed
shadow behavior once the indices are honored. Removing a building cap can expose
different surfaces through a wrongly culled roof, without repairing its winding.
The barrel's correct expanded order explains why it does not share this defect.

These relationships establish the draw-path defect and its repair in engine
dispatch. They do **not** prove that every black patch, stripe or flicker has the
same cause, or that all owner-visible symptoms are gone. Coplanar interior caps,
shadow filtering and near-eave views can still have separate effects. Actual
WebGL observation remains the boundary for declaring the whole roof defect fixed.

## Updated comparator

`/lab/roof-comparison` defaults to **Corrected triangle draw · current shadows**.
Compare it with **PR89 · PCF and bias** at the same view/context; only the gable's
indexed versus sequential draw changes. **Corrected triangle draw · original
shadows** versus **PR86 · exponential shadows** repeats that isolation under the
older filter. The seven historical recipes keep their old unindexed roof draw,
so the owner's prior comparison remains reproducible.

Culling and shadow reception/casting remain enabled in ordinary play. Start with
full-yard context and the above/eave/gable views. If the correction removes
see-through faces but leaves some shading artifacts, retain that distinction
rather than treating a partial improvement as complete resolution.
