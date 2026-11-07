"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useApp } from "./AppShell";
import { Modal } from "./ui";
import { StudentPicker } from "./StudentPicker";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, openStudent } = useApp();
  const router = useRouter();
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Buscar aluno"
      subtitle="Use ↑ ↓ e Enter para abrir a ficha"
      icon={
        <div className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <Search size={20} />
        </div>
      }
    >
      <StudentPicker
        summaries={data.summaries}
        onPick={(s) => {
          onClose();
          router.push(`/alunos/${s.student.id}`);
        }}
        onCreate={() => {
          onClose();
          openStudent(null);
        }}
      />
    </Modal>
  );
}
