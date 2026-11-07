import type { Metadata, Viewport } from "next";
import "./globals.css";
import { readDb } from "@/lib/db";
import { summarizeAll } from "@/lib/calc";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Caderninho", template: "%s · Caderninho" },
  description: "Controle de fiado da cantina da escola",
  appleWebApp: { capable: true, title: "Caderninho", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await readDb();
  const data = { summaries: summarizeAll(db), products: db.products, settings: db.settings };
  return (
    <html lang="pt-BR">
      <body>
        <AppShell data={data}>{children}</AppShell>
      </body>
    </html>
  );
}
