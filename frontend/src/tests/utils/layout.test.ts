import { describe, test, expect } from "vitest";
import { MarkerType, Position } from "@xyflow/react";
import {
  buildLegacyGraphElements,
  buildScaffoldGraphElements,
} from "main/utils/layout";
import { majorConcepts, prereqEdgeData } from "main/data/conceptGraph";
import { positions } from "main/data/conceptGraphPositions";

describe("utils/layout", () => {
  describe("buildLegacyGraphElements", () => {
    test("creates one node per major concept", () => {
      const { nodes } = buildLegacyGraphElements(positions);
      expect(nodes).toHaveLength(majorConcepts.length);
    });

    test("each node carries the concept's id, type, and data", () => {
      const { nodes } = buildLegacyGraphElements(positions);
      majorConcepts.forEach((concept) => {
        const node = nodes.find((n) => n.id === concept.name);
        expect(node).toBeDefined();
        expect(node?.type).toBe("major");
        expect(node?.sourcePosition).toBe(Position.Top);
        expect(node?.targetPosition).toBe(Position.Bottom);
        expect(node?.data).toEqual({
          label: concept.label,
          color: concept.color,
          subconcepts: concept.subconcepts,
        });
      });
    });

    test("places each node at its position from the provided positions map", () => {
      const { nodes } = buildLegacyGraphElements(positions);
      const recursionNode = nodes.find((n) => n.id === "recursion");
      expect(recursionNode?.position).toEqual(positions["recursion"]);
    });

    test("defaults a node's position to the origin when it is missing from the positions map", () => {
      const customPositions: Record<string, { x: number; y: number }> = {
        ...positions,
      };
      delete customPositions["recursion"];

      const { nodes } = buildLegacyGraphElements(customPositions);
      const recursionNode = nodes.find((n) => n.id === "recursion");
      expect(recursionNode?.position).toEqual({ x: 0, y: 0 });
    });

    test("creates one edge per prerequisite relationship", () => {
      const { edges } = buildLegacyGraphElements(positions);
      expect(edges).toHaveLength(prereqEdgeData.length);
    });

    test("each edge connects the correct source and target with the expected shape", () => {
      const { edges } = buildLegacyGraphElements(positions);
      const { source, target } = prereqEdgeData[0];
      const edge = edges.find(
        (e) => e.source === source && e.target === target,
      );
      const sourceColor = majorConcepts.find((c) => c.name === source)?.color;

      expect(edge).toBeDefined();
      expect(edge?.id).toBe(`prereq-${source}-${target}`);
      expect(edge?.sourceHandle).toBe("top");
      expect(edge?.targetHandle).toBe("bottom");
      expect(edge?.type).toBe("default");
      expect(edge?.style).toEqual({ stroke: sourceColor, strokeWidth: 4 });
      expect(edge?.markerEnd).toEqual({
        type: MarkerType.ArrowClosed,
        color: sourceColor,
      });
    });
  });

  describe("buildScaffoldGraphElements", () => {
    const sampleConcepts = [
      {
        id: 1,
        labelHtml: "A",
        color: "#111111",
        subconcepts: [{ id: 101, parentId: 1, labelHtml: "sub-a1" }],
      },
      { id: 2, labelHtml: "B", color: "#222222", subconcepts: [] },
    ];
    const sampleEdges = [{ id: 10, sourceId: 1, targetId: 2, color: null }];
    const samplePositions = {
      "1": { x: 10, y: 20 },
      "2": { x: 30, y: 40 },
    };

    test("creates one node per supplied major concept, using the supplied data (not the hardcoded import)", () => {
      const { nodes } = buildScaffoldGraphElements(
        samplePositions,
        sampleConcepts,
        sampleEdges,
      );
      expect(nodes).toHaveLength(2);
      expect(nodes.map((n) => n.id).sort()).toEqual(["1", "2"]);
      expect(nodes[0].data).toEqual({
        labelHtml: "A",
        color: "#111111",
        subconcepts: [{ id: 101, parentId: 1, labelHtml: "sub-a1" }],
      });
    });

    test("places each node at its position from the supplied positions map", () => {
      const { nodes } = buildScaffoldGraphElements(
        samplePositions,
        sampleConcepts,
        sampleEdges,
      );
      expect(nodes.find((n) => n.id === "1")?.position).toEqual({
        x: 10,
        y: 20,
      });
    });

    test("defaults a node's position to the origin when missing from the positions map", () => {
      const { nodes } = buildScaffoldGraphElements(
        {},
        sampleConcepts,
        sampleEdges,
      );
      expect(nodes.find((n) => n.id === "1")?.position).toEqual({
        x: 0,
        y: 0,
      });
    });

    test("creates one edge per supplied prerequisite relationship, colored from the supplied concepts", () => {
      const { edges } = buildScaffoldGraphElements(
        samplePositions,
        sampleConcepts,
        sampleEdges,
      );
      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({
        id: "prereq-10",
        source: "1",
        target: "2",
        sourceHandle: "top",
        targetHandle: "bottom",
        type: "default",
        style: { stroke: "#111111", strokeWidth: 4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#111111" },
      });
    });

    test("uses the edge's own color (e.g. cycle red) when it has one", () => {
      const { edges } = buildScaffoldGraphElements(
        samplePositions,
        sampleConcepts,
        [{ id: 10, sourceId: 1, targetId: 2, color: "#FF0000" }],
      );
      expect(edges[0].style).toEqual({ stroke: "#FF0000", strokeWidth: 4 });
      expect(edges[0].markerEnd).toEqual({
        type: MarkerType.ArrowClosed,
        color: "#FF0000",
      });
    });

    test("is independent of the hardcoded conceptGraph.ts data", () => {
      const { nodes, edges } = buildScaffoldGraphElements(
        samplePositions,
        sampleConcepts,
        sampleEdges,
      );
      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);
      // sanity check that this is genuinely not the hardcoded 26-concept dataset
      expect(nodes.length).not.toEqual(majorConcepts.length);
    });
  });
});
