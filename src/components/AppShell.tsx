"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BellRing,
  ReceiptText,
  UtensilsCrossed,
  Settings as SettingsIcon,
  Plus,
  HandCoins,
  Search,
  NotebookPen,
} from "lucide-react";
import type { Product, Settings, StudentSummary } from "@/lib/types";
import { ConfirmProvider, ToastProvider, cx } from "./ui";
import { SaleDialog } from "./SaleDialog";
import { PaymentDialog } from "./PaymentDialog";
import { StudentDialog } from "./StudentDialog";
import { ChargeDialog } from "./ChargeDialog";
import { CommandPalette } from "./CommandPalette";
import { money } from "@/lib/format";

export interface AppData {
  summaries: StudentSummary[];
  products: Product[];
  settings: Settings;
}

interface AppActions {
  data: AppData;
  openSale: (studentId?: string) => void;
  openPayment: (studentId?: string, amount?: number) => void;
  openStudent: (studentId?: string | null) => void;
  openCharge: (studentId: string) => void;
  openSearch: () => void;
}

const Ctx = createContext<AppActions | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do AppShell");
  return c;
}

const NAV = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/cobrancas", label: "Cobranças", icon: BellRing },
  { href: "/historico", label: "Histórico", icon: ReceiptText },
  { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { href: "/configuracoes", label: "Ajustes", icon: SettingsIcon },
];

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
}

export function AppShell({ data, children }: { data: AppData; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sale, setSale] = useState<{ open: boolean; studentId?: string }>({ open: false });
  const [payment, setPayment] = useState<{ open: boolean; studentId?: string; amount?: number }>({ open: false });
  const [student, setStudent] = useState<{ open: boolean; studentId?: string | null }>({ open: false });
  const [charge, setCharge] = useState<{ open: boolean; studentId?: string }>({ open: false });
  const [search, setSearch] = useState(false);

  const anyOpen = sale.open || payment.open || student.open || charge.open || search;

  const actions = useMemo<AppActions>(
    () => ({
      data,
      openSale: (studentId) => setSale({ open: true, studentId }),
      openPayment: (studentId, amount) => setPayment({ open: true, studentId, amount }),
      openStudent: (studentId) => setStudent({ open: true, studentId: studentId ?? null }),
      openCharge: (studentId) => setCharge({ open: true, studentId }),
      openSearch: () => setSearch(true),
    }),
    [data],
  );

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
        return;
      }
      if (anyOpen || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "f" || k === "n") {
        e.preventDefault();
        setSale({ open: true });
      } else if (k === "r") {
        e.preventDefault();
        setPayment({ open: true });
      } else if (k === "/") {
        e.preventDefault();
        setSearch(true);
      }
    },
    [anyOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const overdue = data.summaries.filter((s) => s.status === "atrasado" && !s.student.archived).length;
  const receivable = data.summaries.reduce((a, s) => a + Math.max(0, s.balance), 0);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Ctx.Provider value={actions}>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200/80 bg-stone-50/80 backdrop-blur-xl md:flex dark:border-stone-800 dark:bg-stone-900/60">
              <div className="flex items-center gap-3 px-5 pt-6 pb-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-md shadow-brand-500/30">
                  <NotebookPen size={20} />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[17px] leading-tight font-bold tracking-tight">Caderninho</div>
                  <div className="truncate text-xs text-stone-500 dark:text-stone-400">{data.settings.shopName}</div>
                </div>
              </div>

              <div className="space-y-2 px-3">
                <button className="btn btn-primary w-full justify-between" onClick={() => setSale({ open: true })}>
                  <span className="flex items-center gap-2">
                    <Plus size={18} strokeWidth={2.5} /> Anotar fiado
                  </span>
                  <span className="kbd">F</span>
                </button>
                <button className="btn btn-secondary w-full justify-between" onClick={() => setPayment({ open: true })}>
                  <span className="flex items-center gap-2">
                    <HandCoins size={18} /> Receber pagamento
                  </span>
                  <span className="kbd">R</span>
                </button>
                <button
                  className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-stone-500 transition hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800"
                  onClick={() => setSearch(true)}
                >
                  <Search size={16} /> Buscar aluno…
                  <span className="kbd ml-auto">⌘K</span>
                </button>
              </div>

              <nav className="mt-4 flex-1 space-y-0.5 px-3">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cx(
                      "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition",
                      isActive(href)
                        ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80 dark:bg-stone-800 dark:text-white dark:ring-stone-700"
                        : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-white",
                    )}
                  >
                    <Icon size={18} className={isActive(href) ? "text-brand-500" : ""} />
                    {label}
                    {href === "/cobrancas" && overdue > 0 && (
                      <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{overdue}</span>
                    )}
                  </Link>
                ))}
              </nav>

              <div className="m-3 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 p-4 text-white dark:from-stone-800 dark:to-stone-900">
                <div className="text-xs font-medium text-stone-400">Total a receber</div>
                <div className="tabular mt-0.5 font-display text-2xl font-bold">{money(receivable)}</div>
                <Link href="/cobrancas" className="mt-2 inline-block text-xs font-semibold text-brand-300 hover:text-brand-200">
                  Ver quem cobrar →
                </Link>
              </div>
            </aside>

            {/* Mobile / janela estreita */}
            <div className="min-w-0 flex-1">
              <header className="no-print sticky top-0 z-30 flex items-center gap-2 overflow-x-auto border-b border-stone-200 bg-stone-50/90 px-3 py-2 backdrop-blur md:hidden dark:border-stone-800 dark:bg-stone-900/90">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cx("chip shrink-0", isActive(href) && "!border-brand-500 !bg-brand-500 !text-white")}
                  >
                    <Icon size={14} /> {label}
                  </Link>
                ))}
              </header>
              <main className="print-full mx-auto w-full max-w-6xl px-5 py-8 md:px-10">{children}</main>
              <div className="no-print fixed right-5 bottom-5 flex gap-2 md:hidden">
                <button className="btn btn-secondary btn-lg shadow-xl" onClick={() => setPayment({ open: true })}>
                  <HandCoins size={18} />
                </button>
                <button className="btn btn-primary btn-lg shadow-xl" onClick={() => setSale({ open: true })}>
                  <Plus size={18} /> Fiado
                </button>
              </div>
            </div>
          </div>

          <SaleDialog
            open={sale.open}
            initialStudentId={sale.studentId}
            onClose={() => setSale({ open: false })}
          />
          <PaymentDialog
            open={payment.open}
            initialStudentId={payment.studentId}
            initialAmount={payment.amount}
            onClose={() => setPayment({ open: false })}
          />
          <StudentDialog
            open={student.open}
            studentId={student.studentId ?? null}
            onClose={() => setStudent({ open: false })}
            onCreated={(id) => router.push(`/alunos/${id}`)}
          />
          <ChargeDialog open={charge.open} studentId={charge.studentId} onClose={() => setCharge({ open: false })} />
          <CommandPalette open={search} onClose={() => setSearch(false)} />
        </Ctx.Provider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
