"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export default function HomePage() {
  const { state } = useSession();
  const zh = state.lang === "zh";
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {zh ? "众筹里程碑证据台" : "Crowdfunding milestone evidence desk"}
        </p>
        <h1 className="max-w-3xl font-display text-4xl leading-tight md:text-5xl">
          {zh
            ? "把公开证据和里程碑标准放在同一份可复查的共识记录里。"
            : "Put public evidence and milestone criteria into one reviewable consensus record."}
        </h1>
        <p className="max-w-3xl text-base leading-7">
          {zh
            ? "发起人公布里程碑。支持者提交公开摘录或 https 页面。智能合约让验证者各自抓取同一页面、各自重读标准，再只在读法一致时记下结果。确定性策略只能降级，不能把薄弱证据升成“支持”。合约不收款、不托管、不触发退款。"
            : "An organizer publishes milestones. Anyone can submit a public excerpt or an https page. Validators fetch that page independently and re-read the criteria. A deterministic policy can only downgrade a reading. The contract accepts no payment, holds no funds, and triggers no refund."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/desk" />}>
            {zh ? "看台面" : "Open the desk"}
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/limits" />}>
            {zh ? "先看它不能证明什么" : "What it cannot prove"}
          </Button>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {[
          ["supports", zh ? "摘录出现在公开页面上，且每条标准都被读作满足。" : "The excerpt is found on a public page and every criterion is read as met."],
          ["does_not_support", zh ? "材料对着标准，并且至少一条被读作未满足。" : "The material addresses the criteria and at least one is read as unmet."],
          ["insufficient_evidence", zh ? "页面没对上、抓取失败，或材料没有覆盖标准。" : "The page does not contain the excerpt, the fetch failed, or the material misses the criteria."],
          ["uncertain", zh ? "读法互相冲突，或置信度跨不过门槛。" : "The readings conflict, or confidence stays below the gate."],
        ].map(([name, body]) => (
          <article key={name} className="rounded-xl border bg-card p-4">
            <h2 className="font-mono text-sm">{name}</h2>
            <p className="mt-2 text-sm leading-6">{body}</p>
          </article>
        ))}
      </section>
      <p className="max-w-3xl text-sm text-muted-foreground">
        {zh
          ? "四种结果都是对已提交材料的共识阅读。它们不是付款资格、身份结论或现实事实。模型原文和降级后的结果会一起留下，方便看出策略改了什么。"
          : "All four outcomes are consensus readings of submitted material. They are not payment entitlement, identity, or real-world fact. The raw model reading is stored beside the downgraded result."}
      </p>
    </div>
  );
}
