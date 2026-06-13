"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityGroup } from "@/types/activity-group";

interface ActivityGroupBadgesProps {
  groupIds?: string[];
  allGroups: ActivityGroup[];
  maxVisible?: number;
}

function groupDescription(group: ActivityGroup): string | null {
  const description = group.description?.trim();
  if (!description) return null;
  if (description.toLowerCase() === group.name.trim().toLowerCase()) return null;
  return description;
}

function truncateLabel(name: string, maxLength = 10): string {
  return name.length > maxLength ? `${name.slice(0, maxLength)}…` : name;
}

export function ActivityGroupBadges({ groupIds, allGroups, maxVisible = 2 }: ActivityGroupBadgesProps) {
  if (!groupIds?.length) return null;

  const groups = groupIds
    .map((id) => allGroups.find((g) => g.id === id))
    .filter(Boolean) as ActivityGroup[];

  if (!groups.length) return null;

  const visible = groups.slice(0, maxVisible);
  const hidden = groups.slice(maxVisible);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        {visible.map((g) => {
          const description = groupDescription(g);

          return (
            <Tooltip key={g.id}>
              <TooltipTrigger asChild>
                <span className="fiori-activity-group-badge max-w-[7rem]">
                  <span
                    className="fiori-activity-group-badge-swatch"
                    style={{ backgroundColor: g.color }}
                    aria-hidden
                  />
                  <span className="fiori-activity-group-badge-label">
                    {truncateLabel(g.name)}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                variant="fiori-panel"
                className="w-64 z-[200]"
              >
                <div className="fiori-tooltip-panel-body">
                  <div className="fiori-tooltip-panel-section-title">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="fiori-activity-group-badge-swatch"
                        style={{ backgroundColor: g.color }}
                        aria-hidden
                      />
                      <span className="truncate normal-case tracking-normal font-semibold">{g.name}</span>
                    </span>
                  </div>
                  {description && (
                    <p className="fiori-tooltip-panel-desc mb-0 text-[0.8125rem] leading-snug">{description}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {hidden.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="fiori-activity-group-badge fiori-activity-group-badge--overflow">
                +{hidden.length}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              variant="fiori-panel"
              className="w-64 z-[200]"
            >
              <div className="fiori-tooltip-panel-body">
                <div className="fiori-tooltip-panel-section-title">
                  <span>Grupos de atividade</span>
                  <span className="fiori-tooltip-panel-badge">{hidden.length}</span>
                </div>
                <div className="fiori-tooltip-panel-dep-list">
                  {hidden.map((g) => (
                    <div key={g.id} className="fiori-tooltip-panel-dep-item">
                      <span
                        className="fiori-activity-group-badge-swatch"
                        style={{ backgroundColor: g.color }}
                        aria-hidden
                      />
                      <span className="truncate">{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
