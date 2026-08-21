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
