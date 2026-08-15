package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.BulkCitationUploadFromACMDLViewAllService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/**
 * Parses a pasted ACM DL "Cited By &gt; View All" page and adds each citing paper as a new BibTeX
 * entry citing the current one, via {@link BulkCitationUploadFromACMDLViewAllService}.
 */
@Builder
public class BulkCitationUploadFromACMDLViewAllJob implements JobContextConsumer {

  private int projectId;
  private String citeKey;
  private String rawText;
  private BulkCitationUploadFromACMDLViewAllService bulkCitationUploadFromACMDLViewAllService;

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
    bulkCitationUploadFromACMDLViewAllService.bulkUpload(projectId, citeKey, rawText, ctx);
  }
}
