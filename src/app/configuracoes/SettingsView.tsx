"use client";

import { useRef, useState, useTransition } from "react";
import { Store, QrCode, Scale, MessageSquareText, DatabaseBackup, Download, Upload, TriangleAlert, Keyboard, FolderOpen, RotateCcw } from "lucide-react";
import { restoreBackup, saveSettings, wipeAll } from "@/app/actions";
import { useApp } from "@/components/AppShell";
import { MoneyInput, PageHeader, useConfirm, useToast } from "@/components/ui";
import { buildChargeMessage } from "@/lib/message";
import { normalizePixKey } from "@/lib/pix";
import type { Settings, StudentSummary } from "@/lib/types";

const DEFAULT_TEMPLATE = `Olá, {responsavel}! Tudo bem? 😊
Aqui é da {lanchonete}. Passando para lembrar que {aluno} está com um saldo em aberto de *{valor}* na cantina.

{itens}
Para pagar via Pix, a chave é: {pix}

Qualquer dúvida é só me chamar. Obrigada! 💛`;

const VARS: [string, string][] = [
  ["{responsavel}", "1º nome do responsável"],
  ["{aluno}", "1º nome do aluno"],
  ["{aluno_completo}", "nome completo"],
  ["{turma}", "turma"],
  ["{valor}", "valor devido"],
  ["{itens}", "lista do que está em aberto"],
  ["{dias}", "dias em aberto"],
  ["{pix}", "sua chave Pix"],
  ["{lanchonete}", "nome da cantina"],
  ["{atendente}", "seu nome"],
];

