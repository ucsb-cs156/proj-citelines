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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = ProjectsController.class)
@Import({edu.ucsb.cs.citelines.testconfig.TestConfig.class, ProjectSecurity.class})
public class ProjectsControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;

  // ---- Authorization tests ----

  @Test
  public void logged_out_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/projects/post?name=Foo&description=Bar"))
        .andExpect(status().is(403));
  }

  @WithMockUser(roles = {"USER"})
  @Test
  public void logged_in_regular_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/projects/post?name=Foo&description=Bar"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_list_owner() throws Exception {
    mockMvc.perform(get("/api/projects/list/owner")).andExpect(status().is(403));
  }

  @WithMockUser(roles = {"USER"})
  @Test
  public void logged_in_regular_users_cannot_list_owner() throws Exception {
    mockMvc.perform(get("/api/projects/list/owner")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_list_collaborator() throws Exception {
    mockMvc.perform(get("/api/projects/list/collaborator")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_by_id() throws Exception {
    mockMvc.perform(get("/api/projects/1")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_put() throws Exception {
    mockMvc
        .perform(put("/api/projects?projectId=1&name=Foo&description=Bar"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_delete() throws Exception {
    mockMvc.perform(delete("/api/projects?projectId=1")).andExpect(status().is(403));
  }

  // ---- Functional tests ----

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void a_researcher_can_post_a_new_project() throws Exception {
    Project project =
        Project.builder()
            .id(1L)
            .name("Citation Graphs")
            .description("A project about citation graphs")
            .owner("phtcon@example.org")
            .dateCreated(LocalDateTime.now())
            .build();
    when(projectRepository.save(any(Project.class))).thenReturn(project);

    MvcResult response =
        mockMvc
            .perform(
                post("/api/projects/post?name=Citation Graphs&description=A project about citation graphs")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(projectRepository, times(1)).save(any(Project.class));
    String responseString = response.getResponse().getContentAsString();
    String expectedJson = mapper.writeValueAsString(project);
    assertEquals(expectedJson, responseString);
  }

  @WithMockUser(
      username = "admingaucho",
      roles = {"ADMIN"})
  @Test
  public void an_admin_can_post_a_new_project() throws Exception {
    Project project = Project.builder().id(1L).name("Foo").description("Bar").build();
    when(projectRepository.save(any(Project.class))).thenReturn(project);

    mockMvc
        .perform(post("/api/projects/post?name=Foo&description=Bar").with(csrf()))
        .andExpect(status().isOk());

    verify(projectRepository, times(1)).save(any(Project.class));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void a_researcher_can_list_their_own_projects() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findByOwner("phtcon@example.org")).thenReturn(List.of(project));

    MvcResult response =
        mockMvc.perform(get("/api/projects/list/owner")).andExpect(status().isOk()).andReturn();

    verify(projectRepository, times(1)).findByOwner("phtcon@example.org");
    String expectedJson = mapper.writeValueAsString(List.of(project));
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "cgaucho",
      roles = {"USER"})
  @Test
  public void a_user_can_list_projects_they_collaborate_on() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder().id(1L).email("cgaucho@example.org").project(project).build();
    when(projectCollaboratorRepository.findAllByEmail("cgaucho@example.org"))
        .thenReturn(List.of(collaborator));

    MvcResult response =
        mockMvc
            .perform(get("/api/projects/list/collaborator"))
            .andExpect(status().isOk())
            .andReturn();

    String expectedJson = mapper.writeValueAsString(List.of(project));
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "cgaucho",
      roles = {"USER"})
  @Test
  public void a_user_who_collaborates_on_two_projects_only_gets_each_project_once()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator c1 =
        ProjectCollaborator.builder().id(1L).email("cgaucho@example.org").project(project).build();
    ProjectCollaborator c2 =
        ProjectCollaborator.builder().id(2L).email("cgaucho@example.org").project(project).build();
    when(projectCollaboratorRepository.findAllByEmail("cgaucho@example.org"))
        .thenReturn(List.of(c1, c2));

    MvcResult response =
        mockMvc
            .perform(get("/api/projects/list/collaborator"))
            .andExpect(status().isOk())
            .andReturn();

    String expectedJson = mapper.writeValueAsString(List.of(project));
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_project_by_id() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail(any())).thenReturn(List.of());

    MvcResult response =
        mockMvc.perform(get("/api/projects/1")).andExpect(status().isOk()).andReturn();

    String expectedJson = mapper.writeValueAsString(project);
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "stranger",
      roles = {"USER"})
  @Test
  public void non_owner_non_collaborator_cannot_get_project_by_id() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail(any())).thenReturn(List.of());

    mockMvc.perform(get("/api/projects/1")).andExpect(status().is(403));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void get_by_id_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(999L)).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc.perform(get("/api/projects/999")).andExpect(status().isNotFound()).andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Project with id 999 not found", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_update_a_project() throws Exception {
    Project existing =
        Project.builder()
            .id(1L)
            .name("Old Name")
            .description("Old Desc")
            .owner("phtcon@example.org")
            .build();
    Project updated =
        Project.builder()
            .id(1L)
            .name("New Name")
            .description("New Desc")
            .owner("phtcon@example.org")
            .build();
    when(projectRepository.findById(eq(1L))).thenReturn(Optional.of(existing));
    when(projectRepository.save(any(Project.class))).thenReturn(updated);

    MvcResult response =
        mockMvc
            .perform(
                put("/api/projects?projectId=1&name=New Name&description=New Desc").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(projectRepository, times(1)).save(existing);
    assertEquals("New Name", existing.getName());
    assertEquals("New Desc", existing.getDescription());
    String expectedJson = mapper.writeValueAsString(updated);
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "stranger",
      roles = {"RESEARCHER"})
  @Test
  public void non_owner_researcher_cannot_update_a_project() throws Exception {
    Project existing = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(existing));

    mockMvc
        .perform(put("/api/projects?projectId=1&name=New&description=New").with(csrf()))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void update_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(999L)).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(put("/api/projects?projectId=999&name=New&description=New").with(csrf()))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Project with id 999 not found", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_delete_a_project_and_its_collaborators() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder().id(5L).project(project).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findByProjectId(1L)).thenReturn(List.of(collaborator));

    MvcResult response =
        mockMvc
            .perform(delete("/api/projects?projectId=1").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(projectCollaboratorRepository, times(1)).deleteAll(List.of(collaborator));
    verify(projectRepository, times(1)).delete(project);
    Map<String, Object> json = responseToJson(response);
    assertEquals("Project with id 1 deleted", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void delete_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(999L)).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(delete("/api/projects?projectId=999").with(csrf()))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Project with id 999 not found", json.get("message"));
  }
}
