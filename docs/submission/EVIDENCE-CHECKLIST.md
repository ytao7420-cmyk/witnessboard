# Evidence checklist

Status on 19 November 2026. Nothing below has been submitted to the GenLayer portal.

| Evidence | Intelligent Contract | Project | Status |
| --- | --- | --- | --- |
| Readable contract with real equivalence logic | Required | Used by the app | Present: `contracts/milestone_witness.py` |
| State design and limits | Required | Shown in the UI | Present: contract views, `SECURITY.md`, Limits page |
| Docs and tests | Required | Usage instructions | Present: `README.md`, `docs/zh-quickstart.md`, `docs/test-reports/` |
| Description within 1000 words | Required | Overview within 1000 words | Drafts in this folder. Count them again before submission. |
| Pitch within 180 characters | No | Required | Draft in `project.md`. Count before submission. |
| Evidence URLs | Required | Required | Public repository, Pages site, and one temporary Studionet deployment below. |
| Usable website | No | Required | GitHub Pages target: `https://ytao7420-cmyk.github.io/witnessboard/`. Local dev: `http://127.0.0.1:43123/witnessboard/`. Not a chain deployment. |
| GitHub repository | Helpful as a URL | Required | Public: `https://github.com/ytao7420-cmyk/witnessboard`. This is not an Origin mirror. |
| Deployed contract address | Not required by the written brief, but useful | Useful for a live demo | Studionet, temporary: `0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865`. Not Bradbury. |
| Transaction hash | One create, no review | Would show a live review | Deploy `0xe1e1b325d145270f2696fa349075d60417e918d55c954796bf5a870a711df544`. create_campaign `0xa964822ba610072987b7cbb5ed14997aa22058b1a9ab98c01068cb9ce646f768` returned `c0001`. No review transaction. |
| Screenshots of chain success | No | No | Do not create them. UI screenshots, if captured, are of the local draft only. |
| Faucet, signature, portal post | No | No | Not done. Owner must confirm before any of these. |

## Duplicate credit

The contract can be understood without the website: its consensus rule, storage, and tests stand alone. The website can be understood as the operator's desk, but its chain mode is only meaningful because of that contract. Submit them as separate drafts. Do not tell a reviewer that one repository automatically earns both point ranges. The reviewer decides.

## Owner actions still required

1. Read the contract, the security notes, and both submission drafts.
2. The public Git repository is https://github.com/ytao7420-cmyk/witnessboard.
3. Decide whether to deploy on localnet, Studio, or a testnet, and whether to use a faucet. This draft has not signed or deployed.
4. If deployed, paste the real address into the app and replace the "missing address" lines in this checklist with the receipt you actually received.
5. The static site is built for GitHub Pages at https://ytao7420-cmyk.github.io/witnessboard/. That URL is not a contract address.
6. Only then paste the drafts into the portal. Do not attach this checklist's gaps as if they were done.