export function SettingsView({
  dataFile,
  dataDir,
  backups,
  backupCount,
}: {
  dataFile: string;
  dataDir: string;
  backups: string[];
  backupCount: number;
}) {
  const { data } = useApp();
  const [s, setS] = useState<Settings>(data.settings);
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const save = () =>
    start(async () => {
      await saveSettings(s);
      toast({ kind: "success", text: "Ajustes salvos" });
    });

  const insertVar = (v: string) => {
    const el = templateRef.current;
    if (!el) return set("messageTemplate", s.messageTemplate + v);
    const { selectionStart: a, selectionEnd: b } = el;
    const next = s.messageTemplate.slice(0, a) + v + s.messageTemplate.slice(b);
    set("messageTemplate", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + v.length, a + v.length);
    });
  };

  const sample: StudentSummary =
    data.summaries.find((x) => x.balance > 0) ??
    ({
      student: {
        id: "x",
        name: "Ana Clara Souza",
        grade: "5º A",
        guardianName: "Mariana",
        phone: "",
        creditLimit: null,
        notes: "",
        blocked: false,
        archived: false,
        createdAt: "",
        lastChargedAt: null,
      },
      balance: 2350,
      totalBought: 2350,
      totalPaid: 0,
      oldestOpenDate: new Date().toISOString(),
      daysOpen: 12,
      lastPurchaseAt: null,
      lastPaymentAt: null,
      limit: 0,
      overLimit: false,
      status: "devendo",
      openPurchases: [
        {
          remaining: 1100,
          tx: {
            id: "a",
            studentId: "x",
            type: "compra",
            amount: 1100,
            items: [
              { productId: null, name: "Coxinha", unitPrice: 600, qty: 1 },
              { productId: null, name: "Suco natural", unitPrice: 500, qty: 1 },
            ],
            note: "",
            createdAt: new Date().toISOString(),
          },
        },
      ],
    } satisfies StudentSummary);

  const onRestore = async (file: File) => {
    const text = await file.text();
    const ok = await confirm({
      title: "Restaurar este backup?",
      message: (
        <>
          Os dados atuais serão <b>substituídos</b> pelos do arquivo <b>{file.name}</b>. Um backup automático de hoje já está guardado na pasta de
          backups, por segurança.
        </>
      ),
      confirmLabel: "Restaurar",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await restoreBackup(text);
      toast({ kind: "success", text: `Backup restaurado: ${res.students} alunos, ${res.transactions} lançamentos` });
    } catch (e) {
      toast({ kind: "error", text: (e as Error).message });
    }
  };

  const onWipe = async () => {
    const ok = await confirm({
      title: "Apagar todos os dados?",
      message: "Alunos, fiados, pagamentos e ajustes serão apagados. Baixe um backup antes se quiser guardar alguma coisa.",
      confirmLabel: "Apagar tudo",
      danger: true,
      requireText: "APAGAR",
    });
    if (!ok) return;
    await wipeAll();
    toast({ kind: "info", text: "Tudo apagado. Começando do zero!" });
  };

  const pixNormalized = s.pixKey ? normalizePixKey(s.pixKey) : "";

  return (
    <div className="animate-slide-up pb-24">
      <PageHeader title="Ajustes" subtitle="Personalize o Caderninho do seu jeito." />

      <div className="space-y-6">
        <Section icon={<Store size={18} />} title="A cantina">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome da cantina</label>
              <input className="input" value={s.shopName} onChange={(e) => set("shopName", e.target.value)} />
            </div>
            <div>
              <label className="label">Seu nome</label>
              <input className="input" value={s.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="Aparece na saudação do painel" />
            </div>
          </div>
        </Section>

        <Section icon={<QrCode size={18} />} title="Pix" desc="Com a chave Pix, cada cobrança gera um QR Code e um Pix copia e cola com o valor exato.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label">Chave Pix</label>
              <input className="input" value={s.pixKey} onChange={(e) => set("pixKey", e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" />
              {s.pixKey && pixNormalized !== s.pixKey.trim() && (
                <p className="hint">
                  Será usada como: <code className="font-semibold">{pixNormalized}</code>
                </p>
              )}
              <p className="hint">Celular: digite com DDD, ex. (11) 98765-4321 — o +55 é colocado automaticamente.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nome do recebedor</label>
              <input className="input" value={s.pixName} onChange={(e) => set("pixName", e.target.value)} placeholder="Como está no banco" />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="input" value={s.pixCity} onChange={(e) => set("pixCity", e.target.value)} placeholder="Ex.: São Paulo" />
            </div>
          </div>
        </Section>

        <Section icon={<Scale size={18} />} title="Regras do fiado">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Limite padrão por aluno</label>
              <MoneyInput value={s.defaultCreditLimit} onChange={(v) => set("defaultCreditLimit", v)} placeholder="0,00 = sem limite" />
              <p className="hint">Avisa quando o aluno passar desse valor. Dá para mudar por aluno. 0 = sem limite.</p>
            </div>
            <div>
              <label className="label">Considerar atrasado após</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  className="input pr-14"
                  value={s.overdueDays}
                  onChange={(e) => set("overdueDays", Number(e.target.value))}
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-stone-400">dias</span>
              </div>
              <p className="hint">Conta a partir do lanche mais antigo ainda não pago.</p>
            </div>
          </div>
        </Section>

        <Section icon={<MessageSquareText size={18} />} title="Mensagem de cobrança" desc="Texto usado ao cobrar pelo WhatsApp. Clique nas etiquetas para inserir.">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {VARS.map(([v, label]) => (
                  <button key={v} className="chip h-7 text-xs" title={label} onClick={() => insertVar(v)}>
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                ref={templateRef}
                className="input font-mono text-[13px]"
                rows={11}
                value={s.messageTemplate}
                onChange={(e) => set("messageTemplate", e.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-500"
                    checked={s.includeItemsInMessage}
                    onChange={(e) => set("includeItemsInMessage", e.target.checked)}
                  />
                  Listar os lanches em aberto em {"{itens}"}
                </label>
                <button className="btn btn-ghost btn-sm" onClick={() => set("messageTemplate", DEFAULT_TEMPLATE)}>
                  <RotateCcw size={13} /> Texto original
                </button>
              </div>
            </div>
            <div>
              <div className="label">Prévia</div>
              <div className="rounded-2xl bg-[#efeae2] p-4 dark:bg-[#0b141a]">
                <div className="ml-auto max-w-[95%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap text-stone-900 shadow-sm dark:bg-[#005c4b] dark:text-white">
                  {buildChargeMessage(s, sample)}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={<DatabaseBackup size={18} />} title="Backup e dados" desc="Seus dados ficam só neste Mac. Um backup automático é feito todo dia que o sistema é usado.">
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-secondary" href="/api/backup">
              <Download size={16} /> Baixar backup agora
            </a>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Restaurar backup…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onRestore(f);
                e.target.value = "";
              }}
            />
            <a className="btn btn-secondary" href="/api/export?tipo=saldos">
              <Download size={16} /> Planilha de saldos
            </a>
          </div>
          <div className="mt-4 space-y-1.5 rounded-xl bg-stone-50 p-4 text-sm dark:bg-stone-800/50">
            <div className="flex items-start gap-2">
              <FolderOpen size={15} className="mt-0.5 shrink-0 text-stone-400" />
              <div className="min-w-0">
                <div className="text-stone-500">Arquivo de dados</div>
                <code className="break-all text-xs">{dataFile}</code>
              </div>
            </div>
            <div className="pl-6 text-stone-500">
              {backupCount} backups automáticos em <code className="break-all text-xs">{dataDir}/backups</code>
              {backups[0] && <> · último: {backups[0].replace("caderninho-", "").replace(".json", "")}</>}
            </div>
          </div>
          <p className="hint mt-3">Dica: de vez em quando, baixe um backup e guarde no iCloud Drive ou Google Drive.</p>
        </Section>

        <Section icon={<Keyboard size={18} />} title="Atalhos de teclado">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["F", "Anotar fiado"],
              ["R", "Receber pagamento"],
              ["⌘ K  ou  /", "Buscar aluno"],
              ["⌘ Enter", "Salvar o fiado"],
              ["Esc", "Fechar janela"],
              ["Botão direito no produto", "Tirar 1 unidade"],
            ].map(([k, d]) => (
              <div key={k} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
                <span>{d}</span>
                <span className="kbd h-6 px-2 opacity-100">{k}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<TriangleAlert size={18} />} title="Zona de perigo" danger>
          <button className="btn btn-danger" onClick={onWipe}>
            Apagar todos os dados
          </button>
        </Section>
      </div>

      {dirty && (
        <div className="no-print fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 md:pl-64">
          <div className="flex animate-slide-up items-center gap-3 rounded-2xl bg-stone-900 py-2 pr-2 pl-5 text-sm text-white shadow-2xl dark:bg-white dark:text-stone-900">
            Você tem alterações não salvas
            <button className="btn btn-ghost btn-sm !text-stone-300 dark:!text-stone-600" onClick={() => setS(data.settings)}>
              Descartar
            </button>
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={save}>
              {pending ? "Salvando…" : "Salvar ajustes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  desc,
  children,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={`card p-6 ${danger ? "border-rose-200 dark:border-rose-500/30" : ""}`}>
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"}`}
        >
          {icon}
        </span>
        <div>
          <h2 className="font-display text-base font-bold">{title}</h2>
          {desc && <p className="text-sm text-stone-500 dark:text-stone-400">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
