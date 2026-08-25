package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.BibTexEntryImproveService;
import edu.ucsb.cs.citelines.services.BibTexEntryImproveService.ImproveScope;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/**
 * Re-resolves whichever of a project's BibTeX entries the given {@link #scope} selects — the whole
 * project, a single entry, or the references/citations of a single entry (see {@link ImproveScope})
 * — filling in any additional metadata a resolver now reports that an entry doesn't already have,
 * via {@link BibTexEntryImproveService}.
 */
@Builder
public class BibTexEntryImproveJob implements JobContextConsumer {

  private int projectId;
  private ImproveScope scope;
  private String entryId;
  private BibTexEntryImproveService bibTexEntryImproveService;

  @Override
  public String getScopeType() {
    return "project";
  }

  @Override
  public Long getScopeId() {
    return (long) projectId;
  }

  @Override
  public void accept(JobContext ctx) throws Exception {
    bibTexEntryImproveService.improveEntries(projectId, scope, entryId, ctx);
  }
}
