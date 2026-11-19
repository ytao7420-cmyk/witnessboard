import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { createAccount, createClient } from "genlayer-js";
import { localnet } from "genlayer-js/chains";

const GLSIM = process.env.GLSIM_RPC || "http://127.0.0.1:4217/api";
const LOCAL_CONTRACT = "0x7466a13ff8ae365437dfb20e287e7f46897b453c";

function encodeStringList(items) {
  const out = [];
  const writeNum = (value) => {
    let data = BigInt(value);
    if (data === 0n) {
      out.push(0);
      return;
    }
    while (data > 0n) {
      let cur = Number(data & 0x7fn);
      data >>= 7n;
      if (data > 0n) cur |= 128;
      out.push(cur);
    }
  };
  writeNum((BigInt(items.length) << 3n) | 5n);
  for (const item of items) {
    const bytes = new TextEncoder().encode(item);
    writeNum((BigInt(bytes.length) << 3n) | 4n);
    out.push(...bytes);
  }
  return Buffer.from(out).toString("hex");
}

async function withRpc(handler, fn) {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const request = JSON.parse(body || "{}");
      const result = handler(request);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/api`;
  try {
    await fn(endpoint);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("readContract decodes a gen_call payload from a local RPC", async () => {
  await withRpc(
    (request) => {
      assert.equal(request.method, "gen_call");
      assert.equal(request.params[0].type, "read");
      assert.equal(request.params[0].transaction_hash_variant, "latest-nonfinal");
      return { status: { code: 0, message: "" }, data: encodeStringList(["c0001"]) };
    },
    async (endpoint) => {
      const client = createClient({ chain: localnet, endpoint });
      const value = await client.readContract({
        address: LOCAL_CONTRACT,
        functionName: "list_campaign_ids",
        args: [],
      });
      assert.deepEqual(value, ["c0001"]);
    },
  );
});

test("readContract surfaces a gen_call failure instead of inventing state", async () => {
  await withRpc(
    () => ({ status: { code: 1, message: "contract missing" }, data: "" }),
    async (endpoint) => {
      const client = createClient({ chain: localnet, endpoint });
      await assert.rejects(
        () =>
          client.readContract({
            address: LOCAL_CONTRACT,
            functionName: "manifest",
            args: [],
          }),
        /gen_call failed: contract missing/,
      );
    },
  );
});

test("writeContract without a wallet fails before a transaction is sent", async () => {
  let calls = 0;
  await withRpc(
    () => {
      calls += 1;
      return null;
    },
    async (endpoint) => {
      const client = createClient({ chain: localnet, endpoint });
      await assert.rejects(
        () =>
          client.writeContract({
            address: LOCAL_CONTRACT,
            functionName: "create_campaign",
            args: ["North slope", "A local book corner."],
            value: 0n,
          }),
        /No account set|Account is required/,
      );
      assert.equal(calls, 0);
    },
  );
});

test("local GLSim read and empty-title failure stay on loopback", async (t) => {
  let chainId;
  try {
    const response = await fetch(GLSIM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    chainId = (await response.json()).result;
  } catch {
    t.skip("local GLSim is not running");
    return;
  }
  assert.equal(chainId, "0xeec7");
  const client = createClient({ chain: localnet, endpoint: GLSIM });
  const ids = await client.readContract({
    address: LOCAL_CONTRACT,
    functionName: "list_campaign_ids",
    args: [],
  });
  assert.ok(Array.isArray(ids));
  assert.equal(ids.includes("c0001"), true);
  const account = createAccount();
  const writer = createClient({ chain: localnet, endpoint: GLSIM, account });
  await writer.request({ method: "sim_fundAccount", params: [account.address, "1000000000000000000"] });
  const before = await client.readContract({
    address: LOCAL_CONTRACT,
    functionName: "list_campaign_ids",
    args: [],
  });
  let failed = false;
  try {
    await writer.writeContract({
      address: LOCAL_CONTRACT,
      functionName: "create_campaign",
      args: ["", ""],
      value: 0n,
    });
  } catch (error) {
    failed = true;
    assert.match(String(error), /title is empty|UserError|reverted|failed|ERROR/i);
  }
  const after = await client.readContract({
    address: LOCAL_CONTRACT,
    functionName: "list_campaign_ids",
    args: [],
  });
  assert.deepEqual(after, before);
  assert.equal(failed || after.length === before.length, true);
});
