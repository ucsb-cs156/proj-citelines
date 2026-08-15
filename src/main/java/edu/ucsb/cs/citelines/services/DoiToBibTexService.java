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
 * issue #63). Tries the same resolver chain (OpenAlex, then Semantic Scholar, then Crossref) that
 * {@link CitationGraphService} uses to discover a source work's references/citations, then
 * synthesizes a BibTeX entry for it via {@link BibTexSynthesisService}, using a citeKey unique
 * among the project's existing entries.
 */
@Service
public class DoiToBibTexService {

  private final DOIService doiService;
  private final BibTexSynthesisService bibTexSynthesisService;
  private final BibTexEntryRepository bibTexEntryRepository;
  private final List<CitationMetadataResolver> resolversInPriorityOrder;

  public DoiToBibTexService(
      DOIService doiService,
      BibTexSynthesisService bibTexSynthesisService,
      BibTexEntryRepository bibTexEntryRepository,
      OpenAlexService openAlexService,
      SemanticScholarResolver semanticScholarResolver,
      CrossrefResolver crossrefResolver) {
    this.doiService = doiService;
    this.bibTexSynthesisService = bibTexSynthesisService;
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.resolversInPriorityOrder =
        List.of(openAlexService, semanticScholarResolver, crossrefResolver);
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
        + relevance
        + "},\n"
        + rawBibtex.substring(lastBrace);
  }
}
