import { getEntryRelevance } from "main/utils/citationFilter";
import { relevanceRank } from "main/utils/relevance";

// Pure state-shape + reordering logic for CitationSort (issue #102). Kept separate from the
// component, matching citationFilter.js's split, so the drag-and-drop drop-target resolution
// logic is independently testable without simulating an actual pointer drag sequence.

export const CITATION_SORT_OPTIONS = ["Relevance", "Year", "Author", "Title"];

// Nothing selected by default — an empty array means "no sort applied".
export const DEFAULT_CITATION_SORT = [];

// The direction a newly-added criterion starts in (issue #112) — chosen to match what each
// field's sort used to be hardcoded to before per-criterion direction existed: Relevance ranks
// High first, Year is oldest-first, Author/Title are A-to-Z. The chip's direction toggle lets the
// user override this per use; it's just a sensible starting point.
export const DEFAULT_DIRECTIONS = {
  Relevance: "desc",
  Year: "asc",
  Author: "asc",
  Title: "asc",
};

// Droppable ids for the two containers themselves, used so a criterion can be dropped into an
// empty list (which otherwise has no item to be dropped "onto").
export const SELECTED_CONTAINER_ID = "CitationSort-selected-container";
export const AVAILABLE_CONTAINER_ID = "CitationSort-available-container";

function fieldOf(sortCriteria, field) {
  return sortCriteria.findIndex((c) => c.field === field);
}

export function addCriterion(sortCriteria, field) {
  if (fieldOf(sortCriteria, field) !== -1) return sortCriteria;
  return [...sortCriteria, { field, direction: DEFAULT_DIRECTIONS[field] }];
}

export function removeCriterion(sortCriteria, field) {
  return sortCriteria.filter((c) => c.field !== field);
}

export function toggleDirection(sortCriteria, field) {
  return sortCriteria.map((c) =>
    c.field === field
      ? { ...c, direction: c.direction === "asc" ? "desc" : "asc" }
      : c,
  );
}

/**
 * Resolves a dnd-kit onDragEnd({active, over}) pair into the new sortCriteria array: dropping a
 * selected criterion onto the available side removes it; dropping an available criterion onto
 * the selected side (or its container) adds it (at its default direction) at the hovered
 * position; dropping a selected criterion elsewhere within the selected side reorders it there,
 * keeping its current direction. Returns sortCriteria unchanged (same reference) when the drop
 * doesn't change anything, so callers can skip a no-op onChange.
 *
 * @param {{field: string, direction: "asc"|"desc"}[]} sortCriteria
 * @param {string} activeId - the field name being dragged
 * @param {string|null|undefined} overId - the field name or container id dropped onto, if any
 * @returns {{field: string, direction: "asc"|"desc"}[]}
 */
export function reorderAfterDrag(sortCriteria, activeId, overId) {
  if (!overId || activeId === overId) return sortCriteria;

  const activeIndex = fieldOf(sortCriteria, activeId);
  const isActiveSelected = activeIndex !== -1;
  const overIndex = fieldOf(sortCriteria, overId);
  const overIsSelectedItem = overIndex !== -1;
  const droppedOnSelectedSide =
    overId === SELECTED_CONTAINER_ID || overIsSelectedItem;

  if (!droppedOnSelectedSide) {
    return isActiveSelected
      ? removeCriterion(sortCriteria, activeId)
      : sortCriteria;
  }

  if (isActiveSelected) {
    const newIndex = overIsSelectedItem ? overIndex : sortCriteria.length - 1;
    if (activeIndex === newIndex) return sortCriteria;
    const next = [...sortCriteria];
    const [moved] = next.splice(activeIndex, 1);
    next.splice(newIndex, 0, moved);
    return next;
  }

  const insertIndex = overIsSelectedItem ? overIndex : sortCriteria.length;
  const next = [...sortCriteria];
  next.splice(insertIndex, 0, {
    field: activeId,
    direction: DEFAULT_DIRECTIONS[activeId],
  });
  return next;
}

function fieldValue(entry, field) {
  return entry.keyValuePairs?.[field] ?? "";
}

function compareLocale(entry1, entry2, field) {
  return fieldValue(entry1, field).localeCompare(
    fieldValue(entry2, field),
    undefined,
    {
      sensitivity: "base",
    },
  );
}

// A missing/non-numeric year is treated as infinitely large, so it sorts last when ascending and
// first when descending — the same way a spreadsheet column of numbers with blanks behaves when
// you flip the sort direction.
function numericYear(entry) {
  const year = Number.parseInt(fieldValue(entry, "year"), 10);
  return Number.isNaN(year) ? Infinity : year;
}

// One comparator per CITATION_SORT_OPTIONS entry, each defined in its "ascending" sense: negated
// by sortCriteriaComparator below when a criterion's direction is "desc". Relevance ascending
// means Unreviewed-to-High; Year ascending is oldest-first; Author/Title ascending is A-to-Z.
const CRITERION_COMPARATORS = {
  Relevance: (entry1, entry2) =>
    relevanceRank(getEntryRelevance(entry1)) -
    relevanceRank(getEntryRelevance(entry2)),
  Year: (entry1, entry2) => numericYear(entry1) - numericYear(entry2),
  Author: (entry1, entry2) => compareLocale(entry1, entry2, "author"),
  Title: (entry1, entry2) => compareLocale(entry1, entry2, "title"),
};

/**
 * Builds an Array.prototype.sort comparator from an ordered CitationSort criteria array (e.g.
 * [{field: "Author", direction: "asc"}, {field: "Title", direction: "asc"}]): two entries are
 * compared by the first criterion (in its chosen direction), falling through to the next only
 * when the current one ties. An empty sortCriteria is a valid input — every comparison is a tie
 * (0), so sorting by it leaves the array's existing order untouched.
 *
 * @param {{field: string, direction: "asc"|"desc"}[]} sortCriteria
 * @returns {(entry1: object, entry2: object) => number}
 */
export function sortCriteriaComparator(sortCriteria) {
  return (entry1, entry2) => {
    for (const { field, direction } of sortCriteria) {
      const cmp = CRITERION_COMPARATORS[field](entry1, entry2);
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  };
}
