package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

/**
 * Merges multiple {@link BibTexEntry} documents that were (incorrectly) stored for the same
 * project/citeKey pair into a single entry, so that lookups that expect at most one entry per
 * citeKey (e.g. {@code BibTexEntryRepository.findByProjectIdAndCiteKey}) don't blow up with an
 * {@code IncorrectResultSizeDataAccessException} when duplicates slip in (e.g. from data created
 * before duplicate-prevention was added).
 *
 * <p>This is intentionally standalone (rather than baked into a single controller) so it can be
 * reused anywhere entries might collide: when posting pasted BibTeX, when uploading from a file,
 * and when a citeKey is (re-)discovered by the "Get References"/"Get Citations" jobs.
 */
@Service
public class BibTexEntryCoalescingService {

  // Field-specific merge rule requested for these two: the resolved value should be the highest
  // ranked of the differing values, from most to least relevant. A value not on this list ranks
  // below all of these (see rankOf).
  private static final String RELEVANCE_KEY = "CITELINES_relevance";
  private static final List<String> RELEVANCE_RANK =
      List.of("high", "medium", "low", "none", "unreviewed");

  // Field-specific merge rule requested for these two: concatenate differing values, separated by
  // a blank line, so no manually-entered notes are lost.
  private static final List<String> CONCATENATED_KEYS =
      List.of("CITELINES_comments", "CITELINES_comments_draft");

  /**
   * Merges a list of duplicate {@link BibTexEntry} documents (all sharing the same projectId and
   * citeKey) into a single entry, in-memory. The returned entry reuses the id/projectId/citeKey of
   * the first entry in the list; callers are responsible for persisting the result (and removing
   * the other duplicates).
   *
   * @param entries the duplicate entries to merge; must not be empty
   * @return the merged entry
   */
  public BibTexEntry coalesce(List<BibTexEntry> entries) {
    if (entries.isEmpty()) {
      throw new IllegalArgumentException("Cannot coalesce an empty list of entries");
    }
    if (entries.size() == 1) {
      return entries.get(0);
    }

    Map<String, String> mergedFields = new LinkedHashMap<>();
    for (BibTexEntry entry : entries) {
      for (Map.Entry<String, String> field : entry.getKeyValuePairs().entrySet()) {
        mergedFields.merge(
            field.getKey(), field.getValue(), (a, b) -> resolveField(field.getKey(), a, b));
      }
    }

    BibTexEntry merged = entries.get(0);
    merged.setKeyValuePairs(mergedFields);
    return merged;
  }

  private String resolveField(String key, String a, String b) {
    if (Objects.equals(a, b)) {
      return a;
    }
    if (a.isBlank()) {
      return b;
    }
    if (b.isBlank()) {
      return a;
    }
    if (RELEVANCE_KEY.equals(key)) {
      return rankOf(a) <= rankOf(b) ? a : b;
    }
    if (CONCATENATED_KEYS.contains(key)) {
      return a + "\n\n" + b;
    }
    // CITELINES_position, and any other field not covered by a specific rule above: no principled
    // way to pick between two differing values, so arbitrarily keep the first one seen.
    return a;
  }

  // Unrecognized relevance values are ranked below all known ones, so a recognized value always
  // wins over one that isn't (and two recognized values are compared by their listed order).
  private int rankOf(String relevance) {
    int rank = RELEVANCE_RANK.indexOf(relevance);
    return rank == -1 ? RELEVANCE_RANK.size() : rank;
  }
}
