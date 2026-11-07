"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, Plus, HandCoins, MessageCircle, Users, Ban, Archive } from "lucide-react";
import { useApp } from "@/components/AppShell";
import { Avatar, BalanceText, EmptyState, PageHeader, StatusBadge, cx } from "@/components/ui";
import { money, normalize, relativeDays } from "@/lib/format";

type Filter = "todos" | "devendo" | "atrasado" | "em_dia" | "bloqueados" | "arquivados";
type Sort = "nome" | "saldo" | "atraso" | "recente";

export function StudentsView() {
  const { data, openStudent, openSale, openPayment, openCharge } = useApp();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("todas");
  const [filter, setFilter] = useState<Filter>("todos");
  const [sort, setSort] = useState<Sort>("nome");

  const grades = useMemo(
    () => Array.from(new Set(data.summaries.map((s) => s.student.grade).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [data.summaries],
  );

  const list = useMemo(() => {
    const nq = normalize(q);
    let l = data.summaries.filter((s) => (filter === "arquivados" ? s.student.archived : !s.student.archived));
    if (nq) l = l.filter((s) => normalize(`${s.student.name} ${s.student.guardianName} ${s.student.grade}`).includes(nq));
    if (grade !== "todas") l = l.filter((s) => s.student.grade === grade);
    if (filter === "devendo") l = l.filter((s) => s.balance > 0);
    if (filter === "atrasado") l = l.filter((s) => s.status === "atrasado");
    if (filter === "em_dia") l = l.filter((s) => s.balance <= 0);
    if (filter === "bloqueados") l = l.filter((s) => s.student.blocked);
    const byName = (a: (typeof l)[0], b: (typeof l)[0]) => a.student.name.localeCompare(b.student.name, "pt-BR");
    return [...l].sort((a, b) => {
      if (sort === "saldo") return b.balance - a.balance || byName(a, b);
      if (sort === "atraso") return b.daysOpen - a.daysOpen || byName(a, b);
      if (sort === "recente") return (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "") || byName(a, b);
      return byName(a, b);
    });
  }, [data.summaries, q, grade, filter, sort]);

  const total = list.reduce((a, s) => a + Math.max(0, s.balance), 0);
  const active = data.summaries.filter((s) => !s.student.archived);

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "todos", label: "Todos", count: active.length },
    { id: "devendo", label: "Devendo", count: active.filter((s) => s.balance > 0).length },
    { id: "atrasado", label: "Atrasados", count: active.filter((s) => s.status === "atrasado").length },
    { id: "em_dia", label: "Em dia", count: active.filter((s) => s.balance <= 0).length },
    { id: "bloqueados", label: "Bloqueados", count: active.filter((s) => s.student.blocked).length },
    { id: "arquivados", label: "Arquivados", count: data.summaries.filter((s) => s.student.archived).length },
  ];

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Alunos"
        subtitle={`${active.length} alunos cadastrados`}
        actions={
          <button className="btn btn-primary" onClick={() => openStudent(null)}>
            <UserPlus size={16} /> Novo aluno
          </button>
        }
      />

      <div className="card mb-4 space-y-3 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-1">
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400" />
            <input className="input pl-10" placeholder="Buscar por aluno, responsável ou turma…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="todas">Todas as turmas</option>
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="nome">Ordenar: nome</option>
            <option value="saldo">Ordenar: maior dívida</option>
            <option value="atraso">Ordenar: mais atrasado</option>
            <option value="recente">Ordenar: comprou por último</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button key={f.id} className="chip" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.id === "bloqueados" && <Ban size={12} />}
              {f.id === "arquivados" && <Archive size={12} />}
              {f.label}
              {f.count !== undefined && <span className="opacity-60">{f.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={data.summaries.length ? "Nenhum aluno com esses filtros" : "Nenhum aluno cadastrado"}
            text={data.summaries.length ? "Tente limpar a busca ou trocar o filtro." : "Cadastre o primeiro aluno para começar a anotar."}
            action={
              !data.summaries.length && (
                <button className="btn btn-primary" onClick={() => openStudent(null)}>
                  <UserPlus size={16} /> Cadastrar aluno
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_120px_140px_130px_150px] gap-4 border-b border-stone-100 bg-stone-50/60 px-5 py-2.5 text-xs font-semibold tracking-wide text-stone-500 uppercase lg:grid dark:border-stone-800 dark:bg-stone-950/30">
              <span>Aluno</span>
              <span>Situação</span>
              <span>Última compra</span>
              <span className="text-right">Saldo</span>
              <span />
            </div>
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {list.map((s) => {
                const usage = s.limit > 0 ? Math.min(100, (Math.max(0, s.balance) / s.limit) * 100) : 0;
                return (
                  <li
                    key={s.student.id}
                    className="group grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 transition hover:bg-stone-50/80 lg:grid-cols-[1fr_120px_140px_130px_150px] dark:hover:bg-stone-800/30"
                  >
                    <Link href={`/alunos/${s.student.id}`} className="flex min-w-0 items-center gap-3">
                      <Avatar name={s.student.name} muted={s.student.blocked || s.student.archived} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 truncate font-semibold">
                          {s.student.name}
                          {s.student.blocked && <Ban size={13} className="shrink-0 text-stone-400" />}
                        </div>
                        <div className="truncate text-xs text-stone-500 dark:text-stone-400">
                          {[s.student.grade, s.student.guardianName].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </Link>
                    <div className="hidden lg:block">
                      <StatusBadge status={s.status} days={s.status === "atrasado" ? s.daysOpen : undefined} />
                    </div>
                    <div className="hidden text-sm text-stone-500 lg:block">{relativeDays(s.lastPurchaseAt)}</div>
                    <div className="text-right">
                      <BalanceText cents={s.balance} />
                      {s.limit > 0 && s.balance > 0 && (
                        <div className="mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" title={`Limite ${money(s.limit)}`}>
                          <div
                            className={cx("h-full rounded-full", usage >= 100 ? "bg-rose-500" : usage > 70 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${usage}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1 lg:col-span-1 lg:opacity-60 lg:group-hover:opacity-100">
                      <button className="btn btn-ghost btn-sm" title="Anotar fiado" onClick={() => openSale(s.student.id)}>
                        <Plus size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Receber" onClick={() => openPayment(s.student.id)}>
                        <HandCoins size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Cobrar no WhatsApp"
                        disabled={s.balance <= 0}
                        onClick={() => openCharge(s.student.id)}
                      >
                        <MessageCircle size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-between border-t border-stone-100 bg-stone-50/60 px-5 py-3 text-sm dark:border-stone-800 dark:bg-stone-950/30">
              <span className="text-stone-500">{list.length} alunos na lista</span>
              <span>
                Em aberto: <b className="tabular">{money(total)}</b>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
