import { useState } from "react";
import {
  DEFAULT_CITATION_FILTER,
  matchesCitationFilter,
} from "main/utils/citationFilter";
import {
  DEFAULT_CITATION_SORT,
  sortCriteriaComparator,
} from "main/utils/citationSort";

/**
 * Bundles the filter/sort state and client-side filtering/sorting glue shared by every place
 * that renders a CitationFilter + CitationSort pair above a CitationTable — originally written
 * inline in CitationsTabComponent.jsx (issues #106/#107), and extracted here once
 * BibTexEntryShowPage's References and Citations cards became a second and third call site
 * needing the identical logic (issue #108) — see docs/design/sort-filter-design.md.
 *
 * Each call owns its own independent filter/sort state, so two calls in the same component (one
 * per card, for instance) never affect each other.
 *
 * @param {object[]} entries - the full, unfiltered/unsorted entry list for this call's scope
 * @returns {{
 *   filter: object,
 *   setFilter: Function,
 *   sortCriteria: {field: string, direction: "asc"|"desc"}[],
 *   setSortCriteria: Function,
 *   visibleCitations: object[],
 *   enableColumnSort: boolean,
 * }}
 */
export function useFilteredSortedCitations(entries) {
  const [filter, setFilter] = useState(DEFAULT_CITATION_FILTER);
  const [sortCriteria, setSortCriteria] = useState(DEFAULT_CITATION_SORT);

  const visibleCitations = entries
    .filter((entry) => matchesCitationFilter(entry, filter))
    .sort(sortCriteriaComparator(sortCriteria));

  return {
    filter,
    setFilter,
    sortCriteria,
    setSortCriteria,
    visibleCitations,
    // A stray CitationTable column-header click can't silently desync the table from what
    // CitationSort's own ordering shows — see CitationTable's enableColumnSort doc comment.
    enableColumnSort: sortCriteria.length === 0,
  };
}
