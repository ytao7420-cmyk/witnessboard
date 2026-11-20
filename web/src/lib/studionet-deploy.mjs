/** Studionet deploy guards for genlayer-js 1.1.8. No wallet and no broadcast. */

import { interpretReceipt, isContractAddress } from "./rules.mjs";

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
  if (error?.code != null) parts.push(`code ${error.code}`);
  for (const value of [error?.shortMessage, error?.message, error?.details, error?.data?.message, error?.cause?.message]) {
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  }
  const detail = [...new Set(parts)].join("\n");
  return {
    code: error?.code ?? null,
    message: String(error?.shortMessage || error?.message || error || "unknown error"),
    detail: detail || "unknown error",
  };
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
  const reading = genlayer ? interpretReceipt(genlayer) : null;
  const address = pickDeployedAddress(genlayer);
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
