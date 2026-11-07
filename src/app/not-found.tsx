import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="text-6xl">📒</div>
      <h1 className="mt-4 font-display text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-1 text-stone-500">Essa folha do caderninho está em branco.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Voltar ao painel
      </Link>
    </div>
  );
}
