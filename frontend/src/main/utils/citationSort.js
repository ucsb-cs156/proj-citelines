import { getEntryRelevance } from "main/utils/citationFilter";
import { relevanceRank } from "main/utils/relevance";

// Pure state-shape + reordering logic for CitationSort (issue #102). Kept separate from the
// component, matching citationFilter.js's split, so the drag-and-drop drop-target resolution
// logic is independently testable without simulating an actual pointer drag sequence.

export const CITATION_SORT_OPTIONS = ["Relevance", "Year", "Author", "Title"];

// Nothing selected by default — an empty array means "no sort applied".
export const DEFAULT_CITATION_SORT = [];

// Droppable ids for the two containers themselves, used so a criterion can be dropped into an
// empty list (which otherwise has no item to be dropped "onto").
export const SELECTED_CONTAINER_ID = "CitationSort-selected-container";
export const AVAILABLE_CONTAINER_ID = "CitationSort-available-container";

export function addCriterion(sortCriteria, criterion) {
  if (sortCriteria.includes(criterion)) return sortCriteria;
  return [...sortCriteria, criterion];
}

export function removeCriterion(sortCriteria, criterion) {
  return sortCriteria.filter((c) => c !== criterion);
}

// direction is -1 (up/earlier) or +1 (down/later); a no-op past either end of the list.
export function moveCriterion(sortCriteria, criterion, direction) {
  const index = sortCriteria.indexOf(criterion);
  const swapWith = index + direction;
  if (index === -1 || swapWith < 0 || swapWith >= sortCriteria.length) {
    return sortCriteria;
  }
  const next = [...sortCriteria];
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return next;
}

/**
 * Resolves a dnd-kit onDragEnd({active, over}) pair into the new sortCriteria array: dropping a
 * selected criterion onto the available side removes it; dropping an available criterion onto
 * the selected side (or its container) adds it at the hovered position; dropping a selected
 * criterion elsewhere within the selected side reorders it there. Returns sortCriteria unchanged
 * (same reference) when the drop doesn't change anything, so callers can skip a no-op onChange.
 *
 * @param {string[]} sortCriteria
 * @param {string} activeId - the criterion being dragged
 * @param {string|null|undefined} overId - the criterion or container id dropped onto, if any
 * @returns {string[]}
 */
export function reorderAfterDrag(sortCriteria, activeId, overId) {
  if (!overId || activeId === overId) return sortCriteria;

  const isActiveSelected = sortCriteria.includes(activeId);
  const overIsSelectedItem = sortCriteria.includes(overId);
  const droppedOnSelectedSide =
    overId === SELECTED_CONTAINER_ID || overIsSelectedItem;

  if (!droppedOnSelectedSide) {
    return isActiveSelected
      ? removeCriterion(sortCriteria, activeId)
      : sortCriteria;
  }

  if (isActiveSelected) {
    const oldIndex = sortCriteria.indexOf(activeId);
    const newIndex = overIsSelectedItem
      ? sortCriteria.indexOf(overId)
      : sortCriteria.length - 1;
    if (oldIndex === newIndex) return sortCriteria;
    const next = [...sortCriteria];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, activeId);
    return next;
  }

  const insertIndex = overIsSelectedItem
    ? sortCriteria.indexOf(overId)
    : sortCriteria.length;
  const next = [...sortCriteria];
  next.splice(insertIndex, 0, activeId);
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

// A missing/non-numeric year sorts last regardless of direction, rather than being treated as
// "year 0" and sorting first.
function numericYear(entry) {
  const year = Number.parseInt(fieldValue(entry, "year"), 10);
  return Number.isNaN(year) ? Infinity : year;
}

// One comparator per CITATION_SORT_OPTIONS entry, each already reflecting the fixed default
// direction documented in docs/design/sort-filter-design.md: Relevance ranks High to Unreviewed
// (descending), matching CitationTable's own Relevance column (issue #54); Year is oldest-first
// (ascending); Author/Title are case-insensitive locale compares.
const CRITERION_COMPARATORS = {
  Relevance: (entry1, entry2) =>
    relevanceRank(getEntryRelevance(entry2)) -
    relevanceRank(getEntryRelevance(entry1)),
  Year: (entry1, entry2) => numericYear(entry1) - numericYear(entry2),
  Author: (entry1, entry2) => compareLocale(entry1, entry2, "author"),
  Title: (entry1, entry2) => compareLocale(entry1, entry2, "title"),
};

/**
 * Builds an Array.prototype.sort comparator from an ordered CitationSort criteria array (e.g.
 * ["Author", "Title"]): two entries are compared by the first criterion, falling through to the
 * next only when the current one ties. An empty sortCriteria is a valid input — every comparison
 * is a tie (0), so sorting by it leaves the array's existing order untouched.
 *
 * @param {string[]} sortCriteria
 * @returns {(entry1: object, entry2: object) => number}
 */
export function sortCriteriaComparator(sortCriteria) {
  return (entry1, entry2) => {
    for (const criterion of sortCriteria) {
      const cmp = CRITERION_COMPARATORS[criterion](entry1, entry2);
      if (cmp !== 0) return cmp;
    }
    return 0;
  };
}
