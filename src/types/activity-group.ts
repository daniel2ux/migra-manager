import type { Timestamp } from "@/supabase/compat-db-shim";

export interface ActivityGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  displayOrder: number;
  objectIds: string[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}
