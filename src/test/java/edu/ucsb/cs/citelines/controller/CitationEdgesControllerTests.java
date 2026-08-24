package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.UnresolvedCitation;
import edu.ucsb.cs.citelines.collections.UnresolvedCitationRepository;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CitationEdgeService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = CitationEdgesController.class)
@Import({edu.ucsb.cs.citelines.testconfig.TestConfig.class, ProjectSecurity.class})
public class CitationEdgesControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;
  @MockitoBean CitationEdgeService citationEdgeService;
  @MockitoBean UnresolvedCitationRepository unresolvedCitationRepository;

  @Test
  public void logged_out_users_cannot_get_references() throws Exception {
    mockMvc
        .perform(get("/api/citationedges/references?projectId=1&id=id-smith2020"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_get_citations() throws Exception {
    mockMvc
        .perform(get("/api/citationedges/citations?projectId=1&id=id-smith2020"))
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
        .perform(get("/api/citationedges/references?projectId=1&id=id-smith2020"))
        .andExpect(status().is(403));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_the_references_of_an_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    BibTexEntry citedEntry =
        BibTexEntry.builder().id("id-jones2019").projectId(1).citeKey("jones2019").build();
    when(citationEdgeService.referencesOf(1, "id-smith2020")).thenReturn(List.of(citedEntry));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/references?projectId=1&id=id-smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(citedEntry)),
        response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_the_citations_of_an_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    BibTexEntry citingEntry =
        BibTexEntry.builder().id("id-jones2019").projectId(1).citeKey("jones2019").build();
    when(citationEdgeService.citationsOf(1, "id-smith2020")).thenReturn(List.of(citingEntry));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/citations?projectId=1&id=id-smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(citingEntry)),
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
            .sourceEntryId("id-smith2020")
            .direction("reference")
            .reason("not_found_by_any_resolver")
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

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_get_unresolved_citations_for_a_single_source_entry_id() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    UnresolvedCitation unresolved =
        UnresolvedCitation.builder()
            .id("u1")
            .projectId(1)
            .sourceEntryId("id-smith2020")
            .direction("reference")
            .reason("missing_title")
            .build();
    when(unresolvedCitationRepository.findByProjectIdAndSourceEntryId(1, "id-smith2020"))
        .thenReturn(List.of(unresolved));

    MvcResult response =
        mockMvc
            .perform(get("/api/citationedges/unresolved?projectId=1&sourceEntryId=id-smith2020"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(unresolved)),
        response.getResponse().getContentAsString());
  }
}
