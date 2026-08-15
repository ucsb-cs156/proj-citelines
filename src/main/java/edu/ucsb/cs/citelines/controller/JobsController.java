package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.jobs.CheckLinksJob;
import edu.ucsb.cs.citelines.jobs.GetCitationsJob;
import edu.ucsb.cs.citelines.jobs.GetReferencesJob;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CheckLinksService;
import edu.ucsb.cs.citelines.services.CitationGraphService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.repositories.JobsRepository;
import edu.ucsb.cs156.jobs.services.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * App-level job endpoints: launching the "Get References"/"Get Citations" jobs for a project's
 * BibTeX entries, and listing jobs scoped to a project. Coexists with lib-jobs' own {@code
 * JobsController} (admin-only list/logs/delete) under the same {@code /api/jobs} prefix, on
 * non-overlapping sub-paths — same pattern as proj-scaffold's app-level {@code JobsController}.
 */
@Tag(name = "Jobs")
@RequestMapping("/api/jobs")
@RestController
@Slf4j
public class JobsController extends ApiController {

  @Autowired private JobsRepository jobsRepository;
  @Autowired private JobService jobService;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private BibTexEntryRepository bibTexEntryRepository;
  @Autowired private CitationGraphService citationGraphService;
  @Autowired private CheckLinksService checkLinksService;

  @Operation(summary = "List jobs scoped to a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/project")
  public Iterable<Job> jobsByProject(@Parameter(name = "projectId") @RequestParam Long projectId) {
    projectRepository
        .findById(projectId)
        .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));
    return jobsRepository.findByScopeTypeAndScopeIdOrderByIdDesc("project", projectId);
  }

  @Operation(summary = "Launch a job to fetch the papers a BibTeX entry cites")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/launch/getReferences")
  public Job launchGetReferences(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "citeKey") @RequestParam String citeKey) {
    requireEntry(projectId, citeKey);
    return jobService.runAsJob(
        GetReferencesJob.builder()
            .projectId(projectId.intValue())
            .citeKey(citeKey)
            .citationGraphService(citationGraphService)
            .build());
  }

  @Operation(summary = "Launch a job to fetch the papers that cite a BibTeX entry")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/launch/getCitations")
  public Job launchGetCitations(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "citeKey") @RequestParam String citeKey) {
    requireEntry(projectId, citeKey);
    return jobService.runAsJob(
        GetCitationsJob.builder()
            .projectId(projectId.intValue())
            .citeKey(citeKey)
            .citationGraphService(citationGraphService)
            .build());
  }

  @Operation(summary = "Launch a job to check DOI/URL links for a project's BibTeX entries")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/launch/checkLinks")
  public Job launchCheckLinks(@Parameter(name = "projectId") @RequestParam Long projectId) {
    projectRepository
        .findById(projectId)
        .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));
    return jobService.runAsJob(
        CheckLinksJob.builder()
            .projectId(projectId.intValue())
            .checkLinksService(checkLinksService)
            .build());
  }

  private void requireEntry(Long projectId, String citeKey) {
    BibTexEntry entry =
        bibTexEntryRepository.findByProjectIdAndCiteKey(projectId.intValue(), citeKey).orElse(null);
    if (entry == null) {
      throw new EntityNotFoundException(BibTexEntry.class, citeKey);
    }
  }
}
