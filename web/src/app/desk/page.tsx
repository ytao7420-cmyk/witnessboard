"use client";

import { Suspense, useEffect, useState } from "react";

import { CampaignList } from "@/components/records";
import { useRuntimeTarget } from "@/components/runtime";
import { illustrativeCampaigns, type CampaignView } from "@/lib/fixtures";
import { chainFacts, loadCampaigns } from "@/lib/genlayer";

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
            ? "链上模式没有合约地址，所以这里是空的。标本不会用来冒充链上状态。部署后打开 /desk/?address=0x…&chain=studionet ，或在“链上操作”粘贴地址。"
            : "Chain mode has no contract address, so this desk is empty. Specimens are not used as chain state."}
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
        {zh ? "链上读取，不是标本。" : "Chain read. Not a specimen."} {facts.name} · chain id {facts.id} ·{" "}
        {endpoint || facts.rpc} · {variantName} · {source}
      </p>
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
