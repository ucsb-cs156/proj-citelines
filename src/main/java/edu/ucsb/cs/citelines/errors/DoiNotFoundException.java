package edu.ucsb.cs.citelines.errors;

/**
 * Thrown when a DOI given for the "Add Citation via DOI" flow cannot be recognized as a DOI at
 * all, or no {@link edu.ucsb.cs.citelines.services.CitationMetadataResolver} has a record for it.
 * Mapped to a 404 by {@link edu.ucsb.cs.citelines.controller.ApiController}, so the frontend can
 * show it inline and keep its modal open rather than treating it as an unexpected server error.
 */
public class DoiNotFoundException extends RuntimeException {
  public DoiNotFoundException(String doi) {
    super("Could not find a citation for DOI: %s".formatted(doi));
  }
}
