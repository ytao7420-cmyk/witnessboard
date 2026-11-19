# Project submission draft

Do not submit this until the owner reviews it. No portal form has been sent.

Category: Projects. Stated range 20–4000 points, two weekly slots. This is the application draft. It is not a second claim on the Intelligent Contract. The reviewer decides if both categories can be credited.

## Pitch

Witnessboard is a noncustodial desk where crowdfunding milestone evidence gets a GenLayer consensus reading, without holding funds or claiming real-world fact.

## Overview

Witnessboard is the working desk around MilestoneWitness. Organizers publish milestone criteria. Backers, or the organizer, attach a public excerpt or an https page. After the organizer locks the milestone, a review request sends that material through GenLayer consensus. The page shows the stored outcome, the raw model reading, the per-criterion findings, the fetch class, whether the passage was found, the input fingerprint, and the limits. The claim scope stays on the review: the result is not a real-world finding and it has no payment effect.

GenLayer is the review step, not a decorative API call. The desk is not useful as a record of "what the model said" unless the contract's equivalence check and downgrade policy have run. The interface therefore separates two modes. The default mode is a read-only specimen desk with an amber banner. Its campaigns are labeled specimens and contain no transaction hashes and no contract address. Chain mode uses another banner and requires an explicit confirmation. It reads only the address the operator pastes, through `genlayer-js` 1.1.8 `readContract`, and it can show an empty or error state. Writes use `writeContract` with value zero, then `waitForTransactionReceipt` for an accepted decision and for finalization. The screen does not call a write successful unless the execution result is `FINISHED_WITH_RETURN`. If a hash already exists, the UI can resume waiting. It does not submit a second transaction to recover from a timeout.

The installed SDK does not include the newer fee-estimation helpers described in some current docs. The app does not pretend that an unmeasured fee profile was generated. Deployment and fee measurement are written as owner steps and have not been executed. There is no faucet use, no live signature, and no published hosting.

The local site runs at http://127.0.0.1:43123 after `npm run dev` in `web/`. A public website URL does not exist yet. A public GitHub repository does not exist yet. The Origin scratch repository is only the draft source. Those two gaps block a Project submission that requires a usable website and a GitHub repository as evidence.

## Usage

1. Start `web` with `npm run dev` and open the desk in specimen mode.
2. Open a specimen review and read the outcome, the raw reading, and the limits.
3. For a real contract, the owner deploys locally with the commands in the README, then pastes that address in chain mode.
4. Connect a wallet only after that, on the network selected in the form. Confirm the chain id shown from the SDK chain object.
5. Create a campaign, add criteria, submit evidence, lock, and request a review. Keep the returned transaction hash. Wait for decision and finalization on that same hash.

## Verifiable outcomes

- Specimen mode renders without a wallet and states that it is not chain data.
- Chain mode with no address does not show specimens.
- `npm run test:rules` checks the installed SDK methods and the receipt rule. It does not send a transaction.
- Contract tests in `docs/test-reports/pytest-direct.txt` show 17 passing direct-mode tests.
- No production transaction hash is available to verify on an explorer.
