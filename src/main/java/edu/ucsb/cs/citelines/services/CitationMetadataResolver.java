package edu.ucsb.cs.citelines.services;

import java.util.List;
import java.util.Optional;

/**
 * A source of scholarly-work metadata and citation-graph data (references/citations), e.g. {@link
 * OpenAlexService}, {@link SemanticScholarResolver}, or {@link CrossrefResolver}. {@link
 * CitationGraphService} tries resolvers in a fixed priority order, falling back to the next one
 * only when the previous one has no record at all for a given DOI — see {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for why this is a waterfall rather
 * than a union of all resolvers' results.
 */
public interface CitationMetadataResolver {

  /**
   * A short, stable name for logging and for {@link
   * edu.ucsb.cs.citelines.collections.UnresolvedCitation#getResolverName()}.
   */
  String name();

  /** Looks up a single work by DOI. Empty if this resolver has no record for that DOI. */
  Optional<ResolvedWork> resolveByDoi(String doi);

  /**
   * The works {@code sourceWork} cites, most-relevant-first, capped at {@code maxResults}. May
   * require additional network calls beyond the one that produced {@code sourceWork} (e.g. to
   * hydrate {@code sourceWork.referencedWorkIds()}), or may simply return {@code
   * sourceWork.embeddedReferences()} if this resolver returns them inline.
   */
  List<ResolvedWork> getReferences(ResolvedWork sourceWork, int maxResults);

  /**
   * The works that cite {@code sourceWork}, most-relevant-first, capped at {@code maxResults}.
   * Resolvers with no citation-discovery capability at all (e.g. Crossref's public API has no
   * citing-works endpoint) always return an empty list.
   */
  List<ResolvedWork> getCitations(ResolvedWork sourceWork, int maxResults);
}
