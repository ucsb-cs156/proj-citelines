import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
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
import {
  buildScaffoldGraphElements,
  type MajorConceptLike,
  type SubconceptLike,
  type EdgeLike,
} from "main/utils/layout";
import type { ConceptContentDTO } from "main/types/conceptGraph";
import { useStaffTools } from "main/utils/useStaffTools";
import LevelLegend from "main/components/Scaffold/LevelLegend";
import ResetButton from "main/components/Scaffold/ResetButton";

// This is a parallel, database-driven version of ConceptGraph.tsx: instead of
// importing majorConcepts/prereqEdgeData/positions/conceptContent from the
// hardcoded frontend/src/main/data files, it takes them as props so it can
// render a concept graph fetched from the backend for any course. The
// original ConceptGraph.tsx (used by LegacyHomePage.tsx) is left completely
// untouched; once this version is proven out, one of the two can be retired.

const cardKeyMap: Record<string, keyof ConceptContentDTO> = {
  Description: "descriptionHtml",
  Example: "exampleHtml",
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

interface ScaffoldConceptGraphProps {
  majorConcepts: MajorConceptLike[];
  positions: Record<string, { x: number; y: number }>;
  conceptContent: Record<string, ConceptContentDTO>;
  prereqEdgeData: EdgeLike[];
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
  // Called when the user finishes dragging a top-level concept node. The position is a
  // private, per-user override (see ConceptGraphPage) until an instructor's course-wide
  // reset recomputes the shared, canonical position.
  onMajorMoved?: (name: string, posX: number, posY: number) => void;
  // Called when an author (with editing enabled) drag-and-drops a card's
  // subconcepts into a new order. orderedSubconceptIds is the complete new
  // ordering of the parent's subconcept ids; the page persists it.
  onSubconceptsReordered?: (
    parentConceptId: number,
    orderedSubconceptIds: number[],
  ) => void;
  onConceptDoubleClick?: (conceptId: string) => void;
  onSubconceptDoubleClick?: (
    parentConceptId: string,
    subconceptId: string,
  ) => void;
  onAddSubconcept?: (parentConceptId: string) => void;
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
const ConceptContentContext = createContext<Record<string, ConceptContentDTO>>(
  {},
);
// Lets a MajorNode report that the author drag-and-dropped its subconcepts into
// a new order (nodeId is the parent's React Flow node id, i.e. its numeric
// concept id as a string). Provided by ScaffoldConceptGraph, which updates the node's
// data and notifies the page so it can persist the order.
const SubconceptReorderContext = createContext<
  (nodeId: string, reordered: SubconceptLike[]) => void
>(() => {});

function MajorNode({ data, id }: NodeProps) {
  const color = data.color as string;
  const labelHtml = data.labelHtml as string;
  const subconcepts = data.subconcepts as SubconceptLike[];
  const highlighted = data.highlighted as boolean;
  const hasSelection = data.hasSelection as boolean;
  const highlightedSubconcepts = data.highlightedSubconcepts as Set<string>;
  const starred = data.starred as boolean;
  const onStarClick = data.onStarClick as () => void;
  const masteredSubconcepts = data.masteredSubconcepts as
    Set<string> | undefined;
  const onSubconceptMastered = data.onSubconceptMastered as
    ((sub: string) => void) | undefined;
  const onConceptDoubleClick = data.onConceptDoubleClick as
    ((conceptId: string) => void) | undefined;
  const onSubconceptDoubleClick = data.onSubconceptDoubleClick as
    ((parentConceptId: string, subconceptId: string) => void) | undefined;
  const onAddSubconcept = data.onAddSubconcept as
    ((parentConceptId: string) => void) | undefined;

  const { debugMode, enableEditing } = useStaffTools();
  const onSubconceptsReordered = useContext(SubconceptReorderContext);
  // Index of the subconcept row being dragged / hovered over during an
  // editing-enabled drag-and-drop reorder; null when no drag is in progress.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const allConceptContent = useContext(ConceptContentContext);
  const conceptContentForNode = allConceptContent[id];
  const debugTitle = useMemo(
    () =>
      debugMode
        ? JSON.stringify(
            {
              id,
              label: labelHtml,
              color,
              subconcepts,
              conceptContent: conceptContentForNode,
            },
            null,
            2,
          )
        : undefined,
    [debugMode, id, labelHtml, color, subconcepts, conceptContentForNode],
  );

  const showColor = !hasSelection || highlighted;

  return (
    <div
      title={debugTitle}
      data-testid={`major-node-${id}`}
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
        data-testid={`major-node-header-${id}`}
        onDoubleClick={() => {
          if (!enableEditing) return;
          onConceptDoubleClick?.(id);
        }}
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
        <span dangerouslySetInnerHTML={{ __html: labelHtml }} />
        <div
          data-testid={`star-button-${id}`}
          onClick={(e) => {
            e.stopPropagation();
            onStarClick();
          }}
          onDoubleClick={(e) => e.stopPropagation()}
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
          const isMastered = masteredSubconcepts?.has(sub.labelHtml) ?? false;
          const isDropTarget =
            dropIndex === i && dragIndex !== null && dragIndex !== i;
          return (
            <div
              key={sub.id}
              data-testid={`subconcept-row-${id}-${i}`}
              // "nodrag" tells React Flow not to treat a drag that starts on
              // this row as a node drag, so the HTML5 row drag can happen.
              className={enableEditing ? "nodrag" : undefined}
              draggable={enableEditing}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                setDragIndex(i);
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.stopPropagation();
                setDropIndex(i);
              }}
              onDrop={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.stopPropagation();
                if (dragIndex !== i) {
                  const reordered = [...subconcepts];
                  const [moved] = reordered.splice(dragIndex, 1);
                  reordered.splice(i, 0, moved);
                  onSubconceptsReordered(id, reordered);
                }
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDoubleClick={(e) => {
                if (!enableEditing) return;
                e.stopPropagation();
                onSubconceptDoubleClick?.(id, String(sub.id));
              }}
              style={{
                position: "relative",
                background: isDropTarget
                  ? "#e2e8f0"
                  : highlightedSubconcepts?.has(sub.labelHtml)
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
                cursor: enableEditing ? "grab" : undefined,
                opacity: dragIndex === i ? 0.5 : 1,
              }}
            >
              <div
                data-testid={`subconcept-checkbox-${id}-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubconceptMastered?.(sub.labelHtml);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
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
              <span dangerouslySetInnerHTML={{ __html: sub.labelHtml }} />
              {enableEditing && (
                <span
                  data-testid={`subconcept-drag-handle-${id}-${i}`}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    fontSize: 13,
                  }}
                >
                  ⠿
                </span>
              )}
            </div>
          );
        })}
        {enableEditing && (
          <button
            type="button"
            className="nodrag"
            data-testid={`add-subconcept-button-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddSubconcept?.(id);
            }}
            style={{
              background: "#ffffff",
              borderTop: "1px solid #1E293B",
              borderLeft: "1px solid #1E293B",
              borderRight: "2.5px solid #1E293B",
              borderBottom: "2.5px solid #1E293B",
              borderRadius: 6,
              color: "#1E293B",
              cursor: "pointer",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              margin: "6px 6px 4px",
              padding: "6px 10px",
            }}
          >
            Add subconcept
          </button>
        )}
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
          <div
            className="concept-detail-content"
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
            dangerouslySetInnerHTML={{
              __html:
                (data.cardContent as string) ||
                `Example for "${itemLabel}" will appear here.`,
            }}
          />
        ) : (
          <div
            className="concept-detail-content"
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              fontSize: 12,
              color: "#1E293B",
              lineHeight: 1.5,
            }}
            dangerouslySetInnerHTML={{
              __html:
                (data.cardContent as string) ||
                `${cardType} for "${itemLabel}" will appear here.`,
            }}
          />
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

