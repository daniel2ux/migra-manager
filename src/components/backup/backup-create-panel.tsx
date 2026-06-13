import { AlertCircle, HardDrive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mock } from '@/types/migration';
import type { BackupDestination } from '@/lib/backup/build-backup';

interface BackupCreatePanelProps {
  backupType: 'full' | 'mock';
  onBackupTypeChange: (type: 'full' | 'mock') => void;
  backupDestination: BackupDestination;
  onBackupDestinationChange: (destination: BackupDestination) => void;
  onExecute: () => void;
  isCreating: boolean;
  isCreatingMock: boolean;
  projectId: string | null;
  selectedMock: string;
  onSelectedMockChange: (mockId: string) => void;
  isLoadingMocks: boolean;
  sortedMocks: Mock[];
  objectCountByMock: Record<string, number>;
}

export function BackupCreatePanel({
  backupType,
  onBackupTypeChange,
  backupDestination,
  onBackupDestinationChange,
  onExecute,
  isCreating,
  isCreatingMock,
  projectId,
  selectedMock,
  onSelectedMockChange,
  isLoadingMocks,
  sortedMocks,
  objectCountByMock,
}: BackupCreatePanelProps) {
  const isExecuting = backupType === 'full' ? isCreating : isCreatingMock;
  const isDisabled =
    backupType === 'full' ? isCreating : isCreatingMock || !projectId || !selectedMock;

  return (
    <div className="fiori-backup-create">
      <h3 className="fiori-wizard-panel-title">
        <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Criar backup
      </h3>
      <p className="fiori-wizard-panel-desc">
        Exporte todos os dados do sistema ou selecione uma mock do projeto atual (mock, objetos e logs).
        Escolha gravar no armazenamento na nuvem ou salvar em uma pasta local do seu computador.
      </p>

      <div className="fiori-backup-type-row">
        <div className="fiori-on-off fiori-backup-type-toggle">
          <span className="fiori-on-off__label">Tipo</span>
          <div className="fiori-on-off__group" role="group" aria-label="Tipo de backup">
            <button
              type="button"
              className={cn(
                'fiori-on-off__btn',
                backupType === 'full' && 'fiori-on-off__btn--selected',
              )}
              onClick={() => onBackupTypeChange('full')}
            >
              Backup completo
            </button>
            <button
              type="button"
              className={cn(
                'fiori-on-off__btn',
                backupType === 'mock' && 'fiori-on-off__btn--selected',
              )}
              onClick={() => onBackupTypeChange('mock')}
            >
              Por mock
            </button>
          </div>
        </div>

        <div className="fiori-on-off fiori-backup-dest-toggle">
          <span className="fiori-on-off__label">Destino</span>
          <div className="fiori-on-off__group" role="group" aria-label="Destino do backup">
            <button
              type="button"
              className={cn(
                'fiori-on-off__btn',
                backupDestination === 'storage' && 'fiori-on-off__btn--selected',
              )}
              onClick={() => onBackupDestinationChange('storage')}
            >
              Nuvem
            </button>
            <button
              type="button"
              className={cn(
                'fiori-on-off__btn',
                backupDestination === 'local' && 'fiori-on-off__btn--selected',
              )}
              onClick={() => onBackupDestinationChange('local')}
            >
              Pasta local
            </button>
          </div>
        </div>

        <button
          type="button"
          className="fiori-wizard-btn fiori-wizard-btn--emphasized fiori-backup-execute-btn"
          onClick={onExecute}
          disabled={isDisabled}
          aria-label={
            backupType === 'full'
              ? 'Executar backup completo'
              : 'Executar backup do mock selecionado'
          }
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Executando…
            </>
          ) : (
            'Executar'
          )}
        </button>
      </div>

      {backupType === 'mock' && (
        <div className="fiori-backup-mock-fields">
          {isLoadingMocks ? (
            <div className="fiori-wizard-empty fiori-backup-mock-list">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--fiori-brand)]" aria-hidden />
              <p>Carregando mocks…</p>
            </div>
          ) : sortedMocks.length > 0 ? (
            <div className="fiori-wizard-chip-grid fiori-backup-mock-list">
              {sortedMocks.map((mock) => {
                const objectCount = objectCountByMock[mock.id] ?? 0;
                const isSelected = selectedMock === mock.id;

                return (
                  <button
                    key={mock.id}
                    type="button"
                    onClick={() => onSelectedMockChange(mock.id)}
                    className={cn('fiori-chip', isSelected && 'fiori-chip-selected')}
                    aria-pressed={isSelected}
                  >
                    <span className="font-semibold">{mock.name}</span>
                    <span className="text-[0.6875rem] font-normal opacity-80">
                      {objectCount} objeto{objectCount !== 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="fiori-wizard-empty fiori-backup-mock-list">
              <AlertCircle className="w-6 h-6 text-[var(--fiori-label)]" aria-hidden />
              <p>Nenhuma mock encontrada neste projeto.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
