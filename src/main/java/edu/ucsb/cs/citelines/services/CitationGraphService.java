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
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Orchestrates the "Get References" and "Get Citations" jobs: looks up a source {@link
 * BibTexEntry}'s DOI on OpenAlex, resolves the related works it names, synthesizes+saves a {@link
 * BibTexEntry} for each one not already present (deduped by DOI), and records a {@link
 * CitationEdge} between the source and each related entry. Anything OpenAlex can't fully resolve is
 * recorded as an {@link UnresolvedCitation} rather than silently dropped — see {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}.
 */
@Service
public class CitationGraphService {

  /** Cap on how many references/citations are fetched per job run. */
  static final int MAX_RESULTS = 200;

  @Autowired BibTexEntryRepository bibTexEntryRepository;
  @Autowired CitationEdgeRepository citationEdgeRepository;
  @Autowired UnresolvedCitationRepository unresolvedCitationRepository;
  @Autowired OpenAlexService openAlexService;
  @Autowired BibTexSynthesisService bibTexSynthesisService;
  @Autowired BibTexConverterService bibTexConverterService;

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

    OpenAlexWork sourceWork =
        openAlexService
            .getWorkByDoi(doi)
            .orElseThrow(
                () -> {
                  ctx.log("No OpenAlex record found for DOI " + doi);
                  return new IllegalStateException("No OpenAlex record for DOI: " + doi);
                });
    ctx.log("Found source work on OpenAlex: " + sourceWork.title());

    List<OpenAlexWork> relatedWorks =
        direction == Direction.REFERENCE
            ? fetchReferencedWorks(sourceWork, projectId, sourceCiteKey, ctx)
            : fetchCitingWorks(sourceWork, ctx);

    Map<String, BibTexEntry> existingByDoi = new HashMap<>();
    Set<String> existingCiteKeys = new HashSet<>();
    for (BibTexEntry entry : bibTexEntryRepository.findByProjectId(projectId)) {
      existingCiteKeys.add(entry.getCiteKey());
      String entryDoi =
          entry.getKeyValuePairs() != null ? entry.getKeyValuePairs().get("doi") : null;
      if (entryDoi != null) {
        existingByDoi.put(entryDoi, entry);
      }
    }

    int added = 0;
    int linked = 0;
    int unresolved = 0;
    for (OpenAlexWork work : relatedWorks) {
      if (work.title() == null || work.title().isBlank()) {
        saveUnresolved(projectId, sourceCiteKey, direction, work.id(), null, "missing_title");
        ctx.log("Skipping %s: no title available.".formatted(work.id()));
        unresolved++;
        continue;
      }

      BibTexEntry existing = work.doi() != null ? existingByDoi.get(work.doi()) : null;
      String citeKey;
      if (existing != null) {
        citeKey = existing.getCiteKey();
        linked++;
        ctx.log("Linking to existing entry %s: %s".formatted(citeKey, work.title()));
      } else {
        citeKey = bibTexSynthesisService.generateUniqueCiteKey(work, existingCiteKeys);
        existingCiteKeys.add(citeKey);
        String rawBibtex = bibTexSynthesisService.synthesizeRawBibTex(work, citeKey);
        BibTexEntry newEntry = bibTexConverterService.parseToEntries(rawBibtex, projectId).get(0);
        bibTexEntryRepository.save(newEntry);
        if (work.doi() != null) {
          existingByDoi.put(work.doi(), newEntry);
        } else {
          saveUnresolved(
              projectId, sourceCiteKey, direction, work.id(), work.title(), "missing_doi");
        }
        added++;
        ctx.log("Added new entry %s: %s".formatted(citeKey, work.title()));
      }

      citationEdgeRepository.save(makeEdge(projectId, sourceCiteKey, citeKey, direction));
    }

    ctx.log(
        "Done: %d new %s added, %d linked to existing entries, %d unresolved."
            .formatted(added, added == 1 ? "entry" : "entries", linked, unresolved));
  }

  private List<OpenAlexWork> fetchReferencedWorks(
      OpenAlexWork sourceWork, int projectId, String sourceCiteKey, JobContext ctx) {
    List<String> refIds = sourceWork.referencedWorkIds();
    if (refIds.size() > MAX_RESULTS) {
      ctx.log(
          "Found %d references; fetching only the first %d.".formatted(refIds.size(), MAX_RESULTS));
      refIds = refIds.subList(0, MAX_RESULTS);
    } else {
      ctx.log("Found %d references.".formatted(refIds.size()));
    }
    if (refIds.isEmpty()) {
      return List.of();
    }

    List<OpenAlexWork> resolved = openAlexService.getWorksByIds(refIds);
    Set<String> resolvedIds = new HashSet<>();
    resolved.forEach(w -> resolvedIds.add(w.id()));
    for (String id : refIds) {
      if (!resolvedIds.contains(id)) {
        saveUnresolved(
            projectId, sourceCiteKey, Direction.REFERENCE, id, null, "not_found_in_openalex");
        ctx.log("Could not resolve reference " + id + " in OpenAlex.");
      }
    }
    return resolved;
  }

  private List<OpenAlexWork> fetchCitingWorks(OpenAlexWork sourceWork, JobContext ctx) {
    List<OpenAlexWork> citing = openAlexService.getWorksCiting(sourceWork.id(), MAX_RESULTS);
    ctx.log("Found %d citations (capped at %d).".formatted(citing.size(), MAX_RESULTS));
    return citing;
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
      String openAlexWorkId,
      String title,
      String reason) {
    unresolvedCitationRepository.save(
        UnresolvedCitation.builder()
            .projectId(projectId)
            .sourceCiteKey(sourceCiteKey)
            .direction(direction.trackingLabel)
            .openAlexWorkId(openAlexWorkId)
            .title(title)
            .reason(reason)
            .discoveredAt(Instant.now())
            .build());
  }
}
