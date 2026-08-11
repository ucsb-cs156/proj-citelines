package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.BibTexConverterService;
import edu.ucsb.cs.citelines.services.DOIService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = BibTexEntriesController.class)
@Import({
  edu.ucsb.cs.citelines.testconfig.TestConfig.class,
  ProjectSecurity.class,
  BibTexConverterService.class,
  DOIService.class
})
public class BibTexEntriesControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;
  @MockitoBean BibTexEntryRepository bibTexEntryRepository;

  private static final String RAW_BIBTEX =
      """
      @article{smith2020,
        author = {Jane Smith},
        title = {A Great Paper}
      }
      """;

  // ---- Authorization tests ----

  @Test
  public void logged_out_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/bibtexentries/post?projectId=1").content(RAW_BIBTEX))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_list() throws Exception {
    mockMvc.perform(get("/api/bibtexentries/project?projectId=1")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_a_single_entry() throws Exception {
    mockMvc
        .perform(get("/api/bibtexentries/entry?projectId=1&citeKey=smith2020"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_export() throws Exception {
    mockMvc
        .perform(get("/api/bibtexentries/export?id=abc&projectId=1"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_put() throws Exception {
    mockMvc
        .perform(put("/api/bibtexentries?id=abc&projectId=1").content(RAW_BIBTEX))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_delete() throws Exception {
    mockMvc
        .perform(delete("/api/bibtexentries/delete?id=abc&projectId=1"))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "stranger",
      roles = {"USER"})
  @Test
  public void a_stranger_cannot_access_a_project_they_dont_own_or_collaborate_on()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail(any())).thenReturn(List.of());

    mockMvc.perform(get("/api/bibtexentries/project?projectId=1")).andExpect(status().is(403));
  }

  @WithMockUser(
      username = "cgaucho",
      roles = {"USER"})
  @Test
  public void a_collaborator_can_list_entries_for_a_project_they_collaborate_on() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    ProjectCollaborator collaborator =
        ProjectCollaborator.builder().id(1L).email("cgaucho@example.org").project(project).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail("cgaucho@example.org"))
        .thenReturn(List.of(collaborator));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of());

    mockMvc.perform(get("/api/bibtexentries/project?projectId=1")).andExpect(status().isOk());
  }

  // ---- Functional tests ----

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_post_bibtex_and_it_is_parsed_and_saved() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(post("/api/bibtexentries/post?projectId=1").content(RAW_BIBTEX).with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> body =
        mapper.readValue(response.getResponse().getContentAsString(), List.class);
    assertEquals(1, body.size());
    assertEquals("smith2020", body.get(0).get("citeKey"));
    assertEquals(1, body.get(0).get("projectId"));

    org.mockito.ArgumentCaptor<List<BibTexEntry>> captor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    verify(bibTexEntryRepository, times(1)).saveAll(captor.capture());
    assertEquals(1, captor.getValue().size());
    assertEquals("Jane Smith", captor.getValue().get(0).getKeyValuePairs().get("author"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void post_with_malformed_bibtex_returns_a_useful_error() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

    MvcResult response =
        mockMvc
            .perform(
                post("/api/bibtexentries/post?projectId=1")
                    .content("@article{smith2020, title = {Missing closing brace")
                    .with(csrf()))
            .andExpect(status().isBadRequest())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertTrue(((String) json.get("message")).startsWith("Could not parse BibTeX:"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_list_entries_for_their_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/project?projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    String expectedJson = mapper.writeValueAsString(List.of(entry));
    assertEquals(expectedJson, response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_a_single_entry_by_citekey() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "smith2020"))
        .thenReturn(Optional.of(entry));

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/entry?projectId=1&citeKey=smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(mapper.writeValueAsString(entry), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void get_single_entry_throws_not_found_for_nonexistent_citekey() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "missing"))
        .thenReturn(Optional.empty());

    mockMvc
        .perform(get("/api/bibtexentries/entry?projectId=1&citeKey=missing"))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_export_an_entry_to_bibtex_text() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(entry));

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/export?id=abc123&projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    String body = response.getResponse().getContentAsString();
    assertTrue(body.contains("@article{smith2020"));
    assertTrue(body.contains("A Great Paper"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void export_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/export?id=missing&projectId=1"))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("BibTexEntry with id missing not found", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_update_an_entry_from_edited_bibtex() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("misc")
            .citeKey("oldkey")
            .keyValuePairs(Map.of("title", "Old Title"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));
    when(bibTexEntryRepository.save(any(BibTexEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(
                put("/api/bibtexentries?id=abc123&projectId=1").content(RAW_BIBTEX).with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<BibTexEntry> captor =
        org.mockito.ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository, times(1)).save(captor.capture());
    assertEquals("abc123", captor.getValue().getId());
    assertEquals("smith2020", captor.getValue().getCiteKey());
    assertEquals("article", captor.getValue().getEntryType());
    assertEquals("Jane Smith", captor.getValue().getKeyValuePairs().get("author"));

    Map<String, Object> json = responseToJson(response);
    assertEquals("smith2020", json.get("citeKey"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void update_rejects_bibtex_text_with_more_than_one_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder().id("abc123").projectId(1).entryType("misc").citeKey("k").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));

    String twoEntries = RAW_BIBTEX + "\n@book{jones2019, title = {A Book}}\n";

    MvcResult response =
        mockMvc
            .perform(
                put("/api/bibtexentries?id=abc123&projectId=1").content(twoEntries).with(csrf()))
            .andExpect(status().isBadRequest())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals(
        "Please provide exactly one BibTeX entry when editing (found 2).", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void update_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    mockMvc
        .perform(put("/api/bibtexentries?id=missing&projectId=1").content(RAW_BIBTEX).with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_delete_an_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry =
        BibTexEntry.builder().id("abc123").projectId(1).entryType("misc").citeKey("k").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(entry));

    MvcResult response =
        mockMvc
            .perform(delete("/api/bibtexentries/delete?id=abc123&projectId=1").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(bibTexEntryRepository, times(1)).delete(entry);
    Map<String, Object> json = responseToJson(response);
    assertEquals("BibTexEntry with id abc123 deleted", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void delete_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    mockMvc
        .perform(delete("/api/bibtexentries/delete?id=missing&projectId=1").with(csrf()))
        .andExpect(status().isNotFound());
  }
}
