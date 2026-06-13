import type { MasterObject } from "@/types/master-object";

export type MasterObjectType = NonNullable<MasterObject["type"]>;

export const MASTER_OBJECT_TYPE_OPTIONS: readonly {
  value: MasterObjectType;
  label: string;
}[] = [
  { value: "MASTER", label: "Master" },
  { value: "TRANSACTIONAL", label: "Transacional" },
  { value: "TECHNICAL", label: "Técnico" },
  { value: "SCRIPT", label: "Script" },
] as const;

export const DEFAULT_MASTER_OBJECT_TYPE: MasterObjectType = "SCRIPT";

export function masterObjectTypeLabel(type: string | undefined | null): string {
  const found = MASTER_OBJECT_TYPE_OPTIONS.find((o) => o.value === type);
  return found?.label ?? type ?? "—";
}
