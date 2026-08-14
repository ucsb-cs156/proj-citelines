package edu.ucsb.cs.citelines.services;

import java.util.List;

/**
 * A minimal, resolver-agnostic projection of a scholarly work, carrying only the fields {@link
 * BibTexSynthesisService} needs to synthesize a BibTeX entry, plus enough of its reference/citation
 * graph for {@link CitationGraphService} to discover related works without a second round-trip
 * where a resolver's API already hands them over in the same response.
 *
 * <p>{@code id} is the resolving {@link CitationMetadataResolver}'s own native id for this work
 * (e.g. an OpenAlex id like {@code "W3035965352"}, with any URL prefix already stripped) — ids are
 * only meaningful within the resolver that produced them, never compared across resolvers. {@code
 * doi}, by contrast, is always normalized (via {@link DOIService#normalizeRawDOI}) so it can be
 * compared across resolvers for deduplication.
 *
 * <p>{@code referencedWorkIds} holds native ids that still need a same-resolver follow-up fetch to
 * hydrate (OpenAlex's two-step id-list-then-batch-fetch shape). {@code embeddedReferences}/{@code
 * embeddedCitations} hold related works that arrived already fully hydrated in the same response
 * that resolved this work (Crossref's inline {@code reference} array, Semantic Scholar's inline
 * {@code references}/{@code citations} fields) — a resolver populates at most one of {@code
 * referencedWorkIds} or {@code embeddedReferences}, never both. All three list fields are always
 * non-null (an empty {@link java.util.List#of()} when not applicable) — every {@link
 * CitationMetadataResolver} implementation is expected to uphold this, since callers rely on it.
 */
public record ResolvedWork(
    String id,
    String doi,
    String title,
    Integer year,
    String type,
    List<String> authorNames,
    String venue,
    List<String> referencedWorkIds,
    List<ResolvedWork> embeddedReferences,
    List<ResolvedWork> embeddedCitations) {}
