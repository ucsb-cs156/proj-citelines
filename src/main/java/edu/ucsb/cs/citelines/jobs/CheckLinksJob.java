package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.CheckLinksService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/**
 * Scans all BibTeX entries in a project and flags entries whose DOI/URL link looks broken, via
 * {@link CheckLinksService}.
 */
@Builder
public class CheckLinksJob implements JobContextConsumer {

  private int projectId;
  private CheckLinksService checkLinksService;

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
    checkLinksService.checkLinks(projectId, ctx);
  }
}
