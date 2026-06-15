import { useMemo } from "react";
import type { MigrationObject, Mock, Project, AggregatedObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import {
    isObjectInProgress,
    isObjectLoaded,
    isActiveCatalogMaster,
    resolveMasterObject,
} from "@/lib/dashboard/object-filters";
import {
    resolveDashboardCardChargeSequence,
    type ResolvedChargeSequence,
} from "@/lib/migration/sequence-utils";
import {
    buildCatalogMasterOrderIndex,
    buildGestaoMasterOrderIndex,
    buildMockChargeSequenceLookup,
    resolveDashboardChargeSequence,
    sortByGestaoDisplayOrder,
} from "@/lib/migration/gestao-sequence";

function chargeSequenceFromMigrationAndMaster(
    obj: Pick<MigrationObject, "chargeGroup" | "chargeOrder" | "parallelOrder" | "name" | "masterObjectId">,
    master: MasterObject | undefined,
    mockScoped: boolean,
    mockLookup: Map<string, { chargeGroup?: string | null; chargeOrder?: string | number | null; parallelOrder?: string | number | null }> | null,
    objectName?: string,
    masterObjectId?: string | null,
): ResolvedChargeSequence {
    if (mockScoped) {
        return resolveDashboardChargeSequence({
            master,
            masterObjectId: masterObjectId ?? obj.masterObjectId ?? null,
            objectName: objectName ?? String(obj.name ?? ""),
            mockScoped: true,
            mockLookup,
        });
    }

    return resolveDashboardCardChargeSequence(master, obj);
}

interface UseDashboardFilteringProps {
    objects: MigrationObject[] | undefined;
    allMocks: Mock[] | undefined;
    projects: Project[] | undefined;
    masterObjects: MasterObject[] | undefined;
    isAdmin: boolean;
    selectedProjectId: string;
    selectedMockId: string;
    objectSearchTerm: string;
    performanceStatusFilter: "all" | "success" | "error" | "inProgress";
    inProgressOnly: boolean;
    chargePercentOp: ">=" | "<=" | "=" | ">" | "<";
    chargePercentValue: string;
    dashboardGroupFilter: string;
}

export function useDashboardFiltering({
    objects,
    allMocks,
    projects: _projects,
    masterObjects,
    isAdmin: _isAdmin,
    selectedProjectId,
    selectedMockId,
    objectSearchTerm,
    performanceStatusFilter,
    inProgressOnly,
    chargePercentOp,
    chargePercentValue,
    dashboardGroupFilter
}: UseDashboardFilteringProps) {

    const mockScopedSequences = selectedMockId !== "all";

    const mockChargeSequenceLookup = useMemo(() => {
        if (!mockScopedSequences || !objects?.length || !masterObjects?.length) return null;
        return buildMockChargeSequenceLookup(
            objects.filter((o) => o.mockId === selectedMockId),
            masterObjects,
        );
    }, [mockScopedSequences, objects, masterObjects, selectedMockId]);

    const gestaoDisplayOrderIndex = useMemo(() => {
        if (mockScopedSequences && selectedMockId !== "all") {
            return buildGestaoMasterOrderIndex(
                objects?.filter((o) => o.mockId === selectedMockId),
                masterObjects,
            );
        }
        return buildCatalogMasterOrderIndex(masterObjects);
    }, [mockScopedSequences, selectedMockId, objects, masterObjects]);

    const mocksByIdMap = useMemo(() => new Map(allMocks?.map((m) => [m.id, m])), [allMocks]);

    const masterObjectsById = useMemo(
        () => new Map(masterObjects?.map((m) => [m.id, m])),
        [masterObjects]
    );

    const masterObjectsByName = useMemo(() => new Map(masterObjects?.map((m) => [m.name, m])), [masterObjects]);

    // Evita colisão de nomes entre projetos: quando houver objeto com masterObjectId,
    // usamos esse vínculo para aprender qual "name -> master" pertence ao escopo atual.
    const scopedMasterByName = useMemo(() => {
        const map = new Map<string, MasterObject>();
        (objects || []).forEach((o) => {
            const masterId = String((o as any).masterObjectId || "");
            if (!masterId) return;
            const master = masterObjectsById.get(masterId);
            if (!master) return;
            if (!map.has(o.name)) map.set(o.name, master);
        });
        return map;
    }, [objects, masterObjectsById]);

    const masterLookupMaps = useMemo(
        () => ({
            byId: masterObjectsById,
            byName: masterObjectsByName,
            scopedByName: scopedMasterByName,
        }),
        [masterObjectsById, masterObjectsByName, scopedMasterByName],
    );

    const aggregatedPerformance = useMemo(() => {
        if (!objects) return [] as AggregatedObject[];

        const map = new Map<string, AggregatedObject>();

        objects.forEach((obj) => {
            const aggregationKey = String((obj as any).masterObjectId || obj.name || "");
            const current = map.get(aggregationKey);
            const existingHistory = Array.isArray(current?.history) ? [...(current?.history || [])] : [];
            const incomingDur = Math.max(0, Number(obj.currentChargeDurationMs) || 0);
            const incomingProcessed = Number(obj.processedRecordsCount) || 0;
            const incomingError = Number(obj.errorRecordsCount) || 0;
            const incomingTarget = Number(obj.targetRecordsCount) || 0;
            const incomingSuccess = Math.max(0, incomingProcessed - incomingError);
            const incomingLabel = mocksByIdMap.get(obj.mockId || "")?.name || obj.mockId || "Mock";

            if (obj.mockId) {
                const histIdx = existingHistory.findIndex((h: any) => h?.mockId === obj.mockId);
                const incomingHist = {
                    ...(histIdx >= 0 ? existingHistory[histIdx] : {}),
                    label: incomingLabel,
                    mockId: obj.mockId,
                    duracaoMs: incomingDur,
                    total: incomingProcessed,
                    erro: incomingError,
                    target: incomingTarget,
                    sucesso: incomingSuccess,
                };

                if (histIdx >= 0) {
                    const currentHistProcessed = Number((existingHistory[histIdx] as any)?.total) || 0;
                    // Mantém a entrada mais completa para o mesmo mock.
                    if (incomingProcessed >= currentHistProcessed) {
                        existingHistory[histIdx] = incomingHist as any;
                    }
                } else {
                    existingHistory.push(incomingHist as any);
                }
            }

            const processed = obj.processedRecordsCount || 0;
            const currentProcessed = current?.processedRecordsCount || 0;
            const incomingFromSelectedMock = selectedMockId !== "all" && obj.mockId === selectedMockId;
            const currentFromSelectedMock = selectedMockId !== "all" && current?.mockId === selectedMockId;
            const shouldPreferIncoming =
                !current ||
                (incomingFromSelectedMock && !currentFromSelectedMock) ||
                (incomingFromSelectedMock === currentFromSelectedMock &&
                    (processed > currentProcessed ||
                        (obj.status === "CARGA_EM_ANDAMENTO" && current.status !== "CARGA_EM_ANDAMENTO")));

            if (shouldPreferIncoming) {
                const masterId = String((obj as any).masterObjectId || "");
                const master =
                    (masterId ? masterObjectsById.get(masterId) : undefined) ??
                    scopedMasterByName.get(obj.name) ??
                    masterObjectsByName.get(obj.name);
                const objectEmbeddedHistory = Array.isArray((obj as any).history) ? (obj as any).history : [];
                const mergedHistoryMap = new Map<string, any>();
                [...existingHistory, ...objectEmbeddedHistory].forEach((h: any) => {
                    if (!h?.mockId) return;
                    const prev = mergedHistoryMap.get(h.mockId);
                    const prevTotal = Number(prev?.total) || 0;
                    const nextTotal = Number(h?.total) || 0;
                    if (!prev || nextTotal >= prevTotal) mergedHistoryMap.set(h.mockId, h);
                });
                const sourceMock = mocksByIdMap.get(obj.mockId);
                const isMockRunning = sourceMock?.status === "CARGA_EM_ANDAMENTO" || sourceMock?.isRunning === true;
                const effectiveMockLocked = (sourceMock?.isLocked ?? false) && !isMockRunning;

                const seqFields = chargeSequenceFromMigrationAndMaster(
                    obj,
                    master,
                    mockScopedSequences,
                    mockChargeSequenceLookup,
                    obj.name,
                    masterId || null,
                );
                map.set(aggregationKey, {
                    ...obj,
                    currentChargeDurationMs: Math.max(0, Number(obj.currentChargeDurationMs) || 0),
                    chargeGroup: seqFields.chargeGroup,
                    chargeOrder: seqFields.chargeOrder,
                    parallelOrder: seqFields.parallelOrder,
                    hasComments: (obj as any).hasComments ?? false,
                    mockName: sourceMock?.name || obj.mockId,
                    // Em execução, o lock do mock nao deve bloquear as acoes operacionais do card.
                    mockIsLocked: effectiveMockLocked,
                    history: Array.from(mergedHistoryMap.values()),
                    isInProgress: isObjectInProgress(obj),
                    isLoaded: isObjectLoaded(obj),
                });
            } else if (current) {
                const masterId = String((obj as any).masterObjectId || "");
                const master =
                    (masterId ? masterObjectsById.get(masterId) : undefined) ??
                    scopedMasterByName.get(obj.name) ??
                    masterObjectsByName.get(obj.name);
                const seqFromSelectedMock =
                    selectedMockId !== "all" && obj.mockId === selectedMockId
                        ? chargeSequenceFromMigrationAndMaster(
                              obj,
                              master,
                              true,
                              mockChargeSequenceLookup,
                              obj.name,
                              masterId || null,
                          )
                        : null;

                map.set(aggregationKey, {
                    ...current,
                    history: existingHistory as any,
                    ...(seqFromSelectedMock
                        ? {
                              chargeGroup: seqFromSelectedMock.chargeGroup,
                              chargeOrder: seqFromSelectedMock.chargeOrder,
                              parallelOrder: seqFromSelectedMock.parallelOrder,
                          }
                        : {}),
                });
            }
        });

        return sortByGestaoDisplayOrder(Array.from(map.values()), gestaoDisplayOrderIndex);
    }, [objects, mocksByIdMap, masterObjectsById, scopedMasterByName, masterObjectsByName, selectedMockId, mockScopedSequences, mockChargeSequenceLookup, gestaoDisplayOrderIndex]);

    const filteredAggregatedPerformance = useMemo(() => {
        const mapped = aggregatedPerformance.filter((obj) => {
            if (obj.isActive === false) return false;

            if (selectedMockId !== "all") {
                const hasSelectedMockHistory = !!obj.history?.some((h) => h.mockId === selectedMockId);
                const isFromSelectedMock = obj.mockId === selectedMockId;
                if (!isFromSelectedMock && !hasSelectedMockHistory) return false;
            }

            const master = resolveMasterObject(obj, masterLookupMaps);
            if (!isActiveCatalogMaster(master)) return false;

            if (objectSearchTerm && !obj.name.toLowerCase().includes(objectSearchTerm.toLowerCase())) return false;

            if (performanceStatusFilter !== "all") {
                if (performanceStatusFilter === "success") {
                    if (obj.status !== "CARGA_CONCLUIDA" || (obj.errorRecordsCount || 0) > 0) return false;
                }
                if (performanceStatusFilter === "error") {
                    if ((obj.errorRecordsCount || 0) === 0) return false;
                }
                if (performanceStatusFilter === "inProgress") {
                    if (obj.status !== "CARGA_EM_ANDAMENTO") return false;
                }
            }

            if (inProgressOnly && obj.status !== "CARGA_EM_ANDAMENTO") return false;

            if (chargePercentValue !== "") {
                const target = obj.targetRecordsCount || 0;
                const proc = obj.processedRecordsCount || 0;
                const perc = target > 0 ? (proc / target) * 100 : 0;
                const filterVal = parseFloat(chargePercentValue);
                if (chargePercentOp === ">=" && !(perc >= filterVal)) return false;
                if (chargePercentOp === "<=" && !(perc <= filterVal)) return false;
                if (chargePercentOp === "=" && !(Math.abs(perc - filterVal) < 0.01)) return false;
                if (chargePercentOp === ">" && !(perc > filterVal)) return false;
                if (chargePercentOp === "<" && !(perc < filterVal)) return false;
            }

            if (dashboardGroupFilter !== "all") {
                const master = resolveMasterObject(obj, masterLookupMaps);
                if (!master?.activityGroupIds?.includes(dashboardGroupFilter)) return false;
            }

            return true;
        }).map((obj) => {
            if (selectedMockId === "all") return obj;

            const selectedHist = obj.history?.find((h) => h.mockId === selectedMockId);
            // Se existe histórico da mock selecionada, usa-o como fonte de verdade
            // para os gráficos/listas do dashboard.
            if (selectedHist) {
                const master = resolveMasterObject(obj, masterLookupMaps);
                const target = Number((selectedHist as any).target) || 0;
                const processed = Number((selectedHist as any).total) || 0;
                const errors = Number((selectedHist as any).erro) || 0;
                const success = Number((selectedHist as any).sucesso) || Math.max(0, processed - errors);
                const durationMs = Number((selectedHist as any).duracaoMs) || 0;
                const running = !!(selectedHist as any).isRunning;
                const loaded = !!(selectedHist as any).isLoaded || processed > 0 || success > 0 || errors > 0;

                const seqFromMock = chargeSequenceFromMigrationAndMaster(
                    obj,
                    master,
                    true,
                    mockChargeSequenceLookup,
                    obj.name,
                    (obj as any).masterObjectId ?? null,
                );
                return {
                    ...obj,
                    mockId: selectedMockId,
                    mockName: mocksByIdMap.get(selectedMockId)?.name || selectedMockId,
                    chargeOrder: seqFromMock.chargeOrder,
                    chargeGroup: seqFromMock.chargeGroup,
                    parallelOrder: seqFromMock.parallelOrder,
                    targetRecordsCount: target,
                    processedRecordsCount: processed,
                    successfulRecordsCount: success,
                    errorRecordsCount: errors,
                    currentChargeDurationMs: durationMs,
                    isInProgress: running,
                    isLoaded: loaded,
                    status: running ? "CARGA_EM_ANDAMENTO" : (loaded ? "CARGA_CONCLUIDA" : "PENDENTE"),
                } as AggregatedObject;
            }

            // Sem histórico da mock selecionada: mantém objeto da própria mock (se houver),
            // caso contrário zera os indicadores operacionais.
            if (obj.mockId === selectedMockId) {
                const masterForSelf = resolveMasterObject(obj, masterLookupMaps);
                const seqSelf = chargeSequenceFromMigrationAndMaster(
                    obj,
                    masterForSelf,
                    true,
                    mockChargeSequenceLookup,
                    obj.name,
                    (obj as any).masterObjectId ?? null,
                );
                return {
                    ...obj,
                    chargeOrder: seqSelf.chargeOrder,
                    chargeGroup: seqSelf.chargeGroup,
                    parallelOrder: seqSelf.parallelOrder,
                } as AggregatedObject;
            }
            const masterForOrder = resolveMasterObject(obj, masterLookupMaps);
            const seqFallback = chargeSequenceFromMigrationAndMaster(
                obj,
                masterForOrder,
                true,
                mockChargeSequenceLookup,
                obj.name,
                (obj as any).masterObjectId ?? null,
            );
            return {
                ...obj,
                mockId: selectedMockId,
                mockName: mocksByIdMap.get(selectedMockId)?.name || selectedMockId,
                chargeOrder: seqFallback.chargeOrder,
                chargeGroup: seqFallback.chargeGroup,
                parallelOrder: seqFallback.parallelOrder,
                targetRecordsCount: 0,
                processedRecordsCount: 0,
                successfulRecordsCount: 0,
                errorRecordsCount: 0,
                currentChargeDurationMs: 0,
                isInProgress: false,
                isLoaded: false,
                status: "PENDENTE",
            } as AggregatedObject;
        });
        return sortByGestaoDisplayOrder(mapped, gestaoDisplayOrderIndex);
    }, [aggregatedPerformance, masterLookupMaps, objectSearchTerm, performanceStatusFilter, inProgressOnly, chargePercentOp, chargePercentValue, dashboardGroupFilter, selectedMockId, mocksByIdMap, mockChargeSequenceLookup, gestaoDisplayOrderIndex]);

    const totals = useMemo(() => {
        const mocksInScope = allMocks?.filter(m => selectedProjectId === "all" || m.projectId === selectedProjectId) || [];
        return { total: mocksInScope.length };
    }, [allMocks, selectedProjectId]);

    const filteredObjectStats = useMemo(() => {
        let totalRecords = 0, totalDurationMs = 0, loaded = 0, inProgress = 0;
        const getDisplayDurationMs = (obj: AggregatedObject): number => {
            const loadHistory = (obj as any).loadHistory as any[] | undefined;
            const fromSelectedMockHistory = selectedMockId !== "all"
                ? Number(obj.history?.find((h) => h.mockId === selectedMockId)?.duracaoMs || 0)
                : 0;
            const fromLoadHistory = selectedMockId !== "all" && Array.isArray(loadHistory)
                ? Number(
                    [...loadHistory]
                        .sort((a, b) => {
                            const aEnd = new Date(a?.endTime || a?.data_fim || 0).getTime();
                            const bEnd = new Date(b?.endTime || b?.data_fim || 0).getTime();
                            return bEnd - aEnd;
                        })[0]?.durationMs || 0
                )
                : 0;
            const fromCurrentDuration = Number(obj.currentChargeDurationMs) || 0;
            const baseDuration = selectedMockId !== "all"
                ? (fromSelectedMockHistory > 0
                    ? fromSelectedMockHistory
                    : (fromLoadHistory > 0
                        ? fromLoadHistory
                        : (obj.mockId === selectedMockId ? fromCurrentDuration : 0)))
                : fromCurrentDuration;
            // Deve refletir exatamente o mesmo campo exibido no card/tooltip (currentChargeDurationMs).
            // Mantém a mesma regra de exibição: mínimo de 1 minuto quando houver duração > 0.
            if (baseDuration > 0) return Math.max(60000, baseDuration);
            return 0;
        };

        filteredAggregatedPerformance.forEach((obj) => {
            totalRecords += obj.targetRecordsCount || 0;
            totalDurationMs += getDisplayDurationMs(obj);
            if (obj.isInProgress) inProgress++;
            if (obj.isLoaded) loaded++;
        });
        return { total: filteredAggregatedPerformance.length, totalRecords, totalDurationMs, loaded, inProgress };
    }, [filteredAggregatedPerformance, selectedMockId]);

    const effectiveMockId = useMemo(() => {
        if (selectedMockId !== "all") return selectedMockId;
        const running = allMocks?.find(m => (m.status === "CARGA_EM_ANDAMENTO" || m.isRunning) && (selectedProjectId === "all" || m.projectId === selectedProjectId));
        if (running) return running.id;
        const mocksInProj = allMocks?.filter(m => selectedProjectId === "all" || m.projectId === selectedProjectId);
        if (mocksInProj && mocksInProj.length > 0) {
            return mocksInProj.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())[0].id;
        }
        return null;
    }, [selectedMockId, allMocks, selectedProjectId]);

    const previousMockId = useMemo(() => {
        if (!effectiveMockId || !allMocks) return null;
        const currentMock = allMocks.find((m) => m.id === effectiveMockId);
        if (!currentMock) return null;

        const parseDateMs = (value: unknown): number | null => {
            if (!value) return null;
            if (typeof value === "object" && value !== null) {
                const anyValue = value as any;
                const seconds = anyValue.seconds ?? anyValue._seconds;
                if (typeof seconds === "number" && Number.isFinite(seconds)) {
                    return seconds * 1000;
                }
            }
            const raw = String(value).trim();
            // Formato BR comum: dd/MM/yyyy (com ou sem hora)
            const brMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
            if (brMatch) {
                const day = Number(brMatch[1]);
                const month = Number(brMatch[2]);
                const year = Number(brMatch[3]);
                const hour = Number(brMatch[4] || 0);
                const minute = Number(brMatch[5] || 0);
                const second = Number(brMatch[6] || 0);
                const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
                if (Number.isFinite(ms)) return ms;
            }
            const ms = new Date(raw).getTime();
            return Number.isFinite(ms) ? ms : null;
        };

        const inSameProject = allMocks.filter(
            (m) => m.projectId === currentMock.projectId && m.id !== effectiveMockId
        );
        if (inSameProject.length === 0) return null;

        const currentStartMs = parseDateMs(currentMock.startDate);
        if (currentStartMs === null) return null;

        const olderByDate = inSameProject
            .map((m) => ({ id: m.id, startMs: parseDateMs(m.startDate) }))
            .filter((m): m is { id: string; startMs: number } => m.startMs !== null && m.startMs < currentStartMs)
            .sort((a, b) => b.startMs - a.startMs);

        return olderByDate[0]?.id || null;
    }, [effectiveMockId, allMocks]);

    return {
        filteredAggregatedPerformance,
        totals,
        filteredObjectStats,
        effectiveMockId,
        previousMockId,
        mocksByIdMap
    };
}
