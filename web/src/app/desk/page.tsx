"use client";

import { Suspense, useEffect, useState } from "react";

import { CampaignList } from "@/components/records";
import { useRuntimeTarget } from "@/components/runtime";
import { basePath } from "@/lib/base-path";
import { illustrativeCampaigns, type CampaignView } from "@/lib/fixtures";
import { chainFacts, loadCampaigns } from "@/lib/genlayer";
import { RECORDED_STUDIONET_DEPLOYMENT } from "@/lib/studionet-deploy.mjs";

export default function DeskRoute() {
  return (
    <Suspense fallback={<p className="text-sm">…</p>}>
      <DeskPage />
    </Suspense>
  );
}

function DeskPage() {
  const target = useRuntimeTarget();
  const zh = target.lang === "zh";
  if (target.mode === "illustrative") {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl">{zh ? "台面" : "Desk"}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {zh
            ? "这些卡片是界面标本。标识写成 specimen。链上活动不会出现在这个模式里。"
            : "These cards are interface specimens. Chain campaigns are not shown in this mode."}
        </p>
        <CampaignList campaigns={illustrativeCampaigns} />
      </div>
    );
  }
  if (!target.contractAddress) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">{zh ? "台面" : "Desk"}</h1>
        <p className="rounded-xl border border-dashed p-4 text-sm">
          {zh
            ? `链上模式没有合约地址，所以这里是空的。标本不会用来冒充链上状态。所有者部署后打开 ${basePath}/desk/?address=0x…&chain=studionet ，或在“链上操作”粘贴地址。这里不预填地址。`
            : `Chain mode has no contract address, so this desk is empty. Specimens are not used as chain state. After the owner deploys, open ${basePath}/desk/?address=0x…&chain=studionet. Nothing is prefilled.`}
        </p>
      </div>
    );
  }
  return (
    <ChainDesk
      key={`${target.chainKey}:${target.contractAddress}:${target.endpoint}:${target.stateVariant}`}
      chainKey={target.chainKey}
      address={target.contractAddress}
      endpoint={target.endpoint}
      variantName={target.stateVariant}
      source={target.addressSource}
      zh={zh}
    />
  );
}

function ChainDesk({
  chainKey,
  address,
  endpoint,
  variantName,
  source,
  zh,
}: {
  chainKey: Parameters<typeof loadCampaigns>[0];
  address: string;
  endpoint: string;
  variantName: "latest-final" | "latest-nonfinal";
  source: string;
  zh: boolean;
}) {
  const [rows, setRows] = useState<CampaignView[] | null>(null);
  const [error, setError] = useState("");
  const facts = chainFacts(chainKey);
  useEffect(() => {
    let cancelled = false;
    loadCampaigns(chainKey, address, variantName, endpoint)
      .then((loaded) => {
        if (!cancelled) setRows(loaded);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [chainKey, address, endpoint, variantName]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">{zh ? "台面" : "Desk"}</h1>
      <p className="text-sm text-muted-foreground">
        {zh ? "链上读取，不是标本。这里不签名、不发送交易。" : "Chain read. Not a specimen. This page does not sign or send a transaction."} {facts.name} · chain id {facts.id} ·{" "}
        {endpoint || facts.rpc} · {variantName} · {source}
      </p>
      {address.toLowerCase() === RECORDED_STUDIONET_DEPLOYMENT.contractAddress.toLowerCase() ? (
        <p className="rounded-xl border p-4 text-sm leading-6">
          {zh
            ? "这是会重置的 Studionet 临时合约。页面上的活动是一次验证记录：证据来自本仓库自己的 README，不是真实筹款或业务成果。匿名访问只能读取。写入在链上操作页，使用访问者自己的钱包。"
            : "This is a temporary Studionet contract and the network can be reset. The campaign here is one verification record. Its evidence is a sentence from this repository's own README, not fundraising or business traction. An anonymous visit can only read. Writes are on the actions page and use the visitor's own wallet."}
        </p>
      ) : null}
      <p className="break-all text-xs text-muted-foreground">{address}</p>
      {error ? <p className="rounded-xl border border-destructive/40 p-4 text-sm">{error}</p> : null}
      {!error && !rows ? <p className="text-sm">{zh ? "正在从合约读取…" : "Reading the contract…"}</p> : null}
      {rows && rows.length === 0 ? (
        <p className="text-sm">{zh ? "合约里还没有活动。这是空链上状态，不是标本。" : "The contract has no campaigns. This is empty chain state, not a specimen."}</p>
      ) : null}
      {rows && rows.length > 0 ? <CampaignList campaigns={rows} /> : null}
    </div>
  );
}
