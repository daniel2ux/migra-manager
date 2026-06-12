import { Archive } from 'lucide-react';

export function BackupEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Archive className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-[11px] font-black uppercase tracking-widest">Nenhum backup encontrado</p>
      <p className="text-[11px] mt-1">Crie um backup acima ou salve localmente para registrá-lo aqui.</p>
    </div>
  );
}
