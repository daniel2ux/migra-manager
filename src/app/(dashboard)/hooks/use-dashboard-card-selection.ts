import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AggregatedObject } from "@/types/migration";
import { getDashboardCardKey } from "@/lib/dashboard/card-key";
import {
  beginDashboardDialogScroll,
  endDashboardDialogScroll,
  ensureDashboardCardVisible,
  isDashboardDialogScrollLocked,
} from "@/lib/dashboard/scroll-preservation";

interface UseDashboardCardSelectionOptions {
  visibleObjects: AggregatedObject[];
  resetKey?: string | null;
  anyDialogOpen: boolean;
}

export function useDashboardCardSelection({
  visibleObjects,
  resetKey,
  anyDialogOpen,
}: UseDashboardCardSelectionOptions) {
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const dialogWasOpenRef = useRef(false);

  const selectCard = useCallback((obj: AggregatedObject) => {
    setSelectedCardKey(getDashboardCardKey(obj));
  }, []);

  const openCardDialog = useCallback((obj: AggregatedObject, open: () => void) => {
    beginDashboardDialogScroll();
    setSelectedCardKey(getDashboardCardKey(obj));
    open();
  }, []);

  useEffect(() => {
    setSelectedCardKey(null);
    endDashboardDialogScroll(false);
  }, [resetKey]);

  useEffect(() => {
    if (!selectedCardKey) return;
    const stillVisible = visibleObjects.some(
      (obj) => getDashboardCardKey(obj) === selectedCardKey,
    );
    if (!stillVisible) setSelectedCardKey(null);
  }, [visibleObjects, selectedCardKey]);

  useLayoutEffect(() => {
    if (anyDialogOpen) {
      if (!isDashboardDialogScrollLocked()) {
        beginDashboardDialogScroll();
      }
      dialogWasOpenRef.current = true;
      return;
    }

    if (!dialogWasOpenRef.current) return;

    dialogWasOpenRef.current = false;
    const savedScroll = endDashboardDialogScroll(true);

    requestAnimationFrame(() => {
      if (savedScroll !== null && selectedCardKey) {
        ensureDashboardCardVisible(selectedCardKey);
      }
    });
  }, [anyDialogOpen, selectedCardKey]);

  return {
    selectedCardKey,
    selectCard,
    openCardDialog,
    isCardSelected: (obj: AggregatedObject) =>
      selectedCardKey === getDashboardCardKey(obj),
  };
}
