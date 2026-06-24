import type { MasterObject } from "@/types/master-object";

export type MasterObjectType = NonNullable<MasterObject["type"]>;

export const MASTER_OBJECT_TYPE_OPTIONS: readonly {
  value: MasterObjectType;
  label: string;
}[] = [
  { value: "MASTER", label: "Master" },
  { value: "COMMERCIAL_MASTER", label: "Dados mestres comerciais" },
  { value: "TECHNICAL_OBJECT", label: "Objetos técnicos" },
  { value: "EQUIPMENT_READING", label: "Gestão de equipamentos e leituras" },
  { value: "BILLING", label: "Faturamento e cobrança" },
  { value: "CUSTOMER_SERVICE", label: "Serviços ao cliente" },
  { value: "TRANSACTIONAL", label: "Transacional" },
  { value: "TECHNICAL", label: "Técnico" },
  { value: "SCRIPT", label: "Script" },
] as const;

export function isMasterObjectType(value: string): value is MasterObjectType {
  return MASTER_OBJECT_TYPE_OPTIONS.some((option) => option.value === value);
}

export const DEFAULT_MASTER_OBJECT_TYPE: MasterObjectType = "SCRIPT";

export function masterObjectTypeLabel(type: string | undefined | null): string {
  const found = MASTER_OBJECT_TYPE_OPTIONS.find((o) => o.value === type);
  return found?.label ?? type ?? "—";
}
