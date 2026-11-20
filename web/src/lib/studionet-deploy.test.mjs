import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import {
  CONSENSUS_ADDRESS,
  CONTRACT_SHA256,
  STUDIO_FLAT_GAS,
  canSubmitDeploy,
  createGuardedProvider,
  describeError,
  intrinsicGas,
  judgeDeployObservation,
  pollUntil,
  prepareDeployTransaction,
  sha256Hex,
  withTimeout,
} from "./studionet-deploy.mjs";

const ACCOUNT = "0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9";
const code = readFileSync(new URL("../../../deploy/MilestoneWitness.py", import.meta.url));

function baseTx(overrides = {}) {
  return {
    from: ACCOUNT,
    to: CONSENSUS_ADDRESS,
    data: "0x" + "ab".repeat(40000),
    value: "0x0",
    gas: "0x7a120",
    gasPrice: "0x0",
    nonce: "0x11",
    type: "0x0",
    chainId: "0xf22f",
    ...overrides,
  };
}

test("a hanging wallet request times out with the step name and ignores a late result", async () => {
  const timers = [];
  let late = null;
  const pending = withTimeout(
    () =>
      new Promise((resolve) => {
        late = resolve;
      }),
    {
      ms: 50,
      step: "eth_chainId",
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {},
    },
  );
  timers[0]();
  await assert.rejects(pending, (error) => {
    assert.equal(error.step, "eth_chainId");
    assert.equal(error.code, "step-timeout");
    assert.match(error.message, /No transaction was sent/);
    return true;
  });
  late("too-late");
  await new Promise((resolve) => setTimeout(resolve, 0));
});

test("published contract file matches the pinned sha256", async () => {
  assert.equal(await sha256Hex(code), CONTRACT_SHA256);
});

test("flat studio gas is below the intrinsic gas of a nonzero payload", () => {
  const prepared = prepareDeployTransaction(baseTx());
  assert.equal(prepared.requested, STUDIO_FLAT_GAS);
  assert.equal(prepared.raised, true);
  assert.ok(prepared.intrinsic > STUDIO_FLAT_GAS);
  assert.equal(BigInt(prepared.transaction.gas), prepared.intrinsic);
  assert.equal(prepared.transaction.value, "0x0");
});

test("a non-zero value is refused before a wallet sees it", () => {
  assert.throws(() => prepareDeployTransaction(baseTx({ value: "0x1" })), /value is not 0/);
});

test("wrong chain and missing account do not allow a send", () => {
  assert.equal(canSubmitDeploy({ chainId: "0x1", account: ACCOUNT, existingHash: "" }).reason, "wrong-chain");
  assert.equal(canSubmitDeploy({ chainId: "0xf22f", account: "", existingHash: "" }).reason, "no-account");
  assert.equal(
    canSubmitDeploy({ chainId: "0xf22f", account: ACCOUNT, existingHash: "0xabc" }).reason,
    "already-submitted",
  );
});

test("provider rejection is returned and does not invent a hash", async () => {
  let sends = 0;
  const ethereum = {
    async request({ method }) {
      if (method === "eth_sendTransaction") {
        sends += 1;
        const error = new Error("MetaMask Tx Signature: User denied transaction signature.");
        error.code = 4001;
        throw error;
      }
      throw new Error(method);
    },
  };
  const state = { hash: "" };
  const provider = createGuardedProvider(ethereum, state);
  await assert.rejects(provider.request({ method: "eth_sendTransaction", params: [baseTx()] }), /User denied/);
  assert.equal(sends, 1);
  assert.equal(state.hash, "");
  const described = describeError({ code: 4001, message: "User denied transaction signature." });
  assert.match(described.detail, /4001/);
  assert.match(described.detail, /User denied/);
});

test("a hash already stored blocks a second send", async () => {
  let sends = 0;
  const ethereum = {
    async request() {
      sends += 1;
      return "0xhash";
    },
  };
  const state = { hash: "0xalready" };
  const provider = createGuardedProvider(ethereum, state);
  await assert.rejects(
    provider.request({ method: "eth_sendTransaction", params: [baseTx()] }),
    /already exists/,
  );
  assert.equal(sends, 0);
});

test("receipt timeout does not ask for another signature", async () => {
  let reads = 0;
  let clock = 0;
  const result = await pollUntil(
    async () => {
      reads += 1;
      return null;
    },
    {
      timeoutMs: 30,
      intervalMs: 10,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
    },
  );
  assert.equal(result.timedOut, true);
  assert.equal(result.value, null);
  assert.ok(reads > 1);
});

