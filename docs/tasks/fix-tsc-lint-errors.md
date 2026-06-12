# Task: Fix TSC and Lint Errors

## Objective
Identify and resolve TypeScript and Linting errors in the Migra platform, focusing on field naming consistency (`targetRecordsCount`, etc.) and basic maintenance (unused variables, explicit types).

## Context
- **System**: Migra (Data Migration Accelerator)
- **Problem**: Next.js build succeeds but has over 600 lint errors and several TS errors in the dashboard/objects pages.
- **Reference**: `src/types/migration.ts` defines `MigrationObject` and `AggregatedObject`.

## Status Tracking
- [ ] Fix naming errors in `src/app/(dashboard)/objetos/[mockId]/page.tsx`
- [ ] Fix naming errors in `src/app/(dashboard)/objetos/[mockId]/[objectId]/page.tsx`
- [ ] Fix naming and type errors in `src/app/(dashboard)/objetos/page.tsx`
- [ ] Clean up unused variables and `any` types in core dashboard components.
- [ ] Final verification with `checklist.py`.

## Detailed Action Plan

### 1. Unified Field Naming
Audit properties in `src/app/(dashboard)/objetos/` where `MigrationObject` is used.
Transition from:
- `target` -> `targetRecordsCount`
- `processed` -> `processedRecordsCount`
- `success` -> `successfulRecordsCount`
- `error` -> `errorRecordsCount`
- `duration` -> `currentChargeDurationMs`

### 2. Linting Cleanup
Target common errors in `lint_results_v2.txt`:
- `no-unused-vars`: Remove or prefix with `_` if needed for future use.
- `no-explicit-any`: Add proper types from `@/types/migration`.
- `no-unescaped-entities`: Fix escaping in JSX strings.

### 3. Verification
Run `npm run lint` and `npm run build` locally, then check with `checklist.py`.
