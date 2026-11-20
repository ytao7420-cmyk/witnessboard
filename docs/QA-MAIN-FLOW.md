# 浏览器最小主流程

这四笔已经由发起人钱包签过，并且只读核对过。不要再发。归档在 `docs/test-reports/2026-11-20-main-flow-readback.txt`。当时每笔 value 为 0，钱包预览 0.0005 GEN 是上限，不是实际扣费。没有接受 Snap。

下面保留当时的参数，方便对照，不是再做一遍的指令。

页面：https://ytao7420-cmyk.github.io/witnessboard/actions/?address=0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865&chain=studionet

合约 `0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865`。网络 studionet，chain id 61999，RPC `https://studio.genlayer.com/api`。读取快照选 `latest-final`。签名账户必须是发起人 `0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9`。

## 当前前置状态

2026-11-20 只读：

- `manifest.campaign_count` 为 1，`holds_funds` 为 false。
- `list_campaign_ids` 为 `["c0001"]`。
- `get_campaign("c0001")`：title `测试记录`，summary `用于验证见证台在Studionet上的创建与读回流程；不代表真实筹款或参与记录。`，status `open`，organizer 同上，`milestone_ids` 为 `[]`。

先再点一次 `list_campaign_ids` 和 `get_campaign`。只有仍是这个状态才继续。这不是真实筹款。

## 要发的四笔

每笔成功的标准都是：回执 `FINALIZED` 且执行结果为 return，页面读回对上这次参数。不要把某一次记录写成通用成功。`request_review` 可能要几分钟。等待超时但已经有哈希时，点“只继续等待已有哈希的最终化”，然后用返回的 id 读，不要重发。

### 1. add_milestone

- campaign id：`c0001`
- 活动标题栏改填里程碑标题：`README says the result does not move money`
- 标准，一行：`The page states that the stored result is a consensus reading of the supplied material and that it does not move money.`

当前没有里程碑，第一次返回应为 `m0001`。若返回别的 id，用那个 id，不要再发一次。

读回 `get_milestone`：status `collecting`，title 和 criteria 与上面一致，`evidence_ids` 为 `[]`。

### 2. submit_evidence

- source kind：`public_https`
- URL：`https://raw.githubusercontent.com/ytao7420-cmyk/witnessboard/49ffbad6931125c565ca37709cb88c379b914771/README.md`
- 摘录，整句照抄：`The stored result is a consensus reading of the supplied material. It is not a finding of real-world fact, and it does not move money.`
- 备注留空。

这个 URL 是合并 PR6 时的 README 原文，正文 7074 字符，在合约 8000 字截断之内，上面的摘录能在归一化后找到。它只证明页面写了这句话。

读回 `get_evidence`：source_kind `public_https`，locator 和 excerpt 与提交一致。第一次返回应为 `e0001`。

### 3. lock_milestone

参数只有 `c0001` 和上一步的 milestone id。无返回值。

读回 `get_milestone`：status `locked`，evidence_ids 含刚才的证据 id。

### 4. request_review

参数只有 `c0001` 和同一个 milestone id。这是唯一一次 GenLayer 非确定性评审。

读回 `get_review` 和 `get_milestone_view`：

- 返回的 review id 等于 milestone 的 `active_review_id`，status 为 `reviewed`。第一次返回应为 `r0001`。
- `claim_scope` 含 “Not a finding of real-world fact”。
- `outcome` 是 `supports`、`does_not_support`、`insufficient_evidence`、`uncertain` 之一。
- `supports` 只在 grounded 为 true、唯一标准为 `met`、confidence 至少 6500 bps 时成立。别的结果也是一次完整评审，不要为了换成 `supports` 再发。`limits` 里出现 `single_evidence_item` 是正常的。

最终 `get_milestone_view` 应同时含 campaign、milestone、evidence、review。

## 不要发

- `update_criteria`：标准已在添加里程碑时写入。它只在收集中且没有证据时合法，多发一笔不增加主流程。
- `close_campaign`：会关掉 `c0001`，后面的证据和评审都不能再做。
- `reopen_milestone`：会把评审标成 superseded。要保留这次评审就不要发。
- `pasted_excerpt`、第二条证据、第二个里程碑、再开一个活动：都不能把未接地的材料变成 `supports`，也不是这条主流程需要的。
