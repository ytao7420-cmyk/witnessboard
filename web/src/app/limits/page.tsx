"use client";

import { useSession } from "@/components/session";

export default function LimitsPage() {
  const { state } = useSession();
  const zh = state.lang === "zh";
  const items = zh
    ? [
        ["不认定事实", "审查结果是验证者对已提交材料的共识阅读。页面可能过时、个性化或被替换。"],
        ["不碰资金", "没有 payable 方法，不记录捐款，不计算退款，也不连接支付合约。"],
        ["正向结论有门槛", "supports 需要公开 https 页面里确实出现规范化后的摘录，每条标准都被读作 met，并且置信度不低于 6500 bps。粘贴文本不能单独得到 supports。"],
        ["只能降级", "模型如果说 supports，但标准没覆盖、页面没对上或置信度不够，合约记下 insufficient_evidence 或 uncertain，并保留模型原读法。"],
        ["页面正文不入库", "链上留下摘录、摘录哈希、URL、抓取类别和是否对上。不保存整页，避免把易变网页写进状态。"],
        ["截断", "抓取文本只取前 8000 个字符参与比对。超出的部分即使含有摘录，也记为未对上，并带上 page_text_truncated。"],
        ["URL 限制", "只接受无凭据、无片段的 https。拒绝回环、私网、链路本地、CGNAT 和 localhost 等主机名。这不能消除 DNS 重绑定。"],
        ["对抗性文本", "控制字符和双向覆盖符会被拒绝。摘录被当作数据，不执行。验证者必须自己重跑，只检查 JSON 形状不算共识。"],
        ["分歧", "读法或抓取类别不一致时，验证者拒绝。交易可以变成 undetermined，状态保持原样。"],
        ["申诉", "协议层可以申诉。本草案不自动申诉，也不代付保证金。"],
      ]
    : [
        ["Not a finding of fact", "A review is a consensus reading of submitted material. Pages can be stale, personalized, or replaced."],
        ["No funds", "There is no payable method, no donation ledger, no refund math, and no payment-contract call."],
        ["Support has gates", "supports requires the normalized excerpt to appear in a public https page, every criterion read as met, and confidence of at least 6500 bps. A paste alone cannot support."],
        ["Downgrade only", "If the model says supports but the criteria are incomplete, the page does not match, or confidence is low, the stored outcome becomes insufficient_evidence or uncertain. The raw reading stays visible."],
        ["Page body is not stored", "The chain keeps the excerpt, its hash, the URL, the fetch class, and whether the passage was found. The full page is not stored."],
        ["Truncation", "Only the first 8000 characters are searched. A match past that point is ungrounded and marked page_text_truncated."],
        ["URL limits", "https only, no credentials and no fragment. Loopback, private, link-local, CGNAT, and localhost names are rejected. This does not remove DNS rebinding."],
        ["Adversarial text", "Control characters and bidi overrides are rejected. Excerpts are data and are not executed. Validators must re-run the reading; a JSON shape check is not consensus."],
        ["Disagreement", "If the reading or fetch class differs, validators reject. The transaction can end undetermined and the previous state remains."],
        ["Appeals", "The protocol can appeal. This draft does not appeal automatically and does not post a bond."],
      ];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">{zh ? "边界" : "Limits"}</h1>
      <div className="grid gap-3">
        {items.map(([title, body]) => (
          <article key={title} className="rounded-xl border bg-card p-4">
            <h2 className="font-display text-xl">{title}</h2>
            <p className="mt-2 text-sm leading-6">{body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
