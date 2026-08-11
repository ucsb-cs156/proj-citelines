package edu.ucsb.cs.citelines.jobs;

import edu.ucsb.cs.citelines.services.CitationGraphService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import lombok.Builder;

/** Fetches (and saves) the papers a given BibTeX entry cites, via {@link CitationGraphService}. */
@Builder
public class GetReferencesJob implements JobContextConsumer {

  private int projectId;
  private String citeKey;
  private CitationGraphService citationGraphService;

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
    citationGraphService.fetchReferences(projectId, citeKey, ctx);
  }
}
