import assert from "node:assert/strict";
import { createRequire } from "node:module";
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

const recordedWrite = createRequire(import.meta.url)("./fixtures/studionet-create-2026-11-20.json");

test("sdk status 7 is finalized and is not success without a return", () => {
  const reading = interpretReceipt({ status: 7 });
  assert.equal(reading.status, "FINALIZED");
  assert.equal(reading.execution, "absent");
  assert.equal(reading.successful, false);
});

test("the recorded create_campaign receipt is a return of c0001", () => {
  const reading = interpretReceipt(recordedWrite.sdkReceipt);
  assert.equal(reading.status, "FINALIZED");
  assert.equal(reading.executionName, "FINISHED_WITH_RETURN");
  assert.equal(reading.returnText, "c0001");
  assert.equal(reading.successful, true);
});

test("the public rpc base64 return decodes to c0001", () => {
  const raw = structuredClone(recordedWrite.sdkReceipt);
  raw.consensus_data.leader_receipt[0].result = "ACxjMDAwMQ==";
  const reading = interpretReceipt(raw);
  assert.equal(reading.successful, true);
  assert.equal(reading.returnText, "c0001");
  const emptyReturn = structuredClone(recordedWrite.sdkReceipt);
  emptyReturn.consensus_data.leader_receipt[0].result = "AAA=";
  const empty = interpretReceipt(emptyReturn);
  assert.equal(empty.successful, true);
  assert.equal(empty.returnText, "");
});

test("a successful execution flag with a rollback result is not success", () => {
  const rollback = structuredClone(recordedWrite.sdkReceipt);
  rollback.consensus_data.leader_receipt[0].result = { status: "rollback", payload: { readable: "\"no\"" } };
  assert.equal(interpretReceipt(rollback).successful, false);
  const errored = structuredClone(recordedWrite.sdkReceipt);
  errored.consensus_data.leader_receipt[0].execution_result = "ERROR";
  assert.equal(interpretReceipt(errored).successful, false);
});

test("an evm status of 0x1 is not a genlayer return", () => {
  assert.equal(interpretReceipt({ status: "0x1" }).successful, false);
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
