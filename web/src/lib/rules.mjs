/** Pure helpers shared by the UI and the local checks. No network and no wallet. */

export function isContractAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value ?? "").trim());
}

export function writesAllowed(mode) {
  return mode === "chain";
}

const FAILED = new Set([
  "CANCELED",
  "UNDETERMINED",
  "VALIDATORS_TIMEOUT",
  "LEADER_TIMEOUT",
]);

const STATUS_BY_NUMBER = {
  0: "UNINITIALIZED",
  1: "PENDING",
  2: "PROPOSING",
  3: "COMMITTING",
  4: "REVEALING",
  5: "ACCEPTED",
  6: "UNDETERMINED",
  7: "FINALIZED",
  8: "CANCELED",
  9: "APPEAL_REVEALING",
  10: "APPEAL_COMMITTING",
  11: "READY_TO_FINALIZE",
  12: "VALIDATORS_TIMEOUT",
  13: "LEADER_TIMEOUT",
};

const RESULT_CODES = ["return", "rollback", "contract_error", "error", "none", "no_leaders"];

function resultCode(value) {
  if (value && typeof value === "object" && typeof value.status === "string") return value.status;
  if (typeof value !== "string" || !value) return null;
  try {
    const raw = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return RESULT_CODES[raw[0]] ?? "unknown";
  } catch {
    return null;
  }
}

function decodeCalldataString(bytes) {
  let packed = 0n;
  let shift = 0n;
  let index = 0;
  for (; index < bytes.length; index += 1) {
    const byte = bytes[index];
    packed |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    if ((byte & 0x80) === 0) {
      index += 1;
      break;
    }
  }
  if (Number(packed & 7n) !== 4) return "";
  const length = Number(packed >> 3n);
  return new TextDecoder().decode(bytes.slice(index, index + length));
}

function returnText(value) {
  const readable = value?.payload?.readable;
  if (typeof readable === "string") return readable.replace(/^"|"$/g, "");
  if (typeof value !== "string" || !value) return "";
  try {
    const raw = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    if (raw[0] !== 0) return "";
    return decodeCalldataString(raw.slice(1));
  } catch {
    return "";
  }
}

function studioExecution(tx) {
  const leader = tx?.consensus_data?.leader_receipt?.[0];
  if (!leader) return { name: "", text: "" };
  const code = resultCode(leader.result);
  const execution = leader.execution_result ?? "";
  if (execution === "SUCCESS" && code === "return") return { name: "FINISHED_WITH_RETURN", text: returnText(leader.result) };
  if (execution && execution !== "SUCCESS") return { name: "FINISHED_WITH_ERROR", text: "" };
  if (code && code !== "return") return { name: "FINISHED_WITH_ERROR", text: "" };
  return { name: "", text: "" };
}

function statusName(tx) {
  const named = tx?.statusName ?? tx?.status_name;
  if (typeof named === "string" && named && !/^\d+$/.test(named)) return named;
  const raw = named ?? tx?.status ?? "";
  return STATUS_BY_NUMBER[String(raw)] ?? String(named ?? raw ?? "");
}

/**
 * An accepted or finalized status is not enough. Success needs a GenLayer
 * return: either txExecutionResultName FINISHED_WITH_RETURN, or the Studionet
 * leader receipt execution_result SUCCESS together with result code return.
 * A numeric status such as 7 means FINALIZED and is not success by itself.
 * An EVM status of 0x1 is not a GenLayer return.
 */
export function interpretReceipt(tx) {
  const status = statusName(tx);
  const derived = studioExecution(tx);
  const executionName = String(tx?.txExecutionResultName || derived.name || "");
  const execution =
    executionName === "FINISHED_WITH_RETURN"
      ? "return"
      : executionName === "FINISHED_WITH_ERROR"
        ? "error"
        : "absent";
  let phase = "unknown";
  if (FAILED.has(status)) phase = "failed";
  else if (status === "FINALIZED") phase = "final";
  else if (status === "ACCEPTED" || status === "READY_TO_FINALIZE") phase = "decided";
  else if (status) phase = "pending";
  const successful = (phase === "decided" || phase === "final") && execution === "return";
  return { phase, execution, successful, status, executionName, returnText: derived.text };
}

export function asText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function asList(value) {
  return Array.isArray(value) ? value : [];
}

export function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
