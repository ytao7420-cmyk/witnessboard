/** Studionet deploy guards for genlayer-js 1.1.8. No wallet and no broadcast. */

import { genvmReturnText, interpretReceipt, isContractAddress } from "./rules.mjs";

export const STUDIO_CHAIN_ID = 61999;
export const STUDIO_CHAIN_HEX = "0xf22f";
export const CONSENSUS_ADDRESS = "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575";
export const CONTRACT_SHA256 = "6cc5e74eba8c843870b7e6300b89b946678d747220f40e4caffe0557dd3a7aa9";
export const STUDIO_FLAT_GAS = 500000n;

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function chainIdMatchesStudio(value) {
  if (value == null) return false;
  const text = String(value).trim().toLowerCase();
  if (text === String(STUDIO_CHAIN_ID)) return true;
  try {
    return BigInt(text) === BigInt(STUDIO_CHAIN_ID);
  } catch {
    return false;
  }
}

export function intrinsicGas(data) {
  const hex = String(data ?? "");
  if (!/^0x[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("deploy data is not even-length hex");
  }
  let gas = 21000n;
  for (let index = 2; index < hex.length; index += 2) {
    gas += hex.slice(index, index + 2) === "00" ? 4n : 16n;
  }
  return gas;
}

function hexQuantity(value) {
  return `0x${BigInt(value).toString(16)}`;
}

function isZeroQuantity(value) {
  if (value == null || value === "" || value === "0x") return true;
  try {
    return BigInt(value) === 0n;
  } catch {
    return false;
  }
}

export function prepareDeployTransaction(tx) {
  if (!tx || typeof tx !== "object") throw new Error("missing deploy transaction");
  if (!isZeroQuantity(tx.value)) {
    throw new Error("refusing a deploy whose value is not 0");
  }
  if (tx.chainId != null && !chainIdMatchesStudio(tx.chainId)) {
    throw new Error(`refusing a deploy for chain ${tx.chainId}`);
  }
  if (String(tx.to ?? "").toLowerCase() !== CONSENSUS_ADDRESS.toLowerCase()) {
    throw new Error("refusing a deploy whose recipient is not the SDK consensus contract");
  }
  const intrinsic = intrinsicGas(tx.data);
  const requested = tx.gas == null ? 0n : BigInt(tx.gas);
  const raised = requested < intrinsic;
  return {
    transaction: {
      ...tx,
      value: "0x0",
      gas: hexQuantity(raised ? intrinsic : requested),
    },
    intrinsic,
    requested,
    raised,
  };
}

export function canSubmitDeploy({ chainId, account, existingHash }) {
  if (existingHash) return { ok: false, reason: "already-submitted" };
  if (!chainIdMatchesStudio(chainId)) return { ok: false, reason: "wrong-chain" };
  if (!isContractAddress(account)) return { ok: false, reason: "no-account" };
  return { ok: true };
}

export function isUserRejection(error) {
  const code = error?.code;
  const text = `${error?.message ?? ""} ${error?.shortMessage ?? ""}`.toLowerCase();
  return code === 4001 || text.includes("user rejected") || text.includes("user denied");
}

export function describeError(error) {
  const parts = [];
  if (error?.step) parts.push(`step ${error.step}`);
  if (error?.code != null) parts.push(`code ${error.code}`);
  for (const value of [error?.shortMessage, error?.message, error?.details, error?.data?.message, error?.cause?.message]) {
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  }
  const detail = [...new Set(parts)].join("\n");
  return {
    code: error?.code ?? null,
    step: error?.step ?? null,
    message: String(error?.shortMessage || error?.message || error || "unknown error"),
    detail: detail || "unknown error",
  };
}

export function withTimeout(work, { ms, step, setTimer = setTimeout, clearTimer = clearTimeout }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimer(() => {
      if (settled) return;
      settled = true;
      const error = new Error(`timed out after ${ms}ms waiting for ${step}. No transaction was sent.`);
      error.code = "step-timeout";
      error.step = step;
      reject(error);
    }, ms);
    Promise.resolve()
      .then(work)
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        reject(error);
      });
  });
}

export function createGuardedProvider(ethereum, state) {
  return {
    async request(args) {
      if (args?.method !== "eth_sendTransaction") return ethereum.request(args);
      if (state.hash) {
        const error = new Error("A deploy hash already exists. Not sending another transaction.");
        error.code = "already-submitted";
        throw error;
      }
      const prepared = prepareDeployTransaction(args.params?.[0]);
      state.adjustment = {
        intrinsic: prepared.intrinsic.toString(),
        requested: prepared.requested.toString(),
        raised: prepared.raised,
        gas: prepared.transaction.gas,
        value: prepared.transaction.value,
      };
      state.onSend?.();
      const hash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [prepared.transaction],
      });
      if (typeof hash !== "string" || !hash.startsWith("0x")) {
        throw new Error("wallet returned no transaction hash");
      }
      state.hash = hash;
      return hash;
    },
  };
}

