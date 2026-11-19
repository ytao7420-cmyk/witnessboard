# Evidence checklist

Status on 19 November 2026. Nothing below has been submitted to the GenLayer portal.

| Evidence | Intelligent Contract | Project | Status |
| --- | --- | --- | --- |
| Readable contract with real equivalence logic | Required | Used by the app | Present: `contracts/milestone_witness.py` |
| State design and limits | Required | Shown in the UI | Present: contract views, `SECURITY.md`, Limits page |
| Docs and tests | Required | Usage instructions | Present: `README.md`, `docs/zh-quickstart.md`, `docs/test-reports/` |
| Description within 1000 words | Required | Overview within 1000 words | Drafts in this folder. Count them again before submission. |
| Pitch within 180 characters | No | Required | Draft in `project.md`. Count before submission. |
| Evidence URLs | Required | Required | Only documentation URLs are real. No deployment URL. |
| Usable website | No | Required | Local only: `http://127.0.0.1:43123`. Not public hosting. |
| GitHub repository | Helpful as a URL | Required | Missing. This Origin scratch repo is the draft. Do not mirror or publish it without approval. |
| Deployed contract address | Not required by the written brief, but useful | Useful for a live demo | Missing on every public network. A local GLSim address exists only while `127.0.0.1:4217` is running and is recorded as local-only in `docs/test-reports/glsim-local.json`. |
| Transaction hash | No | Would show a live review | Missing. Do not invent one. |
| Screenshots of chain success | No | No | Do not create them. UI screenshots, if captured, are of the local draft only. |
| Faucet, signature, portal post | No | No | Not done. Owner must confirm before any of these. |

## Duplicate credit

The contract can be understood without the website: its consensus rule, storage, and tests stand alone. The website can be understood as the operator's desk, but its chain mode is only meaningful because of that contract. Submit them as separate drafts. Do not tell a reviewer that one repository automatically earns both point ranges. The reviewer decides.

## Owner actions still required

1. Read the contract, the security notes, and both submission drafts.
2. Decide whether to publish a public Git repository. This agent will not create one unless asked.
3. Decide whether to deploy on localnet, Studio, or a testnet, and whether to use a faucet. This agent will not sign or deploy.
4. If deployed, paste the real address into the app and replace the "missing address" lines in this checklist with the receipt you actually received.
5. If a public site is required, host `web/` yourself and record that URL.
6. Only then paste the drafts into the portal. Do not attach this checklist's gaps as if they were done.
