# Witnessboard

Witnessboard (见证台) is an independent draft for a noncustodial crowdfunding milestone evidence desk. An organizer publishes criteria. Anyone can submit a pasted excerpt or a public https page. A GenLayer Intelligent Contract asks validators to fetch that page and re-read the criteria. The stored result is a consensus reading of the supplied material. It is not a finding of real-world fact, and it does not move money.

This is not a GenLayer Foundation product and it does not impersonate the GenLayer portal.

## What the contract decides

`contracts/milestone_witness.py` keeps campaigns, milestones, evidence, and reviews. Evidence is append-only. Criteria freeze after the first submission. A milestone moves `collecting → locked → reviewed`. Reopening keeps the old review.

`request_review` copies the criteria and evidence out of storage, then calls `gl.vm.run_nondet_unsafe`. The leader and each validator:

1. `gl.nondet.web.get` the same https URL, when the evidence is a public page.
2. Record a fetch class and whether the normalized excerpt appears in the first 8000 characters.
3. Call `gl.nondet.exec_prompt(..., response_format="json")` on the excerpt plus those grounding flags.
4. Compare outcome, per-criterion status, fetch class, grounding, truncation, and confidence. Confidence may differ by at most 1500 bps, and it may not cross the 6500 or 5000 bps gates.

A deterministic policy then runs outside the nondeterministic block. It can downgrade a reading. It cannot turn a weak reading into `supports`. `supports` requires a grounded public page, every criterion read as `met`, and confidence of at least 6500 bps. A paste alone cannot support a milestone. The raw model outcome is stored next to the policy outcome, with machine-readable limits and this claim scope:

> Consensus reading of the supplied evidence against the milestone criteria. Not a finding of real-world fact, identity, legal compliance, payment entitlement, or refund.

There is no payable method, no balance, and no refund path.

## Runner pin

The contract header is:

```text
py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6
```

That is the hash shown by the GenLayer docs pages fetched on 19 November 2026, including [Your First Contract](https://docs.genlayer.com/developers/intelligent-contracts/first-contract) and the [runner appendix](https://sdk.genlayer.com/v0.3.x/impl-spec/appendix/available-runners.html). Direct-mode tests execute this runner from the GenVM v0.2.16 universal archive, which `genlayer-test` 0.29.2 can load.

`genvm-lint` 0.11.0 also reports a newer runner, `1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh`, inside GenVM v0.3.0-rc7. Loading that runner with `genlayer-test` 0.29.2 fails while injecting the transaction message (`unexpected end of memory`). Do not switch the pin until the tests pass on it. v0.3.0-rc7 no longer publishes the `genvm-universal.tar.xz` asset name that `genlayer-test` 0.29.2 requests; the linter cache was able to obtain a compatible archive, and the test cache used for the recorded run is v0.2.16.

## Frontend

`web/` is a Next.js app. It uses the installed `genlayer-js` 1.1.8 client:

- `readContract` with `TransactionHashVariant.LATEST_NONFINAL` or `LATEST_FINAL`
- `writeContract` with `value: 0n`
- `waitForTransactionReceipt` for `ACCEPTED`, then `FINALIZED`
- `connect` for the selected chain object
- optional `simulateWriteContract` before signing

`genlayer-js` 1.1.8 does not export `estimateTransactionFeesForWrite`, `waitForFinalization`, or `isSuccessful`, even though current docs describe those names. The UI treats a receipt as successful only when the status is accepted or finalized **and** `txExecutionResultName` is `FINISHED_WITH_RETURN`. A finalized receipt with no execution result is not shown as success.

The default mode is a read-only specimen desk. Specimen identifiers are labeled as specimens. Chain mode is a separate banner and a separate confirmation. It does not show specimens, and it does not contain a contract address until someone pastes one. No wallet is used by the specimen mode.

## Run the app

```bash
cd web
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

`npm run build` writes a static site to `web/out`. Host that directory as files. A real contract is passed in the URL, for example `/desk/?address=0x…&chain=studionet`. An empty address stays empty. Specimen mode never fills chain mode. See `docs/DEPLOYMENT.md`. There is no public hosting URL in this draft.

```bash
cd web
npm run test:rules
```

That check imports `genlayer-js` and asserts the methods above exist. It does not send a transaction.

## Test the contract

Python 3.12 and the pinned test tools:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest tests/direct/test_milestone_witness.py -v
.venv/bin/genvm-lint check contracts/milestone_witness.py
```

The first direct-mode run downloads the GenVM archive (about 200 MB) into `~/.cache/gltest-direct`. These tests do not need a wallet, a signature, Docker, or a funded account. Studio and network tests are not part of the recorded run. The captured result is in `docs/test-reports/`.

## Deploy, after the owner confirms

Nothing in this draft has been deployed or signed.

```bash
npm install -g genlayer
genlayer init
genlayer up
genlayer network set localnet
genlayer network info
genlayer deploy --contract contracts/milestone_witness.py --rpc http://127.0.0.1:4000/api
```

Paste the address from that receipt into Chain actions. Do not reuse an address from someone else's deployment. Measure fees on local Studio before adding a `fee-profile.json`. This repo does not ship an unmeasured fee profile.

Hosted Studio, Studio-dev, and Bradbury require the owner's network choice, a wallet, and possibly a faucet. Those steps are not done here. See `docs/zh-quickstart.md` for the short Chinese path and `SECURITY.md` for limits.

## Contribution boundary

The Intelligent Contract and the application are separate artifacts. A reviewer decides whether each can receive credit. Shipping both in one repository does not mean the same work should be counted twice. GitHub publication and a public website are still missing; see `docs/submission/EVIDENCE-CHECKLIST.md`.
