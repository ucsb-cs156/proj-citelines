package edu.ucsb.cs.citelines.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.DuplicateDetectionService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class DuplicateDetectionJobTests {

  @Test
  void accept_delegates_to_duplicate_detection_service() throws Exception {
    DuplicateDetectionService duplicateDetectionService = mock(DuplicateDetectionService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    DuplicateDetectionJob job =
        DuplicateDetectionJob.builder()
            .projectId(42)
            .duplicateDetectionService(duplicateDetectionService)
            .build();

    job.accept(ctx);

    verify(duplicateDetectionService).detectDuplicates(42, ctx);
  }

  @Test
  void scope_is_project_scoped() {
    DuplicateDetectionJob job = DuplicateDetectionJob.builder().projectId(42).build();
    assertEquals("project", job.getScopeType());
    assertEquals(42L, job.getScopeId());
  }
}
