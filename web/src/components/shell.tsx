"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRuntimeTarget } from "@/components/runtime";
import { copy } from "@/lib/copy";

const links = [
  ["/", "home"],
  ["/desk", "desk"],
  ["/actions", "actions"],
  ["/limits", "limits"],
  ["/prepare", "prepare"],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { setState, ...state } = useRuntimeTarget();
  const text = copy[state.lang];
  const [confirmChain, setConfirmChain] = useState(false);

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="font-display text-2xl tracking-tight">
              {text.brand}
            </Link>
            <p className="text-sm text-muted-foreground">{text.brandEn}</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {links.map(([href, key]) => (
              <Link key={href} href={href} className="rounded-md px-2 py-1 hover:bg-muted">
                {text[key]}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setState({ lang: state.lang === "zh" ? "en" : "zh" })}
            >
              {text.lang}
            </Button>
            {state.mode === "illustrative" ? (
              <Button type="button" onClick={() => setConfirmChain(true)}>
                {text.chain}
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setState({ mode: "illustrative" })}>
                {text.backIllustrative}
              </Button>
            )}
          </div>
        </div>
      </header>
      <div
        className={
          state.mode === "illustrative"
            ? "border-b border-amber-700/30 bg-amber-100 px-4 py-3 text-sm text-amber-950"
            : "border-b border-sky-800/20 bg-sky-100 px-4 py-3 text-sm text-sky-950"
        }
      >
        <div className="mx-auto max-w-5xl">
          <strong className="mr-2">{state.mode === "illustrative" ? text.illustrative : text.chain}</strong>
          {state.mode === "illustrative" ? text.bannerIllustrative : text.bannerChain}
        </div>
      </div>
      {confirmChain ? (
        <div className="border-b bg-card px-4 py-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm">{text.confirmChain}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setState({ mode: "chain" });
                  setConfirmChain(false);
                }}
              >
                {text.enterChain}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmChain(false)}>
                {text.backIllustrative}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground">{text.independent}</footer>
    </div>
  );
}
