"use client";

import { useState, useTransition } from "react";
import { HandCoins, Banknote, QrCode, CreditCard, Gift, CircleEllipsis, CalendarDays } from "lucide-react";
import { addPayment, deleteTransaction } from "@/app/actions";
import { money, toDateInput } from "@/lib/format";
import { METHOD_LABEL, type PaymentMethod } from "@/lib/types";
import { useApp } from "./AppShell";
import { StudentPicker } from "./StudentPicker";
import { StudentCard } from "./SaleDialog";
import { BalanceText, Modal, MoneyInput, cx, useToast } from "./ui";

const METHODS: { id: PaymentMethod; icon: typeof Banknote }[] = [
  { id: "dinheiro", icon: Banknote },
  { id: "pix", icon: QrCode },
  { id: "cartao", icon: CreditCard },
  { id: "desconto", icon: Gift },
  { id: "outro", icon: CircleEllipsis },
];

export function PaymentDialog(props: {
  open: boolean;
  initialStudentId?: string;
  initialAmount?: number;
  onClose: () => void;
}) {
  if (!props.open) return null;
  return <Inner {...props} />;
}

function Inner({
  initialStudentId,
  initialAmount,
  onClose,
}: {
  initialStudentId?: string;
  initialAmount?: number;
  onClose: () => void;
}) {
  const { data } = useApp();
  const toast = useToast();
  const [studentId, setStudentId] = useState(initialStudentId);
  const summary = data.summaries.find((s) => s.student.id === studentId);
  const [amount, setAmount] = useState(initialAmount ?? Math.max(0, summary?.balance ?? 0));
  const [method, setMethod] = useState<PaymentMethod>("dinheiro");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [showDate, setShowDate] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const icon = (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
      <HandCoins size={20} />
    </div>
  );

  if (!summary) {
    return (
      <Modal open onClose={onClose} title="Receber pagamento" subtitle="Quem está pagando?" icon={icon}>
        <StudentPicker
          sortDebtorsFirst
          summaries={data.summaries}
          onPick={(s) => {
            setStudentId(s.student.id);
            setAmount(Math.max(0, s.balance));
          }}
        />
      </Modal>
    );
  }

  const after = summary.balance - amount;
  const submit = () => {
    if (amount <= 0 || pending) return;
    setError("");
    start(async () => {
      try {
        const res = await addPayment({ studentId: summary.student.id, amount, method, note, date });
        toast({
          kind: "success",
          text: (
            <>
              Recebido <b>{money(amount)}</b> de {summary.student.name.split(" ")[0]}
              {after <= 0 ? " — quitado! 🎉" : ""}
            </>
          ),
          action: {
            label: "Desfazer",
            onClick: async () => {
              await deleteTransaction(res.id);
              toast({ kind: "info", text: "Pagamento desfeito" });
            },
          },
        });
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const presets = [
    summary.balance > 0 && { label: `Tudo (${money(summary.balance)})`, v: summary.balance },
    summary.balance > 1000 && { label: "Metade", v: Math.round(summary.balance / 2) },
    { label: "R$ 10", v: 1000 },
    { label: "R$ 20", v: 2000 },
    { label: "R$ 50", v: 5000 },
  ].filter(Boolean) as { label: string; v: number }[];

  return (
    <Modal
      open
      onClose={onClose}
      title="Receber pagamento"
      icon={icon}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-medium text-stone-500">Saldo depois</div>
            <BalanceText cents={after} className="text-lg" />
            {after < 0 && <span className="ml-2 text-xs text-sky-600">fica de crédito para próximos lanches</span>}
          </div>
          <button className="btn btn-secondary btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-success btn-lg" disabled={amount <= 0 || pending} onClick={submit}>
            {pending ? "Salvando…" : `Receber ${money(amount)}`}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <StudentCard summary={summary} onChange={initialStudentId ? undefined : () => setStudentId(undefined)} />

        <div>
          <label className="label">Valor recebido</label>
          <MoneyInput value={amount} onChange={setAmount} autoFocus onEnter={submit} className="[&_input]:h-14 [&_input]:text-2xl" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p.label} className="chip" data-active={amount === p.v} onClick={() => setAmount(p.v)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Forma de pagamento</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {METHODS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition",
                  method === id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:text-stone-300",
                )}
              >
                <Icon size={20} />
                {METHOD_LABEL[id]}
              </button>
            ))}
          </div>
          {method === "desconto" && (
            <p className="hint">Use para abater/perdoar parte da dívida. Não conta como dinheiro recebido nos relatórios.</p>
          )}
        </div>

        <div>
          <label className="label">Observação</label>
          <input className="input" placeholder="Opcional — ex.: pago pela avó" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {showDate ? (
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-stone-400" />
            <input type="date" className="input h-9 w-auto" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} />
          </div>
        ) : (
          <button className="text-[13px] font-medium text-stone-500 hover:text-emerald-600" onClick={() => setShowDate(true)}>
            <CalendarDays size={14} className="mr-1 inline" /> Recebeu em outro dia?
          </button>
        )}
        {error && <div className="text-sm font-medium text-rose-600">{error}</div>}
      </div>
    </Modal>
  );
}
