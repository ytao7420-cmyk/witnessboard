"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MilestoneList } from "@/components/records";
import { useRuntimeTarget } from "@/components/runtime";
import { findIllustrative, type CampaignView } from "@/lib/fixtures";
import { loadCampaigns } from "@/lib/genlayer";

export default function CampaignRoute() {
  return (
    <Suspense fallback={<p className="text-sm">…</p>}>
      <CampaignPage />
    </Suspense>
  );
}

function CampaignPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const target = useRuntimeTarget();
  const zh = target.lang === "zh";
  if (target.mode === "illustrative") {
    const campaign = findIllustrative(id).campaign;
    if (!campaign) return <p className="text-sm">{zh ? "没有这条标本。" : "Specimen not found."}</p>;
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">{campaign.title}</h1>
        <p className="max-w-3xl text-sm">{campaign.summary}</p>
        <MilestoneList campaign={campaign} />
      </div>
    );
  }
  if (!target.contractAddress) {
    return <p className="text-sm">{zh ? "链上模式需要合约地址。标本不会填到这里。" : "Chain mode needs a contract address. Specimens are not shown here."}</p>;
  }
  return (
    <ChainCampaign
      key={`${target.chainKey}:${target.contractAddress}:${target.endpoint}:${target.stateVariant}:${id}`}
      chainKey={target.chainKey}
      address={target.contractAddress}
      endpoint={target.endpoint}
      variantName={target.stateVariant}
      campaignId={id}
      zh={zh}
    />
  );
}

function ChainCampaign({
  chainKey,
  address,
  endpoint,
  variantName,
  campaignId,
  zh,
}: {
  chainKey: Parameters<typeof loadCampaigns>[0];
  address: string;
  endpoint: string;
  variantName: "latest-final" | "latest-nonfinal";
  campaignId: string;
  zh: boolean;
}) {
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    loadCampaigns(chainKey, address, variantName, endpoint)
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((item) => item.id === campaignId);
        if (!found) setError(zh ? "合约里没有这个活动。" : "Campaign not found on the contract.");
        else setCampaign(found);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [chainKey, address, endpoint, variantName, campaignId, zh]);
  if (error) return <p className="text-sm">{error}</p>;
  if (!campaign) return <p className="text-sm">{zh ? "正在从合约读取…" : "Reading the contract…"}</p>;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{zh ? "链上读取，不是标本。" : "Chain read. Not a specimen."}</p>
      <h1 className="font-display text-3xl">{campaign.title}</h1>
      <p className="max-w-3xl text-sm">{campaign.summary}</p>
      <MilestoneList campaign={campaign} />
    </div>
  );
}
