package edu.ucsb.cs.citelines.jobs;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.CitationGraphService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class GetCitationsJobTests {

  @Test
  void accept_delegates_to_citation_graph_service() throws Exception {
    CitationGraphService citationGraphService = mock(CitationGraphService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    GetCitationsJob job =
        GetCitationsJob.builder()
            .projectId(42)
            .citeKey("harris2020")
            .citationGraphService(citationGraphService)
            .build();

    job.accept(ctx);

    verify(citationGraphService).fetchCitations(42, "harris2020", ctx);
  }

  @Test
  void scope_is_project_scoped() {
    GetCitationsJob job = GetCitationsJob.builder().projectId(42).build();
    org.junit.jupiter.api.Assertions.assertEquals("project", job.getScopeType());
    org.junit.jupiter.api.Assertions.assertEquals(42L, job.getScopeId());
  }
}