export default function ScaffoldConceptGraph({
  majorConcepts,
  positions,
  conceptContent,
  prereqEdgeData,
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
  onMajorMoved,
  masteredSubconcepts,
  onSubconceptMastered,
  onPaneClick,
  onSubconceptsReordered,
  onConceptDoubleClick,
  onSubconceptDoubleClick,
  onAddSubconcept,
}: ScaffoldConceptGraphProps) {
  // majorConcepts/positions/prereqEdgeData were only stable for the lifetime
  // of a mounted instance until concept/subconcept create/update mutations
  // started invalidating the graph query in place, so this memo can now be
  // recomputed after mount (e.g. after creating/editing a concept or
  // subconcept). useNodesState only consumes its initial argument once, so
  // the effect below re-syncs "major" nodes whenever majorConcepts changes,
  // without clobbering locally-added detail cards or dragged node positions.
  // (Prereq edges are already re-synced from majorConcepts/initialEdges by
  // the highlightedIds effect further down.)
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildScaffoldGraphElements(positions, majorConcepts, prereqEdgeData),
    [positions, majorConcepts, prereqEdgeData],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const hasSelection = highlightedIds.size > 0;
  const restoredRef = useRef(false);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Re-sync "major" nodes whenever the fetched concept graph changes (e.g.
  // after creating a concept, editing a concept, or adding/editing a
  // subconcept). Existing major nodes keep their current position (preserving
  // drags/local reordering); their data (label, color, subconcepts, etc.) is
  // refreshed from the latest fetch. New concepts are appended, and any major
  // nodes no longer present in the graph are removed. Non-"major" nodes (e.g.
  // detail cards) are left untouched.
  const majorConceptsRef = useRef(majorConcepts);
  useEffect(() => {
    if (majorConceptsRef.current === majorConcepts) return;
    majorConceptsRef.current = majorConcepts;

    setNodes((nds) => {
      const freshMajorById = new Map(initialNodes.map((n) => [n.id, n]));
      const merged = nds
        .filter((n) => n.type !== "major" || freshMajorById.has(n.id))
        .map((n) => {
          if (n.type !== "major") return n;
          const fresh = freshMajorById.get(n.id);
          if (!fresh) return n;
          // Spread n.data first so any local additions from other effects
          // (e.g. highlighted/starred flags, onConceptDoubleClick handlers set
          // by the highlightedIds effect below) survive; fresh.data only ever
          // contains labelHtml/color/subconcepts (see
          // buildScaffoldGraphElements), so those are the only keys refreshed.
          return { ...n, data: { ...n.data, ...fresh.data } };
        });
      const existingIds = new Set(merged.map((n) => n.id));
      const newMajors = initialNodes.filter((n) => !existingIds.has(n.id));
      return [...merged, ...newMajors];
    });
  }, [majorConcepts, initialNodes, setNodes]);

  const highlightedIdsRef = useRef(highlightedIds);
  useEffect(() => {
    highlightedIdsRef.current = highlightedIds;
  }, [highlightedIds]);

  useEffect(() => {
    if (restoredRef.current || !restoredDetailCards?.length) return;
    restoredRef.current = true;

    const newNodes = restoredDetailCards.map((card, i) => {
      // card.conceptId is the parent concept's numeric id as a string (the React
      // Flow node id). Content is keyed by each concept's own numeric id, so a
      // subconcept card resolves its subconcept id via its label.
      const concept = majorConcepts.find(
        (c) => String(c.id) === card.conceptId,
      );
      const conceptLabel = concept?.labelHtml.replace(/\n/g, " ") ?? "";
      const isConceptItself = card.itemLabel === conceptLabel;
      const subconceptId = concept?.subconcepts.find(
        (s) => s.labelHtml === card.itemLabel,
      )?.id;
      const contentKey = isConceptItself
        ? card.conceptId
        : String(subconceptId);
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
  }, [restoredDetailCards, setNodes, setEdges, majorConcepts, conceptContent]);

  const rfInstance = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    onReset();
    setTimeout(() => rfInstance.current?.fitView({ padding: 0.08 }), 50);
  }, [onReset, setNodes, setEdges, initialNodes, initialEdges]);

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

  // A MajorNode reports a drag-and-drop reorder of its subconcepts: update the
  // node's own data (nodes are snapshotted by useNodesState, so the prop-driven
  // rebuild won't do it) and tell the page so it can persist the new order.
  const handleSubconceptsReordered = useCallback(
    (nodeId: string, reordered: SubconceptLike[]) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, subconcepts: reordered } }
            : node,
        ),
      );
      onSubconceptsReordered?.(
        Number(nodeId),
        reordered.map((sub) => sub.id),
      );
    },
    [setNodes, onSubconceptsReordered],
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
            onConceptDoubleClick,
            onSubconceptDoubleClick,
            onAddSubconcept,
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
    onConceptDoubleClick,
    onSubconceptDoubleClick,
    onAddSubconcept,
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
        const source = String(e.sourceId);
        const target = String(e.targetId);
        const isHighlighted =
          highlightedIds.has(source) && highlightedIds.has(target);
        const color =
          e.color ??
          majorConcepts.find((c) => c.id === e.sourceId)?.color ??
          "#64748B";
        return {
          id: `prereq-${e.id}`,
          source,
          target,
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
  }, [
    highlightedIds,
    hasSelection,
    setEdges,
    initialEdges,
    prereqEdgeData,
    majorConcepts,
  ]);

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
          } else if (node?.type === "major") {
            onMajorMoved?.(node.id, change.position.x, change.position.y);
          }
        }
      });
    },
    [onNodesChange, onDetailMoved, onMajorMoved],
  );

  return (
    <ConceptContentContext.Provider value={conceptContent}>
      <SubconceptReorderContext.Provider value={handleSubconceptsReordered}>
        <DeleteDetailContext.Provider value={handleDeleteDetail}>
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
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
      </SubconceptReorderContext.Provider>
    </ConceptContentContext.Provider>
  );
}
