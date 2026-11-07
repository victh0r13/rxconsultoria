"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { avatarColor, initials, moneyPlain } from "@/lib/format";
import type { StudentStatus } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ---------------- Modal ----------------

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 animate-fade bg-stone-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className={cx(
          "relative flex max-h-[94vh] w-full animate-pop flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl dark:bg-stone-900 dark:ring-white/10",
          width,
        )}
      >
        <div className="flex items-start gap-3 border-b border-stone-100 px-6 pt-5 pb-4 dark:border-stone-800">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="btn btn-ghost -mr-2 h-9 w-9 rounded-full p-0" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-stone-100 bg-stone-50/70 px-6 py-4 dark:border-stone-800 dark:bg-stone-950/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Confirm ----------------

type ConfirmOpts = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
};

const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState("");
  const confirm = useCallback(
    (o: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setTyped("");
        setState({ ...o, resolve });
      }),
    [],
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const blocked = !!state?.requireText && typed.trim().toUpperCase() !== state.requireText.toUpperCase();
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        icon={
          <div
            className={cx(
              "grid h-10 w-10 place-items-center rounded-full",
              state?.danger ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20" : "bg-brand-100 text-brand-600",
            )}
          >
            <AlertTriangle size={20} />
          </div>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => close(false)}>
              Cancelar
            </button>
            <button
              className={cx("btn", state?.danger ? "btn-danger" : "btn-primary")}
              disabled={blocked}
              onClick={() => close(true)}
              autoFocus
            >
              {state?.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        }
      >
        <div className="text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{state?.message}</div>
        {state?.requireText && (
          <div className="mt-4">
            <label className="label">
              Digite <b>{state.requireText}</b> para confirmar
            </label>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

// ---------------- Toast ----------------

type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  text: ReactNode;
  action?: { label: string; onClick: () => void };
};

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.action ? 7000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed right-0 bottom-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-slide-up items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white shadow-2xl dark:bg-white dark:text-stone-900"
          >
            {t.kind === "success" && <CheckCircle2 size={18} className="shrink-0 text-emerald-400 dark:text-emerald-600" />}
            {t.kind === "error" && <AlertTriangle size={18} className="shrink-0 text-rose-400 dark:text-rose-600" />}
            {t.kind === "info" && <Info size={18} className="shrink-0 text-sky-400 dark:text-sky-600" />}
            <div className="min-w-0 flex-1">{t.text}</div>
            {t.action && (
              <button
                className="shrink-0 rounded-lg px-2 py-1 font-semibold text-brand-300 hover:bg-white/10 dark:text-brand-600 dark:hover:bg-stone-100"
                onClick={() => {
                  t.action?.onClick();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- Avatar & badges ----------------

export function Avatar({ name, size = 40, muted }: { name: string; size?: number; muted?: boolean }) {
  return (
    <div
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-bold",
        muted ? "bg-stone-200 text-stone-500 dark:bg-stone-800" : avatarColor(name),
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}

export function StatusBadge({ status, days }: { status: StudentStatus; days?: number }) {
  switch (status) {
    case "atrasado":
      return (
        <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Atrasado{days ? ` · ${days}d` : ""}
        </span>
      );
    case "devendo":
      return (
        <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Em aberto
        </span>
      );
    case "credito":
      return (
        <span className="badge bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          Com crédito
        </span>
      );
    default:
      return (
        <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Em dia
        </span>
      );
  }
}

export function BalanceText({ cents, className }: { cents: number; className?: string }) {
  const color =
    cents > 0 ? "text-rose-600 dark:text-rose-400" : cents < 0 ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <span className={cx("tabular font-bold", color, className)}>
      {cents < 0 ? "+ " : ""}R$ {moneyPlain(Math.abs(cents))}
    </span>
  );
}

// ---------------- Money input ----------------

/** Campo de dinheiro estilo "maquininha": digitar 1 2 5 0 vira 12,50. */
export function MoneyInput({
  value,
  onChange,
  autoFocus,
  className,
  placeholder = "0,00",
  onEnter,
  id,
}: {
  value: number;
  onChange: (cents: number) => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  onEnter?: () => void;
  id?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-stone-400">R$</span>
      <input
        id={id}
        inputMode="numeric"
        autoFocus={autoFocus}
        className="input tabular pl-10 font-semibold"
        placeholder={placeholder}
        value={value ? moneyPlain(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-3xl text-brand-500 dark:bg-brand-500/10">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-stone-500 dark:text-stone-400">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
