package edu.ucsb.cs.citelines.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.CheckLinksService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class CheckLinksJobTests {

  @Test
  void accept_delegates_to_check_links_service() throws Exception {
    CheckLinksService checkLinksService = mock(CheckLinksService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    CheckLinksJob job =
        CheckLinksJob.builder().projectId(42).checkLinksService(checkLinksService).build();

    job.accept(ctx);

    verify(checkLinksService).checkLinks(42, ctx);
  }

  @Test
  void scope_is_project_scoped() {
    CheckLinksJob job = CheckLinksJob.builder().projectId(42).build();
    assertEquals("project", job.getScopeType());
    assertEquals(42L, job.getScopeId());
  }
}