const GENVM_RESULT_CODES = ["return", "rollback", "contract_error", "error", "none", "no_leaders"];

export const RECORDED_STUDIONET_DEPLOYMENT = {
  temporary: true,
  chainId: STUDIO_CHAIN_ID,
  rpc: "https://studio.genlayer.com/api",
  txHash: "0xe1e1b325d145270f2696fa349075d60417e918d55c954796bf5a870a711df544",
  createCampaignTxHash: "0xa964822ba610072987b7cbb5ed14997aa22058b1a9ab98c01068cb9ce646f768",
  createCampaignExplorerTx: "https://explorer-studio.genlayer.com/tx/0xa964822ba610072987b7cbb5ed14997aa22058b1a9ab98c01068cb9ce646f768",
  explorerTx: "https://explorer-studio.genlayer.com/tx/0xe1e1b325d145270f2696fa349075d60417e918d55c954796bf5a870a711df544",
  contractAddress: "0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865",
  sender: "0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9",
  readBack: {
    manifestName: "MilestoneWitness",
    version: "1.0.0",
    holdsFunds: false,
    issuesRefunds: false,
    campaignCountAtRead: 0,
  },
};

export function genvmResultCode(encoded) {
  if (encoded && typeof encoded === "object" && typeof encoded.status === "string") return encoded.status;
  if (typeof encoded !== "string" || encoded.length === 0) return null;
  let raw;
  try {
    raw = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  if (raw.length === 0) return null;
  return GENVM_RESULT_CODES[raw[0]] ?? "unknown";
}

export function normalizeStudioTransaction(tx) {
  const receipts = tx?.consensus_data?.leader_receipt;
  const leader = Array.isArray(receipts) ? receipts[0] : null;
  if (!leader) return null;
  const code = genvmResultCode(leader.result);
  const execution = leader.execution_result ?? "";
  let txExecutionResultName = "";
  if (execution === "SUCCESS" && code === "return") txExecutionResultName = "FINISHED_WITH_RETURN";
  else if ((execution && execution !== "SUCCESS") || (code && code !== "return")) txExecutionResultName = "FINISHED_WITH_ERROR";
  const named = [tx.statusName, tx.status_name, tx.status].find((value) => typeof value === "string" && value && !value.startsWith("0x"));
  const status = typeof named === "string" && !/^\d+$/.test(named)
    ? named
    : ({
        5: "ACCEPTED",
        7: "FINALIZED",
        8: "CANCELED",
        11: "READY_TO_FINALIZE",
        12: "VALIDATORS_TIMEOUT",
        13: "LEADER_TIMEOUT",
      }[String(tx.status ?? named)] ?? "");
  return {
    statusName: status,
    txExecutionResultName,
    contractAddress: tx.data?.contract_address ?? tx.recipient ?? null,
    resultName: tx.result_name ?? "",
    genvmResultCode: code,
    executionResult: execution,
    returnText: genvmReturnText(leader.result),
  };
}

function pickDeployedAddress(tx) {
  const candidates = [
    tx?.contractAddress,
    tx?.contract_address,
    tx?.txDataDecoded?.contractAddress,
    tx?.data?.contract_address,
  ];
  for (const candidate of candidates) {
    if (!isContractAddress(candidate)) continue;
    const normalized = String(candidate).toLowerCase();
    if (normalized === CONSENSUS_ADDRESS.toLowerCase()) continue;
    if (/^0x0{40}$/.test(normalized)) continue;
    return String(candidate);
  }
  return null;
}

export function judgeDeployObservation({ evmReceipt = null, genlayer = null } = {}) {
  const normalized = normalizeStudioTransaction(genlayer);
  const source = normalized ?? genlayer;
  const reading = source ? interpretReceipt(source) : null;
  const address = pickDeployedAddress(source);
  if (reading?.successful && address) {
    return {
      successful: true,
      phase: reading.phase,
      address,
      execution: reading.executionName,
      reason: "genlayer-execution",
    };
  }
  if (reading && (reading.execution === "error" || reading.phase === "failed")) {
    return {
      successful: false,
      phase: reading.phase,
      address: null,
      execution: reading.executionName,
      reason: reading.executionName || reading.status || "execution-failed",
    };
  }
  const status = String(evmReceipt?.status ?? "").toLowerCase();
  if (status === "0x0" || status === "0x00") {
    return { successful: false, phase: "evm-reverted", address: null, execution: "", reason: "evm-status-0" };
  }
  if (status === "0x1") {
    return {
      successful: false,
      phase: "evm-mined",
      address: null,
      execution: reading?.executionName || "",
      reason: "execution-result-absent",
    };
  }
  return { successful: false, phase: reading?.phase || "pending", address: null, execution: "", reason: "receipt-absent" };
}

export async function pollUntil(read, { timeoutMs, intervalMs, now, sleep }) {
  const start = now();
  while (true) {
    const value = await read();
    if (value) return { timedOut: false, value };
    if (now() - start >= timeoutMs) return { timedOut: true, value: null };
    await sleep(intervalMs);
  }
}
