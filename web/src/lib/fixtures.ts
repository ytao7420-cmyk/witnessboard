export type EvidenceView = {
  id: string;
  submitter: string;
  sourceKind: "pasted_excerpt" | "public_https";
  locator: string;
  excerpt: string;
  hash: string;
  note: string;
  at: string;
};

export type ReviewView = {
  id: string;
  outcome: string;
  rawOutcome: string;
  confidenceBps: number;
  findings: string[];
  limits: string[];
  rationale: string;
  claimScope: string;
  fingerprint: string;
  fetchClasses: string[];
  grounded: string[];
  evidenceIds: string[];
  superseded: boolean;
  supersedeNote: string;
  at: string;
  requestedBy: string;
};

export type MilestoneView = {
  id: string;
  title: string;
  status: string;
  criteria: string[];
  evidence: EvidenceView[];
  reviews: ReviewView[];
  activeReviewId: string;
};

export type CampaignView = {
  id: string;
  title: string;
  summary: string;
  status: string;
  organizer: string;
  createdAt: string;
  milestones: MilestoneView[];
};

const CLAIM =
  "Consensus reading of the supplied evidence against the milestone criteria. Not a finding of real-world fact, identity, legal compliance, payment entitlement, or refund.";

const excerpt =
  "The workshop published the 2026 shelf budget of 4800 yuan and listed supplier receipt number NS-204.";

export const illustrativeCampaigns: CampaignView[] = [
  {
    id: "fixture-book-corner",
    title: "北麓社区图书角",
    summary: "界面标本：一个社区书架筹办过程。这里没有链上地址、交易哈希或真实审查。",
    status: "open",
    organizer: "标本 · 发起人",
    createdAt: "specimen",
    milestones: [
      {
        id: "fixture-collecting",
        title: "公开预算页",
        status: "collecting",
        criteria: ["公开页面写明书架预算金额和收据编号。"],
        activeReviewId: "",
        evidence: [
          {
            id: "fixture-evidence-paste",
            submitter: "标本 · 提交者",
            sourceKind: "pasted_excerpt",
            locator: "组织者说明",
            excerpt,
            hash: "specimen-hash-not-a-chain-digest",
            note: "粘贴文本不会被当作已在公开网页上核验。",
            at: "specimen",
          },
        ],
        reviews: [],
      },
      {
        id: "fixture-locked",
        title: "锁定后等待审查",
        status: "locked",
        criteria: ["公开页面写明书架预算金额和收据编号。"],
        activeReviewId: "",
        evidence: [
          {
            id: "fixture-evidence-url",
            submitter: "标本 · 提交者",
            sourceKind: "public_https",
            locator: "https://example.org/budget",
            excerpt,
            hash: "specimen-hash-not-a-chain-digest",
            note: "",
            at: "specimen",
          },
        ],
        reviews: [],
      },
      {
        id: "fixture-support",
        title: "策略允许的正向阅读",
        status: "reviewed",
        criteria: ["公开页面写明书架预算金额和收据编号。"],
        activeReviewId: "fixture-review-support",
        evidence: [
          {
            id: "fixture-evidence-grounded",
            submitter: "标本 · 提交者",
            sourceKind: "public_https",
            locator: "https://example.org/budget",
            excerpt,
            hash: "specimen-hash-not-a-chain-digest",
            note: "",
            at: "specimen",
          },
        ],
        reviews: [
          {
            id: "fixture-review-support",
            outcome: "supports",
            rawOutcome: "supports",
            confidenceBps: 8200,
            findings: ["met"],
            limits: [
              "not_a_real_world_finding",
              "page_body_not_retained",
              "no_payment_or_refund_effect",
              "single_evidence_item",
            ],
            rationale: "标本理由：摘录看起来覆盖了已写明的标准。这不是事实认定。",
            claimScope: CLAIM,
            fingerprint: "specimen-fingerprint",
            fetchClasses: ["ok"],
            grounded: ["true"],
            evidenceIds: ["fixture-evidence-grounded"],
            superseded: false,
            supersedeNote: "",
            at: "specimen",
            requestedBy: "标本 · 请求者",
          },
        ],
      },
      {
        id: "fixture-insufficient",
        title: "页面没有对上摘录",
        status: "reviewed",
        criteria: ["公开页面写明书架预算金额和收据编号。"],
        activeReviewId: "fixture-review-insufficient",
        evidence: [
          {
            id: "fixture-evidence-miss",
            submitter: "标本 · 提交者",
            sourceKind: "public_https",
            locator: "https://example.org/budget",
            excerpt,
            hash: "specimen-hash-not-a-chain-digest",
            note: "",
            at: "specimen",
          },
        ],
        reviews: [
          {
            id: "fixture-review-insufficient",
            outcome: "insufficient_evidence",
            rawOutcome: "supports",
            confidenceBps: 9000,
            findings: ["met"],
            limits: [
              "not_a_real_world_finding",
              "page_body_not_retained",
              "no_payment_or_refund_effect",
              "no_grounded_public_page",
              "support_requires_grounded_https",
              "single_evidence_item",
            ],
            rationale: "标本：模型给出了正向阅读，但摘录没有出现在抓取到的页面里，策略把它降级。",
            claimScope: CLAIM,
            fingerprint: "specimen-fingerprint",
            fetchClasses: ["ok"],
            grounded: ["false"],
            evidenceIds: ["fixture-evidence-miss"],
            superseded: false,
            supersedeNote: "",
            at: "specimen",
            requestedBy: "标本 · 请求者",
          },
        ],
      },
    ],
  },
];

export function findIllustrative(campaignId: string, milestoneId?: string) {
  const campaign = illustrativeCampaigns.find((item) => item.id === campaignId);
  const milestone = milestoneId
    ? campaign?.milestones.find((item) => item.id === milestoneId)
    : undefined;
  return { campaign, milestone };
}
