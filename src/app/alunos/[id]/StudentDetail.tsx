"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  HandCoins,
  MessageCircle,
  Pencil,
  Phone,
  Ban,
  Archive,
  Trash2,
  Printer,
  ShoppingBasket,
  StickyNote,
  MoreHorizontal,
  ArchiveRestore,
  CircleCheck,
  BellRing,
} from "lucide-react";
import { deleteStudent, deleteTransaction, setStudentFlags } from "@/app/actions";
import { useApp } from "@/components/AppShell";
import { Avatar, BalanceText, EmptyState, StatusBadge, cx, useConfirm, useToast } from "@/components/ui";
import { describeItems } from "@/lib/calc";
import { dateFull, dateShort, dayLabel, formatPhone, money, relativeDays, time } from "@/lib/format";
import { METHOD_LABEL, type ChargeLog, type Transaction } from "@/lib/types";

export function StudentDetail({
  studentId,
  transactions,
  charges,
}: {
  studentId: string;
  transactions: Transaction[];
  charges: ChargeLog[];
}) {
  const { data, openSale, openPayment, openCharge, openStudent } = useApp();
  const summary = data.summaries.find((s) => s.student.id === studentId);
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [, start] = useTransition();

  const groups = useMemo(() => {
    let running = 0;
    const withBalance = transactions.map((tx) => {
      running += tx.type === "compra" ? tx.amount : -tx.amount;
      return { tx, after: running };
    });
    const out: { label: string; key: string; rows: typeof withBalance }[] = [];
    for (const row of withBalance.reverse()) {
      const key = new Date(row.tx.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, label: dayLabel(row.tx.createdAt), rows: [row] });
    }
    return out;
  }, [transactions]);

  if (!summary) return null;
  const s = summary.student;
  const openIds = new Map(summary.openPurchases.map((o) => [o.tx.id, o.remaining]));
  const usage = summary.limit > 0 ? Math.min(100, (Math.max(0, summary.balance) / summary.limit) * 100) : 0;

  const removeTx = async (tx: Transaction) => {
    const ok = await confirm({
      title: tx.type === "compra" ? "Apagar este fiado?" : "Apagar este pagamento?",
      message: (
        <>
          {describeItems(tx)} — <b>{money(tx.amount)}</b> em {dateFull(tx.createdAt)}. O saldo do aluno será recalculado.
        </>
      ),
      confirmLabel: "Apagar",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await deleteTransaction(tx.id);
      toast({ kind: "info", text: "Lançamento apagado" });
    });
  };

  const toggle = (flag: "blocked" | "archived") =>
    start(async () => {
      setMenu(false);
      await setStudentFlags(s.id, { [flag]: !s[flag] });
      toast({
        kind: "success",
        text:
          flag === "blocked"
            ? s.blocked
              ? "Fiado liberado novamente"
              : "Fiado bloqueado para este aluno"
            : s.archived
              ? "Aluno reativado"
              : "Aluno arquivado",
      });
    });

  const remove = async () => {
    setMenu(false);
    const ok = await confirm({
      title: `Excluir ${s.name}?`,
      message: "Todo o histórico de fiados e pagamentos deste aluno será apagado para sempre. Se ele só saiu da escola, prefira arquivar.",
      confirmLabel: "Excluir definitivamente",
      danger: true,
      requireText: "EXCLUIR",
    });
    if (!ok) return;
    await deleteStudent(s.id);
    toast({ kind: "info", text: "Aluno excluído" });
    router.push("/alunos");
  };

  return (
    <div className="animate-slide-up space-y-6">
      <Link href="/alunos" className="no-print inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white">
        <ArrowLeft size={16} /> Alunos
      </Link>

      {/* Cabeçalho */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={s.name} size={72} muted={s.blocked || s.archived} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] leading-tight font-bold tracking-tight">{s.name}</h1>
              <StatusBadge status={summary.status} days={summary.status === "atrasado" ? summary.daysOpen : undefined} />
              {s.blocked && (
                <span className="badge bg-stone-900 text-white dark:bg-white dark:text-stone-900">
                  <Ban size={11} /> Fiado bloqueado
                </span>
              )}
              {s.archived && <span className="badge bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300">Arquivado</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
              <span>{s.grade || "Sem turma"}</span>
              {s.guardianName && <span>Resp.: {s.guardianName}</span>}
              {s.phone && (
                <a
                  href={`https://wa.me/${s.phone.replace(/\D/g, "").replace(/^(?!55)(\d{10,11})$/, "55$1")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-emerald-600"
                >
                  <Phone size={13} /> {formatPhone(s.phone)}
                </a>
              )}
            </div>
            {s.notes && (
              <div className="mt-3 inline-flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <StickyNote size={15} className="mt-0.5 shrink-0" /> {s.notes}
              </div>
            )}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => openSale(s.id)}>
              <Plus size={16} strokeWidth={2.5} /> Fiado
            </button>
            <button className="btn btn-success" onClick={() => openPayment(s.id)}>
              <HandCoins size={16} /> Receber
            </button>
            {summary.balance > 0 && (
              <button className="btn btn-whatsapp" onClick={() => openCharge(s.id)}>
                <MessageCircle size={16} /> Cobrar
              </button>
            )}
            <div className="relative">
              <button className="btn btn-secondary w-10 p-0" onClick={() => setMenu((m) => !m)} aria-label="Mais opções">
                <MoreHorizontal size={18} />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 animate-pop overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                    <MenuItem icon={<Pencil size={15} />} onClick={() => (setMenu(false), openStudent(s.id))}>
                      Editar dados
                    </MenuItem>
                    <MenuItem icon={<Printer size={15} />} onClick={() => (setMenu(false), setTimeout(() => window.print(), 50))}>
                      Imprimir extrato
                    </MenuItem>
                    <MenuItem icon={s.blocked ? <CircleCheck size={15} /> : <Ban size={15} />} onClick={() => toggle("blocked")}>
                      {s.blocked ? "Liberar fiado" : "Bloquear fiado"}
                    </MenuItem>
                    <MenuItem icon={s.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />} onClick={() => toggle("archived")}>
                      {s.archived ? "Reativar aluno" : "Arquivar (saiu da escola)"}
                    </MenuItem>
                    <div className="my-1 h-px bg-stone-100 dark:bg-stone-800" />
                    <MenuItem icon={<Trash2 size={15} />} onClick={remove} danger>
                      Excluir aluno
                    </MenuItem>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={summary.balance < 0 ? "Crédito" : "Saldo devedor"}>
            <BalanceText cents={summary.balance} className="text-2xl" />
          </Stat>
          <Stat label="Em aberto desde">
            <span className="text-lg font-bold">{summary.oldestOpenDate ? dateFull(summary.oldestOpenDate) : "—"}</span>
            {summary.oldestOpenDate && <div className="text-xs text-stone-500">{summary.daysOpen} dias</div>}
          </Stat>
          <Stat label="Limite de fiado">
            {summary.limit > 0 ? (
              <>
                <span className="tabular text-lg font-bold">{money(summary.limit)}</span>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                  <div
                    className={cx("h-full rounded-full", usage >= 100 ? "bg-rose-500" : usage > 70 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${usage}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-lg font-bold">Sem limite</span>
            )}
          </Stat>
          <Stat label="Última cobrança">
            <span className="text-lg font-bold">{relativeDays(s.lastChargedAt)}</span>
            <div className="text-xs text-stone-500">{charges.length} cobranças no total</div>
          </Stat>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Extrato */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-display text-base font-bold">Extrato</h2>
            <div className="text-xs text-stone-500">
              Comprou {money(summary.totalBought)} · pagou {money(summary.totalPaid)}
            </div>
          </div>
          {groups.length === 0 ? (
            <EmptyState icon={<ShoppingBasket />} title="Nada anotado ainda" text="Os fiados e pagamentos deste aluno aparecem aqui." />
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <div className="sticky top-0 bg-stone-50/95 px-5 py-1.5 text-xs font-semibold text-stone-500 backdrop-blur dark:bg-stone-950/80">
                  {g.label}
                </div>
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {g.rows.map(({ tx, after }) => {
                    const remaining = openIds.get(tx.id);
                    return (
                      <li key={tx.id} className="group flex items-center gap-3 px-5 py-3">
                        <span
                          className={cx(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                            tx.type === "compra"
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10"
                              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
                          )}
                        >
                          {tx.type === "compra" ? <ShoppingBasket size={16} /> : <HandCoins size={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {tx.type === "compra" ? describeItems(tx) : `Pagamento · ${METHOD_LABEL[tx.method ?? "outro"]}`}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                            <span>{time(tx.createdAt)}</span>
                            {tx.note && tx.type === "pagamento" && <span>· {tx.note}</span>}
                            {tx.note && tx.type === "compra" && tx.items.length > 0 && <span>· {tx.note}</span>}
                            {tx.type === "compra" && remaining === undefined && <span className="text-emerald-600">· pago ✓</span>}
                            {remaining !== undefined && remaining < tx.amount && (
                              <span className="text-amber-600">· falta {money(remaining)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cx("tabular text-sm font-bold", tx.type === "pagamento" && "text-emerald-600 dark:text-emerald-400")}>
                            {tx.type === "compra" ? "+ " : "− "}
                            {money(tx.amount)}
                          </div>
                          <div className="tabular text-[11px] text-stone-400">saldo {money(after)}</div>
                        </div>
                        <button
                          className="no-print btn btn-ghost h-8 w-8 rounded-lg p-0 opacity-0 transition group-hover:opacity-100 hover:!text-rose-600"
                          title="Apagar lançamento"
                          onClick={() => removeTx(tx)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          {/* Em aberto */}
          <div className="card p-5">
            <h2 className="mb-3 font-display text-base font-bold">O que está em aberto</h2>
            {summary.openPurchases.length === 0 ? (
              <p className="text-sm text-stone-500">Tudo pago! ✨</p>
            ) : (
              <ul className="space-y-2">
                {summary.openPurchases.map((o) => (
                  <li key={o.tx.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{describeItems(o.tx)}</div>
                      <div className="text-xs text-stone-500">{dateShort(o.tx.createdAt)}</div>
                    </div>
                    <span className="tabular shrink-0 font-semibold">{money(o.remaining)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cobranças */}
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
              <BellRing size={16} className="text-stone-400" /> Cobranças feitas
            </h2>
            {charges.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhuma cobrança registrada.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {charges.slice(0, 10).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>
                      {dateFull(c.createdAt)} · {c.channel === "whatsapp" ? "WhatsApp" : c.channel === "pessoalmente" ? "Pessoalmente" : "Outro"}
                    </span>
                    <span className="tabular text-stone-500">{money(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
      <div className="mb-1 text-xs font-medium text-stone-500 dark:text-stone-400">{label}</div>
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition",
        danger ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" : "hover:bg-stone-100 dark:hover:bg-stone-800",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
