import { Download, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BackupListItem } from '@/lib/backup/types';
import { BackupEmptyState } from './backup-empty-state';
import { fmtBytes, fmtDate } from './backup-formatters';

interface BackupListProps {
  backups: BackupListItem[];
  isLoadingList: boolean;
  onDownload: (filename: string) => void;
  onRestore: (item: BackupListItem) => void;
  onDelete: (item: BackupListItem) => void;
}

export function BackupList({
  backups,
  isLoadingList,
  onDownload,
  onRestore,
  onDelete,
}: BackupListProps) {
  return (
    <div className="border border-slate-200 rounded-none overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
        {['Arquivo', 'Data', 'Docs', 'Tamanho', 'Ações'].map((col) => (
          <span key={col} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {col}
          </span>
        ))}
      </div>

      {backups.length === 0 && !isLoadingList && <BackupEmptyState />}
      {isLoadingList && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      )}
      {!isLoadingList &&
        backups.map((item) => (
          <div
            key={item.localId ?? item.filename}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
          >
            <span
              className="text-[12px] font-mono text-slate-700 truncate flex items-center gap-2 min-w-0"
              title={item.filename}
            >
              <span className="truncate">{item.filename}</span>
              {item.source === 'local' && (
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700">
                  Local
                </span>
              )}
            </span>
            <span className="text-[12px] text-slate-600">{fmtDate(item.metadata.createdAt)}</span>
            <span className="text-[12px] font-bold text-slate-700">
              {item.metadata.totalDocs.toLocaleString('pt-BR')}
            </span>
            <span className="text-[12px] text-slate-600">{fmtBytes(item.metadata.sizeBytes)}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 border-0 rounded-lg bg-slate-100/80 hover:bg-slate-200 text-slate-600"
                title={item.source === 'local' ? 'Arquivo salvo no seu computador' : 'Download'}
                disabled={item.source === 'local'}
                onClick={() => onDownload(item.filename)}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 border-0 rounded-lg bg-slate-100/80 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700"
                title={
                  item.source === 'local'
                    ? 'Use a seção Restaurar arquivo local abaixo'
                    : 'Restaurar'
                }
                disabled={item.source === 'local'}
                onClick={() => onRestore(item)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 border-0 rounded-lg bg-slate-100/80 hover:bg-red-100 text-slate-600 hover:text-red-600"
                title="Excluir"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
