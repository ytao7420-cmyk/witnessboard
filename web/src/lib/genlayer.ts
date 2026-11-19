import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus, type CalldataEncodable } from "genlayer-js/types";

import { asList, asRecord, asText, interpretReceipt, isContractAddress } from "./rules.mjs";
import type { CampaignView, EvidenceView, MilestoneView, ReviewView } from "./fixtures";

export const chainCatalog = {
  localnet: { connect: "localnet" as const, chain: localnet },
  studionet: { connect: "studionet" as const, chain: studionet },
  testnetAsimov: { connect: "testnetAsimov" as const, chain: testnetAsimov },
  testnetBradbury: { connect: "testnetBradbury" as const, chain: testnetBradbury },
};

export type ChainKey = keyof typeof chainCatalog;

export function chainFacts(key: ChainKey) {
  const chain = chainCatalog[key].chain;
  return {
    id: chain.id,
    name: chain.name,
    rpc: chain.rpcUrls.default.http[0] ?? "",
  };
}

type ReadClient = {
  readContract: (args: {
    address: `0x${string}`;
    functionName: string;
    args?: unknown[];
    transactionHashVariant?: TransactionHashVariant;
  }) => Promise<unknown>;
};

export function safeRpc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function readClient(key: ChainKey, endpoint?: string): Promise<ReadClient> {
  const { createClient } = await import("genlayer-js");
  const rpc = endpoint ? safeRpc(endpoint) : "";
  return createClient({
    chain: chainCatalog[key].chain,
    ...(rpc ? { endpoint: rpc } : {}),
  }) as ReadClient;
}

function txHash(value: string) {
  return value as `0x${string}` & { length: 66 };
}

function transactionId(value: unknown) {
  if (typeof value === "string" && value.startsWith("0x")) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["hash", "txId", "transactionHash"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.startsWith("0x")) return candidate;
    }
  }
  throw new Error("write returned no transaction hash");
}

function variant(name: "latest-final" | "latest-nonfinal") {
  return name === "latest-final"
    ? TransactionHashVariant.LATEST_FINAL
    : TransactionHashVariant.LATEST_NONFINAL;
}

async function read(
  key: ChainKey,
  address: string,
  variantName: "latest-final" | "latest-nonfinal",
  fn: string,
  args: unknown[] = [],
  endpoint?: string,
) {
  if (!isContractAddress(address)) {
    throw new Error("missing-address");
  }
  const client = await readClient(key, endpoint);
  return client.readContract({
    address: address as `0x${string}`,
    functionName: fn,
    args,
    transactionHashVariant: variant(variantName),
  });
}

function evidenceFrom(id: string, raw: Record<string, unknown>): EvidenceView {
  const kind = asText(raw.source_kind) === "public_https" ? "public_https" : "pasted_excerpt";
  return {
    id,
    submitter: asText(raw.submitter),
    sourceKind: kind,
    locator: asText(raw.locator),
    excerpt: asText(raw.excerpt),
    hash: asText(raw.excerpt_sha256),
    note: asText(raw.note),
    at: asText(raw.submitted_at),
  };
}

function reviewFrom(id: string, raw: Record<string, unknown>): ReviewView {
  return {
    id,
    outcome: asText(raw.outcome),
    rawOutcome: asText(raw.raw_outcome),
    confidenceBps: Number(raw.confidence_bps ?? 0),
    findings: asList(raw.finding_status).map(asText),
    limits: asList(raw.limits).map(asText),
    rationale: asText(raw.rationale),
    claimScope: asText(raw.claim_scope),
    fingerprint: asText(raw.input_fingerprint),
    fetchClasses: asList(raw.fetch_classes).map(asText),
    grounded: asList(raw.grounded).map(asText),
    evidenceIds: asList(raw.evidence_ids).map(asText),
    superseded: Boolean(raw.superseded),
    supersedeNote: asText(raw.supersede_note),
    at: asText(raw.recorded_at),
    requestedBy: asText(raw.requested_by),
  };
}

export async function loadCampaigns(
  key: ChainKey,
  address: string,
  variantName: "latest-final" | "latest-nonfinal",
  endpoint?: string,
): Promise<CampaignView[]> {
  const ids = asList(await read(key, address, variantName, "list_campaign_ids", [], endpoint)).map(asText);
  const campaigns: CampaignView[] = [];
  for (const id of ids) {
    const campaign = asRecord(await read(key, address, variantName, "get_campaign", [id], endpoint));
    const milestoneIds = asList(campaign.milestone_ids).map(asText);
    const milestones: MilestoneView[] = [];
    for (const milestoneId of milestoneIds) {
      milestones.push(await loadMilestone(key, address, variantName, milestoneId, endpoint));
    }
    campaigns.push({
      id,
      title: asText(campaign.title),
      summary: asText(campaign.summary),
      status: asText(campaign.status),
      organizer: asText(campaign.organizer),
      createdAt: asText(campaign.created_at),
      milestones,
    });
  }
  return campaigns;
}

