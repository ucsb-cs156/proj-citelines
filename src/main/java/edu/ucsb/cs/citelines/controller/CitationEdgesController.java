package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import edu.ucsb.cs.citelines.collections.UnresolvedCitation;
import edu.ucsb.cs.citelines.collections.UnresolvedCitationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only endpoints for the citation graph built by the "Get References"/"Get Citations" jobs
 * (see {@link edu.ucsb.cs.citelines.services.CitationGraphService}): the papers a given entry
 * cites, the papers that cite it, and the entries the OpenAlex-only MVP could not fully resolve
 * (see {@code docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}).
 */
@Tag(name = "CitationEdges")
@RequestMapping("/api/citationedges")
@RestController
@Slf4j
public class CitationEdgesController extends ApiController {

  @Autowired private CitationEdgeRepository citationEdgeRepository;
  @Autowired private BibTexEntryRepository bibTexEntryRepository;
  @Autowired private UnresolvedCitationRepository unresolvedCitationRepository;

  @Operation(summary = "List the BibTeX entries that a given entry cites")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/references")
  public List<BibTexEntry> references(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "citeKey") @RequestParam String citeKey) {
    return relatedEntries(
        projectId,
        citationEdgeRepository
            .findByProjectIdAndCitingCiteKey(projectId.intValue(), citeKey)
            .stream()
            .map(CitationEdge::getCitedCiteKey));
  }

  @Operation(summary = "List the BibTeX entries that cite a given entry")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/citations")
  public List<BibTexEntry> citations(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "citeKey") @RequestParam String citeKey) {
    return relatedEntries(
        projectId,
        citationEdgeRepository
            .findByProjectIdAndCitedCiteKey(projectId.intValue(), citeKey)
            .stream()
            .map(CitationEdge::getCitingCiteKey));
  }

  @Operation(
      summary =
          "List references/citations the OpenAlex-only MVP could not fully resolve for a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/unresolved")
  public List<UnresolvedCitation> unresolved(
      @Parameter(name = "projectId") @RequestParam Long projectId) {
    return unresolvedCitationRepository.findByProjectId(projectId.intValue());
  }

  private List<BibTexEntry> relatedEntries(Long projectId, Stream<String> citeKeys) {
    return citeKeys
        .map(key -> bibTexEntryRepository.findByProjectIdAndCiteKey(projectId.intValue(), key))
        .flatMap(Optional::stream)
        .toList();
  }
}
