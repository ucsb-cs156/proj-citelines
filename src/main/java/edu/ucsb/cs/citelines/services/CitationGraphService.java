package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import edu.ucsb.cs.citelines.collections.UnresolvedCitation;
import edu.ucsb.cs.citelines.collections.UnresolvedCitationRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Orchestrates the "Get References" and "Get Citations" jobs: looks up a source {@link
 * BibTexEntry}'s DOI across a chain of {@link CitationMetadataResolver}s (OpenAlex first, then
 * Semantic Scholar, then Crossref), resolves the related works the first successful resolver names,
 * synthesizes+saves a {@link BibTexEntry} for each one not already present (deduped by DOI), and
 * records a {@link CitationEdge} between the source and each related entry. Anything no resolver
 * can fully resolve is recorded as an {@link UnresolvedCitation} rather than silently dropped — see
 * {@code docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for why the chain is a
 * waterfall (not a union of all three) and which gaps get a second chance via another resolver.
 */
@Service
public class CitationGraphService {

  /** Cap on how many references/citations are fetched per job run. */
  static final int MAX_RESULTS = 200;

  private static final String REASON_NOT_FOUND = "not_found_by_any_resolver";
  private static final String REASON_MISSING_TITLE = "missing_title";
  private static final String REASON_MISSING_DOI = "missing_doi";

  private final BibTexEntryRepository bibTexEntryRepository;
  private final CitationEdgeRepository citationEdgeRepository;
  private final UnresolvedCitationRepository unresolvedCitationRepository;
  private final BibTexSynthesisService bibTexSynthesisService;
  private final BibTexConverterService bibTexConverterService;
  private final CrossrefResolver crossrefResolver;
  private final List<CitationMetadataResolver> resolversInPriorityOrder;

  public CitationGraphService(
      BibTexEntryRepository bibTexEntryRepository,
      CitationEdgeRepository citationEdgeRepository,
      UnresolvedCitationRepository unresolvedCitationRepository,
      OpenAlexService openAlexService,
      SemanticScholarResolver semanticScholarResolver,
      CrossrefResolver crossrefResolver,
      BibTexSynthesisService bibTexSynthesisService,
      BibTexConverterService bibTexConverterService) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.citationEdgeRepository = citationEdgeRepository;
    this.unresolvedCitationRepository = unresolvedCitationRepository;
    this.bibTexSynthesisService = bibTexSynthesisService;
    this.bibTexConverterService = bibTexConverterService;
    this.crossrefResolver = crossrefResolver;
    this.resolversInPriorityOrder =
        List.of(openAlexService, semanticScholarResolver, crossrefResolver);
  }

  public void fetchReferences(int projectId, String sourceCiteKey, JobContext ctx) {
    fetchGraph(projectId, sourceCiteKey, ctx, Direction.REFERENCE);
  }

  public void fetchCitations(int projectId, String sourceCiteKey, JobContext ctx) {
    fetchGraph(projectId, sourceCiteKey, ctx, Direction.CITATION);
  }

  private enum Direction {
    REFERENCE("reference", "References"),
    CITATION("citation", "Citations");

    final String trackingLabel;
    final String displayLabel;

    Direction(String trackingLabel, String displayLabel) {
      this.trackingLabel = trackingLabel;
      this.displayLabel = displayLabel;
    }
  }

  private void fetchGraph(
      int projectId, String sourceCiteKey, JobContext ctx, Direction direction) {
    ctx.log(
        "Starting Get %s for %s in project %d"
            .formatted(direction.displayLabel, sourceCiteKey, projectId));

    BibTexEntry source =
        bibTexEntryRepository
            .findByProjectIdAndCiteKey(projectId, sourceCiteKey)
            .orElseThrow(
                () -> {
                  ctx.log("Entry not found: " + sourceCiteKey);
                  return new IllegalStateException("Entry not found: " + sourceCiteKey);
                });

    String doi = source.getKeyValuePairs() != null ? source.getKeyValuePairs().get("doi") : null;
    if (doi == null || doi.isBlank()) {
      ctx.log(
          "Entry %s has no DOI; cannot look up %s."
              .formatted(sourceCiteKey, direction.displayLabel.toLowerCase()));
      throw new IllegalStateException("Entry has no DOI: " + sourceCiteKey);
    }

    ResolverResult sourceResult = resolveSourceWork(doi, ctx);
    CitationMetadataResolver discoveryResolver = sourceResult.resolver();
    ResolvedWork sourceWork = sourceResult.work();
    ctx.log("Found source work on %s: %s".formatted(discoveryResolver.name(), sourceWork.title()));

    List<ResolvedWork> relatedWorks =
        direction == Direction.REFERENCE
            ? fetchReferencedWorks(discoveryResolver, sourceWork, projectId, sourceCiteKey, ctx)
            : fetchCitingWorks(discoveryResolver, sourceWork, ctx);

    ExistingEntries existing = loadExistingEntries(projectId);

    int added = 0;
    int linked = 0;
    int unresolved = 0;
    for (ResolvedWork rawWork : relatedWorks) {
      ResolvedWork work = rawWork;
      if (isBlank(work.title())) {
        ResolvedWork recovered = tryRecoverMissingTitle(work, discoveryResolver, ctx);
        if (recovered != null) {
          work = recovered;
        }
      }

      if (isBlank(work.title())) {
        String reason = work.doi() != null ? REASON_MISSING_TITLE : REASON_NOT_FOUND;
        saveUnresolved(
            projectId,
            sourceCiteKey,
            direction,
            discoveryResolver.name(),
            work.id(),
            work.doi(),
            null,
            reason);
        ctx.log("Skipping %s: no title available.".formatted(describeWork(work)));
        unresolved++;
        continue;
      }

      ResolveOrCreateResult result = resolveOrCreateEntry(work, projectId, existing);
      if (!result.created()) {
        linked++;
        ctx.log("Linking to existing entry %s: %s".formatted(result.citeKey(), work.title()));
      } else {
        if (work.doi() == null) {
          saveUnresolved(
              projectId,
              sourceCiteKey,
              direction,
              discoveryResolver.name(),
              work.id(),
              null,
              work.title(),
              REASON_MISSING_DOI);
        }
        added++;
        ctx.log("Added new entry %s: %s".formatted(result.citeKey(), work.title()));
      }

      citationEdgeRepository.save(makeEdge(projectId, sourceCiteKey, result.citeKey(), direction));
    }

    ctx.log(
        "Done: %d new %s added, %d linked to existing entries, %d unresolved."
            .formatted(added, added == 1 ? "entry" : "entries", linked, unresolved));
  }

  /**
   * The result of a successful cross-resolver DOI lookup: which resolver found it, and what it
   * found. Package-visible so {@link BulkCitationUploadFromACMDLViewAllService} can reuse the same
   * waterfall this class uses to discover a "source" entry's own record.
   */
  record ResolverResult(CitationMetadataResolver resolver, ResolvedWork work) {}

  /**
   * Tries each resolver in priority order until one has a record for {@code doi}, returning empty
   * if none do. Package-visible for reuse by {@link BulkCitationUploadFromACMDLViewAllService},
   * whose DOI sanity check treats "no resolver has ever heard of this DOI" as its invalidity
   * signal.
   */
  Optional<ResolverResult> tryResolveByDoi(String doi) {
    for (CitationMetadataResolver resolver : resolversInPriorityOrder) {
      Optional<ResolvedWork> found = resolver.resolveByDoi(doi);
      if (found.isPresent()) {
        return Optional.of(new ResolverResult(resolver, found.get()));
      }
    }
    return Optional.empty();
  }

  /** Like {@link #tryResolveByDoi}, but throws (after logging every resolver tried) if none do. */
  private ResolverResult resolveSourceWork(String doi, JobContext ctx) {
    return tryResolveByDoi(doi)
        .orElseThrow(
            () -> {
              String triedNames =
                  resolversInPriorityOrder.stream()
                      .map(CitationMetadataResolver::name)
                      .collect(Collectors.joining(", "));
              ctx.log("No record found for DOI %s in any of: %s".formatted(doi, triedNames));
              return new IllegalStateException("No record found for DOI: " + doi);
            });
  }

  /**
   * A {@code missing_title} gap can be recovered — the stub has a DOI (that's how it was found in
   * the first place), so any *other* resolver's exact, non-fuzzy DOI lookup is safe to try. A gap
   * with no DOI at all (e.g. a Crossref reference item that is pure unstructured free text) has
   * nothing any resolver's DOI lookup could use, so is not attempted — see the design doc's
   * explicit non-goal around fuzzy/bibliographic title search.
   *
   * <p>Package-visible for reuse by {@link BulkCitationUploadFromACMDLViewAllService}.
   */
  ResolvedWork tryRecoverMissingTitle(
      ResolvedWork stub, CitationMetadataResolver discoveryResolver, JobContext ctx) {
    if (stub.doi() == null || stub.doi().isBlank()) {
      return null;
    }
    for (CitationMetadataResolver resolver : resolversInPriorityOrder) {
      if (resolver == discoveryResolver) {
        continue;
      }
      Optional<ResolvedWork> found = resolver.resolveByDoi(stub.doi());
      if (found.isPresent() && !isBlank(found.get().title())) {
        ctx.log("Recovered title for %s via %s.".formatted(stub.doi(), resolver.name()));
        return found.get();
      }
    }
    return null;
  }

  /**
   * A project's existing entries, indexed for fast dedup lookups during resolve-or-create: {@code
   * byDoi} to detect an entry that already represents a given DOI, {@code citeKeys} to keep newly
   * generated citeKeys from colliding with ones already in use. Both are mutated in place by {@link
   * #resolveOrCreateEntry} as new entries are created, so a single instance should be reused across
   * every work resolved in one job run — see that method's doc.
   */
  record ExistingEntries(Map<String, BibTexEntry> byDoi, Set<String> citeKeys) {}

  /**
   * Builds a snapshot of {@code projectId}'s existing entries for {@link #resolveOrCreateEntry} to
   * dedup against. Package-visible for reuse by {@link BulkCitationUploadFromACMDLViewAllService}.
   */
  ExistingEntries loadExistingEntries(int projectId) {
    Map<String, BibTexEntry> byDoi = new HashMap<>();
    Set<String> citeKeys = new HashSet<>();
    for (BibTexEntry entry : bibTexEntryRepository.findByProjectId(projectId)) {
      citeKeys.add(entry.getCiteKey());
      String entryDoi =
          entry.getKeyValuePairs() != null ? entry.getKeyValuePairs().get("doi") : null;
      if (entryDoi != null) {
        byDoi.put(entryDoi, entry);
      }
    }
    return new ExistingEntries(byDoi, citeKeys);
  }

  /** Whether {@link #resolveOrCreateEntry} linked to an existing entry or created a new one. */
  record ResolveOrCreateResult(String citeKey, boolean created) {}

  /**
   * Returns the citeKey of the existing entry representing {@code work}'s DOI, if {@code existing}
   * already has one; otherwise synthesizes, saves, and indexes a new {@link BibTexEntry} for it and
   * returns that new entry's citeKey. Mutates {@code existing} in place so a second work with the
   * same DOI (or that generates a colliding citeKey) is caught in the same run. Package-visible for
   * reuse by {@link BulkCitationUploadFromACMDLViewAllService}.
   */
  ResolveOrCreateResult resolveOrCreateEntry(
      ResolvedWork work, int projectId, ExistingEntries existing) {
    BibTexEntry existingEntry = work.doi() != null ? existing.byDoi().get(work.doi()) : null;
    if (existingEntry != null) {
      return new ResolveOrCreateResult(existingEntry.getCiteKey(), false);
    }
    String citeKey = bibTexSynthesisService.generateUniqueCiteKey(work, existing.citeKeys());
    existing.citeKeys().add(citeKey);
    String rawBibtex = bibTexSynthesisService.synthesizeRawBibTex(work, citeKey);
    BibTexEntry newEntry = bibTexConverterService.parseToEntries(rawBibtex, projectId).get(0);
    bibTexEntryRepository.save(newEntry);
    if (work.doi() != null) {
      existing.byDoi().put(work.doi(), newEntry);
    }
    return new ResolveOrCreateResult(citeKey, true);
  }

  /**
   * Saves a "{@code citingCiteKey} cites {@code citedCiteKey}" edge directly, for callers (like
   * {@link BulkCitationUploadFromACMDLViewAllService}) that already know which side is which,
   * rather than a source-relative {@link Direction}.
   */
  void saveCitationEdge(int projectId, String citingCiteKey, String citedCiteKey) {
    citationEdgeRepository.save(
        CitationEdge.builder()
            .id(CitationEdge.makeId(projectId, citingCiteKey, citedCiteKey))
            .projectId(projectId)
            .citingCiteKey(citingCiteKey)
            .citedCiteKey(citedCiteKey)
            .build());
  }

  private List<ResolvedWork> fetchReferencedWorks(
      CitationMetadataResolver discoveryResolver,
      ResolvedWork sourceWork,
      int projectId,
      String sourceCiteKey,
      JobContext ctx) {
    List<String> nativeIds = sourceWork.referencedWorkIds();
    int totalFound =
        !nativeIds.isEmpty() ? nativeIds.size() : sourceWork.embeddedReferences().size();
    if (totalFound > MAX_RESULTS) {
      ctx.log(
          "Found %d references; fetching only the first %d.".formatted(totalFound, MAX_RESULTS));
    } else {
      ctx.log("Found %d references.".formatted(totalFound));
    }

    List<ResolvedWork> resolved = discoveryResolver.getReferences(sourceWork, MAX_RESULTS);

    // Only OpenAlex's referenced_works is an id-list that can come back with gaps from its own
    // batch-fetch step — Crossref/Semantic Scholar embed full works inline, so there is no
    // "id came back empty" case for them to detect here (a blank title from either is instead
    // handled per-item, in the main loop above).
    if (!nativeIds.isEmpty()) {
      List<String> capped = nativeIds.subList(0, Math.min(nativeIds.size(), MAX_RESULTS));
      Set<String> resolvedIds = new HashSet<>();
      resolved.forEach(w -> resolvedIds.add(w.id()));
      for (String id : capped) {
        if (!resolvedIds.contains(id)) {
          saveUnresolved(
              projectId,
              sourceCiteKey,
              Direction.REFERENCE,
              discoveryResolver.name(),
              id,
              null,
              null,
              REASON_NOT_FOUND);
          ctx.log("Could not resolve reference %s in %s.".formatted(id, discoveryResolver.name()));
        }
      }
    }
    return resolved;
  }

  private List<ResolvedWork> fetchCitingWorks(
      CitationMetadataResolver discoveryResolver, ResolvedWork sourceWork, JobContext ctx) {
    List<ResolvedWork> citing = discoveryResolver.getCitations(sourceWork, MAX_RESULTS);
    if (discoveryResolver == crossrefResolver) {
      ctx.log("Crossref does not provide citation data.");
    } else {
      ctx.log("Found %d citations (capped at %d).".formatted(citing.size(), MAX_RESULTS));
    }
    return citing;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static String describeWork(ResolvedWork work) {
    return work.id() != null ? work.id() : "an unidentified reference";
  }

  private static CitationEdge makeEdge(
      int projectId, String sourceCiteKey, String relatedCiteKey, Direction direction) {
    String citingCiteKey = direction == Direction.REFERENCE ? sourceCiteKey : relatedCiteKey;
    String citedCiteKey = direction == Direction.REFERENCE ? relatedCiteKey : sourceCiteKey;
    return CitationEdge.builder()
        .id(CitationEdge.makeId(projectId, citingCiteKey, citedCiteKey))
        .projectId(projectId)
        .citingCiteKey(citingCiteKey)
        .citedCiteKey(citedCiteKey)
        .build();
  }

  private void saveUnresolved(
      int projectId,
      String sourceCiteKey,
      Direction direction,
      String resolverName,
      String resolverWorkId,
      String doi,
      String title,
      String reason) {
    String id =
        UnresolvedCitation.makeId(
            projectId, sourceCiteKey, direction.trackingLabel, reason, doi, resolverWorkId, title);
    unresolvedCitationRepository.save(
        UnresolvedCitation.builder()
            .id(id)
            .projectId(projectId)
            .sourceCiteKey(sourceCiteKey)
            .direction(direction.trackingLabel)
            .resolverName(resolverName)
            .resolverWorkId(resolverWorkId)
            .title(title)
            .reason(reason)
            .discoveredAt(Instant.now())
            .build());
  }
}
