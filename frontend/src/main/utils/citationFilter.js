import {
  RELEVANCE_OPTIONS,
  DEFAULT_RELEVANCE,
  RELEVANCE_FIELD_NAME,
} from "main/utils/citelinesFields";
import {
  hasInvalidLinkFlag,
  hasPossibleDuplicateFlag,
} from "main/utils/duplicateFlags";

// Pure filter-state shape + matching logic for CitationFilter (issue #59). Kept separate from the
// component so a page (ResearcherProjectShowPage's Citations tab, BibTexEntryShowPage's
// References/Citations lists) can own a filter value and apply matchesCitationFilter to its own
// entry array without needing to render the filter UI itself, and so this logic is independently
// testable.

export const CITATION_FILTER_LINK_OPTIONS = [
  "all",
  "doi",
  "url",
  "invalid",
  "missing",
];

export const CITATION_FILTER_DUPLICATE_OPTIONS = ["all", "dup", "no-dup"];

// Nothing filtered out by default — every toggle/radio starts in its most permissive state.
export const DEFAULT_CITATION_FILTER = {
  relevance: [...RELEVANCE_OPTIONS],
  link: "all",
  duplicates: "all",
  search: "",
  tagIds: [],
  tagMode: "and",
};

// Relevance is stored directly on keyValuePairs, but — unlike CITELINES_invalid_doi/url, which
// are written straight into an already-parsed entry — it's only ever set by writing a
// "CITELINES_relevance = {...}" field into raw BibTeX text and re-parsing it. That parse step
// (BibTexConverterService.toBibTexEntry) lowercases every field name, so the key actually
// persisted is "citelines_relevance". RELEVANCE_FIELD_NAME is the same constant
// extractCitelinesFields uses when parsing raw BibTeX text, so both stay in sync.
export function getEntryRelevance(entry) {
  return entry.keyValuePairs?.[RELEVANCE_FIELD_NAME] ?? DEFAULT_RELEVANCE;
}

// Matches CitationTable's Link column exactly: a doi takes precedence over a url when an entry
// somehow has both, so "url" only matches entries with a url and no doi.
function matchesLink(entry, link) {
  const doi = entry.keyValuePairs?.doi;
  const url = entry.keyValuePairs?.url;
  const invalid = hasInvalidLinkFlag(entry);
  switch (link) {
    case "doi":
      return Boolean(doi) && !invalid;
    case "url":
      return !doi && Boolean(url) && !invalid;
    case "invalid":
      return invalid;
    case "missing":
      return !doi && !url;
    default:
      return true;
  }
}

function matchesDuplicates(entry, duplicates) {
  if (duplicates === "dup") return hasPossibleDuplicateFlag(entry);
  if (duplicates === "no-dup") return !hasPossibleDuplicateFlag(entry);
  return true;
}

// No early "blank search matches everything" guard is needed: String.prototype.includes("")
// is always true, so a blank/whitespace-only query naturally matches every entry already.
function matchesSearch(entry, search) {
  const query = search.trim().toLowerCase();
  const author = (entry.keyValuePairs?.author ?? "").toLowerCase();
  const title = (entry.keyValuePairs?.title ?? "").toLowerCase();
  return author.includes(query) || title.includes(query);
}

function matchesTags(entry, tagIds, tagMode) {
  if (tagIds.length === 0) return true;
  const entryTagIds = new Set(entry.tagIds ?? []);
  return tagMode === "and"
    ? tagIds.every((id) => entryTagIds.has(id))
    : tagIds.some((id) => entryTagIds.has(id));
}

// Whether a single BibTexEntry satisfies every dimension of the given filter.
export function matchesCitationFilter(entry, filter) {
  return (
    filter.relevance.includes(getEntryRelevance(entry)) &&
    matchesLink(entry, filter.link) &&
    matchesDuplicates(entry, filter.duplicates) &&
    matchesSearch(entry, filter.search) &&
    matchesTags(entry, filter.tagIds, filter.tagMode)
  );
}
