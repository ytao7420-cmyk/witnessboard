"use client";

import { DeployStudio } from "@/components/deploy-studio";
import { useSession } from "@/components/session";

export default function PreparePage() {
  const { state } = useSession();
  const zh = state.lang === "zh";
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">{zh ? "部署准备" : "Deployment preparation"}</h1>
      <p className="max-w-3xl text-sm leading-6">
        {zh
          ? "Studionet 上已有一次部署，网络会重置。下面列出地址和只读结果。写入后的读回还没有做。构建仍然拒绝预填 NEXT_PUBLIC_CONTRACT_ADDRESS。"
          : "One Studionet deployment is recorded. That network can be reset. The address and the read-only result are below. A write followed by a read-back has not been done. The build still rejects NEXT_PUBLIC_CONTRACT_ADDRESS."}
      </p>
      <ul className="space-y-2 text-sm leading-6">
        <li>
          Studio：
          <a className="underline" href="https://studio.genlayer.com">
            https://studio.genlayer.com
          </a>{" "}
          · chain id 61999 · RPC https://studio.genlayer.com/api · 水龙头是账户选择器里的水滴按钮
        </li>
        <li>
          预览 Studio：
          <a className="underline" href="https://studio-dev.genlayer.com">
            https://studio-dev.genlayer.com
          </a>{" "}
          · chain id 61997 · RPC https://studio-dev.genlayer.com/api · 需要匹配的 RC，当前 genlayer-js 1.1.8 没有 studioDevnet
        </li>
        <li>
          Bradbury 链 RPC：https://rpc.testnet-chain.genlayer.com · chain id 4221 · 水龙头{" "}
          <a className="underline" href="https://testnet-faucet.genlayer.foundation">
            https://testnet-faucet.genlayer.foundation
          </a>
          。智能合约不要用这条 Conduit 链 RPC。SDK 1.1.8 的 testnetBradbury 仍指向 https://rpc-bradbury.genlayer.com。
        </li>
        <li>本地：Studio http://localhost:8080 · RPC http://127.0.0.1:4000/api · chain id 61127</li>
      </ul>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
        <li>python3 -m venv .venv && .venv/bin/pip install -r requirements.txt</li>
        <li>pytest tests/direct -v</li>
        <li>genvm-lint check contracts/milestone_witness.py</li>
        <li>npm install -g genlayer && genlayer init && genlayer up</li>
        <li>genlayer network set localnet && genlayer network info</li>
        <li>genlayer deploy --contract contracts/milestone_witness.py --rpc http://127.0.0.1:4000/api</li>
        <li>{zh ? "把部署回执里的地址粘到“链上操作”。不要把别人的地址当成自己的部署。" : "Paste the address from your own deploy receipt into Chain actions."}</li>
        <li>{zh ? "在本地 Studio 上测量费用后，再决定是否生成 fee-profile.json。当前前端不使用未测量的费用配置。" : "Measure fees on local Studio before creating fee-profile.json. The frontend does not use an unmeasured profile."}</li>
      </ol>
      <DeployStudio zh={zh} />
      <p className="text-sm text-muted-foreground">
        {zh
          ? "genvm-lint 0.11.0 提示还有更新的 runner 1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh。genlayer-test 0.29.2 的直接模式无法给那个 runner 注入交易消息。当前合约使用文档仍在展示、且本机测试已通过的 1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6。换 runner 之前需要重新跑测试。"
          : "genvm-lint 0.11.0 reports a newer runner, 1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh. genlayer-test 0.29.2 direct mode cannot inject a transaction message for it. The contract uses 1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6, which the current docs still show and which these tests execute. Re-run the tests before changing the pin."}
      </p>
    </div>
  );
}
