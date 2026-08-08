import { type Node, type Edge, MarkerType, Position } from "@xyflow/react";
import { majorConcepts, prereqEdgeData } from "../data/conceptGraph";

export function buildLegacyGraphElements(
  positions: Record<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = majorConcepts.map((concept) => ({
    id: concept.name,
    type: "major",
    position: positions[concept.name] ?? { x: 0, y: 0 },
    data: {
      label: concept.label,
      color: concept.color,
      subconcepts: concept.subconcepts,
    },
    sourcePosition: Position.Top,
    targetPosition: Position.Bottom,
  }));

  const edges: Edge[] = prereqEdgeData.map((e) => ({
    id: `prereq-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    sourceHandle: "top",
    targetHandle: "bottom",
    type: "default",
    style: {
      stroke: majorConcepts.find((c) => c.name === e.source)?.color,
      strokeWidth: 4,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: majorConcepts.find((c) => c.name === e.source)?.color,
    },
  }));

  return { nodes, edges };
}

export interface SubconceptLike {
  id: number;
  parentId: number;
  labelHtml: string;
}

export interface MajorConceptLike {
  id: number;
  labelHtml: string;
  color: string;
  subconcepts: SubconceptLike[];
}

export interface EdgeLike {
  id: number;
  sourceId: number;
  targetId: number;
  // Set (bright red) when the edge is part of a prerequisite cycle; null otherwise,
  // in which case the edge takes its source concept's color.
  color?: string | null;
}

// Same shape as buildLegacyGraphElements, but fully parameterized so it can build a
// graph from database-fetched data instead of the hardcoded conceptGraph.ts
// imports, using numeric concept ids (as strings) for React Flow node ids. Kept
// separate (rather than changing buildLegacyGraphElements itself) so the original,
// hardcoded-data code path used by LegacyHomePage.tsx / ConceptGraph.tsx is
// completely untouched.
export function buildScaffoldGraphElements(
  positions: Record<string, { x: number; y: number }>,
  majorConceptsData: MajorConceptLike[],
  prereqEdgeDataArg: EdgeLike[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = majorConceptsData.map((concept) => ({
    id: String(concept.id),
    type: "major",
    position: positions[String(concept.id)] ?? { x: 0, y: 0 },
    data: {
      labelHtml: concept.labelHtml,
      color: concept.color,
      subconcepts: concept.subconcepts,
    },
    sourcePosition: Position.Top,
    targetPosition: Position.Bottom,
  }));

  const edges: Edge[] = prereqEdgeDataArg.map((e) => {
    const color =
      e.color ?? majorConceptsData.find((c) => c.id === e.sourceId)?.color;
    return {
      id: `prereq-${e.id}`,
      source: String(e.sourceId),
      target: String(e.targetId),
      sourceHandle: "top",
      targetHandle: "bottom",
      type: "default",
      style: { stroke: color, strokeWidth: 4 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    };
  });

  return { nodes, edges };
}
