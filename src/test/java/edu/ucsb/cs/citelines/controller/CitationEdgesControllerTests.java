package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import edu.ucsb.cs.citelines.collections.UnresolvedCitation;
import edu.ucsb.cs.citelines.collections.UnresolvedCitationRepository;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = CitationEdgesController.class)
@Import({
  edu.ucsb.cs.citelines.testconfig.TestConfig.class,
  ProjectSecurity.class,
  edu.ucsb.cs.citelines.services.BibTexEntryCoalescingService.class
})
public class CitationEdgesControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;
  @MockitoBean CitationEdgeRepository citationEdgeRepository;
  @MockitoBean BibTexEntryRepository bibTexEntryRepository;
  @MockitoBean UnresolvedCitationRepository unresolvedCitationRepository;

  @Test
  public void logged_out_users_cannot_get_references() throws Exception {
    mockMvc
        .perform(get("/api/citationedges/references?projectId=1&citeKey=smith2020"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_citations() throws Exception {
    mockMvc
        .perform(get("/api/citationedges/citations?projectId=1&citeKey=smith2020"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_unresolved() throws Exception {
    mockMvc.perform(get("/api/citationedges/unresolved?projectId=1")).andExpect(status().is(403));
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

    mockMvc
        .perform(get("/api/citationedges/references?projectId=1&citeKey=smith2020"))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_the_references_of_an_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:smith2020:jones2019")
            .projectId(1)
            .citingCiteKey("smith2020")
            .citedCiteKey("jones2019")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitingCiteKey(1, "smith2020"))
        .thenReturn(List.of(edge));
    BibTexEntry citedEntry =
        BibTexEntry.builder().id("id1").projectId(1).citeKey("jones2019").build();
    when(bibTexEntryRepository.findAllByProjectIdAndCiteKey(1, "jones2019"))
        .thenReturn(List.of(citedEntry));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/references?projectId=1&citeKey=smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(citedEntry)),
        response.getResponse().getContentAsString());
    org.mockito.Mockito.verify(bibTexEntryRepository, org.mockito.Mockito.never()).deleteAll(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void references_skips_edges_whose_cited_entry_no_longer_exists() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:smith2020:deleted2019")
            .projectId(1)
            .citingCiteKey("smith2020")
            .citedCiteKey("deleted2019")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitingCiteKey(1, "smith2020"))
        .thenReturn(List.of(edge));
    when(bibTexEntryRepository.findAllByProjectIdAndCiteKey(1, "deleted2019"))
        .thenReturn(List.of());

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/references?projectId=1&citeKey=smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals("[]", response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_the_citations_of_an_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:jones2019:smith2020")
            .projectId(1)
            .citingCiteKey("jones2019")
            .citedCiteKey("smith2020")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitedCiteKey(1, "smith2020"))
        .thenReturn(List.of(edge));
    BibTexEntry citingEntry =
        BibTexEntry.builder().id("id1").projectId(1).citeKey("jones2019").build();
    when(bibTexEntryRepository.findAllByProjectIdAndCiteKey(1, "jones2019"))
        .thenReturn(List.of(citingEntry));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/citations?projectId=1&citeKey=smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(citingEntry)),
        response.getResponse().getContentAsString());
    org.mockito.Mockito.verify(bibTexEntryRepository, org.mockito.Mockito.never()).deleteAll(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void citations_coalesces_duplicate_entries_for_the_same_citeKey_instead_of_erroring_out()
      throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:jones2019:smith2020")
            .projectId(1)
            .citingCiteKey("jones2019")
            .citedCiteKey("smith2020")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitedCiteKey(1, "smith2020"))
        .thenReturn(List.of(edge));
    BibTexEntry duplicate1 =
        BibTexEntry.builder()
            .id("id1")
            .projectId(1)
            .citeKey("jones2019")
            .keyValuePairs(java.util.Map.of("CITELINES_relevance", "low"))
            .build();
    BibTexEntry duplicate2 =
        BibTexEntry.builder()
            .id("id2")
            .projectId(1)
            .citeKey("jones2019")
            .keyValuePairs(java.util.Map.of("CITELINES_relevance", "high"))
            .build();
    when(bibTexEntryRepository.findAllByProjectIdAndCiteKey(1, "jones2019"))
        .thenReturn(List.of(duplicate1, duplicate2));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/citations?projectId=1&citeKey=smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    org.mockito.ArgumentCaptor<List<BibTexEntry>> captor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    org.mockito.Mockito.verify(bibTexEntryRepository).deleteAll(captor.capture());
    assertEquals(List.of(duplicate2), captor.getValue());
    assertEquals(
        mapper.writeValueAsString(List.of(duplicate1)),
        response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_unresolved_citations_for_a_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    UnresolvedCitation unresolved =
        UnresolvedCitation.builder()
            .id("u1")
            .projectId(1)
            .sourceCiteKey("smith2020")
            .direction("reference")
            .reason("not_found_in_openalex")
            .build();
    when(unresolvedCitationRepository.findByProjectId(1)).thenReturn(List.of(unresolved));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/unresolved?projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(unresolved)),
        response.getResponse().getContentAsString());
  }
}
