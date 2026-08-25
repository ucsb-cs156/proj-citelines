package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;

/**
 * Looks up the BibTeX entries related to a given entry via the citation graph built by the "Get
 * References"/"Get Citations" jobs (see {@link CitationGraphService}) — lifted out of {@code
 * CitationEdgesController} once {@link edu.ucsb.cs.citelines.services.BibTexEntryImproveService}
 * needed the same lookups for its {@code REFERENCES}/{@code CITATIONS} scopes (issue #110).
 */
@Service
public class CitationEdgeService {

  private final CitationEdgeRepository citationEdgeRepository;
  private final BibTexEntryRepository bibTexEntryRepository;

  public CitationEdgeService(
      CitationEdgeRepository citationEdgeRepository, BibTexEntryRepository bibTexEntryRepository) {
    this.citationEdgeRepository = citationEdgeRepository;
    this.bibTexEntryRepository = bibTexEntryRepository;
  }

  /**
   * @param entryId the Mongo {@code _id} of the entry to list references for — not its citeKey,
   *     which a user can freely rename (see {@code CitationEdge}'s Javadoc)
   */
  public List<BibTexEntry> referencesOf(int projectId, String entryId) {
    return relatedEntries(
        citationEdgeRepository.findByProjectIdAndCitingEntryId(projectId, entryId).stream()
            .map(CitationEdge::getCitedEntryId));
  }

  /**
   * @param entryId the Mongo {@code _id} of the entry to list citations for — not its citeKey,
   *     which a user can freely rename (see {@code CitationEdge}'s Javadoc)
   */
  public List<BibTexEntry> citationsOf(int projectId, String entryId) {
    return relatedEntries(
        citationEdgeRepository.findByProjectIdAndCitedEntryId(projectId, entryId).stream()
            .map(CitationEdge::getCitingEntryId));
  }

  // A Mongo _id is unique by construction, so (unlike a lookup by citeKey) this can never match
  // more than one entry — no coalescing needed, just a plain lookup that silently skips an edge
  // whose related entry no longer exists (e.g. deleted since the edge was recorded).
  private List<BibTexEntry> relatedEntries(Stream<String> entryIds) {
    return entryIds.map(bibTexEntryRepository::findById).flatMap(Optional::stream).toList();
  }
}
