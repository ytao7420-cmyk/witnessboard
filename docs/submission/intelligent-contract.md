# Intelligent Contract submission draft

Portal contribution `acb5c941-0d9c-4408-a9a8-4ee70a25dbb8` is still Pending. This file does not change that submission and does not ask for a second contract reward.

Category: Intelligent Contracts. Stated range 0–500 points, two weekly slots. This draft does not ask to be scored as a Project as well. The reviewer decides whether the contract and the application are separate contributions.

## Description

MilestoneWitness is a reusable Intelligent Contract for a real trust gap in crowdfunding: backers can see a milestone's criteria and the public material offered for it, but they should not have to trust the platform operator to decide, and the decision should not silently move funds.

The contract stores campaigns, milestones, evidence, and reviews. An organizer publishes one to six criteria. Anyone may submit either a pasted excerpt or an https URL plus the passage they claim is on that page. Evidence is append-only, hashed with SHA-256, and criteria freeze after the first submission. The organizer locks the milestone. Any caller may then request a review. The caller pays the consensus cost. The contract never accepts value and has no payable method.

The review uses GenLayer's leader/validator equivalence principle through `gl.vm.run_nondet_unsafe`. Inside that block the leader fetches each public URL with `gl.nondet.web.get` and asks `gl.nondet.exec_prompt` for a JSON reading of the excerpt against the criteria. Each validator runs the same function. It does not accept the leader result because the JSON is well formed. It compares the outcome, every criterion status (`met`, `unmet`, `unaddressed`, `unclear`), the fetch class, whether the normalized excerpt was found in the fetched page, truncation, and confidence. Confidence may differ by 1500 basis points, but it may not cross the 6500 or 5000 gates that change the policy.

After consensus, a deterministic policy may downgrade the reading and may not upgrade it. `supports` requires a grounded public page, every criterion met, and confidence of at least 6500. A paste, a failed fetch, a missing passage, or an incomplete criterion list cannot become support. `does_not_support` requires an unmet criterion and enough confidence, and it still carries the limit `not_a_real_world_finding`. Weak or conflicting readings stay `insufficient_evidence` or `uncertain`. The raw model outcome is stored beside the policy outcome, with the input fingerprint, fetch classes, and an explicit claim scope: this is a consensus reading of supplied evidence, not a finding of fact, identity, legal compliance, payment, or refund.

The contract rejects control characters, bidi overrides, over-long fields, duplicate evidence, private and localhost URLs, and credentialed URLs. Those checks reduce obvious abuse. They do not make the model a judge of the world, and they do not stop a public page from changing or from hiding text behind JavaScript. When validators disagree, no review is written.

Direct-mode tests cover the state machine, URL rejection, grounding, downgrade, paste-only support denial, malformed model output, prompt text stored as data, and validator disagreement on outcome, grounding, and the confidence gate. `genvm-lint` passes. The runner pin is the hash still shown in the GenLayer docs on 19 November 2026. A newer runner reported by the linter does not load under the installed `genlayer-test` 0.29.2 direct mode, so it is not used.

## Evidence URLs

- Contract source: https://github.com/ytao7420-cmyk/witnessboard/blob/main/contracts/milestone_witness.py . The same file is in this repository at `contracts/milestone_witness.py`.
- Tests: `tests/direct/test_milestone_witness.py` and `docs/test-reports/pytest-direct.txt`.
- Docs: `README.md`, `SECURITY.md`.
- GenLayer references used: https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle , https://docs.genlayer.com/developers/intelligent-contracts/testing , https://docs.genlayer.com/developers/intelligent-contracts/first-contract .
- Temporary Studionet contract `0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865`. Deploy hash `0xe1e1b325d145270f2696fa349075d60417e918d55c954796bf5a870a711df544`. The later verification flow is archived in `docs/test-reports/2026-11-20-main-flow-readback.txt`. Studionet can reset. This is not a Bradbury deployment.
