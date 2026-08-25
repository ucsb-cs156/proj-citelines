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
 * open/closed state), keyed by project and, for the two entry-scoped variants, which BibTexEntry
 * and direction it belongs to (see {@link Scope}). Shared per-project (not per-user) — whichever
 * researcher last changed a filter is what every collaborator on that project sees. See issue #121.
 *
 * <p>{@code id} is a deterministic composite (see {@link #makeId}) of the three fields that
 * identify a single filter panel's scope, so saving the same scope's state twice (i.e. every save
 * after the first) overwrites rather than duplicates it, mirroring {@link
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

  private boolean expanded;
  private List<String> relevance;
  private String link;
  private String duplicates;
  private String search;
  private List<Long> tagIds;
  private String tagMode;

  public static String makeId(int projectId, Scope scope, String entryId) {
    return "%d:%s:%s".formatted(projectId, scope, entryId == null ? "" : entryId);
  }
}
