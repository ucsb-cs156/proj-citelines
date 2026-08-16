package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.BibTexEntryUpgradeService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/**
 * Re-resolves each of a project's BibTeX entries that has a DOI, filling in any additional metadata
 * a resolver now reports that the entry doesn't already have, via {@link
 * BibTexEntryUpgradeService}.
 */
@Builder
public class BibTexEntryUpgradeJob implements JobContextConsumer {

  private int projectId;
  private BibTexEntryUpgradeService bibTexEntryUpgradeService;

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
    bibTexEntryUpgradeService.upgradeEntries(projectId, ctx);
  }
}
