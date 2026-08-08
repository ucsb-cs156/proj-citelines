import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  ReactFlow,
  type ReactFlowInstance,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildLegacyGraphElements } from "main/utils/layout";
import { majorConcepts, prereqEdgeData } from "main/data/conceptGraph";
import { positions } from "main/data/conceptGraphPositions";
import { conceptContent, type ConceptContent } from "main/data/conceptContent";
import { useStaffTools } from "main/utils/useStaffTools";

const cardKeyMap: Record<string, keyof ConceptContent> = {
  Description: "description",
  Example: "example",
  "PrairieLearn Practice": "practiceUrl",
};

interface SavedDetailCard {
  cardType: string;
  itemLabel: string;
  conceptId: string;
  conceptColor: string;
  posX: number;
  posY: number;
}

interface ConceptGraphProps {
  highlightedIds: Set<string>;
  highlightedSubconcepts: Map<string, Set<string>>;
  onConceptClick: (id: string) => void;
  starredIds: Set<string>;
  onStarClick: (id: string) => void;
  onReset: () => void;
  onDetailAdded?: (card: {
    cardType: string;
    itemLabel: string;
    conceptId: string;
    conceptColor: string;
    posX: number;
    posY: number;
  }) => void;
  onDetailDeleted?: (cardType: string, itemLabel: string) => void;
  restoredDetailCards?: SavedDetailCard[];
  onDetailMoved?: (
    cardType: string,
    itemLabel: string,
    posX: number,
    posY: number,
  ) => void;
  masteredSubconcepts: Set<string>;
  onSubconceptMastered: (sub: string) => void;
  onPaneClick?: () => void;
}

function toPastel(hex: string, strength: number = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const pr = Math.round(r * strength + 255 * (1 - strength));
  const pg = Math.round(g * strength + 255 * (1 - strength));
  const pb = Math.round(b * strength + 255 * (1 - strength));
  return `rgb(${pr}, ${pg}, ${pb})`;
}

const DeleteDetailContext = createContext<(id: string) => void>(() => {});

const LEVELS = [
  { label: "Level 5", color: "#2bcd9c" },
  { label: "Level 4", color: "#fe9a71" },
  { label: "Level 3", color: "#93ebff" },
  { label: "Level 2", color: "#feaef2" },
  { label: "Level 1", color: "#c99ffe" },
];

function LevelLegend() {
  return (
    <div className="concept-graph-legend">
      {LEVELS.map((level, i) => (
        <div key={i} className="concept-graph-legend-row">
          <div
            className="concept-graph-legend-swatch"
            style={{ background: level.color }}
          />
          <span className="concept-graph-legend-label">{level.label}</span>
        </div>
      ))}
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <div className="concept-graph-reset-button" onClick={onReset}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      <span className="concept-graph-reset-button-label">
        Click to reset graph
      </span>
    </div>
  );
}

