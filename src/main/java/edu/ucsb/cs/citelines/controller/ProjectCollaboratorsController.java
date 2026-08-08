package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "ProjectCollaborators")
@RequestMapping("/api/projectcollaborators")
@RestController
@Slf4j
public class ProjectCollaboratorsController extends ApiController {

  @Autowired private ProjectCollaboratorRepository projectCollaboratorRepository;

  @Autowired private ProjectRepository projectRepository;

  /**
   * This method adds a new collaborator to a project.
   *
   * @return the created ProjectCollaborator
   */
  @Operation(summary = "Add a collaborator to a project")
  @PreAuthorize("@ProjectSecurity.hasOwnerPermissions(#root, #projectId)")
  @PostMapping("/post")
  public ProjectCollaborator postProjectCollaborator(
      @Parameter(name = "firstName") @RequestParam String firstName,
      @Parameter(name = "lastName") @RequestParam String lastName,
      @Parameter(name = "email") @RequestParam String email,
      @Parameter(name = "projectId") @RequestParam Long projectId)
      throws EntityNotFoundException {

    Project project =
        projectRepository
            .findById(projectId)
            .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));

    ProjectCollaborator collaborator =
        ProjectCollaborator.builder()
            .firstName(firstName)
            .lastName(lastName)
            .email(email.strip())
            .project(project)
            .build();

    return projectCollaboratorRepository.save(collaborator);
  }

  /**
   * This method returns a list of collaborators for a given project.
   *
   * @return a list of collaborators for a project.
   */
  @Operation(summary = "List all collaborators for a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/project")
  public Iterable<ProjectCollaborator> collaboratorsForProject(
      @Parameter(name = "projectId") @RequestParam Long projectId) throws EntityNotFoundException {
    projectRepository
        .findById(projectId)
        .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));
    return projectCollaboratorRepository.findByProjectId(projectId);
  }

  @Operation(summary = "Delete a collaborator")
  @PreAuthorize("@ProjectSecurity.hasOwnerPermissions(#root, #projectId)")
  @DeleteMapping("/delete")
  @Transactional
  public ResponseEntity<String> deleteProjectCollaborator(
      @Parameter(name = "id") @RequestParam Long id,
      @Parameter(name = "projectId") @RequestParam Long projectId)
      throws EntityNotFoundException {
    ProjectCollaborator collaborator =
        projectCollaboratorRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException(ProjectCollaborator.class, id));

    projectCollaboratorRepository.delete(collaborator);

    return ResponseEntity.ok("Successfully deleted collaborator.");
  }
}
