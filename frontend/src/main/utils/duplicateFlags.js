// Shared logic for the "Flags" column (CitationTable) and the "Possible Duplicates" card
// (BibTexEntryShowPage) — both need to agree on when an entry counts as flagged, so that agreement
// lives in one place (issue #68's iteration-aid follow-up).

const DUPLICATE_REASON_LABELS = {
  SAME_DOI: "Same DOI",
  SIMILAR_TITLE: "Similar Title",
};

/**
 * Whether the "Detect Duplicates" job has flagged this entry as possibly duplicating another one.
 */
export function hasPossibleDuplicateFlag(entry) {
  return (
    entry.possibleDuplicateIds != null || entry.possibleDuplicateReason != null
  );
}

/**
 * Whether the "Check Links" job has flagged this entry's DOI or URL as broken.
 */
export function hasInvalidLinkFlag(entry) {
  return (
    entry.keyValuePairs?.CITELINES_invalid_doi === "True" ||
    entry.keyValuePairs?.CITELINES_invalid_url === "True"
  );
}

/**
 * A human-readable label for a possibleDuplicateReason value, e.g. "SAME_DOI" -> "Same DOI".
 * Falls back to the raw value for any reason not yet given a label here.
 */
export function formatDuplicateReason(reason) {
  return DUPLICATE_REASON_LABELS[reason] ?? reason;
}