const recordedDeploy = createRequire(import.meta.url)("./fixtures/studionet-deploy-2026-11-20.json");

test("the recorded Studionet receipt is success only from its execution fields", () => {
  const judged = judgeDeployObservation({
    evmReceipt: recordedDeploy.evmReceipt,
    genlayer: recordedDeploy.studioTransaction,
  });
  assert.equal(judged.successful, true);
  assert.equal(judged.address, "0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865");
  assert.equal(judged.execution, "FINISHED_WITH_RETURN");
  const otherHash = structuredClone(recordedDeploy.studioTransaction);
  otherHash.hash = "0x" + "ab".repeat(32);
  otherHash.data.contract_address = "0x2222222222222222222222222222222222222222";
  const moved = judgeDeployObservation({ genlayer: otherHash });
  assert.equal(moved.successful, true);
  assert.equal(moved.address, "0x2222222222222222222222222222222222222222");
});

test("the same receipt shape fails without a return result", () => {
  const failed = structuredClone(recordedDeploy.studioTransaction);
  failed.consensus_data.leader_receipt[0].execution_result = "ERROR";
  const judged = judgeDeployObservation({ genlayer: failed });
  assert.equal(judged.successful, false);
  assert.equal(judged.address, null);
  const rollback = structuredClone(recordedDeploy.studioTransaction);
  rollback.consensus_data.leader_receipt[0].result = "AQ==";
  const rolled = judgeDeployObservation({ genlayer: rollback });
  assert.equal(rolled.successful, false);
});

test("an evm success without an execution result is not a deployed contract", () => {
  const judged = judgeDeployObservation({ evmReceipt: recordedDeploy.evmReceipt });
  assert.equal(judged.successful, false);
  assert.equal(judged.address, null);
  assert.equal(judged.reason, "execution-result-absent");
});

test("a reverted evm receipt is not success", () => {
  const judged = judgeDeployObservation({ evmReceipt: { status: "0x0" } });
  assert.equal(judged.successful, false);
  assert.equal(judged.reason, "evm-status-0");
});

test("only a genlayer return plus a distinct address counts as deployed", () => {
  const missing = judgeDeployObservation({
    genlayer: { statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN", contractAddress: "" },
  });
  assert.equal(missing.successful, false);
  const judged = judgeDeployObservation({
    genlayer: {
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_RETURN",
      contractAddress: "0x1111111111111111111111111111111111111111",
    },
  });
  assert.equal(judged.successful, true);
  assert.equal(judged.address, "0x1111111111111111111111111111111111111111");
});

test("genlayer-js 1.1.8 studionet payload is captured and not broadcast", async () => {
  let data = "";
  let gas = "";
  const provider = {
    async request({ method, params }) {
      if (method === "eth_chainId") return "0xf22f";
      if (method === "eth_sendTransaction") {
        data = params[0].data;
        gas = params[0].gas;
        assert.equal(params[0].value, "0x0");
        assert.equal(params[0].gasPrice, "0x0");
        assert.equal(String(params[0].chainId).toLowerCase(), "0xf22f");
        assert.equal(String(params[0].to).toLowerCase(), CONSENSUS_ADDRESS.toLowerCase());
        const error = new Error("captured-not-broadcast");
        error.code = 4001;
        throw error;
      }
      throw new Error(`unexpected ${method}`);
    },
  };
  const client = createClient({
    chain: studionet,
    account: ACCOUNT,
    provider,
  });
  await assert.rejects(
    client.deployContract({ code: code.toString("utf8"), args: [] }),
    /captured-not-broadcast|User rejected/,
  );
  const intrinsic = intrinsicGas(data);
  assert.equal(data.slice(0, 10), "0x27241a99");
  assert.equal(BigInt(gas), STUDIO_FLAT_GAS);
  assert.ok(intrinsic > STUDIO_FLAT_GAS);
  const prepared = prepareDeployTransaction({
    from: ACCOUNT,
    to: CONSENSUS_ADDRESS,
    data,
    value: "0x0",
    gas,
    gasPrice: "0x0",
    chainId: "0xf22f",
  });
  assert.equal(prepared.raised, true);
  assert.equal(BigInt(prepared.transaction.gas), intrinsic);
  assert.equal(prepared.transaction.value, "0x0");
});
