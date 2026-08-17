package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.BulkReferenceUploadFromACMDLService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/**
 * Parses a pasted ACM DL References section and adds each reference as a new BibTeX entry cited by
 * the current one, via {@link BulkReferenceUploadFromACMDLService}.
 */
@Builder
public class BulkReferenceUploadFromACMDLJob implements JobContextConsumer {

  private int projectId;
  private String citeKey;
  private String rawHtml;
  private BulkReferenceUploadFromACMDLService bulkReferenceUploadFromACMDLService;

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
    bulkReferenceUploadFromACMDLService.bulkUpload(projectId, citeKey, rawHtml, ctx);
  }
}
