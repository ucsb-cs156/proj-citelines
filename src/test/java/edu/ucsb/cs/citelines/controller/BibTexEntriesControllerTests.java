package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
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
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import edu.ucsb.cs.citelines.errors.DoiNotFoundException;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.BibTexConverterService;
import edu.ucsb.cs.citelines.services.DOIService;
import edu.ucsb.cs.citelines.services.DoiToBibTexService;
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
  DOIService.class,
  edu.ucsb.cs.citelines.services.BibTexEntryCoalescingService.class,
  edu.ucsb.cs.citelines.services.CitationFormattingService.class
})
public class BibTexEntriesControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;
  @MockitoBean BibTexEntryRepository bibTexEntryRepository;
  @MockitoBean CitationEdgeRepository citationEdgeRepository;
  @MockitoBean DoiToBibTexService doiToBibTexService;

  private static final String RAW_BIBTEX =
      """
      @article{smith2020,
        author = {Jane Smith},
        title = {A Great Paper}
      }
      """;

  // Simulates real Spring Data MongoDB behavior: saveAll() assigns a generated id back onto each
  // entity that doesn't already have one, which makeCitationEdge relies on for a newly created
  // entry's side of the edge.
  private static List<BibTexEntry> assignIds(org.mockito.invocation.InvocationOnMock invocation) {
    List<BibTexEntry> entries = invocation.getArgument(0);
    entries.forEach(
        entry -> {
          if (entry.getId() == null) {
            entry.setId("generated-" + entry.getCiteKey());
          }
        });
    return entries;
  }

  // ---- Authorization tests ----

  @Test
  public void logged_out_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/bibtexentries/post?projectId=1").content(RAW_BIBTEX))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_post_by_doi() throws Exception {
    mockMvc
        .perform(
            post("/api/bibtexentries/postByDoi?projectId=1").content("10.1038/s41586-020-2649-2"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_list() throws Exception {
    mockMvc.perform(get("/api/bibtexentries/project?projectId=1")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_a_single_entry() throws Exception {
    mockMvc
        .perform(get("/api/bibtexentries/entry?projectId=1&id=abc123"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_export() throws Exception {
    mockMvc
        .perform(get("/api/bibtexentries/export?id=abc&projectId=1"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_a_formatted_citation() throws Exception {
    mockMvc
        .perform(get("/api/bibtexentries/formatted?id=abc&projectId=1"))
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

  @Test
  public void logged_out_users_cannot_upsert_a_comments_draft() throws Exception {
    mockMvc
        .perform(put("/api/bibtexentries/comments/draft?id=abc&projectId=1").content("draft"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_save_a_comments_draft() throws Exception {
    mockMvc
        .perform(post("/api/bibtexentries/comments/save?id=abc&projectId=1"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_discard_a_comments_draft() throws Exception {
    mockMvc
        .perform(delete("/api/bibtexentries/comments/draft?id=abc&projectId=1"))
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
  public void owner_can_post_bibtex_as_a_reference_and_it_creates_a_citation_edge()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(BibTexEntriesControllerTests::assignIds);

    mockMvc
        .perform(
            post("/api/bibtexentries/post?projectId=1&relatedEntryId=id-paper2021"
                    + "&relationship=reference")
                .content(RAW_BIBTEX)
                .with(csrf()))
        .andExpect(status().isOk());

    org.mockito.ArgumentCaptor<CitationEdge> captor =
        org.mockito.ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository, times(1)).save(captor.capture());
    assertEquals("id-paper2021", captor.getValue().getCitingEntryId());
    assertEquals("generated-smith2020", captor.getValue().getCitedEntryId());
    assertEquals(1, captor.getValue().getProjectId());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_post_bibtex_as_a_citation_and_it_creates_a_citation_edge()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(BibTexEntriesControllerTests::assignIds);

    mockMvc
        .perform(
            post("/api/bibtexentries/post?projectId=1&relatedEntryId=id-paper2021"
                    + "&relationship=citation")
                .content(RAW_BIBTEX)
                .with(csrf()))
        .andExpect(status().isOk());

    org.mockito.ArgumentCaptor<CitationEdge> captor =
        org.mockito.ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository, times(1)).save(captor.capture());
    assertEquals("generated-smith2020", captor.getValue().getCitingEntryId());
    assertEquals("id-paper2021", captor.getValue().getCitedEntryId());
    assertEquals(1, captor.getValue().getProjectId());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void posting_bibtex_without_relatedEntryId_or_relationship_does_not_create_an_edge()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(post("/api/bibtexentries/post?projectId=1").content(RAW_BIBTEX).with(csrf()))
        .andExpect(status().isOk());

    verify(citationEdgeRepository, times(0)).save(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void posting_bibtex_with_relatedEntryId_but_no_relationship_does_not_create_an_edge()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(
            post("/api/bibtexentries/post?projectId=1&relatedEntryId=id-paper2021")
                .content(RAW_BIBTEX)
                .with(csrf()))
        .andExpect(status().isOk());

    verify(citationEdgeRepository, times(0)).save(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void
      posting_bibtex_that_matches_an_existing_citeKey_updates_it_instead_of_creating_a_duplicate()
          throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("existing-id")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("author", "Someone Else"))
            .build();
    when(bibTexEntryRepository.findAllByProjectIdAndCiteKey(1, "smith2020"))
        .thenReturn(List.of(existing));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(
            post("/api/bibtexentries/post?projectId=1&relatedEntryId=id-paper2021"
                    + "&relationship=citation")
                .content(RAW_BIBTEX)
                .with(csrf()))
        .andExpect(status().isOk());

    org.mockito.ArgumentCaptor<List<BibTexEntry>> captor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    verify(bibTexEntryRepository, times(1)).saveAll(captor.capture());
    assertEquals(1, captor.getValue().size());
    assertEquals("existing-id", captor.getValue().get(0).getId());
    verify(bibTexEntryRepository, times(0)).deleteAll(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void
      posting_bibtex_that_matches_multiple_existing_duplicates_coalesces_them_before_updating()
          throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    BibTexEntry existing1 =
        BibTexEntry.builder()
            .id("existing-id-1")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("CITELINES_relevance", "low"))
            .build();
    BibTexEntry existing2 =
        BibTexEntry.builder()
            .id("existing-id-2")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("CITELINES_relevance", "high"))
            .build();
    when(bibTexEntryRepository.findAllByProjectIdAndCiteKey(1, "smith2020"))
        .thenReturn(List.of(existing1, existing2));
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(post("/api/bibtexentries/post?projectId=1").content(RAW_BIBTEX).with(csrf()))
        .andExpect(status().isOk());

    org.mockito.ArgumentCaptor<List<BibTexEntry>> saveCaptor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    verify(bibTexEntryRepository, times(1)).saveAll(saveCaptor.capture());
    assertEquals("existing-id-1", saveCaptor.getValue().get(0).getId());

    org.mockito.ArgumentCaptor<List<BibTexEntry>> deleteCaptor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    verify(bibTexEntryRepository, times(1)).deleteAll(deleteCaptor.capture());
    assertEquals(List.of(existing2), deleteCaptor.getValue());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void posting_bibtex_with_an_invalid_relationship_returns_a_bad_request() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

    mockMvc
        .perform(
            post("/api/bibtexentries/post?projectId=1&relatedEntryId=id-paper2021"
                    + "&relationship=bogus")
                .content(RAW_BIBTEX)
                .with(csrf()))
        .andExpect(status().isBadRequest());

    verify(citationEdgeRepository, times(0)).save(any());
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
  public void owner_can_get_a_single_entry_by_id() throws Exception {
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
            .perform(get("/api/bibtexentries/entry?projectId=1&id=abc123"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(mapper.writeValueAsString(entry), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_a_single_entry_by_id_when_citekey_contains_a_slash() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("inproceedings")
            .citeKey("10.1145/3770762.3772609")
            .keyValuePairs(Map.of("title", "A Pedagogy for Assessing"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(entry));

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/entry?projectId=1&id=abc123"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(mapper.writeValueAsString(entry), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void get_single_entry_throws_not_found_for_nonexistent_id() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    mockMvc
        .perform(get("/api/bibtexentries/entry?projectId=1&id=missing"))
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
  public void owner_can_get_a_formatted_citation_using_the_projects_citation_format()
      throws Exception {
    Project project =
        Project.builder().id(1L).owner("phtcon@example.org").citationFormat("APA").build();
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(
                Map.of(
                    "author", "Jane Smith",
                    "title", "A Great Paper",
                    "journal", "Journal of Testing",
                    "year", "2020"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(entry));

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/formatted?id=abc123&projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        "Smith, J. (2020). A Great Paper. Journal of Testing.",
        response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void formatted_citation_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/formatted?id=missing&projectId=1"))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("BibTexEntry with id missing not found", json.get("message"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void formatted_citation_throws_not_found_for_nonexistent_project() throws Exception {
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(entry));
    when(projectRepository.findById(1L)).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(get("/api/bibtexentries/formatted?id=abc123&projectId=1"))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Project with id 1 not found", json.get("message"));
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

  // ---- Comments draft tests ----

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_create_a_comments_draft_when_the_entry_has_no_keyValuePairs_at_all()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing = BibTexEntry.builder().id("abc123").projectId(1).citeKey("k").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));
    when(bibTexEntryRepository.save(any(BibTexEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    mockMvc
        .perform(
            put("/api/bibtexentries/comments/draft?id=abc123&projectId=1")
                .content("Draft *markdown*")
                .with(csrf()))
        .andExpect(status().isOk());

    org.mockito.ArgumentCaptor<BibTexEntry> captor =
        org.mockito.ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository, times(1)).save(captor.capture());
    assertEquals(
        "Draft *markdown*", captor.getValue().getKeyValuePairs().get("CITELINES_comments_draft"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_overwrite_an_existing_comments_draft_leaving_comments_untouched()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .citeKey("k")
            .keyValuePairs(
                new java.util.HashMap<>(
                    Map.of(
                        "CITELINES_comments", "Published text",
                        "CITELINES_comments_draft", "Old draft")))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));
    when(bibTexEntryRepository.save(any(BibTexEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(
                put("/api/bibtexentries/comments/draft?id=abc123&projectId=1")
                    .content("New draft text")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<BibTexEntry> captor =
        org.mockito.ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository, times(1)).save(captor.capture());
    assertEquals(
        "New draft text", captor.getValue().getKeyValuePairs().get("CITELINES_comments_draft"));
    assertEquals("Published text", captor.getValue().getKeyValuePairs().get("CITELINES_comments"));

    Map<String, Object> json = responseToJson(response);
    @SuppressWarnings("unchecked")
    Map<String, Object> keyValuePairs = (Map<String, Object>) json.get("keyValuePairs");
    assertEquals("New draft text", keyValuePairs.get("CITELINES_comments_draft"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void upsert_comments_draft_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    mockMvc
        .perform(
            put("/api/bibtexentries/comments/draft?id=missing&projectId=1")
                .content("text")
                .with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_save_a_comments_draft_promoting_it_to_comments() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .citeKey("k")
            .keyValuePairs(
                new java.util.HashMap<>(
                    Map.of(
                        "CITELINES_comments", "Old published text",
                        "CITELINES_comments_draft", "Ready to publish")))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));
    when(bibTexEntryRepository.save(any(BibTexEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(post("/api/bibtexentries/comments/save?id=abc123&projectId=1").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<BibTexEntry> captor =
        org.mockito.ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository, times(1)).save(captor.capture());
    assertEquals(
        "Ready to publish", captor.getValue().getKeyValuePairs().get("CITELINES_comments"));
    assertTrue(!captor.getValue().getKeyValuePairs().containsKey("CITELINES_comments_draft"));

    Map<String, Object> json = responseToJson(response);
    @SuppressWarnings("unchecked")
    Map<String, Object> keyValuePairs = (Map<String, Object>) json.get("keyValuePairs");
    assertEquals("Ready to publish", keyValuePairs.get("CITELINES_comments"));
    assertTrue(!keyValuePairs.containsKey("CITELINES_comments_draft"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void saving_a_comments_draft_that_does_not_exist_returns_a_bad_request() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .citeKey("k")
            .keyValuePairs(Map.of("CITELINES_comments", "Already published"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));

    MvcResult response =
        mockMvc
            .perform(post("/api/bibtexentries/comments/save?id=abc123&projectId=1").with(csrf()))
            .andExpect(status().isBadRequest())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Entry abc123 has no draft comments to save.", json.get("message"));
    verify(bibTexEntryRepository, times(0)).save(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void save_comments_draft_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    mockMvc
        .perform(post("/api/bibtexentries/comments/save?id=missing&projectId=1").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_discard_a_comments_draft_leaving_comments_in_place() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .citeKey("k")
            .keyValuePairs(
                new java.util.HashMap<>(
                    Map.of(
                        "CITELINES_comments", "Published text",
                        "CITELINES_comments_draft", "Abandoned draft")))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));
    when(bibTexEntryRepository.save(any(BibTexEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(delete("/api/bibtexentries/comments/draft?id=abc123&projectId=1").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<BibTexEntry> captor =
        org.mockito.ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository, times(1)).save(captor.capture());
    assertEquals("Published text", captor.getValue().getKeyValuePairs().get("CITELINES_comments"));
    assertTrue(!captor.getValue().getKeyValuePairs().containsKey("CITELINES_comments_draft"));

    Map<String, Object> json = responseToJson(response);
    @SuppressWarnings("unchecked")
    Map<String, Object> keyValuePairs = (Map<String, Object>) json.get("keyValuePairs");
    assertEquals("Published text", keyValuePairs.get("CITELINES_comments"));
    assertTrue(!keyValuePairs.containsKey("CITELINES_comments_draft"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void discarding_a_comments_draft_that_does_not_exist_returns_a_bad_request()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existing =
        BibTexEntry.builder()
            .id("abc123")
            .projectId(1)
            .citeKey("k")
            .keyValuePairs(Map.of("CITELINES_comments", "Published text"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("abc123")).thenReturn(Optional.of(existing));

    MvcResult response =
        mockMvc
            .perform(delete("/api/bibtexentries/comments/draft?id=abc123&projectId=1").with(csrf()))
            .andExpect(status().isBadRequest())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Entry abc123 has no draft comments to discard.", json.get("message"));
    verify(bibTexEntryRepository, times(0)).save(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void discard_comments_draft_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findById("missing")).thenReturn(Optional.empty());

    mockMvc
        .perform(delete("/api/bibtexentries/comments/draft?id=missing&projectId=1").with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_post_a_citation_via_doi_and_it_is_resolved_and_saved() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(doiToBibTexService.findExistingEntryForDoi("10.1038/s41586-020-2649-2", 1))
        .thenReturn(Optional.empty());
    when(doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, "High"))
        .thenReturn(RAW_BIBTEX);
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    MvcResult response =
        mockMvc
            .perform(
                post("/api/bibtexentries/postByDoi?projectId=1&relevance=High")
                    .content("10.1038/s41586-020-2649-2")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> body =
        mapper.readValue(response.getResponse().getContentAsString(), List.class);
    assertEquals(1, body.size());
    assertEquals("smith2020", body.get(0).get("citeKey"));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void posting_an_unresolvable_doi_returns_not_found_and_saves_nothing() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(doiToBibTexService.findExistingEntryForDoi("10.9999/nonexistent", 1))
        .thenReturn(Optional.empty());
    when(doiToBibTexService.resolveToBibTex("10.9999/nonexistent", 1, null))
        .thenThrow(new DoiNotFoundException("10.9999/nonexistent"));

    MvcResult response =
        mockMvc
            .perform(
                post("/api/bibtexentries/postByDoi?projectId=1")
                    .content("10.9999/nonexistent")
                    .with(csrf()))
            .andExpect(status().isNotFound())
            .andReturn();

    Map<String, Object> json = responseToJson(response);
    assertEquals("Could not find a citation for DOI: 10.9999/nonexistent", json.get("message"));
    verify(bibTexEntryRepository, times(0)).saveAll(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void posting_a_doi_that_already_has_an_entry_links_to_it_instead_of_creating_a_duplicate()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existingEntry =
        BibTexEntry.builder()
            .id("existing-id")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("doi", "10.1038/s41586-020-2649-2"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(doiToBibTexService.findExistingEntryForDoi("10.1038/s41586-020-2649-2", 1))
        .thenReturn(Optional.of(existingEntry));

    MvcResult response =
        mockMvc
            .perform(
                post("/api/bibtexentries/postByDoi?projectId=1&relatedEntryId=id-paper2021"
                        + "&relationship=citation")
                    .content("10.1038/s41586-020-2649-2")
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> body =
        mapper.readValue(response.getResponse().getContentAsString(), List.class);
    assertEquals(1, body.size());
    assertEquals("smith2020", body.get(0).get("citeKey"));

    verify(doiToBibTexService, never()).resolveToBibTex(anyString(), anyInt(), any());
    verify(bibTexEntryRepository, never()).saveAll(any());
    org.mockito.ArgumentCaptor<CitationEdge> edgeCaptor =
        org.mockito.ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository, times(1)).save(edgeCaptor.capture());
    assertEquals("existing-id", edgeCaptor.getValue().getCitingEntryId());
    assertEquals("id-paper2021", edgeCaptor.getValue().getCitedEntryId());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void
      posting_a_doi_that_already_has_an_entry_with_no_relationship_just_returns_it_and_saves_no_edge()
          throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existingEntry =
        BibTexEntry.builder()
            .id("existing-id")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("doi", "10.1038/s41586-020-2649-2"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(doiToBibTexService.findExistingEntryForDoi("10.1038/s41586-020-2649-2", 1))
        .thenReturn(Optional.of(existingEntry));

    mockMvc
        .perform(
            post("/api/bibtexentries/postByDoi?projectId=1")
                .content("10.1038/s41586-020-2649-2")
                .with(csrf()))
        .andExpect(status().isOk());

    verify(doiToBibTexService, never()).resolveToBibTex(anyString(), anyInt(), any());
    verify(citationEdgeRepository, never()).save(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void
      posting_a_doi_that_already_has_an_entry_with_only_a_relatedEntryId_and_no_relationship_saves_no_edge()
          throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry existingEntry =
        BibTexEntry.builder()
            .id("existing-id")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("doi", "10.1038/s41586-020-2649-2"))
            .build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(doiToBibTexService.findExistingEntryForDoi("10.1038/s41586-020-2649-2", 1))
        .thenReturn(Optional.of(existingEntry));

    mockMvc
        .perform(
            post("/api/bibtexentries/postByDoi?projectId=1&relatedEntryId=id-paper2021")
                .content("10.1038/s41586-020-2649-2")
                .with(csrf()))
        .andExpect(status().isOk());

    verify(citationEdgeRepository, never()).save(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void posting_by_doi_with_an_invalid_relationship_returns_a_bad_request() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

    mockMvc
        .perform(
            post("/api/bibtexentries/postByDoi?projectId=1&relatedEntryId=id-paper2021"
                    + "&relationship=bogus")
                .content("10.1038/s41586-020-2649-2")
                .with(csrf()))
        .andExpect(status().isBadRequest());

    verify(doiToBibTexService, never()).findExistingEntryForDoi(anyString(), anyInt());
    verify(citationEdgeRepository, never()).save(any());
  }
}
