"use client";

import {
  Database,
  ArrowLeftRight,
  Cog,
  Terminal,
  Building2,
  Boxes,
  Gauge,
  Receipt,
  Headset,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  masterObjectTypeLabel,
  DEFAULT_MASTER_OBJECT_TYPE,
  type MasterObjectType,
} from "@/lib/migration/master-object-type";

const ICON_BY_TYPE: Record<MasterObjectType, LucideIcon> = {
  MASTER: Database,
  COMMERCIAL_MASTER: Building2,
  TECHNICAL_OBJECT: Boxes,
  EQUIPMENT_READING: Gauge,
  BILLING: Receipt,
  CUSTOMER_SERVICE: Headset,
  TRANSACTIONAL: ArrowLeftRight,
  TECHNICAL: Cog,
  SCRIPT: Terminal,
};

const ICON_COLOR_BY_TYPE: Record<MasterObjectType, string> = {
  MASTER: "text-sky-600",
  COMMERCIAL_MASTER: "text-blue-600",
  TECHNICAL_OBJECT: "text-indigo-600",
  EQUIPMENT_READING: "text-cyan-600",
  BILLING: "text-amber-600",
  CUSTOMER_SERVICE: "text-teal-600",
  TRANSACTIONAL: "text-emerald-600",
  TECHNICAL: "text-slate-600",
  SCRIPT: "text-violet-600",
};

function resolveMasterObjectType(type: string | undefined | null): MasterObjectType {
  if (type && type in ICON_BY_TYPE) return type as MasterObjectType;
  return DEFAULT_MASTER_OBJECT_TYPE;
}

export function getMasterObjectTypeIconMeta(type: string | undefined | null) {
  const resolved = resolveMasterObjectType(type);
  return {
    resolved,
    Icon: ICON_BY_TYPE[resolved],
    colorClass: ICON_COLOR_BY_TYPE[resolved],
    label: masterObjectTypeLabel(resolved),
  };
}

interface MasterObjectTypeIconProps {
  type?: string | null;
}

export function MasterObjectTypeIcon({ type }: MasterObjectTypeIconProps) {
  const resolved = resolveMasterObjectType(type);
  const Icon = ICON_BY_TYPE[resolved];
  const label = masterObjectTypeLabel(resolved);

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 cursor-help" tabIndex={0}>
          <Icon
            className={cn("w-3.5 h-3.5 shrink-0", ICON_COLOR_BY_TYPE[resolved])}
            aria-hidden
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" variant="fiori">
        Tipo: {label}
      </TooltipContent>
    </Tooltip>
  );
}
