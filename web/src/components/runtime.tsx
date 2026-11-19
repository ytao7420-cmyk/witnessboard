"use client";

import { useSearchParams } from "next/navigation";

import { useSession, type AppMode } from "@/components/session";
import { chainCatalog, safeRpc, type ChainKey } from "@/lib/genlayer";
import { isContractAddress } from "@/lib/rules.mjs";

export type AddressSource = "url" | "session" | "build" | "none";

export function useRuntimeTarget() {
  const { state, setState } = useSession();
  const params = useSearchParams();
  const urlAddress = (params.get("address") ?? "").trim();
  const sessionAddress = state.contractAddress.trim();
  const bakedAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
  let contractAddress = "";
  let addressSource: AddressSource = "none";
  if (isContractAddress(urlAddress)) {
    contractAddress = urlAddress;
    addressSource = "url";
  } else if (isContractAddress(sessionAddress)) {
    contractAddress = sessionAddress;
    addressSource = "session";
  } else if (isContractAddress(bakedAddress)) {
    contractAddress = bakedAddress;
    addressSource = "build";
  }
  const chainParam = params.get("chain") ?? "";
  const chainKey = (chainParam in chainCatalog ? chainParam : state.chainKey) as ChainKey;
  const urlRpc = safeRpc(params.get("rpc") ?? "");
  const sessionRpc = safeRpc(state.rpcOverride);
  const endpoint = urlRpc || sessionRpc;
  const mode: AppMode = contractAddress && addressSource !== "session" ? "chain" : state.mode;
  return {
    ...state,
    setState,
    mode: addressSource === "url" || addressSource === "build" ? "chain" : mode,
    chainKey,
    contractAddress,
    addressSource,
    endpoint,
  };
}
