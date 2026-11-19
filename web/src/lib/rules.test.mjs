import assert from "node:assert/strict";
import test from "node:test";

import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import {
  ExecutionResult,
  TransactionHashVariant,
  TransactionStatus,
} from "genlayer-js/types";

import { interpretReceipt, isContractAddress, writesAllowed } from "./rules.mjs";

test("illustrative mode cannot be treated as a chain write", () => {
  assert.equal(writesAllowed("illustrative"), false);
  assert.equal(writesAllowed("chain"), true);
});

test("contract address must be 20 bytes of hex and is empty by default", () => {
  assert.equal(isContractAddress(""), false);
  assert.equal(isContractAddress("0x1234"), false);
  assert.equal(isContractAddress("0x" + "ab".repeat(20)), true);
  assert.equal(isContractAddress("0x" + "ab".repeat(20) + "cd"), false);
});

test("finalized without an execution result is not success", () => {
  const reading = interpretReceipt({ statusName: "FINALIZED" });
  assert.equal(reading.phase, "final");
  assert.equal(reading.execution, "absent");
  assert.equal(reading.successful, false);
});

test("accepted plus a return is success, and an error result is not", () => {
  assert.equal(
    interpretReceipt({
      statusName: TransactionStatus.ACCEPTED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
    }).successful,
    true,
  );
  assert.equal(
    interpretReceipt({
      statusName: TransactionStatus.FINALIZED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR,
    }).successful,
    false,
  );
  assert.equal(interpretReceipt({ statusName: TransactionStatus.UNDETERMINED }).phase, "failed");
});

test("installed genlayer-js client exposes the methods this app calls", () => {
  const client = createClient({ chain: localnet });
  for (const name of [
    "readContract",
    "writeContract",
    "waitForTransactionReceipt",
    "connect",
    "simulateWriteContract",
    "canAppeal",
    "getMinAppealBond",
    "appealTransaction",
  ]) {
    assert.equal(typeof client[name], "function", name);
  }
  assert.equal(TransactionHashVariant.LATEST_FINAL, "latest-final");
  assert.equal(TransactionHashVariant.LATEST_NONFINAL, "latest-nonfinal");
  for (const chain of [localnet, studionet, testnetAsimov, testnetBradbury]) {
    assert.equal(typeof chain.id, "number");
    assert.ok(chain.rpcUrls.default.http[0]);
  }
  assert.equal("estimateTransactionFeesForWrite" in client, false);
  assert.equal("waitForFinalization" in client, false);
});
