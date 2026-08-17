package edu.ucsb.cs.citelines.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.BulkReferenceUploadFromACMDLService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class BulkReferenceUploadFromACMDLJobTests {

  @Test
  void accept_delegates_to_bulk_reference_upload_service() throws Exception {
    BulkReferenceUploadFromACMDLService service = mock(BulkReferenceUploadFromACMDLService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    BulkReferenceUploadFromACMDLJob job =
        BulkReferenceUploadFromACMDLJob.builder()
            .projectId(42)
            .citeKey("smith2020")
            .rawHtml("<section id=\"bibliography\"></section>")
            .bulkReferenceUploadFromACMDLService(service)
            .build();

    job.accept(ctx);

    verify(service).bulkUpload(42, "smith2020", "<section id=\"bibliography\"></section>", ctx);
  }

  @Test
  void scope_is_project_scoped() {
    BulkReferenceUploadFromACMDLJob job =
        BulkReferenceUploadFromACMDLJob.builder().projectId(42).build();
    assertEquals("project", job.getScopeType());
    assertEquals(42L, job.getScopeId());
  }
}