function MajorNode({ data, id }: NodeProps) {
  const color = data.color as string;
  const label = data.label as string;
  const subconcepts = data.subconcepts as string[];
  const highlighted = data.highlighted as boolean;
  const hasSelection = data.hasSelection as boolean;
  const highlightedSubconcepts = data.highlightedSubconcepts as Set<string>;
  const starred = data.starred as boolean;
  const onStarClick = data.onStarClick as () => void;
  const masteredSubconcepts = data.masteredSubconcepts as
    Set<string> | undefined;
  const onSubconceptMastered = data.onSubconceptMastered as
    ((sub: string) => void) | undefined;

  const { debugMode } = useStaffTools();
  const conceptContentForNode = conceptContent[id];
  const debugTitle = useMemo(
    () =>
      debugMode
        ? JSON.stringify(
            {
              id,
              label,
              color,
              subconcepts,
              conceptContent: conceptContentForNode,
            },
            null,
            2,
          )
        : undefined,
    [debugMode, id, label, color, subconcepts, conceptContentForNode],
  );

  const showColor = !hasSelection || highlighted;

  return (
    <div
      title={debugTitle}
      style={{
        width: 280,
        borderRadius: 10,
        overflow: "hidden",
        borderTop: "1.5px solid #1E293B",
        borderLeft: "1.5px solid #1E293B",
        borderRight: "4px solid #1E293B",
        borderBottom: "4px solid #1E293B",
        boxShadow:
          highlighted && hasSelection
            ? `0 0 0 6px ${color}50, 0 4px 16px rgba(0,0,0,0.2)`
            : showColor
              ? "0 3px 12px rgba(0,0,0,0.18)"
              : "0 2px 8px rgba(0,0,0,0.1)",
        opacity: hasSelection && !highlighted ? 0.25 : 1,
        cursor: "pointer",
        transition: "opacity 0.25s, box-shadow 0.25s",
      }}
    >
      <Handle
        id="bottom"
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      <div
        style={{
          background: showColor ? color : "#94A3B8",
          letterSpacing: "0.03em",
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#000000",
          paddingTop: "27px",
          paddingBottom: "6px",
          paddingLeft: "14px",
          paddingRight: "14px",
          lineHeight: 1.1,
          textAlign: "left",
          fontSize: 28,
          fontWeight: 700,
          whiteSpace: "pre-line",
          transition: "background 0.25s",
          position: "relative",
        }}
      >
        {label}
        <div
          data-testid={`star-button-${id}`}
          onClick={(e) => {
            e.stopPropagation();
            onStarClick();
          }}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "2px solid #1E293B",
            background: starred ? "#FACC15" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={starred ? "#1E293B" : "none"}
            stroke="#1E293B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 2,
          background: showColor ? `${color}55` : "#CBD5E140",
          padding: 2,
        }}
      >
        {subconcepts.map((sub, i) => {
          const isMastered = masteredSubconcepts?.has(sub) ?? false;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                background: highlightedSubconcepts?.has(sub)
                  ? toPastel(color)
                  : "#fff",
                padding: "5px 6px",
                textAlign: "center",
                fontFamily: "Helvetica, Arial, sans-serif",
                fontSize: 17,
                fontWeight: 550,
                lineHeight: 1.3,
                color: "#1E293B",
                whiteSpace: "pre-line",
              }}
            >
              <div
                data-testid={`subconcept-checkbox-${id}-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubconceptMastered?.(sub);
                }}
                style={{
                  position: "absolute",
                  left: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  borderTop: "1px solid #1E293B",
                  borderLeft: "1px solid #1E293B",
                  borderRight: "2.5px solid #1E293B",
                  borderBottom: "2.5px solid #1E293B",
                  background: isMastered ? color : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {isMastered && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>
              {sub}
            </div>
          );
        })}
      </div>

      <Handle
        id="top"
        type="source"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

function DetailNode({ data, id }: NodeProps) {
  const onDelete = useContext(DeleteDetailContext);

  const cardType = data.cardType as string;
  const itemLabel = data.itemLabel as string;
  const conceptColor = data.conceptColor as string;
  const greyed = data.greyed as boolean | undefined;
  const bgColor = greyed ? "#f1f5f9" : toPastel(conceptColor);
  const borderColor = greyed ? "#cbd5e1" : "#000000";
  const pillBg = greyed ? "#cbd5e1" : conceptColor;
  const textColor = greyed ? "#94a3b8" : "#1E293B";

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        width: 250,
        padding: "10px 10px",
        position: "relative",
        textAlign: "left",
      }}
    >
      <Handle
        id="bottom"
        type="target"
        position={Position.Bottom}
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {/* X button */}
      <div
        className="concept-graph-detail-delete"
        data-testid={`detail-delete-${id}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
      >
        <svg
          className="concept-graph-detail-delete-icon"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      {/* Pill label */}
      <span
        style={{
          background: pillBg,
          borderRadius: 100,
          padding: "2px 10px",
          border: `1px solid ${borderColor}`,
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: textColor,
          whiteSpace: "nowrap",
          display: "inline-block",
          marginBottom: 6,
          marginRight: 20,
        }}
      >
        {cardType}
      </span>

      {/* Item label */}
      <div
        style={{
          paddingLeft: 6,
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: textColor,
          marginBottom: 6,
        }}
      >
        {itemLabel}
      </div>

      {/* Content */}
      <div
        style={{
          paddingLeft: 6,
          paddingRight: 6,
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 13,
          color: textColor,
          lineHeight: 1.5,
        }}
      >
        {cardType === "Example" ? (
          <pre
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              background: "#e2e8f0",
              border: "1px solid #000000",
              borderRadius: 6,
              padding: "8px 12px",
              margin: 0,
              whiteSpace: "pre-wrap",
              color: textColor,
              lineHeight: 1.5,
            }}
          >
            {(data.cardContent as string) ||
              `Example for "${itemLabel}" will appear here.`}
          </pre>
        ) : (
          <div
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              fontSize: 12,
              color: "#1E293B",
              lineHeight: 1.5,
            }}
          >
            {(data.cardContent as string) ||
              `${cardType} for "${itemLabel}" will appear here.`}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { major: MajorNode, detail: DetailNode };
