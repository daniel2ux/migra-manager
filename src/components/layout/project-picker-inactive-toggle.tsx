"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PICKER_TOOLBAR_BTN =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

export function ProjectPickerInactiveToggle({
  showInactive,
  onToggle,
  inactiveCount,
  className,
}: {
  showInactive: boolean;
  onToggle: () => void;
  inactiveCount: number;
  className?: string;
}) {
  if (inactiveCount <= 0) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              PICKER_TOOLBAR_BTN,
              showInactive && "fiori-toolbar-btn-active",
              className,
            )}
            onClick={onToggle}
            aria-label={
              showInactive ? "Ocultar projetos inativos" : "Exibir projetos inativos"
            }
          >
            {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" variant="fiori">
          {showInactive
            ? "Ocultar projetos inativos"
            : `Exibir projetos inativos (${inactiveCount})`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
