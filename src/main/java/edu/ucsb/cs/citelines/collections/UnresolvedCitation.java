package edu.ucsb.cs.citelines.collections;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document tracking one reference or citation that the OpenAlex-only MVP could not fully
 * resolve into a usable {@link BibTexEntry} (or resolved with missing metadata), so the gap is
 * durably recorded rather than silently dropped. See {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for how this data bounds the marginal
 * benefit of adding further API tiers.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "unresolved_citations")
public class UnresolvedCitation {

  @Id private String id;

  private int projectId;

  /** The citeKey of the entry whose references/citations were being fetched. */
  private String sourceCiteKey;

  /** {@code "reference"} or {@code "citation"}. */
  private String direction;

  /** The OpenAlex work id involved, if known. */
  private String openAlexWorkId;

  /** Best-effort title, if known. */
  private String title;

  /** {@code "not_found_in_openalex"}, {@code "missing_title"}, or {@code "missing_doi"}. */
  private String reason;

  private Instant discoveredAt;
}
