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
 * When `persistence` is given, the filter's fields and open/closed state are loaded from (and, on
 * any change, saved back to) `/api/citationfilterstate` for that scope (issue #121) — a project
 * that's never touched a given scope's filter gets back the same defaults used when `persistence`
 * is omitted, without writing anything. Sort criteria are NOT persisted (out of scope for #121;
 * see #126 for the parallel follow-up). Saves are sent on a heartbeat (matching
 * BibTexEntryComments' autosave), not on every change, so rapid edits (e.g. typing in the search
 * box) don't POST once per keystroke.
 *
 * @param {object[]} entries - the full, unfiltered/unsorted entry list for this call's scope
 * @param {{projectId: (string|number), scope: "PROJECT"|"REFERENCES"|"CITATIONS", entryId?: string, autosaveIntervalMs?: number}} [persistence] -
 *   when given, this call's filter/expanded state is loaded from and saved to the backend for
 *   this scope; omit for filter state that's local-only (e.g. in tests/stories).
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
  const [sortCriteria, setSortCriteria] = useState(DEFAULT_CITATION_SORT);
  // The CitationFilter panel's own open/closed state (issue #122) — closed by default, owned
  // here (rather than inside CitationFilter itself) so it's available alongside filter for
  // persistence below.
  const [expanded, setExpandedState] = useState(false);
  // CitationSort's own open/closed state (issue #126, mirroring #122) — closed by default.
  // Not yet persisted (that's #126's follow-up PR, mirroring #121); plain local state for now,
  // same as `expanded` was here before #121 wired its persistence up.
  const [sortExpanded, setSortExpanded] = useState(false);

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

  const { data: savedState } = useBackend(
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
    if (!savedState || seededRef.current) return;
    seededRef.current = true;
    const seededFilter = {
      relevance: savedState.relevance,
      link: savedState.link,
      duplicates: savedState.duplicates,
      search: savedState.search,
      tagIds: savedState.tagIds,
      tagMode: savedState.tagMode,
    };
    setFilterState(seededFilter);
    setExpandedState(savedState.expanded);
    latestRef.current = { filter: seededFilter, expanded: savedState.expanded };
  }, [savedState]);

  const saveMutation = useBackendMutation(
    ({ filter: f, expanded: e }) => ({
      method: "POST",
      url: "/api/citationfilterstate",
      params: { projectId, scope, entryId },
      data: { ...f, expanded: e },
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
      // Stryker disable next-line ArrayDeclaration : the interval must persist across
      // re-renders, not reset on every filter/expanded change
    }, autosaveIntervalMs);
    return () => clearInterval(id);
  }, [hasPersistence, autosaveIntervalMs, saveMutation]);

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
