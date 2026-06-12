# Implementation Plan: Mocks Page Modularization & TypeScript Modernization

## Objectives
- Extract logic from `src/app/(dashboard)/mocks/page.tsx` into reusable components and hooks.
- Fix remaining `any` type violations in the dashboard and mocks pages.
- Improve code readability and follow the "Premium BI" design principles.

## Tasks

### Phase 1: Logic Extraction
- [x] Create `src/lib/migration/business-logic.ts` for standalone utility functions.
- [x] Create `src/hooks/useMocksActions.ts` to encapsulate complex state and handlers for the mocks page.

### Phase 2: Component Extraction (Dashboard)
- [x] Create `src/components/dashboard/MigrationResultChart.tsx`.
- [x] Create `src/components/dashboard/PerformanceComparisonChart.tsx`.
- [x] Refactor `src/components/dashboard/DashboardCharts.tsx` to use these components.

### Phase 3: Component Extraction (Mocks Page)
- [x] Create `src/components/mocks/mock-row.tsx` for each mock entry in the table.
- [x] Create `src/components/mocks/mock-alerts.tsx` for modal confirmations and force unlock.
- [x] Create `src/components/mocks/mock-header.tsx` for the page header and search.
- [x] Create `src/components/mocks/mock-table.tsx` for the main table structure.
- [x] Refactor `src/app/(dashboard)/mocks/page.tsx` to use these new components.

### Phase 4: Final Polishing
- [x] Audit remaining `any` usage in the project.
- [x] Ensure all extracted components follow the "Premium BI" style (no borders, spectral colors, etc.).
- [x] Verify accessibility and SEO.

### Phase 5: Architecture v2.10 — Context Migration
- [x] Create `SelectionContext` for global UI state.
- [x] Migrate Objects detail to consume global selection.
- [x] Update Dashboard to synchronize with global context.

### Phase 6: Data Integrity & Governance
- [x] Implement mandatory log cleanup on data import.
- [x] Update Firestore Security Rules for Master/Admin consistency.