export async function loadMilestone(
  key: ChainKey,
  address: string,
  variantName: "latest-final" | "latest-nonfinal",
  milestoneId: string,
  endpoint?: string,
): Promise<MilestoneView> {
  const bundle = asRecord(
    await read(key, address, variantName, "get_milestone_view", [milestoneId], endpoint),
  );
  const milestone = asRecord(bundle.milestone);
  return {
    id: asText(milestone.milestone_id) || milestoneId,
    title: asText(milestone.title),
    status: asText(milestone.status),
    criteria: asList(milestone.criteria).map(asText),
    activeReviewId: asText(milestone.active_review_id),
    evidence: asList(bundle.evidence).map((item) => {
      const record = asRecord(item);
      return evidenceFrom(asText(record.evidence_id), record);
    }),
    reviews: asList(bundle.reviews).map((item) => {
      const record = asRecord(item);
      return reviewFrom(asText(record.review_id), record);
    }),
  };
}

export type TxPhase =
  | "idle"
  | "simulating"
  | "awaiting-signature"
  | "submitted"
  | "waiting-decision"
  | "decided"
  | "waiting-final"
  | "final"
  | "error";

export type TxState = {
  phase: TxPhase;
  hash: string;
  detail: string;
  successful: boolean | null;
};

export const idleTx: TxState = { phase: "idle", hash: "", detail: "", successful: null };

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function provider(): EthereumProvider {
  const ethereum = (globalThis as { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) throw new Error("no-wallet");
  return ethereum;
}

export async function connectWallet(key: ChainKey, endpoint?: string) {
  const accounts = (await provider().request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0];
  if (!account) throw new Error("no-account");
  const { createClient } = await import("genlayer-js");
  const rpc = endpoint ? safeRpc(endpoint) : "";
  const client = createClient({
    chain: chainCatalog[key].chain,
    account: account as `0x${string}`,
    provider: provider(),
    ...(rpc ? { endpoint: rpc } : {}),
  });
  await client.connect(chainCatalog[key].connect);
  return { account, client };
}

export async function runWrite(options: {
  key: ChainKey;
  address: string;
  functionName: string;
  args: unknown[];
  simulateFirst: boolean;
  endpoint?: string;
  onUpdate: (state: TxState) => void;
}) {
  if (!isContractAddress(options.address)) throw new Error("missing-address");
  const address = options.address as `0x${string}`;
  let hash = "";
  try {
    if (options.simulateFirst) {
      options.onUpdate({ phase: "simulating", hash: "", detail: options.functionName, successful: null });
      const reader = await readClient(options.key, options.endpoint);
      if ("simulateWriteContract" in reader) {
        await (reader as ReadClient & {
          simulateWriteContract: (args: {
            address: `0x${string}`;
            functionName: string;
            args?: CalldataEncodable[];
          }) => Promise<unknown>;
        }).simulateWriteContract({
          address,
          functionName: options.functionName,
          args: options.args as CalldataEncodable[],
        });
      }
    }
    options.onUpdate({ phase: "awaiting-signature", hash: "", detail: options.functionName, successful: null });
    const { client } = await connectWallet(options.key, options.endpoint);
    hash = transactionId(
      await client.writeContract({
        address,
        functionName: options.functionName,
        args: options.args as CalldataEncodable[],
        value: 0n,
      }),
    );
    options.onUpdate({ phase: "submitted", hash, detail: options.functionName, successful: null });
    options.onUpdate({ phase: "waiting-decision", hash, detail: options.functionName, successful: null });
    const decision = await client.waitForTransactionReceipt({
      hash: txHash(hash),
      status: TransactionStatus.ACCEPTED,
    });
    const decided = interpretReceipt(decision);
    options.onUpdate({
      phase: decided.successful ? "decided" : decided.phase === "failed" ? "error" : "decided",
      hash,
      detail: `${decided.status} / ${decided.executionName || "execution-absent"}`,
      successful: decided.successful,
    });
    if (decided.phase === "failed") return;
    options.onUpdate({ phase: "waiting-final", hash, detail: options.functionName, successful: decided.successful });
    const finalTx = await client.waitForTransactionReceipt({
      hash: txHash(hash),
      status: TransactionStatus.FINALIZED,
    });
    const finalReading = interpretReceipt(finalTx);
    options.onUpdate({
      phase: finalReading.successful ? "final" : "error",
      hash,
      detail: `${finalReading.status} / ${finalReading.executionName || "execution-absent"}`,
      successful: finalReading.successful,
    });
  } catch (error) {
    options.onUpdate({
      phase: "error",
      hash,
      detail: error instanceof Error ? error.message : String(error),
      successful: false,
    });
  }
}

export async function resumeFinalization(
  key: ChainKey,
  hash: string,
  onUpdate: (state: TxState) => void,
  endpoint?: string,
) {
  const { createClient } = await import("genlayer-js");
  const rpc = endpoint ? safeRpc(endpoint) : "";
  const client = createClient({
    chain: chainCatalog[key].chain,
    ...(rpc ? { endpoint: rpc } : {}),
  });
  onUpdate({ phase: "waiting-final", hash, detail: "resume", successful: null });
  const finalTx = await client.waitForTransactionReceipt({
    hash: txHash(hash),
    status: TransactionStatus.FINALIZED,
  });
  const reading = interpretReceipt(finalTx);
  onUpdate({
    phase: reading.successful ? "final" : "error",
    hash,
    detail: `${reading.status} / ${reading.executionName || "execution-absent"}`,
    successful: reading.successful,
  });
}

export { interpretReceipt };
