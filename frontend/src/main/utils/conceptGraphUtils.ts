import { prereqEdgeData } from "../data/conceptGraph";

export const normalize = (s: string) => s.replace(/\\n/g, "\n");

export function toPastel(hex: string, strength: number = 0.1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * strength + 255 * (1 - strength))}, ${Math.round(g * strength + 255 * (1 - strength))}, ${Math.round(b * strength + 255 * (1 - strength))})`;
}

// Same as computeLegacySubgraph, but parameterized with edges fetched from the
// backend (numeric concept ids) instead of the hardcoded legacy edge list, so
// it works for any course. Node ids are the concepts' numeric ids as strings,
// matching the React Flow node ids used by ScaffoldConceptGraph.
export function computeScaffoldSubgraph(
  taggedIds: string[],
  edges: { sourceId: number; targetId: number }[],
): Set<string> {
  const result = new Set<string>(taggedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      const source = String(e.sourceId);
      if (result.has(String(e.targetId)) && !result.has(source)) {
        result.add(source);
        changed = true;
      }
    }
  }
  return result;
}

// Walk the prereq graph upward from tagged concepts to include all ancestors
// (legacy, hardcoded-data version used by LegacyHomePage.tsx).
export function computeLegacySubgraph(taggedIds: string[]): Set<string> {
  const result = new Set<string>(taggedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { source, target } of prereqEdgeData) {
      if (result.has(target) && !result.has(source)) {
        result.add(source);
        changed = true;
      }
    }
  }
  return result;
}
