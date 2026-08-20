import { DEFAULT_RELEVANCE } from "main/utils/citelinesFields";

// Sort rank and display metadata for each relevance level (issue #54). The colors themselves are
// defined once in index.css (.relevance-*) — this file only maps a relevance value to which of
// those classes/labels/ranks applies, so there's a single source of truth for the colors.
const RELEVANCE_RANKS = { High: 4, Medium: 3, Low: 2, None: 1, Unreviewed: 0 };

const RELEVANCE_CLASS_NAMES = {
  High: "relevance-high",
  Medium: "relevance-medium",
  Low: "relevance-low",
  None: "relevance-none",
  Unreviewed: "relevance-unreviewed",
};

// A numeric rank (4 for High, down to 0 for Unreviewed) so a table column can sort by relevance
// in priority order rather than alphabetically.
export function relevanceRank(relevance) {
  return RELEVANCE_RANKS[relevance] ?? RELEVANCE_RANKS[DEFAULT_RELEVANCE];
}

export function relevanceClassName(relevance) {
  return (
    RELEVANCE_CLASS_NAMES[relevance] ?? RELEVANCE_CLASS_NAMES[DEFAULT_RELEVANCE]
  );
}

// "Unreviewed" displays as "(unreviewed)"; every other level displays as-is.
export function relevanceLabel(relevance) {
  return relevance === "Unreviewed" ? "(unreviewed)" : relevance;
}
