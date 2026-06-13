"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ActivityGroupOrderCellProps {
  order: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  saving: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCommit: (order: number) => void;
}

export function ActivityGroupOrderCell({
  order,
  canMoveUp,
  canMoveDown,
  saving,
  onMoveUp,
  onMoveDown,
  onCommit,
}: ActivityGroupOrderCellProps) {
  const [draft, setDraft] = useState(String(order));

  useEffect(() => {
    setDraft(String(order));
  }, [order]);

  function commitDraft() {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : order;
    setDraft(String(next));
    if (next !== order) onCommit(next);
  }

  return (
    <div
      className={cn(
        "fiori-activity-groups-order-inline",
        saving && "fiori-activity-groups-order-inline--saving",
      )}
    >
      <button
        type="button"
        className="fiori-activity-groups-order-nav"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMoveUp();
        }}
        disabled={!canMoveUp || saving}
        aria-label="Subir ordem"
        title="Subir ordem"
      >
        <ChevronUp className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      <div className="fiori-activity-groups-order-value">
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-[var(--fiori-brand)]" aria-hidden />
        ) : (
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            className="fiori-activity-groups-order-field"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            aria-label="Ordem de exibição"
          />
        )}
      </div>
      <button
        type="button"
        className="fiori-activity-groups-order-nav"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMoveDown();
        }}
        disabled={!canMoveDown || saving}
        aria-label="Descer ordem"
        title="Descer ordem"
      >
        <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
