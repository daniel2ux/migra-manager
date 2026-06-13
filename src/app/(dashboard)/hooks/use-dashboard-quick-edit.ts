import { useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, type CompatDb } from '@/supabase/compat-db-shim';
import type { User } from '@/supabase/auth-shim';
import { addDocumentNonBlocking } from '@/supabase/mutations';
import { useEditLock } from '@/hooks/use-edit-lock';
import { useToast } from '@/hooks/use-toast';
import { formatStatDate, formatStatTime } from './use-dashboard-export';
import type { AggregatedObject, Project, Mock, UserProfile } from '@/types/migration';
import type { MasterObject } from '@/types/master-object';
import { getProjectCompanyDisplay, getProjectNameForContext } from '@/lib/migration/project-company';

type ToastFn = ReturnType<typeof useToast>['toast'];

interface LogViewerTarget {
  name: string; mockId: string; mockName: string; errorCount: number;
  migrador: string; dataMigr: string; hrExecMig: string; empresa: string; projectId: string;
  projectName?: string;
}

interface UseDashboardQuickEditDeps {
  db: CompatDb | null; 
  user: User | null; 
  isAdmin: boolean | undefined; 
  userProfile: UserProfile | null;
  effectiveMockId: string | null | undefined; 
  selectedProjectId: string;
  mocksByIdMap: Map<string, Mock>; 
  migradorName: string;
  toast: ToastFn; 
  projects: Project[] | null | undefined;
  masterObjects: MasterObject[] | null | undefined;
}

// ── Sub-hook: Browser history integration ─────────────────────────────────
// Desabilitado no dashboard: pushState ao abrir modais causava salto de scroll
// no container principal (`main`), especialmente com modais Radix.
function useHistoryBack(_key: string, _isOpen: boolean, _onClose: () => void) {
  // noop
}

// ── Sub-hook: Quick edit dialog ───────────────────────────────────────────

