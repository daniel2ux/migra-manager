import type { Timestamp } from "firebase/firestore";

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
