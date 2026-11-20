import assert from "node:assert/strict";
import test from "node:test";

import { CONSENSUS_ADDRESS } from "./studionet-deploy.mjs";
import { MAX_TEST_FEE_WEI, ONE_GWEI, createWriteProvider, feeForGas, prepareWriteTransaction } from "./write-wallet.mjs";

const ACCOUNT = "0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9";

function tx(overrides = {}) {
  return {
    from: ACCOUNT,
    to: CONSENSUS_ADDRESS,
    data: "0x" + "ab".repeat(80),
    value: "0x0",
    gas: "0x9bb0",
    gasPrice: "0x0",
    chainId: "0xf22f",
    ...overrides,
  };
}

test("a zero gas price quote becomes 1 gwei and stays under 0.001 GEN", () => {
  const prepared = prepareWriteTransaction(tx());
  assert.equal(prepared.transaction.value, "0x0");
  assert.equal(prepared.preview.gasPrice, ONE_GWEI);
  assert.equal(prepared.preview.replacedZeroQuote, true);
  assert.ok(prepared.preview.maxFeeWei <= MAX_TEST_FEE_WEI);
  assert.equal(prepared.transaction.gasPrice, "0x" + ONE_GWEI.toString(16));
});

test("a large gas limit is capped at 0.001 GEN", () => {
  const fee = feeForGas(10_000_000n, ONE_GWEI);
  assert.equal(fee.capped, true);
  assert.ok(fee.maxFeeWei <= MAX_TEST_FEE_WEI);
  assert.ok(fee.gasPrice >= 1n);
});

test("snap methods are refused and a hash blocks a second send", async () => {
  const seen = [];
  const ethereum = {
    async request({ method, params }) {
      seen.push(method);
      if (method === "eth_sendTransaction") {
        assert.equal(params[0].value, "0x0");
        assert.equal(params[0].gasPrice, "0x" + ONE_GWEI.toString(16));
        return "0x" + "11".repeat(32);
      }
      throw new Error(method);
    },
  };
  const state = { hash: "" };
  const provider = createWriteProvider(ethereum, state);
  await assert.rejects(provider.request({ method: "wallet_requestSnaps", params: {} }), /refusing wallet_requestSnaps/);
  assert.deepEqual(seen, []);
  const hash = await provider.request({ method: "eth_sendTransaction", params: [tx()] });
  assert.equal(hash, state.hash);
  await assert.rejects(provider.request({ method: "eth_sendTransaction", params: [tx()] }), /already exists/);
  assert.equal(seen.filter((method) => method === "eth_sendTransaction").length, 1);
});

test("a rejected signature does not invent a hash", async () => {
  const ethereum = {
    async request() {
      const error = new Error("User rejected the request.");
      error.code = 4001;
      throw error;
    },
  };
  const state = { hash: "" };
  const provider = createWriteProvider(ethereum, state);
  await assert.rejects(provider.request({ method: "eth_sendTransaction", params: [tx()] }), /User rejected/);
  assert.equal(state.hash, "");
});
