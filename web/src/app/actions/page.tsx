"use client";

import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRuntimeTarget } from "@/components/runtime";
import { chainCatalog, chainFacts, idleTx, loadCampaigns, readCampaignSummary, readChain, resumeFinalization, runWrite, type ChainKey, type TxState } from "@/lib/genlayer";
import { RECORDED_STUDIONET_DEPLOYMENT } from "@/lib/studionet-deploy.mjs";
import { interpretReceipt, isContractAddress, writesAllowed } from "@/lib/rules.mjs";

const phases = ["simulating", "awaiting-signature", "submitted", "waiting-decision", "decided", "waiting-final", "final"] as const;

export default function ActionsRoute() {
  return (
    <Suspense fallback={<p className="text-sm">…</p>}>
      <ActionsPage />
    </Suspense>
  );
}

function ActionsPage() {
  const target = useRuntimeTarget();
  const { setState } = target;
  const state = target;
  const zh = state.lang === "zh";
  const [tx, setTx] = useState<TxState>(idleTx);
  const [addressDraft, setAddressDraft] = useState(target.contractAddress);
  const [addressDirty, setAddressDirty] = useState(false);
  const [evidence, setEvidence] = useState("");
  useEffect(() => {
    if (!addressDirty) setAddressDraft(target.contractAddress);
  }, [addressDirty, target.contractAddress]);
  const [simulate, setSimulate] = useState(false);
  const [fields, setFields] = useState({
    title: "",
    summary: "",
    campaignId: "",
    milestoneId: "",
    criteria: "",
    sourceKind: "public_https",
    locator: "",
    excerpt: "",
    note: "",
    evidenceId: "",
    reviewId: "",
  });
  const writeAddress = addressDirty ? addressDraft : state.contractAddress || addressDraft;
  const allowed = writesAllowed(state.mode) && isContractAddress(writeAddress);
  const facts = chainFacts(state.chainKey);

  function update(name: string, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function submit(functionName: string, args: unknown[]) {
    if (!allowed) return;
    await runWrite({
      key: state.chainKey,
      address: writeAddress.trim(),
      functionName,
      args,
      simulateFirst: simulate,
      endpoint: state.chainKey === "studionet" ? "https://studio.genlayer.com/api" : state.endpoint,
      variantName: state.stateVariant,
      onUpdate: setTx,
      onReadBack: (value) => setEvidence(JSON.stringify(value, null, 2)),
    });
  }

  async function readList() {
    if (!isContractAddress(writeAddress)) return;
    const campaigns = await loadCampaigns(state.chainKey, writeAddress, state.stateVariant, state.chainKey === "studionet" ? "https://studio.genlayer.com/api" : state.endpoint);
    setEvidence(JSON.stringify({ list_campaign_ids: campaigns.map((campaign) => campaign.id), campaigns }, null, 2));
  }

  async function verifyRecordedWrite() {
    const hash = RECORDED_STUDIONET_DEPLOYMENT.createCampaignTxHash;
    const response = await fetch("https://studio.genlayer.com/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [hash] }),
    });
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "eth_getTransactionByHash failed");
    const reading = interpretReceipt(payload.result);
    const campaigns = isContractAddress(writeAddress)
      ? await loadCampaigns(state.chainKey, writeAddress, state.stateVariant, "https://studio.genlayer.com/api")
      : [];
    const campaign = reading.returnText
      ? await readCampaignSummary(state.chainKey, writeAddress, state.stateVariant, reading.returnText, "https://studio.genlayer.com/api")
      : null;
    setEvidence(JSON.stringify({
      readOnly: true,
      hash,
      explorer: RECORDED_STUDIONET_DEPLOYMENT.createCampaignExplorerTx,
      receipt: reading,
      list_campaign_ids: campaigns.map((item) => item.id),
      get_campaign: campaign,
    }, null, 2));
    setTx({
      phase: reading.successful ? "final" : "error",
      hash,
      detail: reading.successful
        ? `只读核验 ${reading.status} / ${reading.executionName} / ${reading.returnText}. 没有发送新交易。`
        : `只读核验未达到 GenLayer return：${reading.status} / ${reading.executionName || "execution-absent"}`,
      successful: reading.successful,
    });
  }

  async function readNamed(fn: string, args: string[]) {
    if (!isContractAddress(writeAddress) || args.some((item) => !item.trim())) return;
    const endpoint = state.chainKey === "studionet" ? "https://studio.genlayer.com/api" : state.endpoint;
    const value = await readChain(state.chainKey, writeAddress, state.stateVariant, fn, args, endpoint);
    setEvidence(JSON.stringify({ [fn]: value }, null, 2));
  }

  async function readOne() {
    if (!isContractAddress(writeAddress) || !fields.campaignId) return;
    const campaign = await readCampaignSummary(state.chainKey, writeAddress, state.stateVariant, fields.campaignId, state.chainKey === "studionet" ? "https://studio.genlayer.com/api" : state.endpoint);
    setEvidence(JSON.stringify({ get_campaign: campaign }, null, 2));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">{zh ? "链上操作" : "Chain actions"}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {zh
            ? "已安装的 genlayer-js 1.1.8 提供 readContract、writeContract 和 waitForTransactionReceipt。它没有文档里较新的 estimateTransactionFeesForWrite。这里的写操作固定 value 为 0，因为合约不收款。ACCEPTED 或 FINALIZED 只有在回执同时是 FINISHED_WITH_RETURN 时才算成功。"
            : "The installed genlayer-js 1.1.8 exposes readContract, writeContract, and waitForTransactionReceipt. It does not include the newer estimateTransactionFeesForWrite shown in some docs. Writes send value 0 because the contract accepts no funds. ACCEPTED or FINALIZED counts as success only together with FINISHED_WITH_RETURN."}
        </p>
      </div>

      <p className="rounded-xl border p-4 text-sm leading-6">
        {zh
          ? "已安装的 genlayer-js 1.1.8 把 testnetBradbury 指到 https://rpc-bradbury.genlayer.com，chain id 4221。官方网络页写的 Bradbury 链 RPC 是 https://rpc.testnet-chain.genlayer.com，同样是 chain id 4221，并要求智能合约走 Phase 2 节点 RPC，不要用旧端点。签名前核对创世区块。本应用不代签。浏览器钱包会收到 eth_sendTransaction，类型 legacy，value 为 0，目标是该网络的共识主合约，不是无限授权。"
          : "Installed genlayer-js 1.1.8 points testnetBradbury at https://rpc-bradbury.genlayer.com, chain id 4221. The official networks page lists https://rpc.testnet-chain.genlayer.com for the same chain id and says intelligent-contract calls need a Phase 2 node RPC. This app does not sign. A browser wallet receives a legacy eth_sendTransaction with value 0 to that network's consensus contract, not an unlimited approval."}
      </p>

      {state.mode === "illustrative" ? (
        <p className="rounded-xl border border-amber-700/40 bg-amber-50 p-4 text-sm text-amber-950">
          {zh
            ? "当前是只读标本。下面的表单不会调用 SDK，也不会弹出钱包。先在页眉确认进入链上模式。"
            : "Read-only specimen mode is on. These forms do not call the SDK or open a wallet. Confirm chain mode in the header first."}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>{zh ? "网络" : "Network"}</span>
          <select
            className="h-9 w-full rounded-lg border bg-background px-2"
            value={state.chainKey}
            onChange={(event) => setState({ chainKey: event.target.value as ChainKey })}
          >
            {Object.keys(chainCatalog).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <span className="block text-muted-foreground">
            SDK chain id {facts.id} · preset {facts.rpc}
            {state.endpoint ? ` · override ${state.endpoint}` : ""}
            {state.addressSource !== "none" ? ` · address ${state.addressSource}` : ""}
          </span>
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>{zh ? "自定义 GenLayer RPC，可空" : "Optional GenLayer RPC override"}</span>
          <Input
            value={state.rpcOverride}
            placeholder="https://studio.genlayer.com/api"
            onChange={(event) => setState({ rpcOverride: event.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{zh ? "合约地址" : "Contract address"}</span>
            <Input
            value={addressDirty ? addressDraft : state.contractAddress || addressDraft}
            placeholder={zh ? "可粘贴或修改。URL 里的地址会先填在这里。" : "Paste or edit. A URL address is filled here first."}
            onChange={(event) => {
              setAddressDirty(true);
              setAddressDraft(event.target.value.trim());
            }}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{zh ? "读取快照" : "Read snapshot"}</span>
          <select
            className="h-9 w-full rounded-lg border bg-background px-2"
            value={state.stateVariant}
            onChange={(event) => setState({ stateVariant: event.target.value as "latest-final" | "latest-nonfinal" })}
          >
            <option value="latest-nonfinal">latest-nonfinal</option>
            <option value="latest-final">latest-final</option>
          </select>
        </label>
        <p className="text-sm leading-6 text-muted-foreground md:col-span-2">
          {zh
            ? `Studionet 临时合约 ${RECORDED_STUDIONET_DEPLOYMENT.contractAddress}。写入 value 为 0，不安装 Snap。节点 gas price 为 0 时，钱包交易使用 1 Gwei，总额预览不超过 0.001 GEN 测试币。部署回执里的 effectiveGasPrice 0x0 是另一个字段。`
            : `Temporary Studionet contract ${RECORDED_STUDIONET_DEPLOYMENT.contractAddress}. Writes use value 0 and do not install a Snap. When the node quotes gas price 0, the wallet transaction uses 1 Gwei, capped at 0.001 GEN. The deploy receipt effectiveGasPrice of 0x0 is a different field.`}
        </p>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="button" variant="outline" disabled={!isContractAddress(writeAddress)} onClick={() => void readList().catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            list_campaign_ids
          </Button>
          <Button type="button" variant="outline" disabled={!isContractAddress(writeAddress) || !fields.campaignId} onClick={() => void readOne().catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            get_campaign
          </Button>
          <Button type="button" variant="outline" disabled={!isContractAddress(writeAddress) || !fields.milestoneId} onClick={() => void readNamed("get_milestone", [fields.milestoneId]).catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            get_milestone
          </Button>
          <Button type="button" variant="outline" disabled={!isContractAddress(writeAddress) || !fields.evidenceId} onClick={() => void readNamed("get_evidence", [fields.evidenceId]).catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            get_evidence
          </Button>
          <Button type="button" variant="outline" disabled={!isContractAddress(writeAddress) || !fields.reviewId} onClick={() => void readNamed("get_review", [fields.reviewId]).catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            get_review
          </Button>
          <Button type="button" variant="outline" disabled={!isContractAddress(writeAddress) || !fields.milestoneId} onClick={() => void readNamed("get_milestone_view", [fields.milestoneId]).catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            get_milestone_view
          </Button>
          <Button type="button" variant="secondary" disabled={!isContractAddress(writeAddress)} onClick={() => void verifyRecordedWrite().catch((error: unknown) => setEvidence(error instanceof Error ? error.message : String(error)))}>
            {zh ? "只读重读已记录的 create 哈希" : "Re-read the one recorded create hash"}
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground md:col-span-2">
          <a className="underline" href={RECORDED_STUDIONET_DEPLOYMENT.createCampaignExplorerTx}>
            {RECORDED_STUDIONET_DEPLOYMENT.createCampaignTxHash}
          </a>
          {zh
            ? "。这个按钮只重读这一笔已经发生的 create_campaign。它不证明别的地址、别的用户，也不代替后面的里程碑、证据和评审。0.0005 GEN 是那次钱包预览，不是实际扣费。"
            : ". This button only re-reads that one past create_campaign. It does not prove another address, another user, or the later milestone, evidence, and review. 0.0005 GEN was the wallet preview, not the amount charged."}
        </p>
        {evidence ? <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs md:col-span-2">{evidence}</pre> : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={simulate} onChange={(event) => setSimulate(event.target.checked)} />
          {zh ? "签名前尝试 simulateWriteContract（不是费用估算）" : "Try simulateWriteContract before signing (not a fee estimate)"}
        </label>
      </section>

      <TxPanel
        tx={tx}
        zh={zh}
        onResume={
          tx.hash
            ? () =>
                resumeFinalization(state.chainKey, tx.hash, setTx, state.endpoint).catch((error: unknown) =>
                  setTx({
                    phase: "error",
                    hash: tx.hash,
                    detail: error instanceof Error ? error.message : String(error),
                    successful: false,
                  }),
                )
            : undefined
        }
      />

      <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <Field label={zh ? "活动标题" : "Campaign title"} value={fields.title} onChange={(value) => update("title", value)} />
        <Field label={zh ? "活动简介" : "Summary"} value={fields.summary} onChange={(value) => update("summary", value)} area />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!allowed} onClick={() => submit("create_campaign", [fields.title, fields.summary])}>
            create_campaign
          </Button>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {zh
            ? "主流程是 add_milestone、submit_evidence、lock_milestone、request_review，每步等回执并读回返回的 id。不要为了覆盖再发 update_criteria、close_campaign、reopen_milestone 或第二条证据。已有哈希就不要重发。value 必须是 0，单次预览不超过 0.001 GEN。"
            : "The main path is add_milestone, submit_evidence, lock_milestone, then request_review. Wait for each receipt and read back its returned id. Do not send update_criteria, close_campaign, reopen_milestone, or a second evidence item for coverage. If a hash exists, do not send again. Value must be 0, and each preview must stay within 0.001 GEN."}
        </p>
        <Field label="campaign id" value={fields.campaignId} onChange={(value) => update("campaignId", value)} />
        <Field label="milestone id" value={fields.milestoneId} onChange={(value) => update("milestoneId", value)} />
        <Field label="evidence id" value={fields.evidenceId} onChange={(value) => update("evidenceId", value)} />
        <Field label="review id" value={fields.reviewId} onChange={(value) => update("reviewId", value)} />
        <Field label={zh ? "标准，一行一条" : "Criteria, one per line"} value={fields.criteria} onChange={(value) => update("criteria", value)} area />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!allowed} onClick={() => submit("add_milestone", [fields.campaignId, fields.title, fields.criteria])}>
            add_milestone
          </Button>
          <Button type="button" variant="outline" disabled={!allowed} onClick={() => submit("update_criteria", [fields.campaignId, fields.milestoneId, fields.criteria])}>
            update_criteria
          </Button>
          <Button type="button" variant="outline" disabled={!allowed} onClick={() => submit("close_campaign", [fields.campaignId])}>
            close_campaign
          </Button>
          <Button type="button" variant="outline" disabled={!allowed} onClick={() => submit("lock_milestone", [fields.campaignId, fields.milestoneId])}>
            lock_milestone
          </Button>
        </div>
        <label className="space-y-2 text-sm">
          <span>{zh ? "证据类型" : "Evidence kind"}</span>
          <select className="h-9 w-full rounded-lg border bg-background px-2" value={fields.sourceKind} onChange={(event) => update("sourceKind", event.target.value)}>
            <option value="public_https">public_https</option>
            <option value="pasted_excerpt">pasted_excerpt</option>
          </select>
        </label>
        <Field label={zh ? "URL 或标签" : "URL or label"} value={fields.locator} onChange={(value) => update("locator", value)} />
        <Field label={zh ? "摘录" : "Excerpt"} value={fields.excerpt} onChange={(value) => update("excerpt", value)} area />
        <Field label={zh ? "备注，可空" : "Note, optional"} value={fields.note} onChange={(value) => update("note", value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!allowed} onClick={() => submit("submit_evidence", [fields.campaignId, fields.milestoneId, fields.sourceKind, fields.locator, fields.excerpt, fields.note])}>
            submit_evidence
          </Button>
          <Button type="button" disabled={!allowed} onClick={() => submit("request_review", [fields.campaignId, fields.milestoneId])}>
            request_review
          </Button>
          <Button type="button" variant="secondary" disabled={!allowed} onClick={() => submit("reopen_milestone", [fields.campaignId, fields.milestoneId, fields.note])}>
            reopen_milestone
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {area ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <Input value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function TxPanel({ tx, zh, onResume }: { tx: TxState; zh: boolean; onResume?: () => void }) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="font-display text-xl">{zh ? "交易过程" : "Transaction"}</h2>
      <ol className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {phases.map((phase) => (
          <li key={phase} className={tx.phase === phase ? "font-medium" : "text-muted-foreground"}>
            {phase}
            {tx.phase === phase ? " · current" : ""}
          </li>
        ))}
      </ol>
      <p className="mt-3 break-all text-sm">
        {tx.hash ? tx.hash : zh ? "还没有交易哈希。这里不会显示虚构哈希。" : "No transaction hash yet. Nothing is invented here."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{tx.detail}</p>
      {tx.successful === true ? <p className="mt-2 text-sm">{zh ? "回执同时到达目标状态和 FINISHED_WITH_RETURN。" : "The receipt reached the target status and FINISHED_WITH_RETURN."}</p> : null}
      {tx.successful === false ? <p className="mt-2 text-sm">{zh ? "这不是一次成功的合约执行。如果已经有哈希，不要盲目重发。" : "This is not a successful contract execution. If a hash exists, do not blindly resubmit."}</p> : null}
      {onResume ? (
        <Button type="button" className="mt-3" variant="outline" onClick={onResume}>
          {zh ? "只继续等待已有哈希的最终化" : "Resume finalization for this hash"}
        </Button>
      ) : null}
    </section>
  );
}
