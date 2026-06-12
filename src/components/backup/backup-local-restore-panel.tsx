import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { fmtBytes } from './backup-formatters';

interface BackupLocalRestorePanelProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  localFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  localRestoreMode: 'merge' | 'overwrite';
  onLocalRestoreModeChange: (mode: 'merge' | 'overwrite') => void;
  localPurge: boolean;
  onLocalPurgeChange: (purge: boolean) => void;
  isRestoringFile: boolean;
  onRestore: () => void;
}

export function BackupLocalRestorePanel({
  fileInputRef,
  localFile,
  onFileChange,
  localRestoreMode,
  onLocalRestoreModeChange,
  localPurge,
  onLocalPurgeChange,
  isRestoringFile,
  onRestore,
}: BackupLocalRestorePanelProps) {
  return (
    <div className="border border-slate-200 rounded-none p-4 space-y-3 bg-slate-50/60">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        Restaurar arquivo local
      </p>
      <p className="text-[11px] text-slate-500">
        Selecione um arquivo <code className="font-mono bg-slate-200 px-1 rounded">.json.gz</code>{' '}
        baixado anteriormente para restaurar.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json.gz,.gz"
          onChange={onFileChange}
          className="text-[11px] text-slate-600 file:mr-3 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:border-0 file:bg-slate-200 file:text-slate-700 file:rounded-lg file:px-3 file:py-1.5 file:cursor-pointer hover:file:bg-slate-300"
        />
        {localFile && (
          <span className="text-[11px] text-slate-500">{fmtBytes(localFile.size)}</span>
        )}
      </div>

      {localFile && (
        <div className="flex items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="local-mode"
              value="merge"
              checked={localRestoreMode === 'merge'}
              onChange={() => onLocalRestoreModeChange('merge')}
              className="accent-emerald-500"
            />
            <span className="text-[11px] text-slate-600">Merge (upsert)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="local-mode"
              value="overwrite"
              checked={localRestoreMode === 'overwrite'}
              onChange={() => onLocalRestoreModeChange('overwrite')}
              className="accent-emerald-500"
            />
            <span className="text-[11px] text-slate-600">Overwrite</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={localPurge}
              onCheckedChange={(v) => onLocalPurgeChange(v === true)}
              className="rounded-full border-slate-300"
            />
            <span className="text-[11px] text-red-600 font-bold">Limpar antes de restaurar</span>
          </label>
          <Button
            size="sm"
            className="border-0 h-8 text-[11px] font-black uppercase tracking-widest rounded-xl ml-auto"
            onClick={onRestore}
            disabled={isRestoringFile}
          >
            {isRestoringFile ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Restaurando...
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1.5" />
                Restaurar
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
