
import type { Timestamp } from "@/supabase/compat-db-shim";

export interface MemberProfile {
  uid: string;
  name: string;
  role?: string;
  position?: string;
}

export interface Project {
  id: string;
  name: string;
  memberUids: string[];
  memberProfiles?: MemberProfile[];
  isLocked?: boolean;
  lockedByMaster?: boolean;
  lockedByUid?: string;
  lockedByName?: string;
  /** Empresa-cliente (campo `company` no CompatDb) */
  company?: string;
  /** FK para `companies` — obrigatório para cadastro de objetos mestre */
  companyId?: string;
  /** @deprecated Preferir `company` */
  empresa?: string;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  imageUrl?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role?: 'master' | 'admin' | 'user';
  isMaster?: boolean;
  projectIds?: string[];
  position?: string;
  isDisabled?: boolean;
  mustChangePassword?: boolean;
  migradorName?: string;
  fromEmail?: string;
  emailSignatures?: EmailSignature[];
  notes?: string;
  photoURL?: string;
}

export interface Comment {
  id: string;
  projectId?: string;
  objectId?: string;
  objectName?: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp | string;
  __path?: string;
}

export interface LoadHistoryEntry {
  id: string;
  type: 'inicial' | 'reprocessamento';
  startTime: string;
  endTime: string | null;
  targetCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  successPct: number;
  durationMs: number;
  userId: string;
  userName: string;
}

export type MigrationObjectStatus = 'PENDENTE' | 'CARGA_EM_ANDAMENTO' | 'CARGA_CONCLUIDA';

export interface MigrationObject {
  id: string;
  mockId: string;
  projectId: string;
  masterObjectId?: string;
  name: string;
  description: string;
  chargeGroup?: string;
  chargeOrder?: string | number;

  // Immutabile after first load
  initialChargeStartTime?: string;
  initialChargeEndTime?: string;

  // Reflecst LATEST execution
  chargeStartTime: string;
  chargeEndTime: string;

  targetRecordsCount: number;
  processedRecordsCount: number;
  migratedRecordsCount: number;
  successfulRecordsCount: number;
  errorRecordsCount: number;
  currentChargeDurationMs: number;

  previousMigratedRecordsCount: number;
  previousChargeDurationMs: number;

  dependencyIds?: string[];
  ownerId: string;
  isParallel?: boolean;
  parallelOrder?: string | number;
  status?: MigrationObjectStatus;
  hasTechLogs?: boolean;

  loadHistory?: LoadHistoryEntry[];
}
export type MigrationLogStatus = 'ERROR' | 'WARN' | 'INFO' | 'OK';

export interface MigrationLog {
  id: string;
  object: string;
  mock: string;
  filename: string;
  seq: number;
  status: MigrationLogStatus;
  infoKey: string;
  errorId?: string;
  errorNumber?: string;
  message: string;
  username: string;
  startedAt: Timestamp;
  // Auxiliary fields added on import
  importedAt: Timestamp;
  sourceFileName: string;
  projectId: string;
  oldKey?: string;
}

export interface AppConfig {
  logPath: string;
  maxImportLines?: number;
  updatedAt: string;
  updatedByUid: string;
  updatedByName: string;
}

export interface Mock {
  id: string;
  projectId: string;
  name: string;
  slug?: string;
  explanatoryText: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  isLoaded?: boolean;
  lockedByMaster?: boolean;
  lockedByUid?: string;
  lockedByName?: string;
  isRunning?: boolean;
  isActive?: boolean;
  quantityExistingObjects: number;
  status?: string;
  data_inicio_carga?: string;
  data_fim_carga?: string;
  __path?: string;
  loadHistory?: LoadHistoryEntry[];
}

export interface AggregatedObject {
  id: string;
  name: string;
  description: string;
  chargeGroup: string;
  chargeOrder: string | number;
  parallelOrder?: string | number;
  targetRecordsCount: number;
  processedRecordsCount: number;
  successfulRecordsCount: number;
  errorRecordsCount: number;
  currentChargeDurationMs: number;
  previousChargeDurationMs: number;
  isInProgress: boolean;
  isLoaded: boolean;
  hasComments: boolean;
  mockId?: string;
  mockName?: string;
  projectId?: string;
  mockIsLocked?: boolean;
  status?: MigrationObjectStatus;
  hasTechLogs?: boolean;
  chargeStartTime?: string | null;
  chargeEndTime?: string | null;
  _catalogOrder?: string | number;
  _catalogParallelOrder?: string | number;
  dependencyIds?: string[];
  isChainCircular?: boolean;
  precedenceChain?: {
    id: string;
    name: string;
    order: string | number;
    parallel?: string | number;
  }[];
  history: {
    label: string;
    mockId: string;
    sucesso: number;
    erro: number;
    total: number;
    target: number;
    sucessoPct: string;
    erroPct: string;
    processedPct: string;
    duracaoMs: number;
    isRunning: boolean;
    isLoaded: boolean;
  }[];
}
