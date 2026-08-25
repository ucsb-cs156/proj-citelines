package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.UnresolvedCitation;
import edu.ucsb.cs.citelines.collections.UnresolvedCitationRepository;
import edu.ucsb.cs.citelines.services.CitationEdgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
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
 * cites, the papers that cite it, and the entries no configured resolver could fully resolve (see
 * {@code docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}).
 */
@Tag(name = "CitationEdges")
@RequestMapping("/api/citationedges")
@RestController
@Slf4j
public class CitationEdgesController extends ApiController {

  @Autowired private CitationEdgeService citationEdgeService;
  @Autowired private UnresolvedCitationRepository unresolvedCitationRepository;

  /**
   * @param id the Mongo {@code _id} of the entry to list references for — not its citeKey, which a
   *     user can freely rename (see {@code CitationEdge}'s Javadoc)
   */
  @Operation(summary = "List the BibTeX entries that a given entry cites")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/references")
  public List<BibTexEntry> references(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "id") @RequestParam String id) {
    return citationEdgeService.referencesOf(projectId.intValue(), id);
  }

  /**
   * @param id the Mongo {@code _id} of the entry to list citations for — not its citeKey, which a
   *     user can freely rename (see {@code CitationEdge}'s Javadoc)
   */
  @Operation(summary = "List the BibTeX entries that cite a given entry")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/citations")
  public List<BibTexEntry> citations(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "id") @RequestParam String id) {
    return citationEdgeService.citationsOf(projectId.intValue(), id);
  }

  @Operation(
      summary =
          "List references/citations no configured resolver could fully resolve, for a project"
              + " or (if sourceEntryId is given) for a single entry")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/unresolved")
  public List<UnresolvedCitation> unresolved(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "sourceEntryId") @RequestParam(required = false) String sourceEntryId) {
    return sourceEntryId == null
        ? unresolvedCitationRepository.findByProjectId(projectId.intValue())
        : unresolvedCitationRepository.findByProjectIdAndSourceEntryId(
            projectId.intValue(), sourceEntryId);
  }
}
