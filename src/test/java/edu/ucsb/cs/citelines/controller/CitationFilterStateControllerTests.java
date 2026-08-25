package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationFilterState;
import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CitationFilterStateService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = CitationFilterStateController.class)
@Import({edu.ucsb.cs.citelines.testconfig.TestConfig.class, ProjectSecurity.class})
public class CitationFilterStateControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;
  @MockitoBean BibTexEntryRepository bibTexEntryRepository;
  @MockitoBean CitationFilterStateService citationFilterStateService;

  private static CitationFilterState state(Scope scope, String entryId) {
    return CitationFilterState.builder()
        .id("1:" + scope + ":" + (entryId == null ? "" : entryId))
        .projectId(1)
        .scope(scope)
        .entryId(entryId)
        .expanded(true)
        .relevance(List.of("High"))
        .link("doi")
        .duplicates("dup")
        .search("smith")
        .tagIds(List.of(2L))
        .tagMode("or")
        .build();
  }

  @Test
  public void logged_out_users_cannot_get_citation_filter_state() throws Exception {
    mockMvc
        .perform(get("/api/citationfilterstate?projectId=1&scope=PROJECT"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_post_citation_filter_state() throws Exception {
    mockMvc
        .perform(
            post("/api/citationfilterstate?projectId=1&scope=PROJECT")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "stranger",
      roles = {"USER"})
  @Test
  public void
      a_stranger_cannot_get_citation_filter_state_for_a_project_they_dont_own_or_collaborate_on()
          throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail(any())).thenReturn(List.of());

    mockMvc
        .perform(get("/api/citationfilterstate?projectId=1&scope=PROJECT"))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_the_saved_project_scoped_state() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    CitationFilterState saved = state(Scope.PROJECT, null);
    when(citationFilterStateService.getOrDefault(1, Scope.PROJECT, null)).thenReturn(saved);

    MvcResult response =
        mockMvc
            .perform(get("/api/citationfilterstate?projectId=1&scope=PROJECT"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(mapper.writeValueAsString(saved), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_the_saved_references_scoped_state_for_a_valid_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry = BibTexEntry.builder().id("id-smith2020").projectId(1).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByIdAndProjectId("id-smith2020", 1))
        .thenReturn(Optional.of(entry));
    CitationFilterState saved = state(Scope.REFERENCES, "id-smith2020");
    when(citationFilterStateService.getOrDefault(1, Scope.REFERENCES, "id-smith2020"))
        .thenReturn(saved);

    MvcResult response =
        mockMvc
            .perform(
                get("/api/citationfilterstate?projectId=1&scope=REFERENCES&entryId=id-smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(mapper.writeValueAsString(saved), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void get_throws_not_found_for_a_nonexistent_project() throws Exception {
    when(projectRepository.findById(1L)).thenReturn(Optional.empty());

    mockMvc
        .perform(get("/api/citationfilterstate?projectId=1&scope=PROJECT"))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void get_throws_not_found_for_a_citations_scoped_entry_not_in_the_project()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByIdAndProjectId("missing", 1)).thenReturn(Optional.empty());

    mockMvc
        .perform(get("/api/citationfilterstate?projectId=1&scope=CITATIONS&entryId=missing"))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void get_throws_not_found_when_entryId_is_missing_for_a_non_project_scope()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

    mockMvc
        .perform(get("/api/citationfilterstate?projectId=1&scope=REFERENCES"))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_post_project_scoped_state() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    CitationFilterState saved = state(Scope.PROJECT, null);
    when(citationFilterStateService.save(any())).thenReturn(saved);

    String body =
        "{\"expanded\":true,\"relevance\":[\"High\"],\"link\":\"doi\",\"duplicates\":\"dup\","
            + "\"search\":\"smith\",\"tagIds\":[2],\"tagMode\":\"or\"}";

    MvcResult response =
        mockMvc
            .perform(
                post("/api/citationfilterstate?projectId=1&scope=PROJECT")
                    .contentType("application/json")
                    .content(body)
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(mapper.writeValueAsString(saved), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void post_overwrites_the_projectId_scope_and_entryId_from_the_query_params()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry = BibTexEntry.builder().id("id-smith2020").projectId(1).build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByIdAndProjectId("id-smith2020", 1))
        .thenReturn(Optional.of(entry));
    when(citationFilterStateService.save(any()))
        .thenReturn(state(Scope.REFERENCES, "id-smith2020"));

    // A malicious/stale body claiming a different project/scope/entry -- the query params (which
    // ProjectSecurity actually authorizes against) must win.
    String body =
        "{\"projectId\":99,\"scope\":\"CITATIONS\",\"entryId\":\"someone-elses-entry\","
            + "\"expanded\":false,\"relevance\":[],\"link\":\"all\",\"duplicates\":\"all\","
            + "\"search\":\"\",\"tagIds\":[],\"tagMode\":\"and\"}";

    mockMvc
        .perform(
            post("/api/citationfilterstate?projectId=1&scope=REFERENCES&entryId=id-smith2020")
                .contentType("application/json")
                .content(body)
                .with(csrf()))
        .andExpect(status().isOk());

    ArgumentCaptor<CitationFilterState> captor = ArgumentCaptor.forClass(CitationFilterState.class);
    verify(citationFilterStateService).save(captor.capture());
    assertEquals(1, captor.getValue().getProjectId());
    assertEquals(Scope.REFERENCES, captor.getValue().getScope());
    assertEquals("id-smith2020", captor.getValue().getEntryId());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void post_throws_not_found_for_a_references_scoped_entry_not_in_the_project()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByIdAndProjectId("missing", 1)).thenReturn(Optional.empty());

    mockMvc
        .perform(
            post("/api/citationfilterstate?projectId=1&scope=REFERENCES&entryId=missing")
                .contentType("application/json")
                .content("{}")
                .with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void post_throws_not_found_for_a_nonexistent_project() throws Exception {
    when(projectRepository.findById(1L)).thenReturn(Optional.empty());

    mockMvc
        .perform(
            post("/api/citationfilterstate?projectId=1&scope=PROJECT")
                .contentType("application/json")
                .content("{}")
                .with(csrf()))
        .andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "stranger",
      roles = {"USER"})
  @Test
  public void
      a_stranger_cannot_post_citation_filter_state_for_a_project_they_dont_own_or_collaborate_on()
          throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(projectCollaboratorRepository.findAllByEmail(any())).thenReturn(List.of());

    mockMvc
        .perform(
            post("/api/citationfilterstate?projectId=1&scope=PROJECT")
                .contentType("application/json")
                .content("{}")
                .with(csrf()))
        .andExpect(status().is(403));
  }
}
