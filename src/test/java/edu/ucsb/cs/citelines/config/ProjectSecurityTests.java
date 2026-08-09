package edu.ucsb.cs.citelines.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.entity.User;
import edu.ucsb.cs.citelines.model.CurrentUser;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CurrentUserService;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class ProjectSecurityTests {

  @Mock private CurrentUserService currentUserService;
  @Mock private ProjectRepository projectRepository;
  @Mock private ProjectCollaboratorRepository projectCollaboratorRepository;

  private final RoleHierarchy roleHierarchy =
      RoleHierarchyImpl.withDefaultRolePrefix()
          .role("ADMIN")
          .implies("RESEARCHER")
          .role("RESEARCHER")
          .implies("USER")
          .build();

  private ProjectSecurity projectSecurity;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    projectSecurity =
        new ProjectSecurity(
            currentUserService, roleHierarchy, projectRepository, projectCollaboratorRepository);
  }

  private void mockCurrentUser(String email, String... roles) {
    User user = User.builder().email(email).build();
    List<SimpleGrantedAuthority> authorities =
        Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList();
    CurrentUser currentUser = CurrentUser.builder().user(user).roles(authorities).build();
    when(currentUserService.getCurrentUser()).thenReturn(currentUser);
  }

  // ---- hasManagePermissions ----

  @Test
  void hasManagePermissions_true_when_projectId_is_null() {
    assertEquals(true, projectSecurity.hasManagePermissions(null, null));
  }

  @Test
  void hasManagePermissions_true_when_project_not_found() {
    when(projectRepository.findById(99L)).thenReturn(Optional.empty());

    assertEquals(true, projectSecurity.hasManagePermissions(null, 99L));
  }

  @Test
  void hasManagePermissions_true_for_admin() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("admin@ucsb.edu", "ROLE_ADMIN");

    assertEquals(true, projectSecurity.hasManagePermissions(null, 1L));
  }

  @Test
  void hasManagePermissions_true_for_owner() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("owner@ucsb.edu", "ROLE_RESEARCHER", "ROLE_USER");

    assertEquals(true, projectSecurity.hasManagePermissions(null, 1L));
  }

  @Test
  void hasManagePermissions_true_for_collaborator() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("collaborator@ucsb.edu", "ROLE_USER");
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder()
            .id(1L)
            .email("collaborator@ucsb.edu")
            .project(project)
            .build();
    when(projectCollaboratorRepository.findAllByEmail("collaborator@ucsb.edu"))
        .thenReturn(List.of(collaborator));

    assertEquals(true, projectSecurity.hasManagePermissions(null, 1L));
  }

  @Test
  void hasManagePermissions_false_for_unrelated_user() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("stranger@ucsb.edu", "ROLE_USER");
    when(projectCollaboratorRepository.findAllByEmail("stranger@ucsb.edu")).thenReturn(List.of());

    assertEquals(false, projectSecurity.hasManagePermissions(null, 1L));
  }

  @Test
  void hasManagePermissions_false_for_collaborator_of_a_different_project() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    Project otherProject = Project.builder().id(2L).owner("other-owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("collaborator@ucsb.edu", "ROLE_USER");
    ProjectCollaborator collaboratorElsewhere =
        ProjectCollaborator.builder()
            .id(1L)
            .email("collaborator@ucsb.edu")
            .project(otherProject)
            .build();
    when(projectCollaboratorRepository.findAllByEmail("collaborator@ucsb.edu"))
        .thenReturn(List.of(collaboratorElsewhere));

    assertEquals(false, projectSecurity.hasManagePermissions(null, 1L));
  }

  // ---- hasOwnerPermissions ----

  @Test
  void hasOwnerPermissions_true_when_projectId_is_null() {
    assertEquals(true, projectSecurity.hasOwnerPermissions(null, null));
  }

  @Test
  void hasOwnerPermissions_true_when_project_not_found() {
    when(projectRepository.findById(99L)).thenReturn(Optional.empty());

    assertEquals(true, projectSecurity.hasOwnerPermissions(null, 99L));
  }

  @Test
  void hasOwnerPermissions_true_for_admin() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("admin@ucsb.edu", "ROLE_ADMIN");

    assertEquals(true, projectSecurity.hasOwnerPermissions(null, 1L));
  }

  @Test
  void hasOwnerPermissions_true_for_owner() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("owner@ucsb.edu", "ROLE_RESEARCHER", "ROLE_USER");

    assertEquals(true, projectSecurity.hasOwnerPermissions(null, 1L));
  }

  @Test
  void hasOwnerPermissions_false_for_collaborator() {
    Project project = Project.builder().id(1L).owner("owner@ucsb.edu").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    mockCurrentUser("collaborator@ucsb.edu", "ROLE_USER");

    assertEquals(false, projectSecurity.hasOwnerPermissions(null, 1L));
  }
}
