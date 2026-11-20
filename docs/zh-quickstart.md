# 见证台快速开始

见证台是一个非托管的众筹里程碑证据审查草案。它不收款、不托管资金、不自动退款，也不把模型输出写成真实世界事实。

## 看界面

```bash
cd web
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:43123/witnessboard/ 。

公开静态站由 GitHub Pages 提供，地址是 https://ytao7420-cmyk.github.io/witnessboard/ 。这不是测试网部署，也没有提交 Portal。

默认是只读标本。琥珀色横幅会说明这些记录不是链上审查。标本模式不会连接钱包。

Studionet 临时部署：https://ytao7420-cmyk.github.io/witnessboard/desk/?address=0xc4Ad3bd1A69BD91841e16a370f935B3C0ec16865&chain=studionet 。这是只读入口。写入仍要你自己的钱包签名，而且还没有做写入后的读回。构建时如果设置了 `NEXT_PUBLIC_CONTRACT_ADDRESS`，构建会失败。

## 跑合约测试

需要 Python 3.12。测试不需要钱包、签名或付费资源。第一次会下载 GenVM 运行时，体积大约 200 MB。

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest tests/direct/test_milestone_witness.py -v
.venv/bin/genvm-lint check contracts/milestone_witness.py
```

前端检查：

```bash
cd web
npm run test:rules
```

## 所有者自己部署

下面的命令会启动本机节点并发送部署交易。确认之后再执行。本草案没有执行它们。

```bash
npm install -g genlayer
genlayer init
genlayer up
genlayer network set localnet
genlayer network info
genlayer deploy --contract contracts/milestone_witness.py --rpc http://127.0.0.1:4000/api
```

把回执里的合约地址粘到“链上操作”。费用配置要在本地 Studio 测过之后再提交。现在的前端使用已安装的 `genlayer-js` 1.1.8：写入时 `value` 固定为 0，然后分别等待 `ACCEPTED` 和 `FINALIZED`。只有回执里的执行结果是 `FINISHED_WITH_RETURN` 才显示成功。

更完整的英文说明在仓库根目录 `README.md`。限制见 `SECURITY.md`。
