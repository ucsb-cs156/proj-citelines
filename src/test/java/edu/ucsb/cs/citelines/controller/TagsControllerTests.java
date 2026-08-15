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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.Tag;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.repository.TagRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = TagsController.class)
@Import({edu.ucsb.cs.citelines.testconfig.TestConfig.class, ProjectSecurity.class})
public class TagsControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean TagRepository tagRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;

  // ---- Authorization tests ----

  @Test
  public void logged_out_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/tags/post?tag=method&explanation=uses+methodology&projectId=1"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_list() throws Exception {
    mockMvc.perform(get("/api/tags/project?projectId=1")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_put() throws Exception {
    mockMvc
        .perform(put("/api/tags?id=1&projectId=1&tag=method&explanation=uses+methodology"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_delete() throws Exception {
    mockMvc.perform(delete("/api/tags/delete?id=1&projectId=1")).andExpect(status().is(403));
  }

  // ---- Functional tests ----

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_add_a_tag() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag tag =
        Tag.builder().id(1L).tag("method").explanation("uses methodology").project(project).build();
    when(projectRepository.findById(eq(1L))).thenReturn(Optional.of(project));
    when(tagRepository.findByProjectIdAndTag(1L, "method")).thenReturn(Optional.empty());
    when(tagRepository.save(any(Tag.class))).thenReturn(tag);

    MvcResult response =
        mockMvc
            .perform(
                post("/api/tags/post?tag=method&explanation=uses+methodology&projectId=1")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(tagRepository, times(1)).save(any(Tag.class));
    String expectedJson = mapper.writeValueAsString(tag);
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_add_a_tag_with_a_color() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag tag =
        Tag.builder()
            .id(1L)
            .tag("method")
            .explanation("uses methodology")
            .color("#FF0000")
            .project(project)
            .build();
    when(projectRepository.findById(eq(1L))).thenReturn(Optional.of(project));
    when(tagRepository.findByProjectIdAndTag(1L, "method")).thenReturn(Optional.empty());
    when(tagRepository.save(any(Tag.class))).thenReturn(tag);

    MvcResult response =
        mockMvc
            .perform(
                post("/api/tags/post?tag=method&explanation=uses+methodology&projectId=1")
                    .param("color", "#FF0000")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<Tag> captor = org.mockito.ArgumentCaptor.forClass(Tag.class);
    verify(tagRepository, times(1)).save(captor.capture());
    assertEquals("#FF0000", captor.getValue().getColor());
    String expectedJson = mapper.writeValueAsString(tag);
    assertEquals(expectedJson, response.getResponse().getContentAsString());
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
                post("/api/tags/post?tag=method&explanation=uses+methodology&projectId=999")
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
  public void post_rejects_duplicate_tag_for_same_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag existingTag =
        Tag.builder().id(1L).tag("method").explanation("existing").project(project).build();
    when(projectRepository.findById(eq(1L))).thenReturn(Optional.of(project));
    when(tagRepository.findByProjectIdAndTag(1L, "method")).thenReturn(Optional.of(existingTag));

    mockMvc
        .perform(
            post("/api/tags/post?tag=method&explanation=uses+methodology&projectId=1").with(csrf()))
        .andExpect(status().isBadRequest());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_list_tags_for_a_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag tag = Tag.builder().id(1L).tag("method").explanation("desc").project(project).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(tagRepository.findByProjectId(1L)).thenReturn(List.of(tag));

    MvcResult response =
        mockMvc
            .perform(get("/api/tags/project?projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    String expectedJson = mapper.writeValueAsString(List.of(tag));
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void list_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(999L)).thenReturn(Optional.empty());

    mockMvc.perform(get("/api/tags/project?projectId=999")).andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_update_a_tag() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag existingTag =
        Tag.builder().id(1L).tag("method").explanation("old").project(project).build();
    when(tagRepository.findById(1L)).thenReturn(Optional.of(existingTag));
    when(tagRepository.findByProjectIdAndTag(1L, "methodology")).thenReturn(Optional.empty());
    when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(
                put("/api/tags?id=1&projectId=1&tag=methodology&explanation=new")
                    .param("color", "#00FF00")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<Tag> captor = org.mockito.ArgumentCaptor.forClass(Tag.class);
    verify(tagRepository, times(1)).save(captor.capture());
    assertEquals("methodology", captor.getValue().getTag());
    assertEquals("new", captor.getValue().getExplanation());
    assertEquals("#00FF00", captor.getValue().getColor());
    String expectedJson = mapper.writeValueAsString(captor.getValue());
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void update_allows_keeping_the_same_tag_name() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag existingTag =
        Tag.builder().id(1L).tag("method").explanation("old").project(project).build();
    when(tagRepository.findById(1L)).thenReturn(Optional.of(existingTag));
    when(tagRepository.findByProjectIdAndTag(1L, "method")).thenReturn(Optional.of(existingTag));
    when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(put("/api/tags?id=1&projectId=1&tag=method&explanation=new").with(csrf()))
        .andExpect(status().isOk());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void update_rejects_duplicate_tag_for_same_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag existingTag =
        Tag.builder().id(1L).tag("method").explanation("old").project(project).build();
    Tag otherTag =
        Tag.builder().id(2L).tag("methodology").explanation("other").project(project).build();
    when(tagRepository.findById(1L)).thenReturn(Optional.of(existingTag));
    when(tagRepository.findByProjectIdAndTag(1L, "methodology")).thenReturn(Optional.of(otherTag));

    mockMvc
        .perform(put("/api/tags?id=1&projectId=1&tag=methodology&explanation=new").with(csrf()))
        .andExpect(status().isBadRequest());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void update_throws_not_found_for_nonexistent_tag() throws Exception {
    when(tagRepository.findById(999L)).thenReturn(Optional.empty());

    mockMvc
        .perform(put("/api/tags?id=999&projectId=1&tag=method&explanation=desc").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_delete_a_tag() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    Tag tag = Tag.builder().id(5L).tag("method").explanation("desc").project(project).build();
    when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));

    mockMvc
        .perform(delete("/api/tags/delete?id=5&projectId=1").with(csrf()))
        .andExpect(status().isOk())
        .andExpect(content().string("Successfully deleted tag."));

    verify(tagRepository, times(1)).delete(tag);
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void delete_throws_not_found_for_nonexistent_tag() throws Exception {
    when(tagRepository.findById(999L)).thenReturn(Optional.empty());

    mockMvc
        .perform(delete("/api/tags/delete?id=999&projectId=1").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "stranger",
      roles = {"RESEARCHER"})
  @Test
  public void non_collaborator_cannot_add_a_tag() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail("stranger@example.org"))
        .thenReturn(List.of());

    mockMvc
        .perform(
            post("/api/tags/post?tag=method&explanation=uses+methodology&projectId=1").with(csrf()))
        .andExpect(status().is(403));
  }
}
