export const copy = {
  zh: {
    brand: "见证台",
    brandEn: "Witnessboard",
    home: "首页",
    desk: "台面",
    actions: "链上操作",
    limits: "边界",
    prepare: "部署准备",
    illustrative: "只读标本",
    chain: "链上模式",
    lang: "EN",
    bannerIllustrative:
      "只读标本模式。下面的记录是界面标本，不是链上审查，也不能代表真实世界事实。此模式不会连接钱包，也不会发送交易。",
    bannerChain:
      "链上模式。读取和交易只指向你粘贴的合约地址。本应用不托管资金、不自动退款、不代你签名。",
    confirmChain: "进入链上模式后，台面不再显示标本。只有合约返回的内容会出现。",
    enterChain: "进入链上模式",
    backIllustrative: "回到只读标本",
    independent: "独立草案，不是 GenLayer 官方门户。",
  },
  en: {
    brand: "Witnessboard",
    brandEn: "见证台",
    home: "Home",
    desk: "Desk",
    actions: "Chain actions",
    limits: "Limits",
    prepare: "Deploy prep",
    illustrative: "Read-only specimen",
    chain: "Chain mode",
    lang: "中文",
    bannerIllustrative:
      "Read-only specimen mode. These records are interface samples, not chain reviews and not real-world findings. This mode does not connect a wallet or send a transaction.",
    bannerChain:
      "Chain mode. Reads and transactions use only the contract address you paste. This app holds no funds, issues no refunds, and does not sign for you.",
    confirmChain: "Chain mode hides the specimens. The desk shows only what the contract returns.",
    enterChain: "Enter chain mode",
    backIllustrative: "Return to specimens",
    independent: "Independent draft. Not the GenLayer official portal.",
  },
} as const;

export type Copy = (typeof copy)["zh"];
