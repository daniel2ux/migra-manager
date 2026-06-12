'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { BackupCreatePanel } from './backup-create-panel';
import { BackupDeleteDialog } from './backup-delete-dialog';
import { BackupList } from './backup-list';
import { BackupLocalRestorePanel } from './backup-local-restore-panel';
import { BackupRestoreDialog } from './backup-restore-dialog';
import { useBackupManager } from './use-backup-manager';

export interface BackupManagerHandle {
  refresh: () => Promise<void>;
}

interface BackupManagerProps {
  projectId: string | null;
  projectName?: string;
  onLoadingListChange?: (loading: boolean) => void;
}

export const BackupManager = forwardRef<BackupManagerHandle, BackupManagerProps>(
  function BackupManager({ projectId, projectName, onLoadingListChange }, ref) {
    const manager = useBackupManager({ projectId, projectName, onLoadingListChange });

    useImperativeHandle(ref, () => ({ refresh: manager.loadBackups }), [manager.loadBackups]);

    const handleExecute = () => {
      if (manager.backupType === 'full') {
        void manager.createBackup();
      } else {
        void manager.createMockBackup();
      }
    };

    return (
      <div className="space-y-6">
        <BackupCreatePanel
          backupType={manager.backupType}
          onBackupTypeChange={manager.setBackupType}
          backupDestination={manager.backupDestination}
          onBackupDestinationChange={manager.setBackupDestination}
          onExecute={handleExecute}
          isCreating={manager.isCreating}
          isCreatingMock={manager.isCreatingMock}
          projectId={manager.projectId}
          selectedMock={manager.selectedMock}
          onSelectedMockChange={manager.setSelectedMock}
          isLoadingMocks={manager.isLoadingMocks}
          sortedMocks={manager.sortedMocks}
          objectCountByMock={manager.objectCountByMock}
        />

        <BackupList
          backups={manager.backups}
          isLoadingList={manager.isLoadingList}
          onDownload={(filename) => void manager.downloadBackup(filename)}
          onRestore={manager.openRestoreDialog}
          onDelete={manager.setDeleteTarget}
        />

        <BackupLocalRestorePanel
          fileInputRef={manager.fileInputRef}
          localFile={manager.localFile}
          onFileChange={manager.handleFileChange}
          localRestoreMode={manager.localRestoreMode}
          onLocalRestoreModeChange={manager.setLocalRestoreMode}
          localPurge={manager.localPurge}
          onLocalPurgeChange={manager.setLocalPurge}
          isRestoringFile={manager.isRestoringFile}
          onRestore={() => void manager.restoreLocalFile()}
        />

        <BackupRestoreDialog
          restoreTarget={manager.restoreTarget}
          onOpenChange={(open) => !open && manager.setRestoreTarget(null)}
          restoreMode={manager.restoreMode}
          onRestoreModeChange={manager.setRestoreMode}
          availableRoots={manager.availableRoots}
          selectedRoots={manager.selectedRoots}
          onToggleRoot={manager.toggleRoot}
          purgeBeforeRestore={manager.purgeBeforeRestore}
          onPurgeBeforeRestoreChange={manager.setPurgeBeforeRestore}
          isRestoring={manager.isRestoring}
          onConfirm={() => void manager.confirmRestore()}
        />

        <BackupDeleteDialog
          deleteTarget={manager.deleteTarget}
          onOpenChange={(open) => !open && manager.setDeleteTarget(null)}
          isDeleting={manager.isDeleting}
          onConfirm={() => void manager.confirmDelete()}
        />
      </div>
    );
  },
);
