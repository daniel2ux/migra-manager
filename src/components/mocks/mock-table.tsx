"use client";

import { MockCard, MockCardHandle } from './mock-card';
import type { Mock, MigrationObject } from '@/types/migration';
import { useRef, useImperativeHandle, forwardRef } from 'react';
import { Package } from 'lucide-react';

interface MockTableProps {
  mocks: Mock[];
  selectedMockId: string;
  onSelect: (id: string) => void;
  isAdmin: boolean;
  isMaster: boolean;
  isProjectLocked?: boolean;
  currentUserId: string;
  projectId: string | null;
  isTogglingLoad: string | null;
  isDeleting: string | null;
  objectsByMock?: Record<string, MigrationObject[]>;
  catalogObjectCount?: number;
  onToggleLock: (mock: Mock) => void;
  onToggleLoadStatus: (mock: Mock) => void;
  onClone: (mock: Mock) => void;
  onEdit: (mock: Mock) => void;
  onView: (mock: Mock) => void;
  onDelete: (mock: Mock) => void;
  onContextMenu: (e: React.MouseEvent, mock: Mock) => void;
}

export interface MockTableHandle {
  focusSelected: () => void;
  scrollToSelected: () => void;
}

export const MockTable = forwardRef<MockTableHandle, MockTableProps>(
  ({
    mocks, selectedMockId, onSelect, isAdmin, isMaster, isProjectLocked = false, currentUserId: _currentUserId, projectId,
    isTogglingLoad, isDeleting, objectsByMock, catalogObjectCount = 0, onToggleLock, onToggleLoadStatus,
    onClone, onEdit, onView, onDelete: _onDelete, onContextMenu
  }, ref) => {
    const cardRefs = useRef<Map<string, MockCardHandle>>(new Map());

    const setCardRef = (id: string) => (el: MockCardHandle | null) => {
      if (el) {
        cardRefs.current.set(id, el);
      } else {
        cardRefs.current.delete(id);
      }
    };

    useImperativeHandle(ref, () => ({
      focusSelected: () => {
        const card = cardRefs.current.get(selectedMockId);
        card?.focus();
      },
      scrollToSelected: () => {
        const card = cardRefs.current.get(selectedMockId);
        card?.scrollIntoView();
      },
    }));

    if (mocks.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-4 md:px-8 py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-[var(--fiori-border)]" aria-hidden />
          <p className="text-[0.8125rem] font-semibold text-[var(--fiori-label)]">
            Nenhuma janela cadastrada
          </p>
          <p className="mt-1 max-w-sm text-[0.75rem] text-[var(--fiori-label)]">
            Use o botão de adicionar no cabeçalho para criar a primeira mock deste projeto.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-8 py-4">
        {mocks.map((mock) => (
          <MockCard
            key={mock.id}
            ref={setCardRef(mock.id)}
            mock={mock}
            isSelected={selectedMockId === mock.id}
            onSelect={onSelect}
            isAdmin={isAdmin}
            isMaster={isMaster}
            isProjectLocked={isProjectLocked}
            projectId={projectId}
            isTogglingLoad={isTogglingLoad}
            isDeleting={isDeleting}
            objects={objectsByMock?.[mock.id] || []}
            catalogObjectCount={catalogObjectCount}
            onToggleLock={onToggleLock}
            onToggleLoadStatus={onToggleLoadStatus}
            onClone={onClone}
            onEdit={onEdit}
            onView={onView}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    );
  }
);

MockTable.displayName = 'MockTable';
