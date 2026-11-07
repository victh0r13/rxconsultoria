import Link from "next/link";
import {
  Wallet,
  AlarmClock,
  TrendingUp,
  ShoppingBasket,
  MessageCircle,
  ArrowRight,
  Plus,
  HandCoins,
  UserPlus,
  Settings,
  Sparkles,
} from "lucide-react";
import { readDb } from "@/lib/db";
import { dashboardStats, describeItems, summarizeAll, sortByDate } from "@/lib/calc";
import { dayLabel, money, relativeDays, time } from "@/lib/format";
import { METHOD_LABEL } from "@/lib/types";
import { Avatar, StatusBadge } from "@/components/ui";
import { ChargeButton, PaymentButton, SaleButton, StudentButton } from "@/components/Buttons";
import { SampleDataButton } from "@/components/SampleDataButton";

export const metadata = { title: "Painel" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function Dashboard() {
  const db = await readDb();
  const summaries = summarizeAll(db);
  const stats = dashboardStats(db, summaries);
  const names = new Map(db.students.map((s) => [s.id, s.name]));
  const recent = sortByDate(db.transactions, "desc").slice(0, 8);
  const toCharge = summaries
    .filter((s) => s.balance > 0 && !s.student.archived)
    .sort((a, b) => b.daysOpen - a.daysOpen || b.balance - a.balance)
    .slice(0, 6);
  const todayRaw = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const owner = db.settings.ownerName.trim().split(" ")[0];

  if (db.students.length === 0) {
    return (
      <div className="animate-slide-up">
        <h1 className="font-display text-[32px] font-bold tracking-tight">
          {greeting()}
          {owner ? `, ${owner}` : ""}! 👋
        </h1>
        <p className="mt-1 text-[15px] text-stone-500">Bem-vinda ao Caderninho — o caderno de fiado que faz as contas sozinho.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              n: 1,
              icon: <Settings size={22} />,
              title: "Configure a cantina",
              text: "Nome da cantina, seu nome e sua chave Pix (para gerar QR Code de cobrança).",
              action: (
                <Link href="/configuracoes" className="btn btn-secondary btn-sm">
                  Abrir ajustes
                </Link>
              ),
            },
            {
              n: 2,
              icon: <UserPlus size={22} />,
              title: "Cadastre os alunos",
              text: "Nome, turma e o WhatsApp do responsável. Dá para cadastrar na hora do fiado também.",
              action: (
                <StudentButton className="btn-secondary btn-sm">
                  <Plus size={14} /> Novo aluno
                </StudentButton>
              ),
            },
            {
              n: 3,
              icon: <ShoppingBasket size={22} />,
              title: "Anote o primeiro fiado",
              text: "Toque nos lanches, confirme e pronto. Aperte F a qualquer momento para anotar.",
              action: (
                <SaleButton className="btn-primary btn-sm">
                  <Plus size={14} /> Anotar fiado
                </SaleButton>
              ),
            },
          ].map((step) => (
            <div key={step.n} className="card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">{step.icon}</div>
                <span className="text-xs font-bold tracking-wider text-stone-400 uppercase">Passo {step.n}</span>
              </div>
              <h3 className="font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-1 mb-4 text-sm text-stone-500 dark:text-stone-400">{step.text}</p>
              {step.action}
            </div>
          ))}
        </div>
        <div className="card mt-6 flex flex-wrap items-center gap-4 p-5">
          <Sparkles className="text-brand-500" />
          <div className="flex-1">
            <div className="font-semibold">Quer conhecer antes?</div>
            <div className="text-sm text-stone-500">Carregue alunos e lanches de exemplo. Depois é só apagar em Ajustes.</div>
          </div>
          <SampleDataButton />
        </div>
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.daily.map((d) => Math.max(d.sold, d.received)));

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{today}</p>
          <h1 className="font-display text-[32px] leading-tight font-bold tracking-tight">
            {greeting()}
            {owner ? `, ${owner}` : ""}! 👋
          </h1>
        </div>
        <div className="flex gap-2">
          <PaymentButton className="btn-secondary btn-lg">
            <HandCoins size={18} /> Receber
          </PaymentButton>
          <SaleButton className="btn-primary btn-lg">
            <Plus size={18} strokeWidth={2.5} /> Anotar fiado
          </SaleButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon={<Wallet size={20} />}
          tone="rose"
          label="A receber"
          value={money(stats.receivable)}
          sub={`${stats.debtors} ${stats.debtors === 1 ? "aluno devendo" : "alunos devendo"}`}
        />
        <Kpi
          icon={<AlarmClock size={20} />}
          tone="amber"
          label={`Atrasados (+${db.settings.overdueDays} dias)`}
          value={String(stats.overdue)}
          sub={stats.overdue ? <Link href="/cobrancas" className="font-semibold text-brand-600 hover:underline">Cobrar agora →</Link> : "Ninguém atrasado 🎉"}
        />
        <Kpi
          icon={<TrendingUp size={20} />}
          tone="emerald"
          label="Recebido no mês"
          value={money(stats.receivedMonth)}
          sub={`Hoje: ${money(stats.receivedToday)}`}
        />
        <Kpi
          icon={<ShoppingBasket size={20} />}
          tone="orange"
          label="Fiado no mês"
          value={money(stats.soldMonth)}
          sub={`Hoje: ${money(stats.soldToday)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold">Últimos 14 dias</h2>
            <div className="flex items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-400" /> Fiado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Recebido
              </span>
            </div>
          </div>
          <div className="flex h-48 items-end gap-1.5">
            {stats.daily.map((d) => {
              const date = new Date(d.date);
              const weekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="flex h-full items-end justify-center gap-[3px]">
                    <div
                      className="w-full max-w-3.5 rounded-t-md bg-brand-400 transition group-hover:bg-brand-500"
                      style={{ height: `${(d.sold / maxDay) * 100}%`, minHeight: d.sold ? 3 : 0 }}
                    />
                    <div
                      className="w-full max-w-3.5 rounded-t-md bg-emerald-500 transition group-hover:bg-emerald-600"
                      style={{ height: `${(d.received / maxDay) * 100}%`, minHeight: d.received ? 3 : 0 }}
                    />
                  </div>
                  <div className={`mt-1.5 text-center text-[10px] ${weekend ? "text-stone-300 dark:text-stone-600" : "text-stone-400"}`}>
                    {date.getDate()}
                  </div>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] whitespace-nowrap text-white shadow-lg group-hover:block dark:bg-white dark:text-stone-900">
                    <div className="font-semibold">{date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</div>
                    <div>Fiado: {money(d.sold)}</div>
                    <div>Recebido: {money(d.received)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mais vendidos */}
        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-bold">Mais pedidos no fiado (mês)</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-stone-500">Ainda sem lanches neste mês.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-lg dark:bg-stone-800">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className="h-full rounded-full bg-brand-400"
                        style={{ width: `${(p.qty / stats.topProducts[0].qty) * 100}%`, opacity: 1 - i * 0.12 }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold">{p.qty}x</div>
                    <div className="tabular text-stone-500">{money(p.total)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Precisa cobrar */}
        <div className="card">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-display text-base font-bold">Quem cobrar primeiro</h2>
            <Link href="/cobrancas" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          {toCharge.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-stone-500">Ninguém devendo. Que maravilha! ✨</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {toCharge.map((s) => (
                <li key={s.student.id} className="flex items-center gap-3 px-5 py-3">
                  <Link href={`/alunos/${s.student.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={s.student.name} size={38} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.student.name}</div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <StatusBadge status={s.status} days={s.daysOpen} />
                        <span className="truncate">cobrado {relativeDays(s.student.lastChargedAt)}</span>
                      </div>
                    </div>
                  </Link>
                  <span className="tabular text-sm font-bold text-rose-600 dark:text-rose-400">{money(s.balance)}</span>
                  <ChargeButton studentId={s.student.id} className="btn-whatsapp btn-sm" title="Cobrar no WhatsApp">
                    <MessageCircle size={14} />
                  </ChargeButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Últimos lançamentos */}
        <div className="card">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-display text-base font-bold">Últimos lançamentos</h2>
            <Link href="/historico" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
              Histórico <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-stone-500">Nada anotado ainda.</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {recent.map((tx) => (
                <li key={tx.id}>
                  <Link href={`/alunos/${tx.studentId}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tx.type === "compra" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"}`}
                    >
                      {tx.type === "compra" ? <ShoppingBasket size={16} /> : <HandCoins size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{names.get(tx.studentId) ?? "Aluno removido"}</div>
                      <div className="truncate text-xs text-stone-500">
                        {tx.type === "compra" ? describeItems(tx) : `Pagamento · ${METHOD_LABEL[tx.method ?? "outro"]}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`tabular text-sm font-bold ${tx.type === "compra" ? "" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {tx.type === "compra" ? "" : "+ "}
                        {money(tx.amount)}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {dayLabel(tx.createdAt)} {time(tx.createdAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const TONES = {
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  orange: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
};

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[tone]}`}>{icon}</span>
        <span className="text-[13px] font-medium text-stone-500 dark:text-stone-400">{label}</span>
      </div>
      <div className="tabular mt-3 font-display text-[26px] leading-none font-bold tracking-tight">{value}</div>
      <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">{sub}</div>
    </div>
  );
}
