import { Timestamp } from "@/supabase/compat-db-shim";
import { MigrationObjectStatus } from "@/types/migration";

export interface MasterObject {
    id: string;
    name: string;
    description: string;
    status?: "ATIVO" | "INATIVO" | "LEGACY";
    chargeGroup?: string;
    chargeOrder?: string | number;
    isParallel?: boolean;
    dependencyIds?: string[];
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

export interface MigrationObject {
    id: string;
    mockId: string;
    projectId: string;
    masterObjectId?: string;
    name: string;
    description: string;
    chargeGroup?: string;
    chargeOrder?: string | number;
    chargeStartTime: string;
    chargeEndTime: string;
    initialChargeStartTime?: string;
    initialChargeEndTime?: string;
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
    status?: MigrationObjectStatus;
    loadHistory?: LoadHistoryEntry[];
    hasTechLogs?: boolean;
    // Enriched display fields (computed from master)
    displayGroup?: string;
    displayOrder?: string | number;
    displayIsParallel?: boolean;
    displayDependencies?: string[];
    updatedAt?: any;
}

export interface MigrationComment {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    authorRole?: string;
    projectId?: string;
    mockId?: string;
    objectId?: string;
    status: 'aberta' | 'andamento' | 'resolvida' | 'bloqueada';
    createdAt: Timestamp | string;
    __path?: string;
}
