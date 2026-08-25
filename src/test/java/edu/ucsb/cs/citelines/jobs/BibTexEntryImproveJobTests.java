package edu.ucsb.cs.citelines.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.BibTexEntryImproveService;
import edu.ucsb.cs.citelines.services.BibTexEntryImproveService.ImproveScope;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class BibTexEntryImproveJobTests {

  @Test
  void accept_delegates_to_bibtex_entry_improve_service() throws Exception {
    BibTexEntryImproveService bibTexEntryImproveService = mock(BibTexEntryImproveService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    BibTexEntryImproveJob job =
        BibTexEntryImproveJob.builder()
            .projectId(42)
            .scope(ImproveScope.PROJECT)
            .bibTexEntryImproveService(bibTexEntryImproveService)
            .build();

    job.accept(ctx);

    verify(bibTexEntryImproveService).improveEntries(42, ImproveScope.PROJECT, null, ctx);
  }

  @Test
  void accept_passes_through_entry_scope_and_entryId() throws Exception {
    BibTexEntryImproveService bibTexEntryImproveService = mock(BibTexEntryImproveService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    BibTexEntryImproveJob job =
        BibTexEntryImproveJob.builder()
            .projectId(42)
            .scope(ImproveScope.ENTRY)
            .entryId("id-smith2020")
            .bibTexEntryImproveService(bibTexEntryImproveService)
            .build();

    job.accept(ctx);

    verify(bibTexEntryImproveService).improveEntries(42, ImproveScope.ENTRY, "id-smith2020", ctx);
  }

  @Test
  void scope_is_project_scoped() {
    BibTexEntryImproveJob job = BibTexEntryImproveJob.builder().projectId(42).build();
    assertEquals("project", job.getScopeType());
    assertEquals(42L, job.getScopeId());
  }
}
