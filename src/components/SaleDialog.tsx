"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Minus, Plus, ShoppingBag, AlertTriangle, Ban, CalendarDays, StickyNote, Trash2 } from "lucide-react";
import { addPurchase, deleteTransaction, saveStudent } from "@/app/actions";
import { money, toDateInput } from "@/lib/format";
import type { Product, StudentSummary, TxItem } from "@/lib/types";
import { useApp } from "./AppShell";
import { StudentPicker } from "./StudentPicker";
import { Avatar, BalanceText, Modal, MoneyInput, cx, useToast } from "./ui";

export function SaleDialog(props: { open: boolean; initialStudentId?: string; onClose: () => void }) {
  if (!props.open) return null;
  return <SaleDialogInner {...props} />;
}

function SaleDialogInner({ initialStudentId, onClose }: { initialStudentId?: string; onClose: () => void }) {
  const { data } = useApp();
  const toast = useToast();
  const [studentId, setStudentId] = useState<string | undefined>(initialStudentId);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [showDate, setShowDate] = useState(false);
  const [category, setCategory] = useState<string>("Todos");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const summary = data.summaries.find((s) => s.student.id === studentId);
  const products = data.products.filter((p) => p.active);
  const categories = useMemo(() => ["Todos", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visible = category === "Todos" ? products : products.filter((p) => p.category === category);

  const items: TxItem[] = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([pid, qty]) => {
      const p = data.products.find((x) => x.id === pid)!;
      return { productId: p.id, name: p.name, unitPrice: p.price, qty };
    });
  const total = items.reduce((a, i) => a + i.qty * i.unitPrice, 0) + extra;
  const newBalance = (summary?.balance ?? 0) + total;
  const willExceed = summary && summary.limit > 0 && newBalance > summary.limit;

  const add = (p: Product, d = 1) =>
    setCart((c) => {
      const q = Math.max(0, (c[p.id] ?? 0) + d);
      return { ...c, [p.id]: q };
    });

  const submit = () => {
    if (!summary || total <= 0 || pending) return;
    setError("");
    start(async () => {
      try {
        const res = await addPurchase({ studentId: summary.student.id, items, extraAmount: extra, note, date });
        toast({
          kind: "success",
          text: (
            <>
              <b>{money(total)}</b> anotado para {summary.student.name.split(" ")[0]}
            </>
          ),
          action: {
            label: "Desfazer",
            onClick: async () => {
              await deleteTransaction(res.id);
              toast({ kind: "info", text: "Lançamento desfeito" });
            },
          },
        });
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const quickCreate = (name: string) => {
    start(async () => {
      const { id } = await saveStudent(null, { name, grade: "", guardianName: "", phone: "", notes: "", creditLimit: null });
      setStudentId(id);
      toast({ kind: "success", text: `${name} cadastrado(a). Complete os dados depois na ficha.` });
    });
  };

  if (!summary) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Anotar fiado"
        subtitle="Para quem é o lanche?"
        icon={<IconBubble />}
      >
        <StudentPicker summaries={data.summaries} onPick={(s) => setStudentId(s.student.id)} onCreate={quickCreate} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Anotar fiado"
      icon={<IconBubble />}
      subtitle={
        <span className="flex items-center gap-2">
          Toque nos produtos para adicionar · <span className="kbd">⌘</span>
          <span className="kbd">Enter</span> salva
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <div className="text-xs font-medium text-stone-500">Total deste lanche</div>
            <div className="tabular font-display text-2xl font-bold">{money(total)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-stone-500">Saldo depois</div>
            <BalanceText cents={newBalance} className="text-lg" />
          </div>
          <button className="btn btn-secondary btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-lg min-w-44" disabled={total <= 0 || pending} onClick={submit}>
            {pending ? "Salvando…" : "Anotar no caderno"}
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Produtos */}
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const q = cart[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    add(p, -1);
                  }}
                  className={cx(
                    "group relative flex flex-col items-start rounded-2xl border p-3 text-left transition active:scale-[0.97]",
                    q > 0
                      ? "border-brand-400 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10"
                      : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm dark:border-stone-700 dark:bg-stone-800/60",
                  )}
                >
                  <span className="text-3xl leading-none">{p.emoji}</span>
                  <span className="mt-2 line-clamp-2 text-[13px] leading-tight font-semibold">{p.name}</span>
                  <span className="tabular mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">{money(p.price)}</span>
                  {q > 0 && (
                    <span className="absolute top-2 right-2 grid h-6 min-w-6 animate-pop place-items-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                      {q}
                    </span>
                  )}
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700">
                Nenhum produto no cardápio. Use o valor avulso ao lado ou cadastre produtos em <b>Cardápio</b>.
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Valor avulso (opcional)</label>
              <MoneyInput value={extra} onChange={setExtra} onEnter={submit} />
            </div>
            <div>
              <label className="label">Descrição / observação</label>
              <input
                className="input"
                placeholder={extra ? "Ex.: Lanche da festa junina" : "Opcional"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            {showDate ? (
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-stone-400" />
                <input type="date" className="input h-9 w-auto" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} />
                <span className="text-xs text-stone-500">Útil para passar anotações do papel para o sistema.</span>
              </div>
            ) : (
              <button className="text-[13px] font-medium text-stone-500 hover:text-brand-600" onClick={() => setShowDate(true)}>
                <CalendarDays size={14} className="mr-1 inline" /> Foi em outro dia?
              </button>
            )}
          </div>
        </div>

        {/* Aluno + carrinho */}
        <div className="space-y-3">
          <StudentCard summary={summary} onChange={() => setStudentId(undefined)} />
          {summary.student.notes && (
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <StickyNote size={16} className="mt-0.5 shrink-0" />
              <span>{summary.student.notes}</span>
            </div>
          )}
          {summary.student.blocked && (
            <div className="flex gap-2 rounded-xl bg-stone-900 p-3 text-sm text-white dark:bg-stone-700">
              <Ban size={16} className="mt-0.5 shrink-0" />
              <span>
                <b>Fiado bloqueado</b> para este aluno. Você ainda pode anotar, se combinou com o responsável.
              </span>
            </div>
          )}
          {willExceed && (
            <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Vai passar do limite de <b>{money(summary.limit)}</b>.
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-2.5 text-sm font-semibold dark:border-stone-800">
              <ShoppingBag size={16} className="text-brand-500" /> Itens
              {items.length > 0 && (
                <button className="ml-auto text-xs font-medium text-stone-400 hover:text-rose-500" onClick={() => setCart({})}>
                  <Trash2 size={13} className="mr-1 inline" />
                  limpar
                </button>
              )}
            </div>
            <div className="max-h-64 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
              {items.length === 0 && extra === 0 && (
                <div className="px-4 py-6 text-center text-sm text-stone-400">Nenhum item ainda</div>
              )}
              {items.map((it) => {
                const p = data.products.find((x) => x.id === it.productId)!;
                return (
                  <div key={it.productId} className="flex items-center gap-2 px-4 py-2">
                    <span className="text-lg">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="tabular text-xs text-stone-500">{money(it.unitPrice * it.qty)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="btn btn-secondary h-7 w-7 rounded-lg p-0" onClick={() => add(p, -1)}>
                        <Minus size={14} />
                      </button>
                      <span className="tabular w-6 text-center text-sm font-bold">{it.qty}</span>
                      <button className="btn btn-secondary h-7 w-7 rounded-lg p-0" onClick={() => add(p, 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {extra > 0 && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-lg">✏️</span>
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">{note || "Valor avulso"}</div>
                  <span className="tabular text-sm">{money(extra)}</span>
                </div>
              )}
            </div>
          </div>
          {error && <div className="text-sm font-medium text-rose-600">{error}</div>}
        </div>
      </div>
    </Modal>
  );
}

export function StudentCard({ summary, onChange }: { summary: StudentSummary; onChange?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/60">
      <Avatar name={summary.student.name} size={44} muted={summary.student.blocked} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{summary.student.name}</div>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {summary.student.grade || "Sem turma"} · saldo <BalanceText cents={summary.balance} />
        </div>
      </div>
      {onChange && (
        <button className="btn btn-ghost btn-sm" onClick={onChange}>
          Trocar
        </button>
      )}
    </div>
  );
}

function IconBubble() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
      <Plus size={20} strokeWidth={2.5} />
    </div>
  );
}
