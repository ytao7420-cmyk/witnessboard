# Project field draft

Do not paste this into the portal until the owner reviews it. Intelligent Contract contribution `acb5c941-0d9c-4408-a9a8-4ee70a25dbb8` is still Pending. This draft is the separate Project record. It does not hide that pending contract submission, and it does not promise that both categories will be rewarded.

## Pitch

Witnessboard stores a GenLayer consensus reading of public milestone evidence. It holds no funds and does not claim a real-world fact.

## Description

Witnessboard is a noncustodial desk for milestone evidence. An organizer publishes criteria. A caller submits a public https page and the passage they claim is on it. After the organizer locks the milestone, a review request makes GenLayer validators fetch that page and compare the passage with the criteria. The contract stores the consensus reading, the raw model outcome, the per-criterion findings, the fetch class, whether the passage was found, and the limits. The claim scope stays on the review: it is not a finding of fact, identity, legal compliance, payment, or refund. There is no payable method.

The public site has two separate paths. The desk is anonymous and read-only: https://ytao7420-cmyk.github.io/witnessboard/desk/?address=0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865&chain=studionet . Specimen mode, with no address, shows labeled samples and no chain data. Writes are only on https://ytao7420-cmyk.github.io/witnessboard/actions/?address=0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865&chain=studionet and use the visitor's injected wallet. Each write sends value 0. A receipt counts only when GenLayer execution returns, and the page then reads the returned id back. A finalized status number by itself is not success.

One temporary Studionet walk-through is recorded. The campaign title is a test label and says it is not a fundraising record. The evidence is one sentence from this repository's own README. The stored outcome `supports` means the validators found that sentence and read the single criterion as met. It is not business traction, not a third-party participant, and not a result that transfers to another visitor. Studionet can reset. The contract address is not a Bradbury or mainnet address.

## How to use

1. Open the desk URL above. Do not connect a wallet. Read the campaign, milestone, evidence, and review. The amber specimen desk, without an address, is a separate sample and is not this chain record.
2. To make a new call, open the actions URL, choose studionet, and connect the wallet that should sign. Value must be 0. Reject a Snap prompt. If a transaction hash appears, do not send that call again.
3. The recorded path was `add_milestone`, `submit_evidence` with `public_https`, `lock_milestone`, then `request_review`. `update_criteria`, `close_campaign`, and `reopen_milestone` were not part of it.

## Expected read-back

For this recorded contract, `latest-final` reads are:

- `c0001` is open. Its summary says the record is not real fundraising. `milestone_ids` is `["m0001"]`.
- `m0001` is `reviewed`, `active_review_id` is `r0001`, and `evidence_ids` is `["e0001"]`.
- `e0001` is `public_https`, the note is empty, and the excerpt is the README sentence named below.
- `r0001` has outcome `supports`, raw outcome `supports`, confidence 9500 bps, finding `met`, fetch class `ok`, and grounded `true`. The claim scope contains "Not a finding of real-world fact". Limits include `not_a_real_world_finding`, `page_body_not_retained`, `no_payment_or_refund_effect`, and `single_evidence_item`.

A different address is not expected to contain these ids. A new write is successful only when its own receipt returns and its own id is read back.

## Evidence URLs

- Repository: https://github.com/ytao7420-cmyk/witnessboard
- Read-only desk: https://ytao7420-cmyk.github.io/witnessboard/desk/?address=0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865&chain=studionet
- Wallet actions: https://ytao7420-cmyk.github.io/witnessboard/actions/?address=0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865&chain=studionet
- Contract: `0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865` on Studionet, chain id 61999, RPC `https://studio.genlayer.com/api`
- Deploy: https://explorer-studio.genlayer.com/tx/0xe1e1b325d145270f2696fa349075d60417e918d55c954796bf5a870a711df544
- add_milestone `m0001`: https://explorer-studio.genlayer.com/tx/0x28e13ed0cfefba84e7b55ed23c0bfd8401cc8d901fa58dc028e1ade10735ad98
- submit_evidence `e0001`: https://explorer-studio.genlayer.com/tx/0x572f47f49c43bc554a7ba8e96a3b62562a172a6c8cc58cddb74ce57dd13a3774
- lock_milestone: https://explorer-studio.genlayer.com/tx/0xbdc3256af5efa137c60ece1c8bed4d115acfd3bedc064cbb949022243404b87f
- request_review `r0001`: https://explorer-studio.genlayer.com/tx/0x9b565f16ba116b3cd7e945054fa060cdd2fc7187a11c6f44b8d76188118553d4
- Quoted page: https://raw.githubusercontent.com/ytao7420-cmyk/witnessboard/49ffbad6931125c565ca37709cb88c379b914771/README.md

## Limits

Studionet can reset, so these ids may disappear. The quoted page is first-party text, not an independent fundraiser. One evidence item is a recorded limit. The review does not retain the page body and has no payment or refund effect. Wallet gas of 500000 at 1 Gwei showed a 0.0005 GEN preview; that preview is not the fee charged. The pending Intelligent Contract submission is a different category, and this draft does not claim both rewards.
