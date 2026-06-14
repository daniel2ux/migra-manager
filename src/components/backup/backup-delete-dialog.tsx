import { Loader2, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BackupListItem } from '@/lib/backup/types';

interface BackupDeleteDialogProps {
  deleteTarget: BackupListItem | null;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function BackupDeleteDialog({
  deleteTarget,
  onOpenChange,
  isDeleting,
  onConfirm,
}: BackupDeleteDialogProps) {
  return (
    <Dialog preserveDashboardScroll open={!!deleteTarget} onOpenChange={onOpenChange}>
      <DialogContent open={!!deleteTarget} className="max-w-sm rounded-none border-slate-200 [&>button]:hidden p-0">
        <DialogTitle className="sr-only">Excluir backup</DialogTitle>

        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <Trash2 className="w-4 h-4 text-red-500" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
            Excluir backup
          </span>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[12px] text-slate-700">
            {deleteTarget?.source === 'local'
              ? 'Remove o registro deste backup da lista. O arquivo .json.gz permanece na pasta local do seu computador.'
              : 'O arquivo será permanentemente removido do Storage. Esta ação não pode ser desfeita.'}
          </p>
          <div className="bg-slate-100 px-3 py-2 border border-slate-200">
            <p className="text-[12px] font-mono text-slate-700">{deleteTarget?.filename}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <Button
            variant="ghost"
            size="sm"
            className="border-0 bg-slate-200 hover:bg-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 h-8"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="border-0 h-8 text-[11px] font-black uppercase tracking-widest rounded-xl"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1.5" />
                Excluir
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
