# Refinement publication ledger

All lanes begin at reviewed PR84
`8b02b8ceab95f28383f607cc4e891fe7e31dfc7a`. Production main was verified before
editing at `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`.

The integrated branch is **`research/yard-repertoire-20261125`**, targeting
`research/places-counterlines-20261123`, never production main. Its draft PR
description is the authority for the exact final published SHA, identical tree,
hosted build status and pinned preview. Keeping the final SHA there avoids a
self-referential documentation commit. Owner entry is `/lab/refinement`.

The separately reviewable musical lane is [draft PR85](https://github.com/CharlesMish/rail-golf/pull/85).
Its final source is `8e6c9a643338c53501f2e0edd635c4db15625926`, published as
`5551d21e2522b17ef9c08eaeb1b70fe759bce67c`, with identical tree
`ddd54b59a08b7c4e7900a0a8663086637f932b1e`.
Pinned standalone preview:
[Counterline repertoire](https://f94b029e-rail-golf.charlesmish.workers.dev/lab/places-counterline).
Cloudflare version `f94b029e-fa8c-42ab-b988-ae80a63679b3`, preview build
`312ab129-c21c-4030-8378-2813e30eb284`, and
[GitHub CI45696133362](https://github.com/CharlesMish/rail-golf/actions/runs/45696133362)
all succeeded on that exact published candidate.

The first independent Counterline implementation is also durable in that branch:
local `2144bc84b45602e1e720dadbde13c1389c2e47fb` maps to published
`6b2900cc8658e93477386c100d14dfedcf6b5c56`, identical tree
`3668aefb24b072c5dfbe1c0d95f516971ef087dd`. Its earlier successful preview was
`https://b62d1b32-rail-golf.charlesmish.workers.dev/lab/places-counterline`.

`PUBLISHED-LANES.json` contains exact local/published endpoint SHAs and trees for
the spatial, interface, musical and independent-review branches. GitHub-created
commit metadata differs from local commits; every published tree is checked
against the reviewed local tree. The integrated commit retains these endpoints
as parents, keeping each lane independently recoverable.

Spatial alternatives and the inherited camera failure are reproducible from the
committed scripts and raw packets. The original Yard physical control is
`/lab/places-architecture?layout=original`; the complete untouched PR84 preview is
[Places & Counterlines](https://a44866f1-rail-golf.charlesmish.workers.dev/lab/places).
PR83, PR82 and all earlier experiments remain unchanged.

Unmerged dependencies remain PR84 → PR82 → PR81/Horizons and the earlier Foundry
research. No production merge/deployment, foundation ref update or force push
was performed. Final remote verification and hosted observations are recorded
in the integrated draft's description.
