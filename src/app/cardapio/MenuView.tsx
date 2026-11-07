"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, UtensilsCrossed, EyeOff } from "lucide-react";
import { deleteProduct, saveProduct } from "@/app/actions";
import { useApp } from "@/components/AppShell";
import { EmptyState, Modal, MoneyInput, PageHeader, cx, useConfirm, useToast } from "@/components/ui";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

const EMOJIS = [
  "🍗", "🧀", "🥟", "🥪", "🥠", "🌭", "🍔", "🍕", "🌮", "🥐", "🍞", "🥨", "🍟", "🍳",
  "🧃", "🥤", "💧", "🥛", "☕", "🧋", "🍹", "🍰", "🍫", "🍿", "🍪", "🍩", "🧁", "🍦",
  "🍬", "🍭", "🍎", "🍌", "🍓", "🥗", "🍇", "🍉", "🍽️",
];

export function MenuView() {
  const { data } = useApp();
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const categories = Array.from(new Set(data.products.map((p) => p.category)));

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Cardápio"
        subtitle="Os produtos aparecem como botões na hora de anotar o fiado. Mudar o preço aqui não altera fiados antigos."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Novo produto
          </button>
        }
      />

      {data.products.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<UtensilsCrossed />}
            title="Cardápio vazio"
            text="Cadastre os lanches para anotar fiado com um toque."
            action={
              <button className="btn btn-primary" onClick={() => setEditing("new")}>
                <Plus size={16} /> Novo produto
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat}>
              <h2 className="mb-3 text-xs font-bold tracking-wider text-stone-500 uppercase">{cat}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.products
                  .filter((p) => p.category === cat)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setEditing(p)}
                      className={cx("card group relative flex flex-col items-start p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md", !p.active && "opacity-50")}
                    >
                      <span className="text-4xl">{p.emoji}</span>
                      <span className="mt-3 font-semibold">{p.name}</span>
                      <span className="tabular text-sm text-stone-500">{money(p.price)}</span>
                      {!p.active && (
                        <span className="badge absolute top-3 right-3 bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                          <EyeOff size={11} /> oculto
                        </span>
                      )}
                      <Pencil size={14} className="absolute right-3 bottom-3 text-stone-300 opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && <ProductDialog product={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductDialog({ product, categories, onClose }: { product: Product | null; categories: string[]; onClose: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [emoji, setEmoji] = useState(product?.emoji ?? "🍽️");
  const [category, setCategory] = useState(product?.category ?? categories[0] ?? "Salgados");
  const [active, setActive] = useState(product?.active ?? true);
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const submit = () =>
    start(async () => {
      try {
        await saveProduct({ id: product?.id, name, price, emoji, category, active });
        toast({ kind: "success", text: product ? "Produto atualizado" : "Produto adicionado ao cardápio" });
        onClose();
      } catch (e) {
        toast({ kind: "error", text: (e as Error).message });
      }
    });

  const remove = async () => {
    if (!product) return;
    const ok = await confirm({
      title: `Remover ${product.name}?`,
      message: "Os fiados antigos com este produto continuam no histórico. Se quiser só esconder temporariamente, desmarque “Disponível”.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    await deleteProduct(product.id);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={product ? "Editar produto" : "Novo produto"}
      icon={<div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-2xl">{emoji}</div>}
      footer={
        <div className="flex items-center gap-2">
          {product && (
            <button className="btn btn-ghost mr-auto !text-rose-600" onClick={remove}>
              Remover
            </button>
          )}
          <button className="btn btn-secondary ml-auto" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending || !name.trim()} onClick={submit}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Coxinha" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço</label>
            <MoneyInput value={price} onChange={setPrice} onEnter={submit} />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input className="input" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="cats">
              {["Salgados", "Bebidas", "Doces", "Lanches", "Frutas", ...categories]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((c) => (
                  <option key={c} value={c} />
                ))}
            </datalist>
          </div>
        </div>
        <div>
          <label className="label">Ícone</label>
          <div className="grid grid-cols-10 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={cx(
                  "grid aspect-square place-items-center rounded-lg text-xl transition hover:bg-stone-100 dark:hover:bg-stone-800",
                  emoji === e && "bg-brand-100 ring-2 ring-brand-400 dark:bg-brand-500/20",
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Disponível (aparece na hora de anotar)
        </label>
      </div>
    </Modal>
  );
}
