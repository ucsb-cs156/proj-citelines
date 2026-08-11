package edu.ucsb.cs.citelines.collections;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document representing a directed "cites" relationship between two {@link BibTexEntry}s
 * in the same project, identified by their citeKeys.
 *
 * <p>{@code id} is a deterministic composite of {@code projectId}/{@code citingCiteKey}/{@code
 * citedCiteKey} so that saving the same edge twice (e.g. on a repeated Get References/Get Citations
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

  private String citingCiteKey;
  private String citedCiteKey;

  public static String makeId(int projectId, String citingCiteKey, String citedCiteKey) {
    return "%d:%s:%s".formatted(projectId, citingCiteKey, citedCiteKey);
  }
}
