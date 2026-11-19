# 部署交接

日期：2026-11-19。没有代签，没有向公开网络发送交易，没有提交 Portal，没有把 Origin 镜像到 GitHub。

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

静态站点接入真实地址，不把标本当成链上数据：

```text
/desk/?address=0x你的合约&chain=studionet
```

可选 `&rpc=https://studio.genlayer.com/api`。地址为空时，链上模式显示空状态。

## 本地模拟和真测试网

本地 GLSim 在 `127.0.0.1:4217` 上实际跑过，chain id 61127（`0xeec7`）。它用一次性内存账户，私钥没有保存。结果在 `docs/test-reports/glsim-local.json`。

那里的 `0x7466a13ff8ae365437dfb20e287e7f46897b453c` 只存在于这次本地进程，不能当作公开部署地址。交易号 `0x…0001` 起是模拟器顺序号，不是测试网交易。

真测试网和 Studio 都还没有部署。
