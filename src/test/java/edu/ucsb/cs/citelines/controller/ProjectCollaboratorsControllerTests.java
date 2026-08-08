package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = ProjectCollaboratorsController.class)
@Import({edu.ucsb.cs.citelines.testconfig.TestConfig.class, ProjectSecurity.class})
public class ProjectCollaboratorsControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;

  // ---- Authorization tests ----

  @Test
  public void logged_out_users_cannot_post() throws Exception {
    mockMvc
        .perform(
            post(
                "/api/projectcollaborators/post?firstName=Chris&lastName=Gaucho&email=cgaucho@ucsb.edu&projectId=1"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_list() throws Exception {
    mockMvc
        .perform(get("/api/projectcollaborators/project?projectId=1"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_delete() throws Exception {
    mockMvc
        .perform(delete("/api/projectcollaborators/delete?id=1&projectId=1"))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "stranger",
      roles = {"RESEARCHER"})
  @Test
  public void non_owner_researcher_cannot_add_a_collaborator() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

    mockMvc
        .perform(
            post("/api/projectcollaborators/post?firstName=Chris&lastName=Gaucho&email=cgaucho@ucsb.edu&projectId=1")
                .with(csrf()))
        .andExpect(status().is(403));
  }

  // ---- Functional tests ----

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_add_a_collaborator() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder()
            .id(1L)
            .firstName("Chris")
            .lastName("Gaucho")
            .email("cgaucho@ucsb.edu")
            .project(project)
            .build();
    when(projectRepository.findById(eq(1L))).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.save(any(ProjectCollaborator.class)))
        .thenReturn(collaborator);

    MvcResult response =
        mockMvc
            .perform(
                post("/api/projectcollaborators/post?firstName=Chris&lastName=Gaucho&email=cgaucho@ucsb.edu&projectId=1")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(projectCollaboratorRepository, times(1)).save(any(ProjectCollaborator.class));
    String expectedJson = mapper.writeValueAsString(collaborator);
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void adding_a_collaborator_strips_whitespace_from_email() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(eq(1L))).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.save(any(ProjectCollaborator.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(
            post("/api/projectcollaborators/post?firstName=Chris&lastName=Gaucho&email= cgaucho@ucsb.edu &projectId=1")
                .with(csrf()))
        .andExpect(status().isOk());

    org.mockito.ArgumentCaptor<ProjectCollaborator> captor =
        org.mockito.ArgumentCaptor.forClass(ProjectCollaborator.class);
    verify(projectCollaboratorRepository).save(captor.capture());
    assertEquals("cgaucho@ucsb.edu", captor.getValue().getEmail());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void post_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(999L)).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(
                post("/api/projectcollaborators/post?firstName=Chris&lastName=Gaucho&email=cgaucho@ucsb.edu&projectId=999")
                    .with(csrf()))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Project with id 999 not found", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_list_collaborators_for_a_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder().id(1L).email("cgaucho@ucsb.edu").project(project).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findByProjectId(1L)).thenReturn(List.of(collaborator));

    MvcResult response =
        mockMvc
            .perform(get("/api/projectcollaborators/project?projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    String expectedJson = mapper.writeValueAsString(List.of(collaborator));
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "cgaucho",
      roles = {"USER"})
  @Test
  public void a_collaborator_can_list_collaborators_for_a_project_they_are_on() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder().id(1L).email("cgaucho@example.org").project(project).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail("cgaucho@example.org"))
        .thenReturn(List.of(collaborator));
    when(projectCollaboratorRepository.findByProjectId(1L)).thenReturn(List.of(collaborator));

    mockMvc
        .perform(get("/api/projectcollaborators/project?projectId=1"))
        .andExpect(status().isOk());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void list_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(999L)).thenReturn(Optional.empty());

    mockMvc
        .perform(get("/api/projectcollaborators/project?projectId=999"))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_delete_a_collaborator() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder().id(5L).email("cgaucho@ucsb.edu").project(project).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findById(5L)).thenReturn(Optional.of(collaborator));

    mockMvc
        .perform(delete("/api/projectcollaborators/delete?id=5&projectId=1").with(csrf()))
        .andExpect(status().isOk())
        .andExpect(content().string("Successfully deleted collaborator."));

    verify(projectCollaboratorRepository, times(1)).delete(collaborator);
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void delete_throws_not_found_for_nonexistent_collaborator() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findById(999L)).thenReturn(Optional.empty());

    mockMvc
        .perform(delete("/api/projectcollaborators/delete?id=999&projectId=1").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "stranger",
      roles = {"RESEARCHER"})
  @Test
  public void non_owner_researcher_cannot_delete_a_collaborator() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

    mockMvc
        .perform(delete("/api/projectcollaborators/delete?id=5&projectId=1").with(csrf()))
        .andExpect(status().is(403));
  }
}
