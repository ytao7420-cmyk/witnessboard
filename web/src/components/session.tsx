"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import type { ChainKey } from "@/lib/genlayer";

export type AppMode = "illustrative" | "chain";
export type Lang = "zh" | "en";

export type SessionState = {
  mode: AppMode;
  lang: Lang;
  chainKey: ChainKey;
  contractAddress: string;
  stateVariant: "latest-final" | "latest-nonfinal";
  rpcOverride: string;
};

const STORAGE_KEY = "witnessboard.session.v1";

const defaultState: SessionState = {
  mode: "illustrative",
  lang: "zh",
  chainKey: "localnet",
  contractAddress: "",
  stateVariant: "latest-nonfinal",
  rpcOverride: "",
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readRaw() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function parse(raw: string): SessionState {
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      ...defaultState,
      ...parsed,
      mode: parsed.mode === "chain" ? "chain" : "illustrative",
      lang: parsed.lang === "en" ? "en" : "zh",
    };
  } catch {
    return defaultState;
  }
}

const SessionContext = createContext<{
  state: SessionState;
  setState: (patch: Partial<SessionState>) => void;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const state = parse(raw);
  const value = {
    state,
    setState: (patch: Partial<SessionState>) => {
      const next = { ...state, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      emit();
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("session missing");
  return value;
}
