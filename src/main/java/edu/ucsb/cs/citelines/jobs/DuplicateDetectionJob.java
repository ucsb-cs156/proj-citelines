package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.DuplicateDetectionService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/**
 * Scans all BibTeX entries in a project for likely duplicates and marks them for manual review, via
 * {@link DuplicateDetectionService}.
 */
@Builder
public class DuplicateDetectionJob implements JobContextConsumer {

  private int projectId;
  private DuplicateDetectionService duplicateDetectionService;

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
    duplicateDetectionService.detectDuplicates(projectId, ctx);
  }
}