function useQuickEditDialog(
  db: CompatDb | null, 
  user: User | null, 
  isAdmin: boolean | undefined, 
  userProfile: UserProfile | null
) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [isQuickReadOnly, setIsQuickReadOnly] = useState(false);
  const [quickEditObject, setQuickEditObject] = useState<AggregatedObject | null>(null);
  const [quickFormData, setQuickFormData] = useState({
    targetRecordsCount: 0, processedRecordsCount: 0, errorRecordsCount: 0,
    chargeStartTime: '', chargeEndTime: '',
  });
  const [isForceLockOpen, setIsForceLockOpen] = useState(false);
  const [forceLockTarget, setForceLockTarget] = useState<AggregatedObject | null>(null);
  const [forceLockBlockerName, setForceLockBlockerName] = useState<string | null>(null);

  const { acquireLock: acquireQuickLock, releaseLock: releaseQuickLock } = useEditLock(
    quickEditObject?.projectId && quickEditObject?.mockId
      ? `projects/${quickEditObject.projectId}/mocks/${quickEditObject.mockId}/migrationObjects/${quickEditObject.id}`
      : null,
    user?.uid ?? null, userProfile?.name ?? user?.email ?? null, user?.email ?? null,
  );

  useHistoryBack('quickEdit', quickOpen, () => setQuickOpen(false));

  const populateAndOpen = (obj: AggregatedObject) => {
    setQuickEditObject(obj);
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const currentDateTime = localNow.toISOString().slice(0, 16);
    setQuickFormData({
      targetRecordsCount: obj.targetRecordsCount || 0,
      processedRecordsCount: obj.processedRecordsCount || obj.targetRecordsCount || 0,
      errorRecordsCount: obj.errorRecordsCount || 0,
      chargeStartTime: obj.chargeStartTime || currentDateTime,
      chargeEndTime: obj.chargeEndTime || obj.chargeStartTime || currentDateTime,
    });
    setQuickOpen(true);
  };

  const handleOpen = async (obj: AggregatedObject) => {
    if (!isAdmin) return;
    if (obj.mockIsLocked) { setIsQuickReadOnly(true); populateAndOpen(obj); return; }
    setIsQuickReadOnly(false);
    const resourceId = `projects/${obj.projectId}/mocks/${obj.mockId}/migrationObjects/${obj.id}`;
    const { acquired, lockedByName: blocker } = await acquireQuickLock(resourceId);
    if (!acquired) {
      setForceLockTarget(obj); setForceLockBlockerName(blocker || 'Outro usuário');
      setIsForceLockOpen(true); return;
    }
    populateAndOpen(obj);
  };

  const handleForceAcquire = async (toast: ToastFn) => {
    if (!forceLockTarget || !isAdmin) return;
    setIsForceLockOpen(false); setIsQuickReadOnly(false);
    const resourceId = `projects/${forceLockTarget.projectId}/mocks/${forceLockTarget.mockId}/migrationObjects/${forceLockTarget.id}`;
    const { acquired, lockedByName: blocker } = await acquireQuickLock(resourceId, true);
    if (acquired) { populateAndOpen(forceLockTarget); }
    else { toast({ variant: 'destructive', description: `FALHA AO FORÇAR LIBERAÇÃO: ${blocker || 'Desconhecido'}` }); }
    setForceLockTarget(null); setForceLockBlockerName(null);
  };

  const handleViewOnly = () => {
    if (!forceLockTarget) return;
    setIsForceLockOpen(false); setIsQuickReadOnly(true);
    populateAndOpen(forceLockTarget);
    setForceLockTarget(null); setForceLockBlockerName(null);
  };

  const handleSave = (dataFromDialog?: typeof quickFormData, toast?: ToastFn) => {
    const data = dataFromDialog || quickFormData;
    if (!isAdmin || !quickEditObject || !db) return;
    const projId = quickEditObject.projectId;
    const mId = quickEditObject.mockId;
    if (!projId || !mId) { toast?.({ variant: 'destructive', description: 'Erro interno: ID do projeto ou mock ausente.' }); return; }
    const target = Number(data.targetRecordsCount) || 0;
    const processed = Number(data.processedRecordsCount) || 0;
    const error = Number(data.errorRecordsCount) || 0;
    let durationMs = 0;
    if (data.chargeStartTime && data.chargeEndTime) {
      const start = new Date(data.chargeStartTime).getTime(), end = new Date(data.chargeEndTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) durationMs = Math.max(1, end - start);
    }
    const objectData = {
      targetRecordsCount: target, processedRecordsCount: processed, errorRecordsCount: error,
      successfulRecordsCount: Math.max(0, processed - error), migratedRecordsCount: processed,
      chargeStartTime: data.chargeStartTime || '', chargeEndTime: data.chargeEndTime || '',
      currentChargeDurationMs: durationMs, updatedAt: serverTimestamp(),
      status: data.chargeEndTime ? 'CONCLUÍDO' : undefined,
    };
    
    return setDoc(doc(db, 'projects', projId, 'mocks', mId, 'migrationObjects', quickEditObject.id), objectData, { merge: true })
      .then(() => { setQuickOpen(false); })
      .catch((err) => { 
        console.error('handleSave error:', err);
        toast?.({ variant: 'destructive', description: 'Erro ao salvar ciclo no banco de dados.' }); 
      });
  };

  return {
    quickOpen, setQuickOpen, isQuickReadOnly, setIsQuickReadOnly,
    quickEditObject, setQuickEditObject,
    quickFormData, setQuickFormData,
    isForceLockOpen, setIsForceLockOpen, forceLockTarget, forceLockBlockerName,
    releaseQuickLock, handleOpen, handleForceAcquire, handleViewOnly, handleSave,
  };
}

// ── Sub-hook: Comment dialog ──────────────────────────────────────────────

function useCommentDialog(
  db: CompatDb | null, 
  user: User | null, 
  userProfile: UserProfile | null
) {
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentTargetObject, setTargetObject] = useState<AggregatedObject | null>(null);
  const [quickCommentText, setQuickCommentText] = useState('');

  useHistoryBack('comment', commentDialogOpen, () => setCommentDialogOpen(false));

  const handleOpen = (obj: AggregatedObject) => {
    setTargetObject(obj); setQuickCommentText(''); setCommentDialogOpen(true);
  };

  const handleSave = (overrideText?: string) => {
    const text = (overrideText ?? quickCommentText).trim();
    if (!text || !commentTargetObject || !user || !db) return;
    addDocumentNonBlocking(collection(db, 'projects', commentTargetObject.projectId || '', 'mocks', commentTargetObject.mockId || '', 'migrationObjects', commentTargetObject.id, 'comments'), {
      text, authorId: user.uid,
      authorName: userProfile?.name || 'Especialista', authorRole: userProfile?.role || 'user',
      projectId: commentTargetObject.projectId, mockId: commentTargetObject.mockId,
      objectId: commentTargetObject.id, objectName: commentTargetObject.name,
      createdAt: serverTimestamp(),
    });
    setCommentDialogOpen(false);
    setQuickCommentText('');
  };

  return { commentDialogOpen, setCommentDialogOpen, commentTargetObject, quickCommentText, setQuickCommentText, handleOpen, handleSave };
}

