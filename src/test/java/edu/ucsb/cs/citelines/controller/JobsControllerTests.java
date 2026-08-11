package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.config.ProjectSecurity;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.jobs.GetCitationsJob;
import edu.ucsb.cs.citelines.jobs.GetReferencesJob;
import edu.ucsb.cs.citelines.repository.ProjectCollaboratorRepository;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.services.CitationGraphService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.repositories.JobsRepository;
import edu.ucsb.cs156.jobs.services.JobService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = JobsController.class)
@Import({edu.ucsb.cs.citelines.testconfig.TestConfig.class, ProjectSecurity.class})
public class JobsControllerTests extends ControllerTestCase {

  @MockitoBean ProjectRepository projectRepository;
  @MockitoBean ProjectCollaboratorRepository projectCollaboratorRepository;
  @MockitoBean BibTexEntryRepository bibTexEntryRepository;
  @MockitoBean JobsRepository jobsRepository;
  @MockitoBean JobService jobService;
  @MockitoBean CitationGraphService citationGraphService;

  @Test
  public void logged_out_users_cannot_list_jobs_by_project() throws Exception {
    mockMvc.perform(get("/api/jobs/project?projectId=1")).andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_launch_getReferences() throws Exception {
    mockMvc
        .perform(post("/api/jobs/launch/getReferences?projectId=1&citeKey=smith2020"))
        .andExpect(status().is(403));
  }

  @Test
  public void logged_out_users_cannot_launch_getCitations() throws Exception {
    mockMvc
        .perform(post("/api/jobs/launch/getCitations?projectId=1&citeKey=smith2020"))
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

    mockMvc.perform(get("/api/jobs/project?projectId=1")).andExpect(status().is(403));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_list_jobs_for_their_project() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    Job job =
        Job.builder().id(9L).jobName("GetReferencesJob").scopeType("project").scopeId(1L).build();
    when(jobsRepository.findByScopeTypeAndScopeIdOrderByIdDesc("project", 1L))
        .thenReturn(List.of(job));

    MvcResult response =
        mockMvc
            .perform(get("/api/jobs/project?projectId=1"))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(List.of(job)), response.getResponse().getContentAsString());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void list_jobs_throws_not_found_for_nonexistent_project() throws Exception {
    when(projectRepository.findById(1L)).thenReturn(Optional.empty());

    mockMvc.perform(get("/api/jobs/project?projectId=1")).andExpect(status().isNotFound());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_launch_a_getReferences_job() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry = BibTexEntry.builder().id("id1").projectId(1).citeKey("smith2020").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "smith2020"))
        .thenReturn(Optional.of(entry));
    Job launchedJob = Job.builder().id(10L).jobName("GetReferencesJob").build();
    when(jobService.runAsJob(any(GetReferencesJob.class))).thenReturn(launchedJob);

    MvcResult response =
        mockMvc
            .perform(
                post("/api/jobs/launch/getReferences?projectId=1&citeKey=smith2020").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(launchedJob), response.getResponse().getContentAsString());
    verify(jobService, times(1)).runAsJob(any(GetReferencesJob.class));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void launch_getReferences_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "missing"))
        .thenReturn(Optional.empty());

    mockMvc
        .perform(post("/api/jobs/launch/getReferences?projectId=1&citeKey=missing").with(csrf()))
        .andExpect(status().isNotFound());

    verify(jobService, times(0)).runAsJob(any());
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void owner_can_launch_a_getCitations_job() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    BibTexEntry entry = BibTexEntry.builder().id("id1").projectId(1).citeKey("smith2020").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "smith2020"))
        .thenReturn(Optional.of(entry));
    Job launchedJob = Job.builder().id(11L).jobName("GetCitationsJob").build();
    when(jobService.runAsJob(any(GetCitationsJob.class))).thenReturn(launchedJob);

    MvcResult response =
        mockMvc
            .perform(
                post("/api/jobs/launch/getCitations?projectId=1&citeKey=smith2020").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    assertEquals(
        mapper.writeValueAsString(launchedJob), response.getResponse().getContentAsString());
    verify(jobService, times(1)).runAsJob(any(GetCitationsJob.class));
  }

  @WithMockUser(
      username = "phtcon",
      roles = {"RESEARCHER"})
  @Test
  public void launch_getCitations_throws_not_found_for_nonexistent_entry() throws Exception {
    Project project = Project.builder().id(1L).owner("phtcon@example.org").build();
    when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "missing"))
        .thenReturn(Optional.empty());

    mockMvc
        .perform(post("/api/jobs/launch/getCitations?projectId=1&citeKey=missing").with(csrf()))
        .andExpect(status().isNotFound());

    verify(jobService, times(0)).runAsJob(any());
  }
}
