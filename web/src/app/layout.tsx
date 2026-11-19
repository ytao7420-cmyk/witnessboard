import type { Metadata } from "next";
import { Fraunces, Noto_Sans_SC } from "next/font/google";

import { SessionProvider } from "@/components/session";
import { Shell } from "@/components/shell";

import "./globals.css";

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "见证台 Witnessboard",
  description: "非托管的众筹里程碑公开证据审查台。共识阅读不是真实世界事实认定。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <SessionProvider>
          <Shell>{children}</Shell>
        </SessionProvider>
      </body>
    </html>
  );
}
