/** Injected-wallet write guards. No Snap, no broadcast. */

import { CONSENSUS_ADDRESS, intrinsicGas } from "./studionet-deploy.mjs";
import { isContractAddress } from "./rules.mjs";

export const SNAP_METHODS = [
  "wallet_requestSnaps",
  "wallet_requestSnap",
  "wallet_getSnaps",
  "wallet_snap",
  "wallet_invokeSnap",
];

export const ONE_GWEI = 1_000_000_000n;
export const MAX_TEST_FEE_WEI = 1_000_000_000_000_000n;

function isZeroQuantity(value) {
  if (value == null || value === "" || value === "0x") return true;
  try {
    return BigInt(value) === 0n;
  } catch {
    return false;
  }
}

export function feeForGas(gas, quotedPrice) {
  const gasLimit = BigInt(gas);
  if (gasLimit <= 0n) throw new Error("gas limit must be positive");
  const quoted = quotedPrice == null || isZeroQuantity(quotedPrice) ? ONE_GWEI : BigInt(quotedPrice);
  let gasPrice = quoted;
  let capped = false;
  if (gasLimit * gasPrice > MAX_TEST_FEE_WEI) {
    gasPrice = MAX_TEST_FEE_WEI / gasLimit;
    capped = true;
  }
  if (gasPrice < 1n) throw new Error("0.001 GEN cap cannot cover this gas limit");
  return {
    gasPrice,
    maxFeeWei: gasLimit * gasPrice,
    capped,
    replacedZeroQuote: quotedPrice == null || isZeroQuantity(quotedPrice),
  };
}

export function prepareWriteTransaction(tx, { consensusAddress = CONSENSUS_ADDRESS, expectedChainId = 61999 } = {}) {
  if (!isZeroQuantity(tx?.value)) throw new Error("refusing a write whose value is not 0");
  if (tx?.chainId != null && BigInt(tx.chainId) !== BigInt(expectedChainId)) {
    throw new Error(`refusing a write for chain ${tx.chainId}`);
  }
  if (String(tx?.to ?? "").toLowerCase() !== String(consensusAddress).toLowerCase()) {
    throw new Error("refusing a write whose recipient is not the consensus contract");
  }
  const intrinsic = intrinsicGas(tx.data);
  const requested = tx.gas == null ? intrinsic : BigInt(tx.gas);
  const gas = requested < intrinsic ? intrinsic : requested;
  const fee = feeForGas(gas, tx.gasPrice);
  return {
    transaction: {
      ...tx,
      value: "0x0",
      gas: `0x${gas.toString(16)}`,
      gasPrice: `0x${fee.gasPrice.toString(16)}`,
    },
    preview: {
      ...fee,
      gas,
      value: "0x0",
      to: tx.to,
      raisedGas: requested < intrinsic,
    },
  };
}

export function createWriteProvider(ethereum, state, options = {}) {
  return {
    async request(args) {
      const method = args?.method;
      if (SNAP_METHODS.includes(method)) {
        const error = new Error(`refusing ${method}. This flow uses eth_sendTransaction on the injected account and does not install a Snap.`);
        error.code = "snap-refused";
        throw error;
      }
      if (method !== "eth_sendTransaction") return ethereum.request(args);
      if (state.hash) {
        const error = new Error("A transaction hash already exists. Not sending another transaction.");
        error.code = "already-submitted";
        throw error;
      }
      const prepared = prepareWriteTransaction(args.params?.[0], options);
      state.preview = {
        gas: prepared.preview.gas.toString(),
        gasPrice: prepared.preview.gasPrice.toString(),
        maxFeeWei: prepared.preview.maxFeeWei.toString(),
        value: "0x0",
        replacedZeroQuote: prepared.preview.replacedZeroQuote,
        capped: prepared.preview.capped,
      };
      state.onSend?.(state.preview);
      const hash = await ethereum.request({ method: "eth_sendTransaction", params: [prepared.transaction] });
      if (typeof hash !== "string" || !hash.startsWith("0x")) throw new Error("wallet returned no transaction hash");
      state.hash = hash;
      return hash;
    },
  };
}

export function assertSelectedAccount(account, selected) {
  if (!isContractAddress(account) || !isContractAddress(selected)) return false;
  return account.toLowerCase() === selected.toLowerCase();
}
