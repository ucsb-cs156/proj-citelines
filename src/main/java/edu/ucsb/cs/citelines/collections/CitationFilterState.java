package edu.ucsb.cs.citelines.collections;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document storing the last-saved state of a {@code CitationFilter} panel (and its
 * open/closed state), keyed by project, which BibTexEntry and direction it belongs to for the two
 * entry-scoped variants (see {@link Scope}), and which user saved it — per-user, not shared across
 * a project's collaborators, so two researchers filtering the same project's literature search
 * independently don't clobber each other's settings (issue #130; originally shared per-project when
 * first built for issue #121, changed before any real user relied on it).
 *
 * <p>{@code id} is a deterministic composite (see {@link #makeId}) of the four fields that identify
 * a single user's filter panel scope, so saving the same scope's state twice (i.e. every save after
 * the first) overwrites rather than duplicates it, mirroring {@link
 * UnresolvedCitation#makeId}/{@link CitationEdge}.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "citation_filter_state")
public class CitationFilterState {

  @Id private String id;

  private int projectId;

  /** Which of the three panels this state belongs to. */
  public enum Scope {
    PROJECT,
    REFERENCES,
    CITATIONS
  }

  private Scope scope;

  /** The Mongo {@code _id} of the BibTexEntry this panel belongs to; {@code null} for PROJECT. */
  private String entryId;

  /** The Postgres id of the {@code User} this saved state belongs to (issue #130). */
  private long userId;

  private boolean expanded;
  private List<String> relevance;
  private String link;
  private String duplicates;
  private String search;
  private List<Long> tagIds;
  private String tagMode;

  public static String makeId(int projectId, Scope scope, String entryId, long userId) {
    return "%d:%s:%s:%d".formatted(projectId, scope, entryId == null ? "" : entryId, userId);
  }
}
