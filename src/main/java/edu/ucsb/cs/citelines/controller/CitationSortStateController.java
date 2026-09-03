package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import edu.ucsb.cs.citelines.collections.CitationSortState;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CitationSortStateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Persists (and retrieves) the last-saved state of a {@code CitationSort} panel, per user, same
 * semantics as {@link CitationFilterStateController} — issue #126. Only ever written on an actual
 * user change (see {@link #post}); a scope nobody has touched yet reads back as a default, unsaved,
 * via {@link #get}.
 */
@Tag(name = "CitationSortState")
@RequestMapping("/api/citationsortstate")
@RestController
@Slf4j
public class CitationSortStateController extends ApiController {

  @Autowired private ProjectRepository projectRepository;
  @Autowired private BibTexEntryRepository bibTexEntryRepository;
  @Autowired private CitationSortStateService citationSortStateService;

  @Operation(
      summary =
          "Get the saved state of a citation sort panel, or a default (unsaved) state if none has"
              + " been saved for this scope yet")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("")
  public CitationSortState get(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "scope") @RequestParam Scope scope,
      @Parameter(name = "entryId") @RequestParam(required = false) String entryId) {
    requireProject(projectId);
    if (scope != Scope.PROJECT) {
      requireEntry(projectId, entryId);
    }
    return citationSortStateService.getOrDefault(
        projectId.intValue(), scope, entryId, getCurrentUser().getUser().getId());
  }

  @Operation(summary = "Save the state of a citation sort panel")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("")
  public CitationSortState post(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "scope") @RequestParam Scope scope,
      @Parameter(name = "entryId") @RequestParam(required = false) String entryId,
      @RequestBody CitationSortState state) {
    requireProject(projectId);
    if (scope != Scope.PROJECT) {
      requireEntry(projectId, entryId);
    }
    state.setProjectId(projectId.intValue());
    state.setScope(scope);
    state.setEntryId(entryId);
    state.setUserId(getCurrentUser().getUser().getId());
    return citationSortStateService.save(state);
  }

  private void requireProject(Long projectId) {
    projectRepository
        .findById(projectId)
        .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));
  }

  private void requireEntry(Long projectId, String entryId) {
    BibTexEntry entry =
        entryId == null
            ? null
            : bibTexEntryRepository
                .findByIdAndProjectId(entryId, projectId.intValue())
                .orElse(null);
    if (entry == null) {
      throw new EntityNotFoundException(BibTexEntry.class, entryId == null ? "(missing)" : entryId);
    }
  }
}
