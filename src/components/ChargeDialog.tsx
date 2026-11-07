"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { MessageCircle, Copy, Check, UserCheck, Send, QrCode } from "lucide-react";
import { logCharge } from "@/app/actions";
import { buildChargeMessage, whatsappLink } from "@/lib/message";
import { pixPayload } from "@/lib/pix";
import { formatPhone, money, relativeDays } from "@/lib/format";
import { useApp } from "./AppShell";
import { Avatar, Modal, StatusBadge, useToast } from "./ui";

export function ChargeDialog(props: { open: boolean; studentId?: string; onClose: () => void }) {
  if (!props.open || !props.studentId) return null;
  return <Inner studentId={props.studentId} onClose={props.onClose} />;
}

function Inner({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useApp();
  const toast = useToast();
  const summary = data.summaries.find((s) => s.student.id === studentId);
  const { settings } = data;
  const [includePix, setIncludePix] = useState(!!settings.pixKey);
  const [text, setText] = useState(() => (summary ? buildChargeMessage(settings, summary) : ""));
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState<"msg" | "pix" | null>(null);
  const [, start] = useTransition();

  const pix = useMemo(
    () =>
      settings.pixKey && summary
        ? pixPayload({
            key: settings.pixKey,
            name: settings.pixName || settings.ownerName || settings.shopName,
            city: settings.pixCity,
            amountCents: Math.max(0, summary.balance),
          })
        : "",
    [settings, summary],
  );

  useEffect(() => {
    if (!pix) return;
    QRCode.toDataURL(pix, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [pix]);

  if (!summary) return null;

  const finalText = includePix && pix ? `${text}\n\nPix copia e cola (valor já preenchido):\n${pix}` : text;
  const hasPhone = summary.student.phone.replace(/\D/g, "").length >= 10;

  const copy = async (what: "msg" | "pix") => {
    await navigator.clipboard.writeText(what === "msg" ? finalText : pix);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  const register = (channel: "whatsapp" | "pessoalmente" | "outro") =>
    start(async () => {
      await logCharge(summary.student.id, summary.balance, channel);
      toast({ kind: "success", text: `Cobrança registrada para ${summary.student.name.split(" ")[0]}` });
    });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Cobrar ${summary.student.name.split(" ")[0]}`}
      icon={
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
          <MessageCircle size={20} />
        </div>
      }
      subtitle={`Última cobrança: ${relativeDays(summary.student.lastChargedAt)}`}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="btn btn-ghost mr-auto"
            onClick={() => {
              register("pessoalmente");
              onClose();
            }}
          >
            <UserCheck size={16} /> Cobrei pessoalmente
          </button>
          <button className="btn btn-secondary" onClick={() => copy("msg")}>
            {copied === "msg" ? <Check size={16} /> : <Copy size={16} />} {copied === "msg" ? "Copiado!" : "Copiar mensagem"}
          </button>
          <a
            className="btn btn-whatsapp"
            href={whatsappLink(summary.student.phone, finalText)}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              register("whatsapp");
              onClose();
            }}
          >
            <Send size={16} /> Enviar no WhatsApp
          </a>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/60">
            <Avatar name={summary.student.name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{summary.student.name}</div>
              <div className="text-xs text-stone-500">
                {summary.student.guardianName || "Responsável não informado"}
                {summary.student.phone && ` · ${formatPhone(summary.student.phone)}`}
              </div>
            </div>
            <div className="text-right">
              <div className="tabular text-lg font-bold text-rose-600">{money(summary.balance)}</div>
              <StatusBadge status={summary.status} days={summary.daysOpen} />
            </div>
          </div>
          {!hasPhone && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              Este aluno não tem WhatsApp do responsável cadastrado. O WhatsApp vai abrir para você escolher o contato.
            </div>
          )}
          <div>
            <label className="label">Mensagem (pode editar antes de enviar)</label>
            <textarea className="input font-[450]" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
            <p className="hint">
              Para mudar o texto padrão de todas as cobranças vá em <Link href="/configuracoes" className="underline" onClick={onClose}>Ajustes</Link>.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {pix ? (
            <>
              <div className="rounded-2xl border border-stone-200 p-4 text-center dark:border-stone-700">
                <div className="mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold">
                  <QrCode size={16} className="text-emerald-600" /> Pix de {money(summary.balance)}
                </div>
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR Code Pix" className="mx-auto w-full max-w-[200px] rounded-lg bg-white p-1" />
                ) : (
                  <div className="mx-auto aspect-square w-full max-w-[200px] animate-pulse rounded-lg bg-stone-100" />
                )}
                <p className="mt-2 text-[11px] text-stone-500">Mostre na tela para o responsável pagar na hora.</p>
              </div>
              <button className="btn btn-secondary w-full" onClick={() => copy("pix")}>
                {copied === "pix" ? <Check size={16} /> : <Copy size={16} />} {copied === "pix" ? "Copiado!" : "Copiar Pix copia e cola"}
              </button>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600" checked={includePix} onChange={(e) => setIncludePix(e.target.checked)} />
                Incluir o Pix copia e cola no final da mensagem
              </label>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700">
              <QrCode size={20} className="mb-2 text-stone-400" />
              Cadastre sua chave Pix em{" "}
              <Link href="/configuracoes" className="font-semibold text-brand-600 underline" onClick={onClose}>
                Ajustes
              </Link>{" "}
              para gerar QR Code e Pix copia e cola com o valor certinho.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
