import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { MODES } from "@/lib/modes";
import { relicData } from "@/lib/relics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Relic Index — Arknights",
  description: "Reference pages for Arknights game modes, in English, Japanese and Chinese",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="border-b border-[var(--border)]">
          <nav className="mx-auto flex w-full max-w-6xl items-center gap-5 px-4 py-3 text-sm sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              {/* the site icon (app/icon.png), served by Next at /icon.png */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
              Relic Index
            </Link>
            {MODES.map((m) => (
              <Link key={m.id} href={m.href} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                {m.name}
              </Link>
            ))}
          </nav>
        </div>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
          {children}
          <footer className="mt-auto border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
            Data from the EN, JP and CN game clients ({relicData.generatedAt}) via{" "}
            <a className="underline" href="https://github.com/ArknightsAssets/ArknightsGamedata">
              ArknightsGamedata
            </a>
            ; icons and banners via ArknightsAssets,{" "}
            <a className="underline" href="https://prts.wiki">
              PRTS
            </a>{" "}
            and the{" "}
            <a className="underline" href="https://arknights.wiki.gg">
              Arknights Terra Wiki
            </a>
            . English text for CN-only content is official wording where it was reused from an earlier theme, and an
            unofficial fan translation otherwise. CN-only theme names and section summaries are unofficial. Fan-made,
            not affiliated with Hypergryph or Yostar.
          </footer>
        </main>
      </body>
    </html>
  );
}
