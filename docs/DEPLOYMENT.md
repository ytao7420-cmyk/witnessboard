# 部署交接

日期：2026-11-19。没有代签，没有向公开网络发送交易，没有提交 Portal。公开仓库是 https://github.com/ytao7420-cmyk/witnessboard ，不是 Origin 的镜像，也不是 Vercel。

## 浏览器上传用的合约

单文件：`deploy/MilestoneWitness.py`，与 `contracts/milestone_witness.py` 字节相同。构造函数没有参数。

校验和写在 `deploy/SHA256SUMS`。上传前重新计算：

```bash
sha256sum deploy/MilestoneWitness.py
```

Studio 路径：打开 https://studio.genlayer.com ，载入这个 `.py` 文件。左侧构造参数应为空。点击 Deploy。部署交易由父级浏览器签名。

官方说明：https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/deploying-contract

## 官方网络

来源：https://docs.genlayer.com/developers/networks ，本次读取日期 2026-11-19。

| 网络 | 界面 | GenLayer RPC | chain id | 测试币 |
| --- | --- | --- | --- | --- |
| Studionet | https://studio.genlayer.com | https://studio.genlayer.com/api | 61999 | Studio 账户选择器里的水滴按钮。文档没有公布固定数量。 |
| Studio dev | https://studio-dev.genlayer.com | https://studio-dev.genlayer.com/api | 61997 | 同样是水滴按钮。状态会重置。当前安装的 genlayer-js 1.1.8 没有 `studioDevnet`，不要把 studionet 预设改名冒充。 |
| Localnet | http://localhost:8080 | http://127.0.0.1:4000/api | 61127 | 本地水滴按钮 |
| Bradbury 链 | 浏览器钱包 | https://rpc.testnet-chain.genlayer.com | 4221 | https://testnet-faucet.genlayer.foundation |

Bradbury 的智能合约调用不能直接打到上面这条 Conduit 链 RPC。官方要求使用发布说明里的 Phase 2 节点 RPC。chain id 4221 被复用。签名前核对创世区块哈希 `0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4` 和 AddressManager `0x3F71AE080BD6270A91dBcc7960d88797828538E0`。已安装的 genlayer-js 1.1.8 把 `testnetBradbury` 指到 `https://rpc-bradbury.genlayer.com`，这和官方链 RPC 不是同一个地址。

浏览器钱包：https://explorer-studio.genlayer.com 和 https://scan.testnet-chain.genlayer.com 只用于核对，不是部署按钮。

## 钱包会签什么

父级浏览器处理签名。本草案不接触私钥。

1. `eth_requestAccounts`：连接账户。
2. `wallet_switchEthereumChain` 或 `wallet_addEthereumChain`：`client.connect` 切到所选链。
3. `eth_sendTransaction`：legacy（type `0x0`）交易。本应用写入时 `value` 为 `0x0`。`to` 是该链 SDK 配置里的共识主合约，不是某个 EOA，也不是 ERC-20 `approve`。
4. Studionet 上，已安装 SDK 的共识主合约地址是 `0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575`。这是 SDK 预设，不是本项目的合约地址。
5. 不要签无限授权，不要签向外部地址转账，不要用实币付费。测试币只从上面的水龙头领取。若节点因费用字段拒绝 `value=0`，停下来看钱包提示，不要改成转账。

## GitHub Pages

静态站点由仓库里的 GitHub Actions 工作流 `.github/workflows/pages.yml` 构建 `web/` 并发布到 GitHub Pages。站点前缀是 `/witnessboard`。目标地址：

https://ytao7420-cmyk.github.io/witnessboard/

工作流只请求 `contents: read`，部署作业另加 `pages: write` 和 `id-token: write`。它不读取密钥，并把 `NEXT_PUBLIC_CONTRACT_ADDRESS` 设为空字符串。构建脚本在这个变量非空时直接失败。

静态站点接入真实地址，不把标本当成链上数据：

```text
https://ytao7420-cmyk.github.io/witnessboard/desk/?address=0x你的合约&chain=studionet
```

可选 `&rpc=https://studio.genlayer.com/api`。地址为空时，链上模式显示空状态。Pages 上线不等于合约已部署。

## 本地模拟和真测试网

本地 GLSim 在 `127.0.0.1:4217` 上实际跑过，chain id 61127（`0xeec7`）。它用一次性内存账户，私钥没有保存。结果在 `docs/test-reports/glsim-local.json`。

那里的 `0x7466a13ff8ae365437dfb20e287e7f46897b453c` 只存在于这次本地进程，不能当作公开部署地址。交易号 `0x…0001` 起是模拟器顺序号，不是测试网交易。

Studionet 已有一次部署，交易 `0xe1e1b325d145270f2696fa349075d60417e918d55c954796bf5a870a711df544`，合约 `0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865`。该网络会重置。只读 `manifest` 返回 MilestoneWitness 1.0.0，`holds_funds` 为 false，`list_campaign_ids` 当时为空。写入后再读回还没有做。Bradbury 没有部署。没有由本仓库提交 Portal。

## Studionet 与 MetaMask

2026-11-20 的只读观察：Studio 能返回 schema，stderr/stdout 为空，并有一条 warning：runner comment does not start with version, using default。浏览器控制台没有部署异常正文。MetaMask Activity 没有 pending、failed 或 rejected。账户仍是 10 GEN。因此这条 warning 不能当成没有哈希的原因。

同一天用 genlayer-js 1.1.8 对 `https://studio.genlayer.com/api` 组过一次部署交易，并在进入钱包前截获，没有广播。截获结果是 value `0x0`、gas `0x7a120`（500000）、gasPrice `0x0`、chain id `0xf22f`、接收方 `0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575`。这笔 calldata 的 EIP-2028 固有 gas 高于 500000。节点没有 `sim_getFeeConfig`。页面 `web` 的“部署准备”只在 gas 低于固有 gas 时提高上限，不写 fee profile，并把钱包或节点返回的原文显示出来。本地测试通过不等于已经部署。

父级在已发布的准备页点过一次“请求 MetaMask 签名部署”。状态停在 `checking` 超过 75 秒，没有 MetaMask 连接或签名提示，没有哈希，也没有错误正文。那一版把 `eth_chainId`、`eth_requestAccounts`、合约下载和 SDK 加载都放在同一个没有超时的 `checking` 里。后续页面会在每一步写下方法名，并在超时后恢复按钮、显示该步原文。没有哈希时不会补发交易。
