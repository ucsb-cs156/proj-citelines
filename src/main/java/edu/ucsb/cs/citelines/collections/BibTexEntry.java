package edu.ucsb.cs.citelines.collections;

import java.util.List;
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

  // Derived data owned by the "Detect Duplicates" job (see DuplicateDetectionService): the ids
  // of other entries in this project this one is suspected to duplicate, and why. Report-only —
  // nothing merges or deletes entries based on these; a future manual-review workflow will read
  // them (see issue #68's follow-up issue). Recomputed from scratch on every job run, so null/
  // empty for an entry not currently believed to be part of a duplicate group.
  private List<String> possibleDuplicateIds;
  private String possibleDuplicateReason;

  // The ids of Tag entities (a Postgres entity, see entity/Tag.java) associated with this entry.
  // Tag lives in Postgres and this in MongoDB, so this is a plain, unenforced cross-database
  // reference — the same pattern already used by projectId above (see issue #71). Null/empty for
  // an entry with no tags.
  private List<Long> tagIds;
}
