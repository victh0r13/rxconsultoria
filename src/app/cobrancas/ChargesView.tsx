"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, HandCoins, Printer, Copy, Check, PartyPopper, CircleCheck } from "lucide-react";
import { useApp } from "@/components/AppShell";
import { Avatar, EmptyState, PageHeader, StatusBadge, cx } from "@/components/ui";
import { dateShort, daysBetween, money, relativeDays } from "@/lib/format";

type Filter = "todos" | "atrasados" | "sem_cobranca";

export function ChargesView() {
  const { data, openCharge, openPayment } = useApp();
  const [filter, setFilter] = useState<Filter>("todos");
  const [grade, setGrade] = useState("todas");
  const [copied, setCopied] = useState(false);
  const now = new Date();

  const debtors = useMemo(
    () => data.summaries.filter((s) => s.balance > 0 && !s.student.archived).sort((a, b) => b.daysOpen - a.daysOpen || b.balance - a.balance),
    [data.summaries],
  );
  const grades = Array.from(new Set(debtors.map((s) => s.student.grade).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true }),
  );

  const notChargedRecently = (iso: string | null) => !iso || daysBetween(new Date(iso), now) >= 7;

  let list = debtors;
  if (filter === "atrasados") list = list.filter((s) => s.status === "atrasado");
  if (filter === "sem_cobranca") list = list.filter((s) => notChargedRecently(s.student.lastChargedAt));
  if (grade !== "todas") list = list.filter((s) => s.student.grade === grade);

  const total = list.reduce((a, s) => a + s.balance, 0);
  const chargedToday = debtors.filter((s) => s.student.lastChargedAt && daysBetween(new Date(s.student.lastChargedAt), now) === 0).length;

  const copyList = async () => {
    const text =
      `Fiados em aberto — ${data.settings.shopName} (${now.toLocaleDateString("pt-BR")})\n\n` +
      list.map((s) => `• ${s.student.name}${s.student.grade ? ` (${s.student.grade})` : ""}: ${money(s.balance)}`).join("\n") +
      `\n\nTotal: ${money(total)}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Cobranças"
        subtitle="Quem está devendo, há quanto tempo, e a mensagem pronta para mandar."
        actions={
          <>
            <button className="btn btn-secondary" onClick={copyList} disabled={!list.length}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado!" : "Copiar lista"}
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()} disabled={!list.length}>
              <Printer size={16} /> Imprimir
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-[13px] font-medium text-stone-500">Total em aberto</div>
          <div className="tabular mt-1 font-display text-[26px] font-bold text-rose-600 dark:text-rose-400">
            {money(debtors.reduce((a, s) => a + s.balance, 0))}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-[13px] font-medium text-stone-500">Alunos devendo</div>
          <div className="mt-1 font-display text-[26px] font-bold">
            {debtors.length}{" "}
            <span className="text-sm font-medium text-stone-500">
              ({debtors.filter((s) => s.status === "atrasado").length} atrasados)
            </span>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-[13px] font-medium text-stone-500">Cobrados hoje</div>
          <div className="mt-1 font-display text-[26px] font-bold">
            {chargedToday} <span className="text-sm font-medium text-stone-500">de {debtors.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${debtors.length ? (chargedToday / debtors.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="no-print mb-4 flex flex-wrap items-center gap-1.5">
        <button className="chip" data-active={filter === "todos"} onClick={() => setFilter("todos")}>
          Todos que devem <span className="opacity-60">{debtors.length}</span>
        </button>
        <button className="chip" data-active={filter === "atrasados"} onClick={() => setFilter("atrasados")}>
          Atrasados (+{data.settings.overdueDays} dias)
        </button>
        <button className="chip" data-active={filter === "sem_cobranca"} onClick={() => setFilter("sem_cobranca")}>
          Não cobrados na última semana
        </button>
        {grades.length > 0 && (
          <select className="input ml-auto h-8 w-auto rounded-full text-[13px]" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="todas">Todas as turmas</option>
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<PartyPopper />}
            title={debtors.length ? "Ninguém nesse filtro" : "Ninguém devendo!"}
            text={debtors.length ? "Troque o filtro para ver os outros." : "Todos os fiados estão pagos. Aproveite o descanso ☕"}
          />
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {list.map((s) => {
              const today = s.student.lastChargedAt && daysBetween(new Date(s.student.lastChargedAt), now) === 0;
              return (
                <li key={s.student.id} className={cx("flex flex-wrap items-center gap-4 px-5 py-4", today && "bg-emerald-50/50 dark:bg-emerald-500/5")}>
                  <Link href={`/alunos/${s.student.id}`} className="flex min-w-56 flex-1 items-center gap-3">
                    <Avatar name={s.student.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 truncate font-semibold">
                        {s.student.name}
                        {today && <CircleCheck size={15} className="text-emerald-500" />}
                      </div>
                      <div className="truncate text-xs text-stone-500">
                        {[s.student.grade, s.student.guardianName].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                  </Link>
                  <div className="w-40 text-sm">
                    <StatusBadge status={s.status} days={s.daysOpen} />
                    <div className="mt-1 text-xs text-stone-500">
                      desde {s.oldestOpenDate ? dateShort(s.oldestOpenDate) : "—"} · {s.openPurchases.length}{" "}
                      {s.openPurchases.length === 1 ? "lanche" : "lanches"}
                    </div>
                  </div>
                  <div className="w-32 text-xs text-stone-500">
                    <div className="font-medium text-stone-700 dark:text-stone-300">Última cobrança</div>
                    {relativeDays(s.student.lastChargedAt)}
                  </div>
                  <div className="tabular w-28 text-right text-lg font-bold text-rose-600 dark:text-rose-400">{money(s.balance)}</div>
                  <div className="no-print flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => openPayment(s.student.id)}>
                      <HandCoins size={14} /> Recebi
                    </button>
                    <button className="btn btn-whatsapp btn-sm" onClick={() => openCharge(s.student.id)}>
                      <MessageCircle size={14} /> Cobrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > 0 && (
          <div className="flex justify-between border-t border-stone-100 bg-stone-50/60 px-5 py-3 text-sm dark:border-stone-800 dark:bg-stone-950/30">
            <span className="text-stone-500">{list.length} alunos</span>
            <span>
              Total: <b className="tabular">{money(total)}</b>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
