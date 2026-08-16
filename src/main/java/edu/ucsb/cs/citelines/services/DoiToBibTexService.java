package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.errors.DoiNotFoundException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Resolves a bare/formatted DOI to a raw BibTeX string, for the "Add Citation via DOI" flow (see
 * issue #63). Tries the same resolver chain (OpenAlex, then Semantic Scholar, then Crossref, then
 * DBLP) that {@link CitationGraphService} uses to discover a source work's references/citations,
 * then synthesizes a BibTeX entry for it via {@link BibTexSynthesisService}, using a citeKey unique
 * among the project's existing entries.
 */
@Service
public class DoiToBibTexService {

  private final DOIService doiService;
  private final BibTexSynthesisService bibTexSynthesisService;
  private final BibTexEntryRepository bibTexEntryRepository;
  private final CitationGraphService citationGraphService;
  private final List<CitationMetadataResolver> resolversInPriorityOrder;

  public DoiToBibTexService(
      DOIService doiService,
      BibTexSynthesisService bibTexSynthesisService,
      BibTexEntryRepository bibTexEntryRepository,
      CitationGraphService citationGraphService,
      OpenAlexService openAlexService,
      SemanticScholarResolver semanticScholarResolver,
      CrossrefResolver crossrefResolver,
      DblpResolver dblpResolver) {
    this.doiService = doiService;
    this.bibTexSynthesisService = bibTexSynthesisService;
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.citationGraphService = citationGraphService;
    this.resolversInPriorityOrder =
        List.of(openAlexService, semanticScholarResolver, crossrefResolver, dblpResolver);
  }

  /**
   * Looks up whether {@code projectId} already has an entry for {@code rawDoi}, so a caller can
   * link to that entry instead of creating a duplicate for the same paper (see issue #67; reuses
   * {@link CitationGraphService}'s existing DOI-dedup index rather than a second copy of it, the
   * same way {@link BulkCitationUploadFromACMDLViewAllService} does).
   *
   * <p>Returns empty both when the project has no matching entry and when {@code rawDoi} isn't a
   * recognizable DOI at all — the latter is left for {@link #resolveToBibTex} to report as a {@link
   * DoiNotFoundException}, so callers only need to branch on "found" vs. "not found."
   *
   * @param rawDoi the DOI, in any format recognized by {@link DOIService#normalizeRawDOI}
   * @param projectId the project to check for an existing entry
   * @return the existing entry for this DOI, if the project already has one
   */
  public Optional<BibTexEntry> findExistingEntryForDoi(String rawDoi, int projectId) {
    String doi;
    try {
      doi = doiService.normalizeRawDOI(rawDoi);
    } catch (IllegalArgumentException e) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        citationGraphService.loadExistingEntries(projectId).byDoi().get(doi));
  }

  /**
   * Resolves {@code rawDoi} to a raw BibTeX string, optionally carrying a {@code
   * CITELINES_relevance} field (mirroring what the frontend injects for a pasted-BibTeX entry — see
   * {@code citelinesFields.js} — since a synthesized entry has no such field of its own).
   *
   * @param rawDoi the DOI, in any format recognized by {@link DOIService#normalizeRawDOI}
   * @param projectId the project the resulting entry will be saved to, used only to generate a
   *     citeKey that doesn't collide with one already in use
   * @param relevance the CITELINES_relevance value to attach, if any
   * @return the synthesized raw BibTeX text
   * @throws DoiNotFoundException if {@code rawDoi} cannot be recognized as a DOI, or no resolver
   *     has a record for it
   */
  public String resolveToBibTex(String rawDoi, int projectId, String relevance) {
    String doi;
    try {
      doi = doiService.normalizeRawDOI(rawDoi);
    } catch (IllegalArgumentException e) {
      throw new DoiNotFoundException(rawDoi);
    }

    for (CitationMetadataResolver resolver : resolversInPriorityOrder) {
      Optional<ResolvedWork> found = resolver.resolveByDoi(doi);
      if (found.isPresent() && !isBlank(found.get().title())) {
        String citeKey =
            bibTexSynthesisService.generateUniqueCiteKey(found.get(), existingCiteKeys(projectId));
        String rawBibtex = bibTexSynthesisService.synthesizeRawBibTex(found.get(), citeKey);
        return injectRelevance(rawBibtex, relevance);
      }
    }

    throw new DoiNotFoundException(rawDoi);
  }

  private Set<String> existingCiteKeys(int projectId) {
    Set<String> existingCiteKeys = new HashSet<>();
    for (BibTexEntry entry : bibTexEntryRepository.findByProjectId(projectId)) {
      existingCiteKeys.add(entry.getCiteKey());
    }
    return existingCiteKeys;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  // BibTexSynthesisService.synthesizeRawBibTex always produces a single, flat "@type{key,\n
  // field = {value},\n...}\n" entry, so inserting one more field is just a matter of splicing it
  // in before the entry's closing brace.
  private static String injectRelevance(String rawBibtex, String relevance) {
    if (isBlank(relevance)) {
      return rawBibtex;
    }
    int lastBrace = rawBibtex.lastIndexOf('}');
    return rawBibtex.substring(0, lastBrace)
        + "  CITELINES_relevance = {"
        + escapeBraces(relevance)
        + "},\n"
        + rawBibtex.substring(lastBrace);
  }

  // Escapes brace characters so a caller-supplied relevance value can never prematurely close (or
  // otherwise corrupt) the synthesized BibTeX entry's field value.
  private static String escapeBraces(String value) {
    return value.replace("{", "\\{").replace("}", "\\}");
  }
}
