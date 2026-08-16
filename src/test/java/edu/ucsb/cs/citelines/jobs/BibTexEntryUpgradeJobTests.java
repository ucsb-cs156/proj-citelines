package edu.ucsb.cs.citelines.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import edu.ucsb.cs.citelines.services.BibTexEntryUpgradeService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import org.junit.jupiter.api.Test;

public class BibTexEntryUpgradeJobTests {

  @Test
  void accept_delegates_to_bibtex_entry_upgrade_service() throws Exception {
    BibTexEntryUpgradeService bibTexEntryUpgradeService = mock(BibTexEntryUpgradeService.class);
    JobContext ctx = new JobContext(null, Job.builder().build());

    BibTexEntryUpgradeJob job =
        BibTexEntryUpgradeJob.builder()
            .projectId(42)
            .bibTexEntryUpgradeService(bibTexEntryUpgradeService)
            .build();

    job.accept(ctx);

    verify(bibTexEntryUpgradeService).upgradeEntries(42, ctx);
  }

  @Test
  void scope_is_project_scoped() {
    BibTexEntryUpgradeJob job = BibTexEntryUpgradeJob.builder().projectId(42).build();
    assertEquals("project", job.getScopeType());
    assertEquals(42L, job.getScopeId());
  }
}
