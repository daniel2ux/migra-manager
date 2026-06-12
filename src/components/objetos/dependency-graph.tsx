"use client"

import React, { useEffect, useContext, createContext, useMemo } from 'react';
import type { ActivityGroup } from '@/types/activity-group';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  MiniMap,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import { Database, Network, Info, Split, GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Context shared with custom node ─────────────────────────────────────────

const GraphContext = createContext<{ activityGroups: ActivityGroup[]; isCompact: boolean; allObjects: any[] }>({
  activityGroups: [],
  isCompact: false,
  allObjects: [],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGraphOrder = (v: unknown) => {
  const s = String(v ?? '').trim();
  if (/^\d{2}\.\d{2}$/.test(s)) return s;
  const n = parseInt(s, 10);
  return n > 0 ? `${String(n).padStart(2, '0')}.00` : '—';
};

const getParallelMajor = (parallelOrder: unknown) => {
  if (!parallelOrder) return 0;
  return parseInt(String(parallelOrder).split('.')[0], 10) || 0;
};

const getParallelObjects = (obj: any, allObjects: any[]) => {
  const catalogObj = allObjects.find((o) => o.name === obj.name) ?? obj;
  const myParallelMajor = getParallelMajor(catalogObj.parallelOrder ?? obj.parallelOrder);

  let candidates: any[] = [];
  if (myParallelMajor > 0) {
    candidates = allObjects.filter(
      (o) => o.parallelOrder && getParallelMajor(o.parallelOrder) === myParallelMajor
    );
  }

  if (candidates.length <= 1) {
    const group = catalogObj.chargeGroup ?? obj.chargeGroup;
    const orderKey = parseSeq(catalogObj.chargeOrder ?? obj.chargeOrder);
    if (orderKey > 0) {
      const slotPeers = allObjects.filter((o) => {
        if (!o.isParallel && !o.parallelOrder) return false;
        if (String(o.chargeGroup ?? "") !== String(group ?? "")) return false;
        return parseSeq(o.chargeOrder) === orderKey;
      });
      if (slotPeers.length > 1) {
        candidates = slotPeers;
      }
    }
  }

  const selfId = catalogObj.id ?? obj.id;
  const selfName = String(catalogObj.name ?? obj.name ?? "").trim().toUpperCase();
  const seen = new Set<string>();

  return candidates
    .filter((o) => {
      if (o.id === selfId) return false;
      if (selfName && String(o.name ?? "").trim().toUpperCase() === selfName) return false;
      const nameNorm = String(o.name || "").trim().toUpperCase();
      const dedupeKey = nameNorm || `__id__:${String(o.id || "")}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .sort((a, b) => parseSeq(a.parallelOrder) - parseSeq(b.parallelOrder));
};

const parseSeq = (v: any) => {
  const s = String(v ?? '').trim();
  if (s.includes('.')) { const [maj, min] = s.split('.'); return parseInt(maj) * 100 + parseInt(min || '0'); }
  return (parseInt(s) || 0) * 100;
};

// ─── Layout ─────────────────────────────────────────────────────────────────

// Calcula o nível de precedência (profundidade) de cada nó em relação ao alvo
const calculatePrecedenceLevels = (nodes: any[], edges: any[], targetId: string | null): Map<string, number> => {
  const levels = new Map<string, number>();

  if (!targetId) return levels;

  // BFS para calcular níveis a partir do target
  const queue: [string, number][] = [[targetId, 0]];
  const visited = new Set<string>([targetId]);
  levels.set(targetId, 0);

  while (queue.length > 0) {
    const [currentId, currentLevel] = queue.shift()!;

    // Encontra todas as arestas onde currentId é o target (dependências)
    const incomingEdges = edges.filter(e => e.target === currentId);

    for (const edge of incomingEdges) {
      const sourceId = edge.source;
      if (!visited.has(sourceId)) {
        visited.add(sourceId);
        const newLevel = currentLevel + 1;
        levels.set(sourceId, newLevel);
        queue.push([sourceId, newLevel]);
      }
    }
  }

  return levels;
};

// Layout em estilo Organograma/Árvore Vertical - de cima para baixo
const getLayoutedElements = (nodes: any[], edges: any[], _direction = 'TB', isCompact = false, allObjects: any[], targetId: string | null = null) => {
  // Calcular níveis de precedência
  const precedenceLevels = calculatePrecedenceLevels(nodes, edges, targetId);

  // Agrupar nós por nível de precedência
  const nodesByLevel: Record<number, any[]> = {};
  nodes.forEach(node => {
    const level = precedenceLevels.get(node.id) ?? 999;
    if (!nodesByLevel[level]) nodesByLevel[level] = [];
    nodesByLevel[level].push(node);
  });

  // Configurações do layout em árvore vertical
  const nodeWidth = isCompact ? 180 : 240;
  const nodeHeight = isCompact ? 80 : 100;
  const levelGap = isCompact ? 100 : 140; // Espaço vertical entre níveis
  const nodeGap = isCompact ? 30 : 50;    // Espaço horizontal entre nós

  // Calcular largura total necessária
  const maxNodesInLevel = Math.max(...Object.values(nodesByLevel).map(n => n.length));
  const canvasWidth = maxNodesInLevel * (nodeWidth + nodeGap);
  const startX = canvasWidth / 2;

  const layoutedNodes = nodes.map((node) => {
    const level = precedenceLevels.get(node.id) ?? 999;
    const nodesInLevel = nodesByLevel[level] || [];
    const indexInLevel = nodesInLevel.findIndex(n => n.id === node.id);
    const totalInLevel = nodesInLevel.length;

    // Calcular nível máximo para inverter a ordem (raiz no topo, target na base)
    const validLevels = Object.keys(nodesByLevel).map(Number).filter(l => l !== 999);
    const maxLevel = validLevels.length > 0 ? Math.max(...validLevels) : 0;
    const invertedLevel = maxLevel - level;

    // Posição Y baseada no nível invertido (raiz no topo)
    const y = invertedLevel * (nodeHeight + levelGap) + 80;

    // Posição X centralizada horizontalmente
    const xOffset = (indexInLevel - (totalInLevel - 1) / 2) * (nodeWidth + nodeGap);
    const x = startX + xOffset;

    const obj = allObjects.find(o => o.id === node.id);
    const group = obj?.chargeGroup || 'OUTROS';

    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: { x, y },
      data: {
        ...node.data,
        precedenceLevel: level,
        chargeGroup: group,
        levelX: x,
        direction: 'TB',
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// ─── Custom Node ──────────────────────────────────────────────────────────────

function ObjectNode({ data }: NodeProps) {
  const { activityGroups, isCompact, allObjects } = useContext(GraphContext);
  const { obj, isTarget, precedenceLevel } = data as { obj: any; isTarget: boolean; precedenceLevel?: number };

  const badges = useMemo(() => {
    return activityGroups.filter((g) =>
      (obj.activityGroupIds ?? []).includes(g.id) ||
      (g.objectIds ?? []).includes(obj.id)
    );
  }, [activityGroups, obj]);

  const catalogObj = useMemo(
    () => allObjects.find((o) => o.name === obj.name) ?? obj,
    [obj, allObjects]
  );

  const hasParallelIndicator = Boolean(
    catalogObj.isParallel || catalogObj.parallelOrder || obj.isParallel || obj.parallelOrder
  );

  const parallelObjects = useMemo(
    () => (hasParallelIndicator ? getParallelObjects(obj, allObjects) : []),
    [hasParallelIndicator, obj, allObjects]
  );

  const externalDependencies = useMemo((): string[] => {
    if (!Array.isArray(obj.externalDependencies)) return [];
    return obj.externalDependencies
      .map((dep: unknown) => String(dep).trim())
      .filter((dep: string) => dep.length > 0);
  }, [obj.externalDependencies]);

  const hasLevelBadge = precedenceLevel !== undefined && precedenceLevel > 0;

  const levelClass = isTarget
    ? 'fiori-graph-node--target'
    : precedenceLevel === 1
      ? 'fiori-graph-node--level-1'
      : precedenceLevel === 2
        ? 'fiori-graph-node--level-2'
        : precedenceLevel === 3
          ? 'fiori-graph-node--level-3'
          : precedenceLevel !== undefined && precedenceLevel > 3
            ? 'fiori-graph-node--level-deep'
            : 'fiori-graph-node--level-default';

  const levelBadgeClass =
    precedenceLevel === 2
      ? 'fiori-graph-node__level-badge--2'
      : precedenceLevel === 3
        ? 'fiori-graph-node__level-badge--3'
        : precedenceLevel !== undefined && precedenceLevel > 3
          ? 'fiori-graph-node__level-badge--deep'
          : undefined;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className={cn(
          'fiori-graph-node relative',
          isCompact && 'fiori-graph-node--compact',
          levelClass,
          hasLevelBadge && externalDependencies.length > 0 && 'fiori-graph-node--has-level-badge'
        )}
      >
        {hasLevelBadge && (
          <div className={cn('fiori-graph-node__level-badge', levelBadgeClass)}>
            {precedenceLevel}
          </div>
        )}

        {externalDependencies.length > 0 && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span
                className="fiori-graph-node__external-tag nodrag nopan"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Network className="fiori-graph-node__external-tag-icon" aria-hidden />
                <span className="fiori-graph-node__external-tag-label">
                  {isCompact ? externalDependencies.length : 'Externa'}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent variant="fiori-panel" side="top" className="fiori-tooltip-panel--warning z-[500] w-56">
              <div className="fiori-tooltip-panel-body">
                <div className="fiori-tooltip-panel-section-title">
                  <span className="flex items-center gap-1.5">
                    <Network className="w-3 h-3" />
                    Dependências externas
                  </span>
                  <span className="fiori-tooltip-panel-badge">{externalDependencies.length}</span>
                </div>
                <div className="fiori-tooltip-panel-dep-list">
                  {externalDependencies.map((dep: string) => (
                    <div key={dep} className="fiori-tooltip-panel-dep-item">
                      <div className="fiori-graph-external-tooltip-dot" />
                      <span className="min-w-0 flex-1 truncate">{dep}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {hasParallelIndicator && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span
                className="fiori-graph-node__parallel-tag nodrag nopan"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Split className="fiori-graph-node__parallel-tag-icon" aria-hidden />
                <span className="fiori-graph-node__parallel-tag-label">
                  {isCompact
                    ? (catalogObj.parallelOrder ?? obj.parallelOrder)
                      ? formatGraphOrder(catalogObj.parallelOrder ?? obj.parallelOrder)
                      : 'Paralelo'
                    : 'Paralelo'}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent variant="fiori-panel" side="top" className="fiori-tooltip-panel--positive z-[500] w-56">
              <div className="fiori-tooltip-panel-body">
                <div className="fiori-tooltip-panel-section-title">
                  <span className="flex items-center gap-1.5">
                    <GitFork className="w-3 h-3" />
                    Execução paralela
                  </span>
                  <span className="fiori-tooltip-panel-badge">{parallelObjects.length}</span>
                </div>
                {(catalogObj.parallelOrder ?? obj.parallelOrder) && (
                  <p className="fiori-graph-parallel-tooltip-order">
                    Ordem deste objeto: {formatGraphOrder(catalogObj.parallelOrder ?? obj.parallelOrder)}
                  </p>
                )}
                {parallelObjects.length > 0 ? (
                  <div className="fiori-tooltip-panel-dep-list">
                    {parallelObjects.map((parallelObj) => (
                      <div key={parallelObj.id || parallelObj.name} className="fiori-tooltip-panel-dep-item">
                        <div className="fiori-graph-parallel-tooltip-dot" />
                        <span className="min-w-0 flex-1 truncate">{parallelObj.name}</span>
                        {parallelObj.parallelOrder && (
                          <span className="fiori-graph-parallel-tooltip-seq">
                            {formatGraphOrder(parallelObj.parallelOrder)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="fiori-graph-parallel-tooltip-empty">
                    Nenhum outro objeto configurado no mesmo grupo de paralelismo.
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="fiori-graph-node__header">
          <Database className={cn('fiori-graph-node__icon', isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <span className="fiori-graph-node__name">{obj.name}</span>
        </div>

        <div className="fiori-graph-node__meta">
          <div className="fiori-graph-node__group">
            <span
              className={cn(
                'fiori-graph-node__status',
                obj.status === 'ATIVO' ? 'fiori-graph-node__status--active' : 'fiori-graph-node__status--inactive'
              )}
            />
            <span>{obj.chargeGroup || 'G'}</span>
          </div>
          <span className="fiori-graph-node__order">{formatGraphOrder(obj.chargeOrder)}</span>
        </div>

        {badges.length > 0 && (
          <div className="fiori-graph-node__badges">
            {badges.map((g) => (
              <span
                key={g.id}
                className="fiori-graph-node__badge"
                style={{ backgroundColor: g.color }}
              >
                {g.name.length > (isCompact ? 8 : 12) ? g.name.slice(0, isCompact ? 8 : 12) + '…' : g.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const NODE_TYPES = { objectNode: ObjectNode };

// ─── Props ────────────────────────────────────────────────────────────────────

interface DependencyGraphProps {
  targetId: string | null;
  allObjects: any[];
  mode?: 'card' | 'global';
  activityGroups?: ActivityGroup[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DependencyGraph({ targetId, allObjects, mode = 'global', activityGroups = [] }: Omit<DependencyGraphProps, 'onClose'>) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [hasDependencies, setHasDependencies] = React.useState(true);
  const isCompact = mode === 'card';

  const contextValue = useMemo(
    () => ({ activityGroups, isCompact, allObjects }),
    [activityGroups, isCompact, allObjects]
  );

  // Rebuild graph only when structure changes (not when activityGroups changes —
  // ObjectNode reads activityGroups from context directly)
  useEffect(() => {
    const buildGraph = () => {
      const initialNodes: any[] = [];
      const initialEdges: any[] = [];
      const visited = new Set<string>();
      const edgeIds = new Set<string>();

      // Primeiro, coletar todos os nós e arestas
      const traverse = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        const obj = allObjects.find(o => o.id === id);
        if (!obj) return;

        const isTarget = !!(targetId && id === targetId);

        initialNodes.push({
          id: obj.id,
          type: 'objectNode',
          data: { obj, isTarget },
          style: {
            padding: 0,
            width: isCompact ? 160 : 220,
            zIndex: isTarget ? 1000 : 10,
            background: 'transparent',
          },
        });

        if (obj.dependencyIds) {
          obj.dependencyIds.forEach((depId: string) => {
            const edgeId = `e-${depId}-${id}`;
            if (!edgeIds.has(edgeId)) {
              edgeIds.add(edgeId);
              initialEdges.push({
                id: edgeId,
                source: depId,
                target: id,
              });
            }
            traverse(depId);
          });
        }
      };

      // Construir grafo básico
      if (targetId) {
        setHasDependencies(true);
        traverse(targetId);
      } else {
        setHasDependencies(true);
        [...allObjects]
          .sort((a, b) => parseSeq(a.chargeOrder) - parseSeq(b.chargeOrder))
          .forEach(obj => traverse(obj.id));
      }

      if (initialNodes.length === 0) return;

      // Calcular níveis de precedência para estilização
      const precedenceLevels = calculatePrecedenceLevels(initialNodes, initialEdges, targetId);

      // Arestas com estilo clean (linhas retas)
      initialEdges.forEach((edge) => {
        const depLevel = precedenceLevels.get(edge.source) ?? 0;
        const isTargetEdge = targetId && edge.target === targetId;

        // Arestas principais (dependências técnicas)
        if (!edge.id.startsWith('seq-')) {
          // Cores por nível
          const levelColors = [
            { stroke: '#107e3e' },
            { stroke: '#0070f2' },
            { stroke: '#0064d9' },
            { stroke: '#5b738b' },
            { stroke: '#89919a' },
          ];
          const colors = depLevel < levelColors.length ? levelColors[depLevel] : levelColors[levelColors.length - 1];
          const inactiveStroke = '#d9d9d9';

          edge.animated = isTargetEdge;
          edge.type = 'straight';
          edge.style = {
            stroke: isTargetEdge ? colors.stroke : inactiveStroke,
            strokeWidth: isTargetEdge ? 2 : 1.5,
            opacity: isTargetEdge ? 0.85 : 0.55,
          };
          edge.markerEnd = {
            type: MarkerType.ArrowClosed,
            color: isTargetEdge ? colors.stroke : inactiveStroke,
            width: 12,
            height: 12,
          };
        } else {
          edge.animated = false;
          edge.type = 'straight';
          edge.style = {
            stroke: '#e5e5e5',
            strokeWidth: 1,
            opacity: 0.6,
            strokeDasharray: '4 4',
          };
          edge.markerEnd = {
            type: MarkerType.ArrowClosed,
            color: '#e5e5e5',
            width: 8,
            height: 8,
          };
          edge.zIndex = -1;
        }
      });

      // Adicionar arestas sequenciais pontilhadas - apenas dentro do mesmo nível de precedência
      {
        // Agrupar nós presentes no grafo por nível de precedência
        const nodesByLevel: Record<number, string[]> = {};
        initialNodes.forEach(node => {
          const level = precedenceLevels.get(node.id) ?? 999;
          if (!nodesByLevel[level]) nodesByLevel[level] = [];
          nodesByLevel[level].push(node.id);
        });

        // Para cada nível, adicionar arestas sequenciais apenas entre objetos do mesmo chargeGroup
        Object.entries(nodesByLevel).forEach(([_levelStr, nodeIds]) => {
          const levelObjects = allObjects.filter(obj => nodeIds.includes(obj.id));

          const byGroup: Record<string, any[]> = {};
          levelObjects.forEach(obj => {
            const g = obj.chargeGroup || '__none__';
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(obj);
          });

          Object.values(byGroup).forEach(group => {
            const sorted = [...group].sort((a, b) => parseSeq(a.chargeOrder) - parseSeq(b.chargeOrder));
            for (let i = 0; i < sorted.length - 1; i++) {
              const from = sorted[i];
              const to = sorted[i + 1];
              const hasExplicitDep = (to.dependencyIds ?? []).includes(from.id);
              const edgeId = `seq-${from.id}-${to.id}`;
              if (!edgeIds.has(edgeId) && !hasExplicitDep) {
                edgeIds.add(edgeId);
                initialEdges.push({
                  id: edgeId,
                  source: from.id,
                  target: to.id,
                  animated: false,
                  style: { stroke: '#e5e5e5', strokeWidth: 1, strokeDasharray: '5 4', opacity: 0.6 },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#e5e5e5', width: 12, height: 12 },
                  type: 'default',
                  zIndex: -1,
                });
              }
            }
          });
        });
      }

      // Ordenar nós para o layout
      initialNodes.sort((a, b) => {
        const objA = allObjects.find(o => o.id === a.id);
        const objB = allObjects.find(o => o.id === b.id);
        return parseSeq(objA?.chargeOrder) - parseSeq(objB?.chargeOrder);
      });

      const direction = 'LR';
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, direction, isCompact, allObjects, targetId);
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    };

    buildGraph();
  }, [targetId, allObjects, setNodes, setEdges, mode, isCompact]);

  if (!hasDependencies) {
    return (
      <div className={cn('fiori-graph-empty', isCompact && 'scale-95')}>
        <div className="fiori-graph-empty__icon">
          <Info className={isCompact ? 'w-5 h-5' : 'w-6 h-6'} />
        </div>
        <h3 className="fiori-graph-empty__title">Nenhuma precedência detectada</h3>
        <p className="fiori-graph-empty__text">
          Este objeto não possui dependências configuradas acima. Ele é considerado um{' '}
          <strong>ponto de origem</strong> ou raiz independente.
        </p>
      </div>
    );
  }

  return (
    <GraphContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={200}>
      <div className="h-full w-full relative overflow-hidden fiori-graph-flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{
            padding: isCompact ? 0.2 : 0.1,
            maxZoom: isCompact ? 1.2 : 1,
            minZoom: 0.1,
            duration: 400
          }}
          className="fiori-graph-flow"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background color="#e5e5e5" gap={24} />
          {!isCompact && (
            <MiniMap
              nodeStrokeWidth={2}
              nodeColor={(node) => ((node.data as { isTarget?: boolean })?.isTarget ? '#0070f2' : '#89919a')}
              maskColor="rgba(245, 246, 247, 0.85)"
              zoomable
              pannable
            />
          )}
          <Controls showInteractive={false} />
          {!isCompact && (
          <Panel position="top-right" className="fiori-graph-legend !m-3">
            <div className="fiori-graph-legend-header">
              <div className="fiori-graph-legend-icon">
                <Network className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="fiori-graph-legend-title">Mapa de dependências</span>
                <span className="fiori-graph-legend-subtitle">Direção: raiz → target</span>
              </div>
            </div>
            <div className="fiori-graph-legend-body">
              <div className="fiori-graph-legend-item">
                <span className="fiori-graph-legend-dot bg-[#107e3e]" />
                Status ativo
              </div>
              <div className="fiori-graph-legend-item">
                <Split className="w-3.5 h-3.5 text-[#107e3e] shrink-0" />
                Execução paralela
              </div>
              <div className="fiori-graph-legend-item">
                <span className="fiori-graph-legend-line bg-[#0070f2]" />
                Conexão principal
              </div>
              <div className="fiori-graph-legend-section">
                <span className="fiori-graph-legend-section-title">Níveis</span>
                <div className="fiori-graph-legend-levels">
                  <div className="fiori-graph-legend-item">
                    <span className="fiori-graph-legend-node border-[#0070f2] bg-white" />
                    Target
                  </div>
                  <div className="fiori-graph-legend-item">
                    <span className="fiori-graph-legend-node border-[#0064d9] bg-[#e8f3ff]" />
                    Nível 1
                  </div>
                  <div className="fiori-graph-legend-item">
                    <span className="fiori-graph-legend-node border-[#5b738b] bg-[#f5f6f7]" />
                    Nível 2
                  </div>
                  <div className="fiori-graph-legend-item">
                    <span className="fiori-graph-legend-node border-[#89919a] bg-[#ededed]" />
                    Nível 3+
                  </div>
                </div>
              </div>
            </div>
          </Panel>
          )}
        </ReactFlow>
      </div>
      </TooltipProvider>
    </GraphContext.Provider>
  );
}