// ── Sub-hook: Log viewer ──────────────────────────────────────────────────

function useLogViewer(effectiveMockId: string | null | undefined, mocksByIdMap: Map<string, Mock>, projects: Project[] | null | undefined, selectedProjectId: string, migradorName: string) {
  const [logViewerObject, setLogViewerObject] = useState<LogViewerTarget | null>(null);

  useHistoryBack('logViewer', !!logViewerObject, () => setLogViewerObject(null));

  const handleOpen = (obj: AggregatedObject) => {
    const resolvedMockId = obj.mockId ?? effectiveMockId;
    if (!resolvedMockId) return;
    const proj =
      projects?.find((p: Project) => p.id === obj.projectId) ??
      (selectedProjectId !== "all"
        ? projects?.find((p: Project) => p.id === selectedProjectId)
        : undefined);
    setLogViewerObject({
      name: obj.name, mockId: resolvedMockId,
      mockName: mocksByIdMap.get(resolvedMockId)?.name || resolvedMockId,
      errorCount: obj.errorRecordsCount ?? 0, migrador: migradorName || '—',
      dataMigr: formatStatDate(obj.chargeStartTime || undefined),
      hrExecMig: formatStatTime(obj.chargeStartTime || undefined),
      empresa: getProjectCompanyDisplay(proj),
      projectId: obj.projectId || selectedProjectId,
      projectName: getProjectNameForContext(proj),
    });
  };

  return { logViewerObject, setLogViewerObject, handleOpen };
}

// ── Hook principal composto ───────────────────────────────────────────────

export function useDashboardQuickEdit({
  db, user, isAdmin, userProfile, effectiveMockId, selectedProjectId,
  mocksByIdMap, migradorName, toast, projects, masterObjects,
}: UseDashboardQuickEditDeps) {
  const quickEdit = useQuickEditDialog(db, user, isAdmin, userProfile);
  const comment = useCommentDialog(db, user, userProfile);
  const logViewer = useLogViewer(effectiveMockId, mocksByIdMap, projects, selectedProjectId, migradorName);

  const handleOpenPrecedence = (obj: AggregatedObject, onOpen: (master: MasterObject) => void, onNotFound: () => void) => {
    const found = masterObjects?.find(m => m.name === obj.name);
    if (found) onOpen(found); else onNotFound();
  };

  return {
    quickOpen: quickEdit.quickOpen, setQuickOpen: quickEdit.setQuickOpen,
    isQuickReadOnly: quickEdit.isQuickReadOnly, setIsQuickReadOnly: quickEdit.setIsQuickReadOnly,
    commentDialogOpen: comment.commentDialogOpen, setCommentDialogOpen: comment.setCommentDialogOpen,
    logViewerObject: logViewer.logViewerObject, setLogViewerObject: logViewer.setLogViewerObject,
    quickEditObject: quickEdit.quickEditObject, setQuickEditObject: quickEdit.setQuickEditObject,
    commentTargetObject: comment.commentTargetObject,
    quickFormData: quickEdit.quickFormData, setQuickFormData: quickEdit.setQuickFormData,
    quickCommentText: comment.quickCommentText, setQuickCommentText: comment.setQuickCommentText,
    isForceLockOpen: quickEdit.isForceLockOpen, setIsForceLockOpen: quickEdit.setIsForceLockOpen,
    forceLockTarget: quickEdit.forceLockTarget, forceLockBlockerName: quickEdit.forceLockBlockerName,
    releaseQuickLock: quickEdit.releaseQuickLock,
    openQuickDialogDirect: (obj: AggregatedObject) => { quickEdit.setQuickEditObject(obj); quickEdit.setQuickOpen(true); },
    handleOpenQuickDialog: (obj: AggregatedObject) => quickEdit.handleOpen(obj),
    handleForceAcquireQuick: () => quickEdit.handleForceAcquire(toast),
    handleViewOnlyQuick: quickEdit.handleViewOnly,
    handleOpenCommentDialog: comment.handleOpen,
    handleOpenLogViewer: logViewer.handleOpen,
    handleSaveQuick: quickEdit.handleSave,
    handleSaveQuickComment: comment.handleSave,
    handleOpenPrecedence,
  };
}

