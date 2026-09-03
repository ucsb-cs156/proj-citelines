package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import edu.ucsb.cs.citelines.collections.CitationSortState;
import edu.ucsb.cs.citelines.collections.CitationSortStateRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Looks up and persists a {@link CitationSortState} by its deterministic scope key (see {@link
 * CitationSortState#makeId}), materializing a default (unsaved, unsorted, closed) state when
 * nothing has been saved yet for that scope+user — same semantics as {@link
 * CitationFilterStateService}, issue #126.
 */
@Service
public class CitationSortStateService {

  private final CitationSortStateRepository citationSortStateRepository;

  public CitationSortStateService(CitationSortStateRepository citationSortStateRepository) {
    this.citationSortStateRepository = citationSortStateRepository;
  }

  public CitationSortState getOrDefault(int projectId, Scope scope, String entryId, long userId) {
    return citationSortStateRepository
        .findById(CitationSortState.makeId(projectId, scope, entryId, userId))
        .orElseGet(() -> defaultState(projectId, scope, entryId, userId));
  }

  public CitationSortState save(CitationSortState state) {
    state.setId(
        CitationSortState.makeId(
            state.getProjectId(), state.getScope(), state.getEntryId(), state.getUserId()));
    return citationSortStateRepository.save(state);
  }

  private CitationSortState defaultState(int projectId, Scope scope, String entryId, long userId) {
    return CitationSortState.builder()
        .id(CitationSortState.makeId(projectId, scope, entryId, userId))
        .projectId(projectId)
        .scope(scope)
        .entryId(entryId)
        .userId(userId)
        .expanded(false)
        .sortCriteria(List.of())
        .build();
  }
}
