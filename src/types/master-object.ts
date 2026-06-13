import type { Timestamp } from "@/supabase/compat-db-shim";

export interface MasterObject {
    id: string;
    name: string;
    description?: string;
    type?: "MASTER" | "TRANSACTIONAL" | "TECHNICAL" | "SCRIPT";
    status?: "ATIVO" | "INATIVO" | "LEGACY";
    chargeGroup?: string;
    chargeOrder?: string | number;
    parallelOrder?: string | number;
    isParallel?: boolean;
    dependencyIds?: string[];
    externalDependencies?: string[];
    ownerId?: string;
    updatedAt?: Timestamp | Date | null;
    activityGroupIds?: string[];
    /** ID do documento em `migrationObjects/{mock}` ao visualizar/editar sequência nesta mock. */
    _migrationDocId?: string;
}