const { nodes: initialNodes, edges: initialEdges } =
  buildLegacyGraphElements(positions);

export default function LegacyConceptGraph({
  highlightedIds,
  highlightedSubconcepts,
  onConceptClick,
  starredIds,
  onStarClick,
  onReset,
  onDetailAdded,
  onDetailDeleted,
  restoredDetailCards,
  onDetailMoved,
  masteredSubconcepts,
  onSubconceptMastered,
  onPaneClick,
}: ConceptGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const hasSelection = highlightedIds.size > 0;
  const restoredRef = useRef(false);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const highlightedIdsRef = useRef(highlightedIds);
  useEffect(() => {
    highlightedIdsRef.current = highlightedIds;
  }, [highlightedIds]);

  useEffect(() => {
    if (restoredRef.current || !restoredDetailCards?.length) return;
    restoredRef.current = true;

    const newNodes = restoredDetailCards.map((card, i) => {
      const concept = majorConcepts.find((c) => c.name === card.conceptId);
      const conceptLabel = concept?.label.replace(/\n/g, " ") ?? "";
      const isConceptItself = card.itemLabel === conceptLabel;
      const contentKey = isConceptItself
        ? card.conceptId
        : `${card.conceptId}:${card.itemLabel}`;
      const cardContent =
        conceptContent[contentKey]?.[cardKeyMap[card.cardType]] ?? "";

      return {
        id: `detail-restored-${i}-${card.cardType}-${card.itemLabel}`,
        type: "detail" as const,
        position: { x: card.posX, y: card.posY },
        data: {
          cardType: card.cardType,
          itemLabel: card.itemLabel,
          conceptId: card.conceptId,
          conceptColor: card.conceptColor,
          cardContent,
        },
      };
    });
    const newEdges = restoredDetailCards.map((card, i) => ({
      id: `edge-restored-${i}`,
      source: card.conceptId,
      target: newNodes[i].id,
      targetHandle: "bottom",
      type: "default",
      style: {
        stroke: card.conceptColor,
        strokeWidth: 4,
        strokeDasharray: "4 2",
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: card.conceptColor },
      data: { conceptColor: card.conceptColor },
    }));

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
  }, [restoredDetailCards, setNodes, setEdges]);

  const rfInstance = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    onReset();
    setTimeout(() => rfInstance.current?.fitView({ padding: 0.08 }), 50);
  }, [onReset, setNodes, setEdges]);

  const handleDeleteDetail = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === id);
        if (node?.data) {
          onDetailDeleted?.(
            node.data.cardType as string,
            node.data.itemLabel as string,
          );
        }
        return nds.filter((n) => n.id !== id);
      });
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges, onDetailDeleted],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/scaffold-card");
      if (!raw) return;

      const { cardType, itemLabel, conceptId, conceptColor, cardContent } =
        JSON.parse(raw);
      const position = rfInstance.current?.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      if (!position) return;

      const nodeId = `detail-${Date.now()}`;

      const isHighlighted = highlightedIdsRef.current.has(conceptId);
      const hasSelectionNow = highlightedIdsRef.current.size > 0;
      const edgeColor =
        hasSelectionNow && !isHighlighted ? "#cbd5e1" : conceptColor;

      setNodes((nds) => [
        ...nds,
        {
          id: nodeId,
          type: "detail",
          position,
          data: { cardType, itemLabel, conceptColor, cardContent, conceptId },
        },
      ]);

      setEdges((eds) => [
        ...eds,
        {
          id: `detail-edge-${nodeId}`,
          source: conceptId,
          target: nodeId,
          targetHandle: "bottom",
          type: "default",
          style: { stroke: edgeColor, strokeWidth: 4, strokeDasharray: "4 2" },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          data: { conceptColor },
        },
      ]);

      onDetailAdded?.({
        cardType,
        itemLabel,
        conceptId,
        conceptColor,
        posX: position.x,
        posY: position.y,
      });
    },
    [setNodes, setEdges, onDetailAdded],
  );

  // Update node appearance when highlighted set changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === "detail") {
          const greyed =
            hasSelection && !highlightedIds.has(node.data.conceptId as string);
          return {
            ...node,
            style: { ...node.style, opacity: greyed ? 0.5 : 1 },
            data: { ...node.data, greyed },
          };
        }
        return {
          ...node,
          data: {
            ...node.data,
            highlighted: highlightedIds.has(node.id),
            hasSelection,
            highlightedSubconcepts:
              highlightedSubconcepts.get(node.id) ?? new Set(),
            starred: starredIds.has(node.id),
            onStarClick: () => onStarClick(node.id),
            masteredSubconcepts: masteredSubconcepts,
            onSubconceptMastered: (sub: string) => onSubconceptMastered(sub),
          },
        };
      }),
    );
  }, [
    highlightedIds,
    hasSelection,
    highlightedSubconcepts,
    starredIds,
    masteredSubconcepts,
    onSubconceptMastered,
    onStarClick,
    setNodes,
  ]);

  // Update edge appearance when highlighted set changes
  useEffect(() => {
    if (!hasSelection) {
      setEdges((eds) => [
        ...initialEdges,
        ...eds
          .filter(
            (e) =>
              e.id.startsWith("detail-edge-") ||
              e.id.startsWith("edge-restored-"),
          )
          .map((e) => {
            const color = (e.data?.conceptColor as string) ?? "#64748B";
            return {
              ...e,
              style: { stroke: color, strokeWidth: 4, strokeDasharray: "4 2" },
              markerEnd: { type: MarkerType.ArrowClosed, color },
            };
          }),
      ]);
      return;
    }
    setEdges((eds) => [
      ...prereqEdgeData.map((e) => {
        const isHighlighted =
          highlightedIds.has(e.source) && highlightedIds.has(e.target);
        const color =
          majorConcepts.find((c) => c.name === e.source)?.color ?? "#64748B";
        return {
          id: `prereq-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          sourceHandle: "top",
          targetHandle: "bottom",
          type: "default",
          animated: isHighlighted,
          style: {
            stroke: isHighlighted ? color : "#CBD5E1",
            strokeWidth: isHighlighted ? 5 : 4,
            strokeDasharray: isHighlighted ? undefined : "5 3",
            opacity: isHighlighted ? 1 : 0.2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isHighlighted ? color : "#CBD5E1",
          },
        };
      }),
      ...eds
        .filter(
          (e) =>
            e.id.startsWith("detail-edge-") ||
            e.id.startsWith("edge-restored-"),
        )
        .map((e) => {
          const isHighlighted = highlightedIds.has(e.source);
          const color = (e.data?.conceptColor as string) ?? "#64748B";
          return {
            ...e,
            style: {
              stroke: isHighlighted ? color : "#cbd5e1",
              strokeWidth: 4,
              strokeDasharray: "4 2",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isHighlighted ? color : "#cbd5e1",
            },
          };
        }),
    ]);
  }, [highlightedIds, hasSelection, setEdges]);

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.type === "detail") return;
      onConceptClick(node.id);
    },
    [onConceptClick],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      changes.forEach((change) => {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position
        ) {
          const node = nodesRef.current.find((n) => n.id === change.id);
          if (node?.type === "detail") {
            onDetailMoved?.(
              node.data.cardType as string,
              node.data.itemLabel as string,
              change.position.x,
              change.position.y,
            );
          }
        }
      });
    },
    [onNodesChange, onDetailMoved],
  );

  return (
    <DeleteDetailContext.Provider value={handleDeleteDetail}>
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Scaffold Concept Graph
        </span>
        <div
          style={{
            position: "absolute",
            alignItems: "flex-end",
            top: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <ResetButton onReset={handleReset} />
          <LevelLegend />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          onNodeClick={onNodeClick}
          onInit={(instance: ReactFlowInstance<Node, Edge>) => {
            rfInstance.current = instance;
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.1}
          onPaneClick={onPaneClick}
        >
          <Controls />
          <Background
            variant={BackgroundVariant.Dots}
            color="#1E293B"
            gap={20}
          />
        </ReactFlow>
      </div>
    </DeleteDetailContext.Provider>
  );
}
