import { CheckCircle2, Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BackupListItem } from '@/lib/backup/types';
import { fmtBytes, fmtDate } from './backup-formatters';

interface BackupRestoreDialogProps {
  restoreTarget: BackupListItem | null;
  onOpenChange: (open: boolean) => void;
  restoreMode: 'merge' | 'overwrite';
  onRestoreModeChange: (mode: 'merge' | 'overwrite') => void;
  availableRoots: string[];
  selectedRoots: string[];
  onToggleRoot: (root: string) => void;
  purgeBeforeRestore: boolean;
  onPurgeBeforeRestoreChange: (purge: boolean) => void;
  isRestoring: boolean;
  onConfirm: () => void;
}

export function BackupRestoreDialog({
  restoreTarget,
  onOpenChange,
  restoreMode,
  onRestoreModeChange,
  availableRoots,
  selectedRoots,
  onToggleRoot,
  purgeBeforeRestore,
  onPurgeBeforeRestoreChange,
  isRestoring,
  onConfirm,
}: BackupRestoreDialogProps) {
  return (
    <Dialog preserveDashboardScroll open={!!restoreTarget} onOpenChange={onOpenChange}>
      <DialogContent open={!!restoreTarget} className="max-w-lg rounded-none border-slate-200 [&>button]:hidden p-0">
        <DialogTitle className="sr-only">Restaurar backup</DialogTitle>

        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
            Restaurar backup
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-slate-100 px-3 py-2 border border-slate-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
              Arquivo
            </p>
            <p className="text-[12px] font-mono text-slate-700">{restoreTarget?.filename}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {restoreTarget && fmtDate(restoreTarget.metadata.createdAt)} •{' '}
              {restoreTarget?.metadata.totalDocs.toLocaleString('pt-BR')} docs •{' '}
              {restoreTarget && fmtBytes(restoreTarget.metadata.sizeBytes)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modo</p>
            <div className="flex gap-4">
              {(['merge', 'overwrite'] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restore-mode"
                    value={m}
                    checked={restoreMode === m}
                    onChange={() => onRestoreModeChange(m)}
                    className="accent-emerald-500"
                  />
                  <div>
                    <span className="text-[12px] font-bold text-slate-700 capitalize">{m}</span>
                    <p className="text-[10px] text-slate-500">
                      {m === 'merge'
                        ? 'Upsert — não apaga docs existentes'
                        : 'Substitui o conteúdo de cada doc'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {availableRoots.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Coleções (vazio = todas)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {availableRoots.map((root) => (
                  <label key={root} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedRoots.includes(root)}
                      onCheckedChange={() => onToggleRoot(root)}
                      className="rounded-full border-slate-300"
                    />
                    <span className="text-[11px] font-mono text-slate-700">{root}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer border border-red-200 bg-red-50 px-3 py-2">
            <Checkbox
              checked={purgeBeforeRestore}
              onCheckedChange={(v) => onPurgeBeforeRestoreChange(v === true)}
              className="rounded-full border-red-300 mt-0.5"
            />
            <div>
              <p className="text-[11px] font-black text-red-700 uppercase tracking-wider">
                Limpar coleções antes de restaurar
              </p>
              <p className="text-[10px] text-red-500 mt-0.5">
                Apaga todos os documentos existentes nas coleções selecionadas. Irreversível.
              </p>
            </div>
          </label>

          {purgeBeforeRestore && (
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p className="text-[11px] font-bold">
                ATENÇÃO: Os dados atuais serão permanentemente apagados antes da restauração.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <Button
            variant="ghost"
            size="sm"
            className="border-0 bg-slate-200 hover:bg-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 h-8"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="border-0 h-8 text-[11px] font-black uppercase tracking-widest rounded-xl"
            onClick={onConfirm}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Restaurando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                Confirmar Restauração
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
