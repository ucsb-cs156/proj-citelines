/**
 * The citation formats/styles a project's references can be rendered in — the single place in
 * the frontend where these are listed. They mirror the keys of `COMMON_ALIASES` in the backend's
 * `CitationFormattingService` (`src/main/java/edu/ucsb/cs/citelines/services/
 * CitationFormattingService.java`); if you add/remove/rename a format in one place, update the
 * other to match.
 */
export const CITATION_FORMAT_OPTIONS = [
  "APA",
  "MLA",
  "ACM",
  "IEEE",
  "CHICAGO-AUTHOR-DATE",
  "CHICAGO-FULLNOTE",
  "HARVARD",
  "VANCOUVER",
  "NATURE",
  "SCIENCE",
];

export const DEFAULT_CITATION_FORMAT = "ACM";

/** localStorage key used to remember the last citation format chosen when creating a project. */
export const LAST_CITATION_FORMAT_STORAGE_KEY = "citelines.lastCitationFormat";

/**
 * Returns the last citation format chosen by the user (per {@link
 * LAST_CITATION_FORMAT_STORAGE_KEY}), falling back to {@link DEFAULT_CITATION_FORMAT} if none was
 * stored, or if the stored value is no longer a recognized format.
 */
export function getLastCitationFormat() {
  const stored = window.localStorage.getItem(LAST_CITATION_FORMAT_STORAGE_KEY);
  return CITATION_FORMAT_OPTIONS.includes(stored)
    ? stored
    : DEFAULT_CITATION_FORMAT;
}

/** Persists `citationFormat` as the last-chosen citation format, for {@link
 * getLastCitationFormat} to pick up next time. */
export function setLastCitationFormat(citationFormat) {
  window.localStorage.setItem(LAST_CITATION_FORMAT_STORAGE_KEY, citationFormat);
}
