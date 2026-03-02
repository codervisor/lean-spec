import * as React from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from './spec-node-types';
import { toneBgColors } from './constants';
import type { SpecNodeData } from './types';

interface DependencyGraphViewProps {
  nodes: Node<SpecNodeData>[];
  edges: Edge[];
  showStandalone: boolean;
  onNodeClick: (event: React.MouseEvent, node: Node<SpecNodeData>) => void;
  onPaneClick: () => void;
  onInstance: (instance: ReactFlowInstance) => void;
  t: (key: string) => string;
}

export function DependencyGraphView({
  nodes,
  edges,
  showStandalone,
  onNodeClick,
  onPaneClick,
  onInstance,
  t,
}: DependencyGraphViewProps) {
  const handleInit = React.useCallback((flowInstance: ReactFlowInstance) => {
    onInstance(flowInstance);
    requestAnimationFrame(() => {
      flowInstance.fitView({ padding: 0.15, duration: 300 });
    });
  }, [onInstance]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm font-medium">{t('dependenciesPage.empty.title')}</p>
          <p className="text-xs mt-1">
            {showStandalone
              ? t('dependenciesPage.empty.filters')
              : t('dependenciesPage.empty.standaloneHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={handleInit}
      className="h-full w-full"
      fitView
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      minZoom={0.05}
      maxZoom={2}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
    >
      <Background gap={20} size={1} color="rgba(100, 116, 139, 0.06)" />
      <Controls showInteractive={false} className="!bg-background/90 !border-border !rounded-md" />
      <MiniMap
        nodeColor={(node) => {
          const d = node.data as SpecNodeData;
          return toneBgColors[d.tone] || '#6b7280';
        }}
        maskColor="rgba(128, 128, 128, 0.6)"
        className="!bg-white/95 dark:!bg-background/95 !border-border !rounded-md"
        style={{ width: 120, height: 80 }}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
