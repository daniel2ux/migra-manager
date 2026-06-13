import type { Timestamp } from "@/supabase/compat-db-shim";

export interface ChargeGroup {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  objectIds: string[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}
