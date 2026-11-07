"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Ban, UserPlus } from "lucide-react";
import { normalize } from "@/lib/format";
import type { StudentSummary } from "@/lib/types";
import { Avatar, BalanceText, cx } from "./ui";

export function StudentPicker({
  summaries,
  onPick,
  onCreate,
  sortDebtorsFirst,
}: {
  summaries: StudentSummary[];
  onPick: (s: StudentSummary) => void;
  onCreate?: (name: string) => void;
  sortDebtorsFirst?: boolean;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const nq = normalize(q);
    let list = summaries.filter((s) => !s.student.archived);
    if (nq) {
      list = list.filter((s) =>
        normalize(`${s.student.name} ${s.student.grade} ${s.student.guardianName}`).includes(nq),
      );
      list.sort((a, b) => {
        const an = normalize(a.student.name).startsWith(nq) ? 0 : 1;
        const bn = normalize(b.student.name).startsWith(nq) ? 0 : 1;
        return an - bn || a.student.name.localeCompare(b.student.name);
      });
    } else if (sortDebtorsFirst) {
      list.sort((a, b) => b.balance - a.balance || a.student.name.localeCompare(b.student.name));
    } else {
      // alunos com compra mais recente primeiro: quem compra muito aparece no topo
      list.sort((a, b) => (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "") || a.student.name.localeCompare(b.student.name));
    }
    return list.slice(0, 50);
  }, [q, summaries, sortDebtorsFirst]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  return (
    <div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400" />
        <input
          autoFocus
          className="input h-12 pl-11 text-base"
          placeholder="Digite o nome, turma ou responsável…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[idx]) onPick(results[idx]);
              else if (q.trim() && onCreate) onCreate(q.trim());
            }
          }}
        />
      </div>
      <div ref={listRef} className="mt-3 max-h-[52vh] space-y-1 overflow-y-auto">
        {results.map((s, i) => (
          <button
            key={s.student.id}
            data-idx={i}
            onMouseEnter={() => setIdx(i)}
            onClick={() => onPick(s)}
            className={cx(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
              i === idx ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30" : "hover:bg-stone-50 dark:hover:bg-stone-800/60",
            )}
          >
            <Avatar name={s.student.name} size={38} muted={s.student.blocked} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 truncate font-semibold">
                {s.student.name}
                {s.student.blocked && (
                  <span className="badge bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                    <Ban size={11} /> Bloqueado
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-stone-500 dark:text-stone-400">
                {[s.student.grade, s.student.guardianName && `resp. ${s.student.guardianName}`].filter(Boolean).join(" · ") ||
                  "Sem turma"}
              </div>
            </div>
            <div className="text-right text-sm">
              <BalanceText cents={s.balance} />
              {s.overLimit && <div className="text-[11px] font-semibold text-rose-500">limite atingido</div>}
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <div className="py-10 text-center text-sm text-stone-500">
            Nenhum aluno encontrado.
            {onCreate && q.trim() && (
              <div className="mt-3">
                <button className="btn btn-secondary" onClick={() => onCreate(q.trim())}>
                  <UserPlus size={16} /> Cadastrar “{q.trim()}”
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
