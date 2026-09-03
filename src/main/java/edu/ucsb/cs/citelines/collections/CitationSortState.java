package edu.ucsb.cs.citelines.collections;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document storing the last-saved state of a {@code CitationSort} panel (its ordered sort
 * criteria and open/closed state), keyed the same way as {@link CitationFilterState} — by project,
 * which BibTexEntry and direction it belongs to for the two entry-scoped variants (see {@link
 * CitationFilterState.Scope}), and which user saved it. Per-user from the start (issue #126, built
 * directly on the per-user pattern issue #130 retrofitted onto {@link CitationFilterState}) — a
 * separate collection/endpoint rather than folded into {@link CitationFilterState}, since the two
 * panels are independent and this keeps each one's persistence simple to reason about on its own.
 *
 * <p>{@code id} is a deterministic composite (see {@link #makeId}), same shape as {@link
 * CitationFilterState#makeId}, so saving the same scope's state twice (i.e. every save after the
 * first) overwrites rather than duplicates it.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "citation_sort_state")
public class CitationSortState {

  @Id private String id;

  private int projectId;

  private CitationFilterState.Scope scope;

  /** The Mongo {@code _id} of the BibTexEntry this panel belongs to; {@code null} for PROJECT. */
  private String entryId;

  /** The Postgres id of the {@code User} this saved state belongs to. */
  private long userId;

  private boolean expanded;
  private List<SortCriterion> sortCriteria;

  /** One {@code {field, direction}} entry, mirroring the frontend's sortCriteria shape exactly. */
  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  @Builder
  public static class SortCriterion {
    private String field;

    /** {@code "asc"} or {@code "desc"}. */
    private String direction;
  }

  public static String makeId(
      int projectId, CitationFilterState.Scope scope, String entryId, long userId) {
    return "%d:%s:%s:%d".formatted(projectId, scope, entryId == null ? "" : entryId, userId);
  }
}
