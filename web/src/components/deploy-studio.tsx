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
  RECORDED_STUDIONET_DEPLOYMENT,
  RECORDED_STUDIONET_FLOW,
  sha256Hex,
  withTimeout,
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

function boundedMs(fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = Number(new URLSearchParams(window.location.search).get("stepMs"));
  if (!Number.isFinite(raw) || raw < 200 || raw > 120000) return fallback;
  return raw;
}

async function rpc(method: string, params: unknown[]) {
  const response = await withTimeout(
    () =>
      fetch("https://studio.genlayer.com/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      }),
    { ms: 8000, step: method },
  );
  const payload = (await response.json()) as { result?: Record<string, unknown> | null; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || `${method} failed`);
  return payload.result ?? null;
}

async function readObservation(hash: string) {
  try {
    const [evm, studio] = await Promise.all([
      rpc("eth_getTransactionReceipt", [hash]).catch(() => null),
      rpc("eth_getTransactionByHash", [hash]).catch(() => null),
    ]);
    if (!evm && !studio) return null;
    return { evm, studio };
  } catch {
    return null;
  }
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
    const attempt: { hash: string; adjustment: Adjustment | null; onSend?: () => void } = {
      hash: "",
      adjustment: null,
    };
    const lines: string[] = [];
    const show = (status: string, detail: string) => {
      lines.push(`${status}: ${detail}`);
      setView({
        status,
        detail: lines.join("\n\n"),
        hash: attempt.hash,
        address: "",
        adjustment: attempt.adjustment,
      });
    };
    const ms = boundedMs(0);
    const limit = (fallback: number) => (ms > 0 ? ms : fallback);
    try {
      show(
        "eth_chainId",
        zh
          ? "正在等待注入钱包返回 eth_chainId。这一步不弹签名窗。超时后会恢复按钮，不会发送交易。"
          : "Waiting for the injected wallet to return eth_chainId. This step has no signature prompt. The button returns if it times out. No transaction is sent.",
      );
      const chainId = String(
        await withTimeout(() => ethereum.request({ method: "eth_chainId" }), {
          ms: limit(8000),
          step: "eth_chainId",
        }),
      );
      show(
        "eth_requestAccounts",
        zh
          ? `eth_chainId 已返回 ${chainId}。正在调用 eth_requestAccounts。若站点尚未连接，MetaMask 应弹出连接请求。超时后停止，不会发送交易。`
          : `eth_chainId returned ${chainId}. Calling eth_requestAccounts. MetaMask should prompt if this site is not connected. A timeout stops here and sends nothing.`,
      );
      const accounts = (await withTimeout(() => ethereum.request({ method: "eth_requestAccounts" }), {
        ms: limit(20000),
        step: "eth_requestAccounts",
      })) as string[];
      const account = accounts?.[0] ?? "";
      const gate = canSubmitDeploy({ chainId, account, existingHash: "" });
      if (!gate.ok) {
        show(
          "error",
          gate.reason === "wrong-chain"
            ? zh
              ? `当前链是 ${chainId}。需要 Studionet ${STUDIO_CHAIN_ID}（0xf22f），RPC https://studio.genlayer.com/api。未发送交易。`
              : `Wallet chain is ${chainId}. Studionet ${STUDIO_CHAIN_ID} (0xf22f) is required. No transaction was sent.`
            : zh
              ? "eth_requestAccounts 没有返回账户。未发送交易。"
              : "eth_requestAccounts returned no account. No transaction was sent.",
        );
        return;
      }
      show(
        "load-contract",
        zh
          ? `账户 ${account}，链 ${chainId}。正在读取本站的 MilestoneWitness.py。未发送交易。`
          : `Account ${account}, chain ${chainId}. Reading this site's MilestoneWitness.py. No transaction sent.`,
      );
      const source = await withTimeout(() => fetch(`${basePath}/MilestoneWitness.py`), {
        ms: limit(15000),
        step: "load-contract",
      });
      if (!source.ok) throw new Error(`contract file HTTP ${source.status}`);
      const bytes = new Uint8Array(await source.arrayBuffer());
      const actual = await sha256Hex(bytes);
      if (actual !== CONTRACT_SHA256) {
        throw new Error(`contract hash ${actual} does not match ${CONTRACT_SHA256}`);
      }
      show(
        "load-sdk",
        zh ? "合约校验通过。正在加载 genlayer-js 1.1.8。未发送交易。" : "Contract hash matched. Loading genlayer-js 1.1.8. No transaction sent.",
      );
      const { createClient } = await withTimeout(() => import("genlayer-js"), {
        ms: limit(20000),
        step: "load-sdk",
      });
      const { studionet } = await withTimeout(() => import("genlayer-js/chains"), {
        ms: limit(20000),
        step: "load-sdk-chains",
      });
      let signing = false;
      attempt.onSend = () => {
        signing = true;
        show(
          "eth_sendTransaction",
          zh
            ? "genlayer-js 已组好交易并调用 eth_sendTransaction。现在才应该出现 MetaMask 签名。value 为 0。没有哈希之前不会再发一次。"
            : "genlayer-js built the transaction and called eth_sendTransaction. MetaMask should ask for a signature now. Value is 0. Nothing is sent again before a hash exists.",
        );
      };
      const provider = createGuardedProvider(ethereum, attempt);
      const client = createClient({
        chain: studionet,
        account: account as `0x${string}`,
        provider,
      });
      show(
        "sdk-deploy",
        zh
          ? "正在调用 deployContract。签名请求出现之前，SDK 会先读取 nonce 和 gas。尚未发送。"
          : "Calling deployContract. Before a signature prompt, the SDK reads the nonce and gas. Nothing is sent yet.",
      );
      const deployPromise = client.deployContract({
        code: new TextDecoder().decode(bytes),
        args: [],
      });
      const hash = await new Promise<string>((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          const elapsed = Date.now() - started;
          if (!signing && elapsed >= 20000) {
            clearInterval(timer);
            const error = new Error("timed out after 20000ms waiting for sdk-deploy before eth_sendTransaction. No transaction was sent.");
            Object.assign(error, { code: "step-timeout", step: "sdk-deploy" });
            reject(error);
          } else if (signing && elapsed >= limit(120000)) {
            clearInterval(timer);
            const error = new Error("timed out after waiting for eth_sendTransaction. No hash was returned.");
            Object.assign(error, { code: "step-timeout", step: "eth_sendTransaction" });
            reject(error);
          }
        }, 200);
        deployPromise.then(
          (value: string) => {
            clearInterval(timer);
            resolve(String(value));
          },
          (error: unknown) => {
            clearInterval(timer);
            reject(error);
          },
        );
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
      const observation = polled.value as { evm?: Record<string, unknown> | null; studio?: Record<string, unknown> | null };
      const judgment = (
        judgeDeployObservation as (input: { evmReceipt?: unknown; genlayer?: unknown }) => {
          successful: boolean;
          address: string | null;
          reason: string;
        }
      )({
        evmReceipt: observation.evm,
        genlayer: observation.studio,
      });
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
      show(described.step ? `error:${described.step}` : "error", described.detail);
    } finally {
      setBusy(false);
    }
  }

  const recorded = RECORDED_STUDIONET_DEPLOYMENT;
  const deskHref = `${basePath}/desk/?address=${recorded.contractAddress}&chain=studionet`;

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h2 className="font-display text-2xl">{zh ? "已记录的 Studionet 部署" : "Recorded Studionet deployment"}</h2>
      <p className="text-sm leading-6">
        {zh
          ? "这是一次已经发生的部署，不是新的发送。Studionet 会重置，这个地址不是 Bradbury 或主网地址。部署当时 campaign_count 为 0。后来同一个发起人钱包走过创建、里程碑、证据、锁定和评审。证据是本仓库 README 里的一句话。这不是真实筹款或业务成果，也不是任意访客的通用结果。匿名打开台面只读；写入仍要用户自己的钱包。"
          : "This deployment already happened. It is not a new transaction. Studionet can be reset, and this address is not a Bradbury or mainnet address. campaign_count was 0 at deployment. One organizer wallet later created a campaign, milestone, evidence item, lock, and review. The evidence is one sentence from this repository's README. That is not fundraising or business traction, and it is not a result for every visitor. The public desk is read-only. Writes use the visitor's own wallet."}
      </p>
      <p className="break-all text-sm">
        {zh ? "合约" : "Contract"}: {recorded.contractAddress}
      </p>
      <p className="break-all text-sm">
        {zh ? "交易" : "Transaction"}:{" "}
        <a className="underline" href={recorded.explorerTx}>
          {recorded.txHash}
        </a>
      </p>
      <p className="text-sm">
        <a className="underline" href={deskHref}>
          {zh ? "匿名只读打开台面" : "Open the read-only desk"}
        </a>
      </p>
      <ul className="space-y-1 break-all text-xs leading-5">
        {RECORDED_STUDIONET_FLOW.transactions.map((item) => (
          <li key={item.hash}>
            {item.method}:{" "}
            <a className="underline" href={`https://explorer-studio.genlayer.com/tx/${item.hash}`}>
              {item.hash}
            </a>
            {item.returnText ? ` → ${item.returnText}` : zh ? " → 无返回 id" : " → no returned id"}
          </li>
        ))}
      </ul>
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
