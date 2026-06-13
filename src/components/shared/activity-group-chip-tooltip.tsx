"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityGroup } from "@/types/activity-group";

export type ActivityGroupTooltipFields = Pick<ActivityGroup, "id" | "name" | "color"> & {
  description?: string;
};

export function activityGroupDescription(group: ActivityGroupTooltipFields): string | null {
  const description = group.description?.trim();
  if (!description) return null;
  if (description.toLowerCase() === group.name.trim().toLowerCase()) return null;
  return description;
}

interface ActivityGroupChipTooltipProps {
  group: ActivityGroupTooltipFields;
  children: React.ReactElement;
  /** Acima de popovers/diálogos (z-[230]). */
  elevated?: boolean;
}

export function ActivityGroupChipTooltip({
  group,
  children,
  elevated = false,
}: ActivityGroupChipTooltipProps) {
  const description = activityGroupDescription(group);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        variant="fiori-panel"
        className={elevated ? "w-64 z-[230]" : "w-64 z-[220]"}
      >
        <div className="fiori-tooltip-panel-body">
          <div className="fiori-tooltip-panel-section-title">
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className="fiori-activity-group-badge-swatch"
                style={{ backgroundColor: group.color }}
                aria-hidden
              />
              <span className="truncate normal-case tracking-normal font-semibold">{group.name}</span>
            </span>
          </div>
          {description && (
            <p className="fiori-tooltip-panel-desc mb-0 text-[0.8125rem] leading-snug">{description}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
