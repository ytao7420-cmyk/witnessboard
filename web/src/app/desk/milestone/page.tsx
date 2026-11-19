"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MilestoneDetail } from "@/components/records";
import { useRuntimeTarget } from "@/components/runtime";
import { findIllustrative, type CampaignView, type MilestoneView } from "@/lib/fixtures";
import { loadCampaigns, loadMilestone } from "@/lib/genlayer";

export default function MilestoneRoute() {
  return (
    <Suspense fallback={<p className="text-sm">…</p>}>
      <MilestonePage />
    </Suspense>
  );
}

function MilestonePage() {
  const params = useSearchParams();
  const campaignId = params.get("campaign") ?? "";
  const id = params.get("id") ?? "";
  const target = useRuntimeTarget();
  const zh = target.lang === "zh";
  if (target.mode === "illustrative") {
    const found = findIllustrative(campaignId, id);
    if (!found.campaign || !found.milestone) {
      return <p className="text-sm">{zh ? "没有这条标本。" : "Specimen not found."}</p>;
    }
    return <MilestoneDetail campaign={found.campaign} milestone={found.milestone} />;
  }
  if (!target.contractAddress) {
    return <p className="text-sm">{zh ? "链上模式需要合约地址。标本不会填到这里。" : "Chain mode needs a contract address."}</p>;
  }
  return (
    <ChainMilestone
      key={`${target.chainKey}:${target.contractAddress}:${target.endpoint}:${id}`}
      chainKey={target.chainKey}
      address={target.contractAddress}
      endpoint={target.endpoint}
      variantName={target.stateVariant}
      campaignId={campaignId}
      milestoneId={id}
      zh={zh}
    />
  );
}

function ChainMilestone({
  chainKey,
  address,
  endpoint,
  variantName,
  campaignId,
  milestoneId,
  zh,
}: {
  chainKey: Parameters<typeof loadMilestone>[0];
  address: string;
  endpoint: string;
  variantName: "latest-final" | "latest-nonfinal";
  campaignId: string;
  milestoneId: string;
  zh: boolean;
}) {
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [milestone, setMilestone] = useState<MilestoneView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadCampaigns(chainKey, address, variantName, endpoint),
      loadMilestone(chainKey, address, variantName, milestoneId, endpoint),
    ])
      .then(([campaigns, loaded]) => {
        if (cancelled) return;
        setCampaign(
          campaigns.find((item) => item.id === campaignId) ?? {
            id: campaignId,
            title: campaignId,
            summary: "",
            status: "",
            organizer: "",
            createdAt: "",
            milestones: [],
          },
        );
        setMilestone(loaded);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [chainKey, address, endpoint, variantName, campaignId, milestoneId]);
  if (error) return <p className="text-sm">{error}</p>;
  if (!campaign || !milestone) return <p className="text-sm">{zh ? "正在从合约读取…" : "Reading the contract…"}</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{zh ? "链上读取，不是标本。" : "Chain read. Not a specimen."}</p>
      <MilestoneDetail campaign={campaign} milestone={milestone} />
    </div>
  );
}
