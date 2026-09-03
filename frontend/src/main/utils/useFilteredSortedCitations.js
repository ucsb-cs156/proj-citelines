import { useEffect, useRef, useState } from "react";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import { CITELINES_AUTOSAVE_INTERVAL_MS } from "main/components/Citations/BibTexEntryComments";
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
 * When `persistence` is given, both panels' fields and open/closed state are loaded from (and, on
 * any change, saved back to) the backend for that scope — the filter via
 * `/api/citationfilterstate` (issue #121) and the sort via `/api/citationsortstate` (issue #126)
 * — two independent endpoints/collections, since the two panels are independent (see #126's own
 * text for why: simpler to reason about each on its own rather than one combined record). A scope
 * that's never touched a given panel gets back the same defaults used when `persistence` is
 * omitted, without writing anything. Both are per-user (issue #130) — resolved entirely
 * server-side from the authenticated session, nothing extra to pass here. Saves are sent on a
 * heartbeat (matching BibTexEntryComments' autosave), not on every change, so rapid edits (e.g.
 * typing in the search box) don't POST once per keystroke.
 *
 * @param {object[]} entries - the full, unfiltered/unsorted entry list for this call's scope
 * @param {{projectId: (string|number), scope: "PROJECT"|"REFERENCES"|"CITATIONS", entryId?: string, autosaveIntervalMs?: number}} [persistence] -
 *   when given, this call's filter/sort/expanded state is loaded from and saved to the backend
 *   for this scope; omit for state that's local-only (e.g. in tests/stories).
 *   `autosaveIntervalMs` defaults to `CITELINES_AUTOSAVE_INTERVAL_MS`; overridable for tests, the
 *   same pattern `BibTexEntryComments` uses.
 * @returns {{
 *   filter: object,
 *   setFilter: Function,
 *   sortCriteria: {field: string, direction: "asc"|"desc"}[],
 *   setSortCriteria: Function,
 *   expanded: boolean,
 *   setExpanded: Function,
 *   sortExpanded: boolean,
 *   setSortExpanded: Function,
 *   visibleCitations: object[],
 *   enableColumnSort: boolean,
 * }}
 */
export function useFilteredSortedCitations(entries, persistence) {
  const [filter, setFilterState] = useState(DEFAULT_CITATION_FILTER);
  const [sortCriteria, setSortCriteriaState] = useState(DEFAULT_CITATION_SORT);
  // The CitationFilter panel's own open/closed state (issue #122) — closed by default, owned
  // here (rather than inside CitationFilter itself) so it's available alongside filter for
  // persistence below.
  const [expanded, setExpandedState] = useState(false);
  // CitationSort's own open/closed state (issue #126, mirroring #122) — closed by default.
  const [sortExpanded, setSortExpandedState] = useState(false);

  const hasPersistence = Boolean(persistence);
  const {
    projectId,
    scope,
    entryId,
    autosaveIntervalMs = CITELINES_AUTOSAVE_INTERVAL_MS,
  } = persistence ?? {};

  // Mirrors filter/expanded outside React state so the autosave heartbeat (set up once, not
  // recreated per keystroke) always reads the latest values rather than closing over stale ones
  // — same reasoning as BibTexEntryComments' draftTextRef.
  const latestRef = useRef({ filter, expanded });
  // Set once real saved/default state has been loaded and applied, so that initial load doesn't
  // immediately mark itself dirty and re-save the exact data it just fetched.
  const seededRef = useRef(!hasPersistence);
  const dirtyRef = useRef(false);

  // Same three refs, for the independent sort panel.
  const latestSortRef = useRef({ sortCriteria, sortExpanded });
  const seededSortRef = useRef(!hasPersistence);
  const dirtySortRef = useRef(false);

  const setFilter = (newFilter) => {
    setFilterState(newFilter);
    latestRef.current = { ...latestRef.current, filter: newFilter };
    if (hasPersistence && seededRef.current) dirtyRef.current = true;
  };

  const setExpanded = (newExpanded) => {
    setExpandedState(newExpanded);
    latestRef.current = { ...latestRef.current, expanded: newExpanded };
    if (hasPersistence && seededRef.current) dirtyRef.current = true;
  };

  const setSortCriteria = (newSortCriteria) => {
    setSortCriteriaState(newSortCriteria);
    latestSortRef.current = {
      ...latestSortRef.current,
      sortCriteria: newSortCriteria,
    };
    if (hasPersistence && seededSortRef.current) dirtySortRef.current = true;
  };

  const setSortExpanded = (newSortExpanded) => {
    setSortExpandedState(newSortExpanded);
    latestSortRef.current = {
      ...latestSortRef.current,
      sortExpanded: newSortExpanded,
    };
    if (hasPersistence && seededSortRef.current) dirtySortRef.current = true;
  };

  const { data: savedFilterState } = useBackend(
    [
      "/api/citationfilterstate",
      String(projectId),
      String(scope),
      String(entryId),
    ],
    {
      method: "GET",
      url: "/api/citationfilterstate",
      params: { projectId, scope, entryId },
    },
    null,
    true,
    { enabled: hasPersistence },
  );

  useEffect(() => {
    if (!savedFilterState || seededRef.current) return;
    seededRef.current = true;
    const seededFilter = {
      relevance: savedFilterState.relevance,
      link: savedFilterState.link,
      duplicates: savedFilterState.duplicates,
      search: savedFilterState.search,
      tagIds: savedFilterState.tagIds,
      tagMode: savedFilterState.tagMode,
    };
    setFilterState(seededFilter);
    setExpandedState(savedFilterState.expanded);
    latestRef.current = {
      filter: seededFilter,
      expanded: savedFilterState.expanded,
    };
  }, [savedFilterState]);

  const { data: savedSortState } = useBackend(
    [
      "/api/citationsortstate",
      String(projectId),
      String(scope),
      String(entryId),
    ],
    {
      method: "GET",
      url: "/api/citationsortstate",
      params: { projectId, scope, entryId },
    },
    null,
    true,
    { enabled: hasPersistence },
  );

  useEffect(() => {
    if (!savedSortState || seededSortRef.current) return;
    seededSortRef.current = true;
    setSortCriteriaState(savedSortState.sortCriteria);
    setSortExpandedState(savedSortState.expanded);
    latestSortRef.current = {
      sortCriteria: savedSortState.sortCriteria,
      sortExpanded: savedSortState.expanded,
    };
  }, [savedSortState]);

  const saveMutation = useBackendMutation(
    ({ filter: f, expanded: e }) => ({
      method: "POST",
      url: "/api/citationfilterstate",
      params: { projectId, scope, entryId },
      data: { ...f, expanded: e },
    }),
    {},
  );

  const saveSortMutation = useBackendMutation(
    ({ sortCriteria: c, sortExpanded: e }) => ({
      method: "POST",
      url: "/api/citationsortstate",
      params: { projectId, scope, entryId },
      data: { sortCriteria: c, expanded: e },
    }),
    {},
  );

  useEffect(() => {
    if (!hasPersistence) return undefined;
    const id = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        saveMutation.mutate(latestRef.current);
      }
      if (dirtySortRef.current) {
        dirtySortRef.current = false;
        saveSortMutation.mutate(latestSortRef.current);
      }
      // Stryker disable next-line ArrayDeclaration : the interval must persist across
      // re-renders, not reset on every filter/sort/expanded change
    }, autosaveIntervalMs);
    return () => clearInterval(id);
  }, [hasPersistence, autosaveIntervalMs, saveMutation, saveSortMutation]);

  const visibleCitations = entries
    .filter((entry) => matchesCitationFilter(entry, filter))
    .sort(sortCriteriaComparator(sortCriteria));

  return {
    filter,
    setFilter,
    sortCriteria,
    setSortCriteria,
    expanded,
    setExpanded,
    sortExpanded,
    setSortExpanded,
    visibleCitations,
    // A stray CitationTable column-header click can't silently desync the table from what
    // CitationSort's own ordering shows — see CitationTable's enableColumnSort doc comment.
    enableColumnSort: sortCriteria.length === 0,
  };
}
