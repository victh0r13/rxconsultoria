"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Download, ShoppingBasket, HandCoins, Trash2, ReceiptText } from "lucide-react";
import { deleteTransaction } from "@/app/actions";
import { EmptyState, PageHeader, cx, useConfirm, useToast } from "@/components/ui";
import { describeItems } from "@/lib/calc";
import { dateFull, dayLabel, money, normalize, startOfDay, time } from "@/lib/format";
import { METHOD_LABEL, type Transaction } from "@/lib/types";

type Period = "hoje" | "7d" | "mes" | "mes_passado" | "tudo";
type Kind = "todos" | "compra" | "pagamento";

function range(p: Period): [string | null, string | null] {
  const now = new Date();
  if (p === "hoje") return [startOfDay(now).toISOString(), null];
  if (p === "7d") return [startOfDay(new Date(now.getTime() - 6 * 86_400_000)).toISOString(), null];
  if (p === "mes") return [new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), null];
  if (p === "mes_passado")
    return [new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), new Date(now.getFullYear(), now.getMonth(), 1).toISOString()];
  return [null, null];
}

export function HistoryView({
  transactions,
  names,
}: {
  transactions: Transaction[];
  names: Record<string, { name: string; grade: string }>;
}) {
  const [period, setPeriod] = useState<Period>("mes");
  const [kind, setKind] = useState<Kind>("todos");
  const [q, setQ] = useState("");
  const confirm = useConfirm();
  const toast = useToast();
  const [, start] = useTransition();

  const [from, to] = range(period);
  const list = useMemo(() => {
    const nq = normalize(q);
    return transactions.filter((t) => {
      if (from && t.createdAt < from) return false;
      if (to && t.createdAt >= to) return false;
      if (kind !== "todos" && t.type !== kind) return false;
      if (nq) {
        const n = names[t.studentId];
        if (!normalize(`${n?.name ?? ""} ${n?.grade ?? ""} ${describeItems(t)} ${t.note}`).includes(nq)) return false;
      }
      return true;
    });
  }, [transactions, from, to, kind, q, names]);

  const sold = list.filter((t) => t.type === "compra").reduce((a, t) => a + t.amount, 0);
  const received = list.filter((t) => t.type === "pagamento" && t.method !== "desconto").reduce((a, t) => a + t.amount, 0);
  const discounts = list.filter((t) => t.method === "desconto").reduce((a, t) => a + t.amount, 0);

  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: Transaction[] }[] = [];
    for (const t of list.slice(0, 500)) {
      const key = new Date(t.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last?.key === key) last.rows.push(t);
      else out.push({ key, label: dayLabel(t.createdAt), rows: [t] });
    }
    return out;
  }, [list]);

  const exportUrl = `/api/export?tipo=movimentos${from ? `&de=${encodeURIComponent(from)}` : ""}${to ? `&ate=${encodeURIComponent(to)}` : ""}`;

  const remove = async (t: Transaction) => {
    const ok = await confirm({
      title: "Apagar lançamento?",
      message: (
        <>
          {names[t.studentId]?.name}: {describeItems(t)} — <b>{money(t.amount)}</b> em {dateFull(t.createdAt)}.
        </>
      ),
      confirmLabel: "Apagar",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await deleteTransaction(t.id);
      toast({ kind: "info", text: "Lançamento apagado" });
    });
  };

  const periods: [Period, string][] = [
    ["hoje", "Hoje"],
    ["7d", "7 dias"],
    ["mes", "Este mês"],
    ["mes_passado", "Mês passado"],
    ["tudo", "Tudo"],
  ];

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Histórico"
        subtitle="Todos os fiados e pagamentos anotados."
        actions={
          <>
            <a className="btn btn-secondary" href="/api/export?tipo=saldos">
              <Download size={16} /> Saldos (planilha)
            </a>
            <a className="btn btn-secondary" href={exportUrl}>
              <Download size={16} /> Movimentos (planilha)
            </a>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-[13px] font-medium text-stone-500">Fiado no período</div>
          <div className="tabular mt-1 font-display text-2xl font-bold">{money(sold)}</div>
        </div>
        <div className="card p-5">
          <div className="text-[13px] font-medium text-stone-500">Recebido no período</div>
          <div className="tabular mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{money(received)}</div>
        </div>
        <div className="card p-5">
          <div className="text-[13px] font-medium text-stone-500">Descontos concedidos</div>
          <div className="tabular mt-1 font-display text-2xl font-bold text-stone-500">{money(discounts)}</div>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {periods.map(([id, label]) => (
            <button key={id} className="chip" data-active={period === id} onClick={() => setPeriod(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-stone-200 dark:bg-stone-700" />
        <div className="flex gap-1.5">
          {(
            [
              ["todos", "Tudo"],
              ["compra", "Fiados"],
              ["pagamento", "Pagamentos"],
            ] as [Kind, string][]
          ).map(([id, label]) => (
            <button key={id} className="chip" data-active={kind === id} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
          <input className="input h-9 pl-9 text-sm" placeholder="Buscar aluno ou item…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {groups.length === 0 ? (
          <EmptyState icon={<ReceiptText />} title="Nada por aqui" text="Nenhum lançamento nesse período/filtro." />
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <div className="flex justify-between bg-stone-50/95 px-5 py-1.5 text-xs font-semibold text-stone-500 dark:bg-stone-950/60">
                <span>{g.label}</span>
                <span className="tabular">{g.rows.length} lançamentos</span>
              </div>
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {g.rows.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 px-5 py-3">
                    <span
                      className={cx(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                        t.type === "compra" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
                      )}
                    >
                      {t.type === "compra" ? <ShoppingBasket size={16} /> : <HandCoins size={16} />}
                    </span>
                    <Link href={`/alunos/${t.studentId}`} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold hover:underline">
                        {names[t.studentId]?.name ?? "Aluno removido"}
                        {names[t.studentId]?.grade && <span className="ml-2 text-xs font-normal text-stone-400">{names[t.studentId].grade}</span>}
                      </div>
                      <div className="truncate text-xs text-stone-500">
                        {time(t.createdAt)} · {t.type === "compra" ? describeItems(t) : `Pagamento · ${METHOD_LABEL[t.method ?? "outro"]}`}
                        {t.note && t.type === "pagamento" ? ` · ${t.note}` : ""}
                      </div>
                    </Link>
                    <div className={cx("tabular text-sm font-bold", t.type === "pagamento" && "text-emerald-600 dark:text-emerald-400")}>
                      {t.type === "pagamento" ? "+ " : ""}
                      {money(t.amount)}
                    </div>
                    <button
                      className="btn btn-ghost h-8 w-8 rounded-lg p-0 opacity-0 transition group-hover:opacity-100 hover:!text-rose-600"
                      title="Apagar"
                      onClick={() => remove(t)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        {list.length > 500 && <div className="p-4 text-center text-xs text-stone-500">Mostrando os 500 mais recentes. Use os filtros ou exporte a planilha.</div>}
      </div>
    </div>
  );
}
