"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { basePath } from "@/lib/base-path";
import {
  CONSENSUS_ADDRESS,
  CONTRACT_SHA256,
  STUDIO_CHAIN_ID,
  STUDIO_FLAT_GAS,
  canSubmitDeploy,
  createGuardedProvider,
  describeError,
  judgeDeployObservation,
  pollUntil,
  sha256Hex,
} from "@/lib/studionet-deploy.mjs";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type Adjustment = {
  intrinsic: string;
  requested: string;
  raised: boolean;
  gas: string;
  value: string;
};

type DeployView = {
  status: string;
  detail: string;
  hash: string;
  address: string;
  adjustment: Adjustment | null;
};

const initialView: DeployView = {
  status: "idle",
  detail: "",
  hash: "",
  address: "",
  adjustment: null,
};

function injectedProvider() {
  return (globalThis as { ethereum?: EthereumProvider }).ethereum;
}

async function readObservation(hash: string) {
  const response = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [hash],
    }),
  });
  const payload = (await response.json()) as { result?: Record<string, unknown> | null; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || "receipt lookup failed");
  return payload.result ?? null;
}

export function DeployStudio({ zh }: { zh: boolean }) {
  const [view, setView] = useState<DeployView>(initialView);
  const [busy, setBusy] = useState(false);

  async function deploy() {
    if (busy || view.hash) return;
    const ethereum = injectedProvider();
    if (!ethereum?.request) {
      setView({
        ...initialView,
        status: "error",
        detail: zh ? "没有检测到注入钱包。这个页面只使用浏览器里的 MetaMask，不新建钱包。" : "No injected wallet. This page uses the browser MetaMask only.",
      });
      return;
    }
    setBusy(true);
    setView({ ...initialView, status: "checking" });
    const attempt: { hash: string; adjustment: Adjustment | null } = { hash: "", adjustment: null };
    try {
      const chainId = String(await ethereum.request({ method: "eth_chainId" }));
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0] ?? "";
      const gate = canSubmitDeploy({ chainId, account, existingHash: "" });
      if (!gate.ok) {
        setView({
          ...initialView,
          status: "error",
          detail:
            gate.reason === "wrong-chain"
              ? zh
                ? `当前链是 ${chainId}。需要 Studionet ${STUDIO_CHAIN_ID}（0xf22f），RPC https://studio.genlayer.com/api。未发送交易。`
                : `Wallet chain is ${chainId}. Studionet ${STUDIO_CHAIN_ID} (0xf22f) is required. No transaction was sent.`
              : zh
                ? "钱包没有返回账户。未发送交易。"
                : "The wallet returned no account. No transaction was sent.",
        });
        return;
      }
      const source = await fetch(`${basePath}/MilestoneWitness.py`);
      if (!source.ok) throw new Error(`contract file HTTP ${source.status}`);
      const bytes = new Uint8Array(await source.arrayBuffer());
      const actual = await sha256Hex(bytes);
      if (actual !== CONTRACT_SHA256) {
        throw new Error(`contract hash ${actual} does not match ${CONTRACT_SHA256}`);
      }
      const { createClient } = await import("genlayer-js");
      const { studionet } = await import("genlayer-js/chains");
      const provider = createGuardedProvider(ethereum, attempt);
      const client = createClient({
        chain: studionet,
        account: account as `0x${string}`,
        provider,
      });
      setView({ ...initialView, status: "awaiting-wallet" });
      const hash = await client.deployContract({
        code: new TextDecoder().decode(bytes),
        args: [],
      });
      setView({
        status: "submitted",
        detail: zh
          ? "钱包已返回哈希。不会再次发送。正在读取回执。"
          : "The wallet returned a hash. It will not be sent again. Reading the receipt.",
        hash: String(hash),
        address: "",
        adjustment: attempt.adjustment,
      });
      const polled = await pollUntil(() => readObservation(String(hash)), {
        timeoutMs: 45000,
        intervalMs: 3000,
        now: () => Date.now(),
        sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
      });
      if (polled.timedOut) {
        setView({
          status: "timeout",
          detail: zh
            ? "45 秒内没有回执。哈希保留，没有第二次发送。这还不是部署成功。"
            : "No receipt within 45 seconds. The hash is kept and nothing was sent again. This is not a successful deployment.",
          hash: String(hash),
          address: "",
          adjustment: attempt.adjustment,
        });
        return;
      }
      const judgment = judgeDeployObservation({ evmReceipt: polled.value });
      setView({
        status: judgment.successful ? "deployed" : "incomplete",
        detail: judgment.successful
          ? zh
            ? "回执里的执行结果允许把这个地址当作本次部署。"
            : "The receipt execution result allows this address to be treated as this deployment."
          : zh
            ? `回执已返回，但还不能当作部署成功：${judgment.reason}。没有伪造地址，也没有再次发送。`
            : `A receipt arrived, but it is not a successful deployment: ${judgment.reason}. No address was invented and nothing was sent again.`,
        hash: String(hash),
        address: judgment.address ?? "",
        adjustment: attempt.adjustment,
      });
    } catch (error) {
      const described = describeError(error);
      setView({
        status: "error",
        detail: described.detail,
        hash: attempt.hash,
        address: "",
        adjustment: attempt.adjustment,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h2 className="font-display text-2xl">{zh ? "用 MetaMask 部署到 Studionet" : "Deploy to Studionet with MetaMask"}</h2>
      <p className="text-sm leading-6">
        {zh
          ? "这一步使用已安装的 genlayer-js 1.1.8 和浏览器注入的钱包。它不读取私钥，不连接 WalletConnect，也不使用 Studio 的会话。Studionet（chain id 61999）是会重置的临时网络，不是 Bradbury，也还没有 Portal 提交。"
          : "This step uses installed genlayer-js 1.1.8 and the injected browser wallet. It does not read a key, open WalletConnect, or use a Studio session. Studionet (chain id 61999) is temporary and is not Bradbury. No portal form has been submitted."}
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        {zh
          ? `交易 value 固定为 0。接收方是 SDK 预设的共识合约 ${CONSENSUS_ADDRESS}，不是本项目的合约地址。节点目前把估算 gas 固定成 ${STUDIO_FLAT_GAS.toString()}。本页只在这个数字低于该笔数据的固有 gas 时提高 gas 上限，好让钱包有机会弹出签名；这不是费用配置，也不是已经看到的某一条钱包报错。`
          : `Value stays 0. The recipient is the SDK consensus contract ${CONSENSUS_ADDRESS}, not this project's contract. The node currently quotes a flat gas of ${STUDIO_FLAT_GAS.toString()}. This page raises that limit only when it is below the calldata intrinsic gas, so the wallet can show a signature. It is not a fee profile and it is not a wallet error we have already observed.`}
      </p>
      <Button type="button" disabled={busy || Boolean(view.hash)} onClick={() => void deploy()}>
        {view.hash ? (zh ? "已有哈希，不再发送" : "Hash exists; not sending again") : zh ? "请求 MetaMask 签名部署" : "Ask MetaMask to sign the deploy"}
      </Button>
      {view.status !== "idle" ? (
        <div className="space-y-2 text-sm leading-6">
          <p>
            {zh ? "状态" : "Status"}: {view.status}
          </p>
          {view.adjustment?.raised ? (
            <p>
              {zh ? "gas 上限已从" : "Gas limit raised from"} {view.adjustment.requested} {zh ? "调到固有 gas" : "to intrinsic gas"}{" "}
              {view.adjustment.intrinsic}。value {view.adjustment.value}
            </p>
          ) : null}
          {view.hash ? <p className="break-all">{zh ? "哈希" : "Hash"}: {view.hash}</p> : null}
          {view.address ? <p className="break-all">{zh ? "合约地址" : "Contract"}: {view.address}</p> : null}
          {view.detail ? <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{view.detail}</pre> : null}
        </div>
      ) : null}
    </section>
  );
}
