package edu.ucsb.cs.citelines.collections;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A MongoDB document tracking one reference or citation that no configured {@link
 * edu.ucsb.cs.citelines.services.CitationMetadataResolver} could fully resolve into a usable {@link
 * BibTexEntry} (or resolved with missing metadata), so the gap is durably recorded rather than
 * silently dropped. See {@code docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for the
 * resolver chain and what bounds each {@code reason}'s recoverability.
 *
 * <p>{@code id} is a deterministic composite (see {@link #makeId}) so that saving the same gap
 * twice (e.g. on a repeated Get References/Get Citations job run) overwrites rather than duplicates
 * it, mirroring {@link CitationEdge#makeId}.
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

  /** Which resolver ultimately reported this gap (e.g. {@code "OpenAlex"}), if known. */
  private String resolverName;

  /** The reporting resolver's own native id for the work involved, if known. */
  private String resolverWorkId;

  /** Best-effort title, if known. */
  private String title;

  /** {@code "not_found_by_any_resolver"}, {@code "missing_title"}, or {@code "missing_doi"}. */
  private String reason;

  private Instant discoveredAt;

  /**
   * Builds a deterministic id from the most stable identifying value available for this gap, in
   * priority order: DOI (most stable, when known), then the reporting resolver's own native work
   * id, then a normalized title. At least one of the three is expected to be non-blank; falls back
   * to {@code "unknown"} only in the degenerate case where none are (kept saveable rather than
   * throwing, since even a coarse dedup key is better than none for so rare a case).
   */
  public static String makeId(
      int projectId, String sourceCiteKey, String direction, String reason, String... candidates) {
    String identifyingValue = "unknown";
    for (String candidate : candidates) {
      if (candidate != null && !candidate.isBlank()) {
        identifyingValue = candidate.trim().toLowerCase();
        break;
      }
    }
    return "%d:%s:%s:%s:%s"
        .formatted(projectId, sourceCiteKey, direction, reason, identifyingValue);
  }
}
