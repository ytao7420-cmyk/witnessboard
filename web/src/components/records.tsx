"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignView, MilestoneView, ReviewView } from "@/lib/fixtures";
import { useSession } from "@/components/session";

const outcomeTone: Record<string, string> = {
  supports: "bg-emerald-100 text-emerald-950",
  does_not_support: "bg-rose-100 text-rose-950",
  insufficient_evidence: "bg-slate-200 text-slate-900",
  uncertain: "bg-amber-100 text-amber-950",
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  return <Badge className={outcomeTone[outcome] ?? ""}>{outcome || "—"}</Badge>;
}

export function CampaignList({ campaigns }: { campaigns: CampaignView[] }) {
  const { state } = useSession();
  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              <Link href={`/desk/campaign?id=${encodeURIComponent(campaign.id)}`}>{campaign.title}</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{campaign.summary}</p>
            <p className="text-muted-foreground">
              {state.lang === "zh" ? "发起人" : "Organizer"}: {campaign.organizer}
            </p>
            <p className="text-muted-foreground">
              {state.lang === "zh" ? "状态" : "Status"}: {campaign.status} · {campaign.milestones.length}{" "}
              {state.lang === "zh" ? "个里程碑" : "milestones"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MilestoneList({ campaign }: { campaign: CampaignView }) {
  const { state } = useSession();
  return (
    <div className="grid gap-3">
      {campaign.milestones.map((milestone) => (
        <Link
          key={milestone.id}
          href={`/desk/milestone?campaign=${encodeURIComponent(campaign.id)}&id=${encodeURIComponent(milestone.id)}`}
          className="rounded-xl border bg-card p-4 hover:bg-muted"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">{milestone.title}</h2>
            <Badge variant="outline">{milestone.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {milestone.evidence.length} {state.lang === "zh" ? "条证据" : "evidence"} · {milestone.reviews.length}{" "}
            {state.lang === "zh" ? "次审查" : "reviews"}
          </p>
        </Link>
      ))}
    </div>
  );
}

function ReviewCard({ review, criteria }: { review: ReviewView; criteria: string[] }) {
  const { state } = useSession();
  const zh = state.lang === "zh";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <OutcomeBadge outcome={review.outcome} />
          <span className="text-sm font-normal text-muted-foreground">
            {zh ? "模型原读法" : "Model reading"}: {review.rawOutcome}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {review.superseded ? (
          <p className="rounded-md bg-muted p-2">{zh ? "这条审查已被重新开放，仍保留在记录里。" : "This review was reopened and kept."} {review.supersedeNote}</p>
        ) : null}
        <p>{review.rationale}</p>
        <p className="text-muted-foreground">
          {zh ? "置信度" : "Confidence"}: {review.confidenceBps} bps
        </p>
        <ul className="space-y-1">
          {criteria.map((criterion, index) => (
            <li key={criterion}>
              {index}. {criterion} — {review.findings[index] ?? "—"}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {review.limits.map((limit) => (
            <Badge key={limit} variant="secondary">
              {limit}
            </Badge>
          ))}
        </div>
        <p className="break-all text-muted-foreground">
          {zh ? "输入指纹" : "Input fingerprint"}: {review.fingerprint}
        </p>
        <p className="text-muted-foreground">
          {zh ? "抓取" : "Fetch"}: {review.fetchClasses.join(", ") || "—"} · {zh ? "原文是否出现" : "Passage found"}:{" "}
          {review.grounded.join(", ") || "—"}
        </p>
        <p className="rounded-md border border-dashed p-3">{review.claimScope}</p>
      </CardContent>
    </Card>
  );
}

export function MilestoneDetail({ campaign, milestone }: { campaign: CampaignView; milestone: MilestoneView }) {
  const { state } = useSession();
  const zh = state.lang === "zh";
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/desk/campaign?id=${encodeURIComponent(campaign.id)}`}>{campaign.title}</Link>
        </p>
        <h1 className="font-display text-3xl">{milestone.title}</h1>
        <p className="mt-2 text-sm">
          {zh ? "状态" : "Status"}: {milestone.status}
        </p>
      </div>
      <section>
        <h2 className="mb-2 font-display text-xl">{zh ? "验收标准" : "Criteria"}</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {milestone.criteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ol>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl">{zh ? "证据" : "Evidence"}</h2>
        {milestone.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">{zh ? "还没有证据。" : "No evidence yet."}</p>
        ) : (
          milestone.evidence.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 pt-4 text-sm">
                <p>
                  <Badge variant="outline">{item.sourceKind}</Badge> {item.locator}
                </p>
                <p className="whitespace-pre-wrap">{item.excerpt}</p>
                <p className="break-all text-muted-foreground">
                  sha256: {item.hash}
                </p>
                <p className="text-muted-foreground">
                  {zh ? "提交者" : "Submitter"}: {item.submitter}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl">{zh ? "审查" : "Reviews"}</h2>
        {milestone.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {zh ? "还没有共识审查。锁定后的请求才会进入合约。" : "No consensus review yet."}
          </p>
        ) : (
          milestone.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} criteria={milestone.criteria} />
          ))
        )}
      </section>
    </div>
  );
}
