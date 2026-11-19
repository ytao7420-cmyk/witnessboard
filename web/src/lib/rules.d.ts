export function isContractAddress(value: unknown): boolean;
export function writesAllowed(mode: string): boolean;
export function interpretReceipt(tx: {
  status?: unknown;
  statusName?: unknown;
  txExecutionResultName?: unknown;
}): {
  phase: "pending" | "decided" | "final" | "failed" | "unknown";
  execution: "return" | "error" | "absent";
  successful: boolean;
  status: string;
  executionName: string;
};
export function asText(value: unknown): string;
export function asList(value: unknown): unknown[];
export function asRecord(value: unknown): Record<string, unknown>;
