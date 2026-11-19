# Security and limits

Witnessboard records a consensus reading of submitted evidence against milestone criteria. It does not establish what happened in the world.

## Funds

The contract has no `@gl.public.write.payable` method and no balance field. The web client sends `value: 0n` on every write. There is no donation ledger, escrow, payout, or refund. A review outcome must not be wired to a payment contract without a separate design.

## What a review is

Validators compare a fresh fetch and a fresh reading. Agreement is required on the outcome, each criterion status, the fetch class, whether the normalized excerpt was found, truncation, and confidence within an explicit gate. The stored policy outcome can be stricter than the model. The raw model outcome remains visible so a downgrade is not hidden.

`supports` is blocked unless a public https response contains the excerpt, every criterion is `met`, and confidence is at least 6500 basis points. Pasted text, a failed fetch, a short excerpt, or a page that does not contain the excerpt cannot be upgraded into support.

## Evidence limits

- Only the excerpt, its SHA-256, the locator, the fetch class, and a grounded flag are stored. The page body is not retained.
- Search uses the first 8000 characters. A match beyond that is ungrounded and labeled `page_text_truncated`.
- https URLs must not contain credentials or fragments. Loopback, private, link-local, CGNAT, documentation, and localhost-style names are rejected. Hostnames that later resolve to those addresses are not fully blocked. This is not a complete SSRF defense.
- JavaScript-only pages may not contain the excerpt in the raw HTTP body. That becomes insufficient evidence, not a claim that the event is false.
- Pages can change between the leader and a validator. Disagreement rejects the leader result instead of averaging it.
- Control characters and bidi overrides are rejected. Instructions inside an excerpt are data. The contract does not claim to detect every prompt injection. The protection is independent re-execution plus the downgrade policy.

## Consensus failure

Malformed model output raises `[LLM_ERROR]` and does not write a review. If validators disagree, the transaction can end undetermined and the milestone stays locked. Do not submit the same review again until that transaction has been inspected.

## Client

Chain mode will ask an injected wallet to sign. Specimen mode does not. The app does not store keys. Appeal helpers exist on `genlayer-js` 1.1.8, but this draft does not call them automatically and does not post an appeal bond.

`genlayer-js` 1.1.8 has no fee-profile estimator. Do not treat a missing estimate as a measured fee. Profile fees on local Studio before mainnet-like use.

## Operations

No contract address in this repository is a deployment. An empty address field is intentional. Publishing the repository, deploying to a public chain, using a faucet, or submitting the portal forms are separate owner actions.
