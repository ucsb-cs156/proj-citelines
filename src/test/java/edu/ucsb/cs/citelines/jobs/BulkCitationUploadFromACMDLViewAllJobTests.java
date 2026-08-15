package edu.ucsb.cs.citelines.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.BulkCitationUploadFromACMDLViewAllService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class BulkCitationUploadFromACMDLViewAllJobTests {

  @Test
  void accept_delegates_to_bulk_citation_upload_service() throws Exception {
    BulkCitationUploadFromACMDLViewAllService service =
        mock(BulkCitationUploadFromACMDLViewAllService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    BulkCitationUploadFromACMDLViewAllJob job =
        BulkCitationUploadFromACMDLViewAllJob.builder()
            .projectId(42)
            .citeKey("smith2020")
            .rawText("pasted text")
            .bulkCitationUploadFromACMDLViewAllService(service)
            .build();

    job.accept(ctx);

    verify(service).bulkUpload(42, "smith2020", "pasted text", ctx);
  }

  @Test
  void scope_is_project_scoped() {
    BulkCitationUploadFromACMDLViewAllJob job =
        BulkCitationUploadFromACMDLViewAllJob.builder().projectId(42).build();
    assertEquals("project", job.getScopeType());
    assertEquals(42L, job.getScopeId());
  }
}
