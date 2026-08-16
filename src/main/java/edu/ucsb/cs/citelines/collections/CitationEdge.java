package edu.ucsb.cs.citelines.collections;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document representing a directed "cites" relationship between two {@link BibTexEntry}s
 * in the same project, identified by their (immutable) Mongo {@code _id}s — not their citeKeys,
 * which a user can freely rename via the "Edit Citation" flow. Identifying entries by id keeps an
 * edge valid across a rename; the same reasoning that led {@code BibTexEntriesController} to look
 * entries up by id rather than citeKey elsewhere (see its {@code bibTexEntryById} Javadoc).
 *
 * <p>{@code id} is a deterministic composite of {@code projectId}/{@code citingEntryId}/{@code
 * citedEntryId} so that saving the same edge twice (e.g. on a repeated Get References/Get Citations
 * job run) overwrites rather than duplicates it.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "citation_edges")
public class CitationEdge {

  @Id private String id;

  private int projectId;

  private String citingEntryId;
  private String citedEntryId;

  public static String makeId(int projectId, String citingEntryId, String citedEntryId) {
    return "%d:%s:%s".formatted(projectId, citingEntryId, citedEntryId);
  }
}
