package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.model.CurrentUser;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CitationFormattingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Projects")
@RequestMapping("/api/projects")
@RestController
@Slf4j
public class ProjectsController extends ApiController {

  @Autowired private ProjectRepository projectRepository;

  @Autowired private ProjectCollaboratorRepository projectCollaboratorRepository;

  /**
   * Validates that {@code citationFormat} is one of the keys of {@link
   * CitationFormattingService#COMMON_ALIASES}.
   *
   * @throws IllegalArgumentException if {@code citationFormat} is not a recognized format
   */
  private void validateCitationFormat(String citationFormat) {
    if (!CitationFormattingService.COMMON_ALIASES.containsKey(citationFormat)) {
      throw new IllegalArgumentException(
          "citationFormat must be one of %s"
              .formatted(CitationFormattingService.COMMON_ALIASES.keySet()));
    }
  }

  /**
   * This method creates a new Project, owned by the current user.
   *
   * @param name the name of the project
   * @param description the description of the project
   * @param citationFormat the citation format for the project's references, one of the keys of
   *     {@link CitationFormattingService#COMMON_ALIASES} (defaults to {@code "ACM"})
   * @return the created project
   */
  @Operation(summary = "Create a new project")
  @PreAuthorize("hasRole('ROLE_ADMIN') || hasRole('ROLE_RESEARCHER')")
  @PostMapping("/post")
  public Project postProject(
      @Parameter(name = "name") @RequestParam String name,
      @Parameter(name = "description") @RequestParam String description,
      @Parameter(name = "citationFormat") @RequestParam(defaultValue = "ACM")
          String citationFormat) {
    validateCitationFormat(citationFormat);
    CurrentUser currentUser = getCurrentUser();
    Project project =
        Project.builder()
            .name(name)
            .description(description)
            .owner(currentUser.getUser().getEmail())
            .dateCreated(LocalDateTime.now())
            .citationFormat(citationFormat)
            .build();
    return projectRepository.save(project);
  }

  /**
   * This method returns a list of projects owned by the current user.
   *
   * @return a list of projects owned by the current user.
   */
  @Operation(summary = "List all projects owned by the current user")
  @PreAuthorize("hasRole('ROLE_RESEARCHER')")
  @GetMapping("/list/owner")
  public Iterable<Project> listForOwner() {
    String email = getCurrentUser().getUser().getEmail();
    return projectRepository.findByOwner(email);
  }

  /**
   * This method returns a list of projects the current user collaborates on.
   *
   * @return a list of projects the current user collaborates on.
   */
  @Operation(summary = "List all projects the current user collaborates on")
  @PreAuthorize("hasRole('ROLE_USER')")
  @GetMapping("/list/collaborator")
  public List<Project> listForCollaborator() {
    String email = getCurrentUser().getUser().getEmail();
    return projectCollaboratorRepository.findAllByEmail(email).stream()
        .map(ProjectCollaborator::getProject)
        .distinct()
        .toList();
  }

  /**
   * This method returns a single project by its id.
   *
   * @return a project
   */
  @Operation(summary = "Get project by id")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #id)")
  @GetMapping("/{id}")
  public Project getProjectById(@Parameter(name = "id") @PathVariable Long id) {
    return projectRepository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException(Project.class, id));
  }

  /**
   * This method updates the name, description, and citation format of an existing project.
   *
   * @param projectId the id of the project to update
   * @param name the new name of the project
   * @param description the new description of the project
   * @param citationFormat the new citation format for the project's references, one of the keys of
   *     {@link CitationFormattingService#COMMON_ALIASES} (defaults to {@code "ACM"})
   * @return the updated project
   */
  @Operation(summary = "Update an existing project")
  @PreAuthorize("@ProjectSecurity.hasOwnerPermissions(#root, #projectId)")
  @PutMapping("")
  public Project updateProject(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "name") @RequestParam String name,
      @Parameter(name = "description") @RequestParam String description,
      @Parameter(name = "citationFormat") @RequestParam(defaultValue = "ACM")
          String citationFormat) {
    validateCitationFormat(citationFormat);
    Project project =
        projectRepository
            .findById(projectId)
            .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));

    project.setName(name);
    project.setDescription(description);
    project.setCitationFormat(citationFormat);

    return projectRepository.save(project);
  }

  /**
   * This method deletes a project, along with any collaborators on it.
   *
   * @param projectId the id of the project to delete
   * @return a message confirming deletion
   */
  @Operation(summary = "Delete a project")
  @PreAuthorize("@ProjectSecurity.hasOwnerPermissions(#root, #projectId)")
  @DeleteMapping("")
  @Transactional
  public Object deleteProject(@RequestParam Long projectId) {
    Project project =
        projectRepository
            .findById(projectId)
            .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));

    projectCollaboratorRepository.deleteAll(
        projectCollaboratorRepository.findByProjectId(projectId));
    projectRepository.delete(project);

    return genericMessage("Project with id %s deleted".formatted(project.getId()));
  }
}
