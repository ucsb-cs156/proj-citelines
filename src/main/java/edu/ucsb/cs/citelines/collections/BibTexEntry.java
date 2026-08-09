package edu.ucsb.cs.citelines.collections;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document representing a single BibTeX bibliography entry, indexed by the id of the
 * (SQL) Project it belongs to.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "bibtex_entries")
public class BibTexEntry {

  @Id private String id;

  private int projectId;

  private String entryType;
  private String citeKey;

  private Map<String, String> keyValuePairs;
}
