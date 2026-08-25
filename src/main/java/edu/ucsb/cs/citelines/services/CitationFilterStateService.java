package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.CitationFilterState;
import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import edu.ucsb.cs.citelines.collections.CitationFilterStateRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Looks up and persists a {@link CitationFilterState} by its deterministic scope key (see {@link
 * CitationFilterState#makeId}), materializing a default (unsaved) state when nothing has been saved
 * yet for that scope, per issue #121: "It is not necessary to store that unless/until the user
 * alters it."
 */
@Service
public class CitationFilterStateService {

  // Kept in sync by hand with the frontend's own defaults: RELEVANCE_OPTIONS
  // (main/utils/citelinesFields.js) and DEFAULT_CITATION_FILTER (main/utils/citationFilter.js).
  // Not read from either at runtime -- this is the one place the backend needs to materialize
  // that same default when nothing has been saved yet, and there's no existing shared-constant
  // mechanism between the two layers for content like this.
  private static final List<String> DEFAULT_RELEVANCE =
      List.of("High", "Medium", "Low", "None", "Unreviewed");

  private final CitationFilterStateRepository citationFilterStateRepository;

  public CitationFilterStateService(CitationFilterStateRepository citationFilterStateRepository) {
    this.citationFilterStateRepository = citationFilterStateRepository;
  }

  public CitationFilterState getOrDefault(int projectId, Scope scope, String entryId) {
    return citationFilterStateRepository
        .findById(CitationFilterState.makeId(projectId, scope, entryId))
        .orElseGet(() -> defaultState(projectId, scope, entryId));
  }

  public CitationFilterState save(CitationFilterState state) {
    state.setId(
        CitationFilterState.makeId(state.getProjectId(), state.getScope(), state.getEntryId()));
    return citationFilterStateRepository.save(state);
  }

  private CitationFilterState defaultState(int projectId, Scope scope, String entryId) {
    return CitationFilterState.builder()
        .id(CitationFilterState.makeId(projectId, scope, entryId))
        .projectId(projectId)
        .scope(scope)
        .entryId(entryId)
        .expanded(false)
        .relevance(DEFAULT_RELEVANCE)
        .link("all")
        .duplicates("all")
        .search("")
        .tagIds(List.of())
        .tagMode("and")
        .build();
  }
}
