package edu.ucsb.cs.citelines.config;

import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CurrentUserService;
import java.util.Collection;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.expression.method.MethodSecurityExpressionOperations;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * ProjectSecurity provides methods to check permissions for managing projects and project
 * collaborators. Mirrors the shape of CourseSecurity in proj-scaffold: {@code hasManagePermissions}
 * allows the owner, any collaborator, or an admin (read access to a project's details and its
 * collaborator list); {@code hasOwnerPermissions} is restricted to the owner (or an admin) for
 * mutating the project itself or its collaborator list.
 *
 * <p>Note that for a method with a projectId, you <em>still</em> need to verify in each method
 * whether the project exists or not. These annotations will <em>only</em> check whether or not the
 * particular user has access to a particular project.
 */
@Slf4j
@Component("ProjectSecurity")
public class ProjectSecurity {
  private final CurrentUserService currentUserService;
  private final RoleHierarchy roleHierarchy;
  private final ProjectRepository projectRepository;
  private final ProjectCollaboratorRepository projectCollaboratorRepository;

  public ProjectSecurity(
      CurrentUserService currentUserService,
      RoleHierarchy roleHierarchy,
      ProjectRepository projectRepository,
      ProjectCollaboratorRepository projectCollaboratorRepository) {
    this.currentUserService = currentUserService;
    this.roleHierarchy = roleHierarchy;
    this.projectRepository = projectRepository;
    this.projectCollaboratorRepository = projectCollaboratorRepository;
  }

  /**
   * Use this when you want to check whether the user is the owner, a collaborator, or an admin for
   * the project.
   *
   * @param operations
   * @param projectId
   * @return true if the user has manage permissions for the project, false otherwise.
   */
  @PreAuthorize("hasRole('ROLE_USER')")
  public Boolean hasManagePermissions(
      MethodSecurityExpressionOperations operations, Long projectId) {
    if (projectId == null) {
      // A null id can reach here from endpoints that take the projectId from a request body.
      // Grant access so the controller can reject the request with a proper validation error,
      // mirroring the project-not-found case below.
      return true;
    }
    Optional<Project> project = projectRepository.findById(projectId);
    if (project.isEmpty()) {
      return true;
    }
    if (isAdmin()) {
      return true;
    }
    String email = currentUserService.getCurrentUser().getUser().getEmail();
    if (email.equals(project.get().getOwner())) {
      return true;
    }
    return projectCollaboratorRepository.findAllByEmail(email).stream()
        .anyMatch(c -> c.getProject().getId().equals(projectId));
  }

  /**
   * Use this for operations that only the project's owner can do, such as editing or deleting the
   * project, or adding/removing collaborators.
   *
   * @param operations
   * @param projectId
   * @return true if the user has owner permissions for the project, false otherwise.
   */
  @PreAuthorize("hasRole('ROLE_RESEARCHER')")
  public Boolean hasOwnerPermissions(
      MethodSecurityExpressionOperations operations, Long projectId) {
    if (projectId == null) {
      return true;
    }
    Optional<Project> project = projectRepository.findById(projectId);
    if (project.isEmpty()) {
      return true;
    }
    if (isAdmin()) {
      return true;
    }
    String email = currentUserService.getCurrentUser().getUser().getEmail();
    return email.equals(project.get().getOwner());
  }

  private boolean isAdmin() {
    Collection<? extends GrantedAuthority> authorities =
        roleHierarchy.getReachableGrantedAuthorities(
            currentUserService.getCurrentUser().getRoles());
    return authorities.stream().anyMatch(role -> role.getAuthority().equals("ROLE_ADMIN"));
  }
}
