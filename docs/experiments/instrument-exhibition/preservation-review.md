# Exhibition authority preservation check

The read-only check on 2026-11-28T01:20:10.723Z found **17/17 expected remote branch tips unchanged**. All **15 prior PRs (#78–92) remain open drafts and unmerged**. GitHub pull-request metadata and a separate `git ls-remote --heads origin` observation agree.

The fourteen authorities from the previous Foundry preservation record remain intact: production main, the original Foundry branch, and PR78–89. The published PR90 and final PR91 heads, plus the owner-provided PR92 baseline, also match.

| Authority | Observed and expected head |
| --- | --- |
| Production main | `4a2be20984da4e50d7f87f37e59d7d61ff384e2c` |
| Original Foundry | `0b151c5c94849b78ccda6c41a1755b66471e3fa2` |
| PR90: gable repair | `bf471fab52b4584362dd03d2816d6433e878236b` |
| PR91: geometry study, final publication | `3d76c099899032f35335bbc7dc44266f96493daa` |
| PR92: Instrument Foundry | `8278fee69fb1bd0c196c2d6fa258faaaaec452e6` |

The complete PR78–92 identities, branch refs, states, expected heads and comparisons are in [preserved-authorities.json](preserved-authorities.json). Starting authorities come from the baseline's [preservation record](../instrument-foundry/preserved-authorities.json), [publication ledger](../instrument-foundry/PUBLICATION.md) and the owner's exact PR92 source. PR91's final publication is `3d76c099…`; the ledger's earlier measured geometry checkpoint `c98e9cd5…` is intentionally not treated as its final branch tip.

This audit did not change any remote state and did not fetch historical previews. It establishes current head/state preservation, not historical preview availability, unchanged PR prose, or the absence of temporary intervening ref movements. The only writes are this report and its JSON evidence; no runtime tests are required for these documentation-only additions.
