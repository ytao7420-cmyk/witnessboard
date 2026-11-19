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

/**
 * An accepted or finalized status is not enough. The installed genlayer-js
 * 1.1.8 receipt exposes txExecutionResultName, and only FINISHED_WITH_RETURN
 * counts as a successful contract result.
 */
export function interpretReceipt(tx) {
  const status = String(tx?.statusName ?? tx?.status ?? "");
  const executionName = String(tx?.txExecutionResultName ?? "");
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
  return { phase, execution, successful, status, executionName };
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
