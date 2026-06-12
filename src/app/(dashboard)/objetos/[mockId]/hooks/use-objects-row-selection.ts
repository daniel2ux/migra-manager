"use client";

import { useState, useCallback } from 'react';

interface UseObjectsRowSelectionDeps {
  sortedObjects: Array<{ id: string }>;
}

/**
 * Gerencia a seleção de linhas na tabela de objetos,
 * incluindo shift-click para seleção em range.
 */
export function useObjectsRowSelection({ sortedObjects }: UseObjectsRowSelectionDeps) {
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleToggleObjectSelection = useCallback((
    id: string,
    index: number,
    event?: React.MouseEvent | React.KeyboardEvent,
  ) => {
    const isShiftKey = event && (event as any).shiftKey;

    setSelectedObjectIds(prev => {
      if (isShiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const rangeIds = sortedObjects.slice(start, end + 1).map(obj => obj.id);
        const isSelecting = !prev.includes(id);
        const newSelection = new Set(prev);
        rangeIds.forEach(rangeId => {
          if (isSelecting) newSelection.add(rangeId);
          else newSelection.delete(rangeId);
        });
        return Array.from(newSelection);
      }
      return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
    });
    setLastSelectedIndex(index);
  }, [lastSelectedIndex, sortedObjects]);

  const _handleToggleSelectRow = (id: string, index: number, isShiftKey: boolean) => {
    if (isShiftKey && lastSelectedIndex !== null) {
      const start = Math.min(index, lastSelectedIndex);
      const end = Math.max(index, lastSelectedIndex);
      const idsInRange = sortedObjects.slice(start, end + 1).map(obj => obj.id);
      setSelectedObjectIds(prev => {
        const areAllInRangeSelected = idsInRange.every(rangeId => prev.includes(rangeId));
        return areAllInRangeSelected
          ? prev.filter(rangeId => !idsInRange.includes(rangeId))
          : Array.from(new Set([...prev, ...idsInRange]));
      });
    } else {
      setSelectedObjectIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
    setLastSelectedIndex(index);
  };

  const _handleToggleSelectAllRows = (checked: boolean) => {
    setSelectedObjectIds(checked ? sortedObjects.map(obj => obj.id) : []);
  };

  return {
    selectedObjectIds, setSelectedObjectIds,
    lastSelectedIndex,
    handleToggleObjectSelection,
    _handleToggleSelectRow,
    _handleToggleSelectAllRows,
  };
}
