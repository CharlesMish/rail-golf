# Publication and recovery ledger

All work remains experimental and unmerged. Production main was verified before
editing at `4a2be20984da4e50d7f87f37e59d7d61ff384e2c`. The previous PRs and pinned
previews remain preserved. Branch names below are new branches for this session.

## Independent published lanes

| Lane | Base | Draft PR / branch | Published final source SHA |
| --- | --- | --- | --- |
| Architecture plus roof candidate | PR86 `21f18bec3286c6c63d094cb1a8ea2135081bdef6` | [PR87](https://github.com/CharlesMish/rail-golf/pull/87), `research/architectural-forms-20261126` | `03f7ba8b316e23d6fdb232075a3f207989417534` |
| Independent ensemble | PR85 `6f080b78efb5afbeb5d8d087b1426e5681d6726d` | [PR88](https://github.com/CharlesMish/rail-golf/pull/88), `research/counterline-ensemble-20261126` | `a32d17b61b1795d04727c63e61f28cbf4d0fd0e1` |

The first durable checkpoints remain ancestors:
architecture `b8e0132144c7d7c9b39bbf00aa5c2496ae26d737`, ensemble
`78ff989a8102b0d05f80cd3290dfd2e17ed6adce`. Updates were ordinary fast-forwards
with expected-head checks, never force pushes.

Local author commits differ from connector-created publication commits because
commit metadata differs. Git trees were asserted exact before publication:

| Local endpoint | Published endpoint | Exact tree |
| --- | --- | --- |
| `3b3af014d71264de8302fea469af91ddce646c95` | `03f7ba8b316e23d6fdb232075a3f207989417534` | `5aa37d28568b261bc38bdd9007b28d0e0d089fbf` |
| `c09be78d47dfe5f89b4f005c7a36881f3f5ff06f` | `a32d17b61b1795d04727c63e61f28cbf4d0fd0e1` | `d99d4ad3931625a92491c4200ccedf2363948dd2` |

Roof author branch `research/roof-study-20261126` begins at PR86 and ends at local
`74c6e12b12e32eb80fb91ef0f78d803bfe628a20`. Its complete result is included in
the architectural lane. Independent review branch `research/forms-review-20261126`
begins at PR86 and ends with report/probes commit
`59c2b0a038812a716e1c49bf97d2589df152a3b2`; those five files are integrated.
Their local branch names are research provenance, not claims of separate hosted
previews. Source commit/file hashes in raw evidence identify the measured code.

## Integrated candidate

`research/forms-ensemble-20261126` begins at PR86. Its tested runtime commit is
`6ed13509afb6179aa65317c342a8b6d4f317c73e`; subsequent changes are director
documentation only. The integrated publication has both final published lanes
as additional parents, preserving independent recovery. Its draft PR body is
the final publication receipt: exact published endpoint, matching local tree,
checks and immutable Cloudflare version-preview URL. Recording that receipt
outside its own commit avoids pretending a commit can contain its own SHA.

The integrated owner entry is `/lab/forms-ensemble`, with:

- `/lab/places-architecture` — canopy, previous versions and ordinary play.
- `/lab/places-counterline` — zero, one or two companions plus live physics.
- `/lab/roof-comparison` — separate seven-variant diagnostic.

Always use the immutable version URL in the draft receipt, not a moving branch
alias. The separate lane PRs also retain their version previews and checks.
Cloudflare's check links use a service path containing `production`; only version
previews on experimental branches were requested here. No production promotion,
deployment command, merge or foundation-branch update was performed.

## Preserved authorities

| Authority | SHA at session start |
| --- | --- |
| PR86 | `21f18bec3286c6c63d094cb1a8ea2135081bdef6` |
| PR85 | `6f080b78efb5afbeb5d8d087b1426e5681d6726d` |
| PR84 | `8b02b8ceab95f28383f607cc4e891fe7e31dfc7a` |
| PR83 | `35e9c2d5b8edcdf504e969d86a70f570504f919f` |
| PR82 | `ddeed5b688ae8c15166c42a0302bf768bb11be70` |
| PR81 | `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054` |
| PR80 | `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb` |
| PR79 | `00110e6890a0cc9541c9047a20c91d9670b206ee` |
| Foundry | `0b151c5c94849b78ccda6c41a1755b66471e3fa2` |
| Amphitheater | `6ebb2f2b370656c7e70b108ad04d0369b78cf89c` |

Previous reviewed preview:
https://077e2174-rail-golf.charlesmish.workers.dev/lab/refinement

Reproduction scripts and compact raw JSON are committed beside the reports.
Successful numerical launch settings remain in `architecture-solutions.md` and
technical JSON, separate from `OWNER-GUIDE.md`. No binary archive is required.
