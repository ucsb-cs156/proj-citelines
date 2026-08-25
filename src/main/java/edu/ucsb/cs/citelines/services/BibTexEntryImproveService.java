package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Re-resolves {@link BibTexEntry} records that have a DOI against the citation-metadata resolver
 * waterfall (see {@link CitationGraphService}), filling in whatever fields an entry is currently
 * missing that a resolver now reports — e.g. {@code abstract}/{@code publisher}/{@code
 * pages}/{@code isbn}/{@code series}/{@code address}/{@code volume}/{@code number}, none of which
 * earlier versions of this app's resolvers extracted at all (see issue #66).
 *
 * <p>Which entries get checked is controlled by {@link ImproveScope} (see issue #110): the whole
 * project, a single entry, or the references/citations of a single entry.
 *
 * <p>Never overwrites a field the entry already has a non-blank value for, even if a resolver now
 * reports a different one for it — an existing value may already have been reviewed or hand-edited,
 * and this job has no way to distinguish "reviewed and correct" from "just never updated." {@code
 * citeKey} is likewise never touched. {@code entryType} is the one exception: an entry currently
 * typed {@code misc} (the fallback used whenever a resolver's own type couldn't be mapped to a more
 * specific BibTeX type — see {@code BibTexSynthesisService#ENTRY_TYPE_MAP}) is upgraded to whatever
 * more specific type the resolver now reports, since {@code misc} was never a deliberate choice to
 * begin with, unlike a hand-set/reviewed field value.
 */
@Service
public class BibTexEntryImproveService {

  private final BibTexEntryRepository bibTexEntryRepository;
  private final CitationGraphService citationGraphService;
  private final BibTexSynthesisService bibTexSynthesisService;
  private final BibTexConverterService bibTexConverterService;
  private final CitationEdgeService citationEdgeService;

  public BibTexEntryImproveService(
      BibTexEntryRepository bibTexEntryRepository,
      CitationGraphService citationGraphService,
      BibTexSynthesisService bibTexSynthesisService,
      BibTexConverterService bibTexConverterService,
      CitationEdgeService citationEdgeService) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.citationGraphService = citationGraphService;
    this.bibTexSynthesisService = bibTexSynthesisService;
    this.bibTexConverterService = bibTexConverterService;
    this.citationEdgeService = citationEdgeService;
  }

  /** Which entries of a project a {@link BibTexEntryImproveService} pass should check. */
  public enum ImproveScope {
    PROJECT,
    ENTRY,
    REFERENCES,
    CITATIONS
  }

  // Package-visible so tests can assert improveEntry's exact return value per branch directly,
  // same as BulkCitationUploadFromACMDLViewAllService.Outcome.
  enum Outcome {
    IMPROVED,
    ALREADY_COMPLETE,
    SKIPPED_NO_DOI,
    UNRESOLVED
  }

  public void improveEntries(int projectId, ImproveScope scope, String entryId, JobContext ctx) {
    List<BibTexEntry> entries = entriesForScope(projectId, scope, entryId);
    ctx.log(
        "Checking %d entries in project %d for improvable metadata."
            .formatted(entries.size(), projectId));

    int improved = 0;
    int alreadyComplete = 0;
    int skippedNoDoi = 0;
    int unresolved = 0;
    for (BibTexEntry entry : entries) {
      // An entry with no DOI (SKIPPED_NO_DOI) or with nothing new to add (ALREADY_COMPLETE)
      // never calls ctx.log() -- checkCancellation() gives this loop its own checkpoint
      // independent of whether an iteration does anything at all.
      ctx.checkCancellation();
      Outcome outcome = improveEntry(entry, projectId, ctx);
      if (outcome == Outcome.IMPROVED) {
        improved++;
      } else if (outcome == Outcome.ALREADY_COMPLETE) {
        alreadyComplete++;
      } else if (outcome == Outcome.SKIPPED_NO_DOI) {
        skippedNoDoi++;
      } else {
        unresolved++;
      }
    }

    ctx.log(
        ("Done: checked %d entr%s, %d improved, %d already complete, %d skipped (no DOI), %d"
                + " unresolved.")
            .formatted(
                entries.size(),
                entries.size() == 1 ? "y" : "ies",
                improved,
                alreadyComplete,
                skippedNoDoi,
                unresolved));
  }

  private List<BibTexEntry> entriesForScope(int projectId, ImproveScope scope, String entryId) {
    return switch (scope) {
      case PROJECT -> bibTexEntryRepository.findByProjectId(projectId);
      case ENTRY -> bibTexEntryRepository.findById(entryId).map(List::of).orElse(List.of());
      case REFERENCES -> citationEdgeService.referencesOf(projectId, entryId);
      case CITATIONS -> citationEdgeService.citationsOf(projectId, entryId);
    };
  }

  Outcome improveEntry(BibTexEntry entry, int projectId, JobContext ctx) {
    Map<String, String> keyValuePairs = entry.getKeyValuePairs();
    String doi = keyValuePairs != null ? keyValuePairs.get("doi") : null;
    if (doi == null || doi.isBlank()) {
      return Outcome.SKIPPED_NO_DOI;
    }

    Optional<CitationGraphService.ResolverResult> resolved =
        citationGraphService.tryResolveByDoi(doi);
    if (resolved.isEmpty()) {
      ctx.log(
          "Could not re-resolve %s (DOI %s): no provider has a record."
              .formatted(entry.getCiteKey(), doi));
      return Outcome.UNRESOLVED;
    }

    ResolvedWork work = resolved.get().work();
    if (work.title() == null || work.title().isBlank()) {
      ctx.log(
          "Could not re-resolve %s (DOI %s): resolved, but no title is available."
              .formatted(entry.getCiteKey(), doi));
      return Outcome.UNRESOLVED;
    }

    String candidateBibtex = bibTexSynthesisService.synthesizeRawBibTex(work, entry.getCiteKey());
    BibTexEntry candidate =
        bibTexConverterService.parseToEntries(candidateBibtex, projectId).get(0);

    List<String> addedFields = new ArrayList<>();
    if ("misc".equals(entry.getEntryType()) && !"misc".equals(candidate.getEntryType())) {
      addedFields.add("entryType (misc → %s)".formatted(candidate.getEntryType()));
      entry.setEntryType(candidate.getEntryType());
    }

    Map<String, String> merged = new HashMap<>(keyValuePairs);
    for (Map.Entry<String, String> field : candidate.getKeyValuePairs().entrySet()) {
      String currentValue = merged.get(field.getKey());
      if (currentValue == null || currentValue.isBlank()) {
        merged.put(field.getKey(), field.getValue());
        addedFields.add(field.getKey());
      }
    }

    if (addedFields.isEmpty()) {
      return Outcome.ALREADY_COMPLETE;
    }

    entry.setKeyValuePairs(merged);
    bibTexEntryRepository.save(entry);
    ctx.log("Improved %s: added %s.".formatted(entry.getCiteKey(), String.join(", ", addedFields)));
    return Outcome.IMPROVED;
  }
}
