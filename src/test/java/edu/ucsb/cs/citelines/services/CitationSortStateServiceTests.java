package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import edu.ucsb.cs.citelines.collections.CitationSortState;
import edu.ucsb.cs.citelines.collections.CitationSortState.SortCriterion;
import edu.ucsb.cs.citelines.collections.CitationSortStateRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class CitationSortStateServiceTests {

  private CitationSortStateService service;
  private CitationSortStateRepository repository;

  @BeforeEach
  void setup() {
    repository = mock(CitationSortStateRepository.class);
    service = new CitationSortStateService(repository);
  }

  @Test
  void getOrDefault_returns_the_saved_state_when_present() {
    CitationSortState saved =
        CitationSortState.builder()
            .id("1:PROJECT::42")
            .projectId(1)
            .scope(Scope.PROJECT)
            .userId(42L)
            .expanded(true)
            .sortCriteria(List.of(new SortCriterion("Author", "asc")))
            .build();
    when(repository.findById("1:PROJECT::42")).thenReturn(Optional.of(saved));

    CitationSortState result = service.getOrDefault(1, Scope.PROJECT, null, 42L);

    assertEquals(saved, result);
  }

  @Test
  void getOrDefault_returns_an_unsaved_default_when_nothing_is_stored() {
    when(repository.findById("1:REFERENCES:id-smith2020:42")).thenReturn(Optional.empty());

    CitationSortState result = service.getOrDefault(1, Scope.REFERENCES, "id-smith2020", 42L);

    assertEquals("1:REFERENCES:id-smith2020:42", result.getId());
    assertEquals(1, result.getProjectId());
    assertEquals(Scope.REFERENCES, result.getScope());
    assertEquals("id-smith2020", result.getEntryId());
    assertEquals(42L, result.getUserId());
    assertEquals(false, result.isExpanded());
    assertEquals(List.of(), result.getSortCriteria());
    verify(repository, never()).save(any());
  }

  @Test
  void getOrDefault_returns_different_defaults_for_different_users_of_the_same_scope() {
    when(repository.findById("1:PROJECT::1")).thenReturn(Optional.empty());
    when(repository.findById("1:PROJECT::2")).thenReturn(Optional.empty());

    CitationSortState result1 = service.getOrDefault(1, Scope.PROJECT, null, 1L);
    CitationSortState result2 = service.getOrDefault(1, Scope.PROJECT, null, 2L);

    assertEquals("1:PROJECT::1", result1.getId());
    assertEquals("1:PROJECT::2", result2.getId());
  }

  @Test
  void save_computes_the_deterministic_id_and_persists_the_state() {
    CitationSortState state =
        CitationSortState.builder()
            .projectId(1)
            .scope(Scope.CITATIONS)
            .entryId("id-smith2020")
            .userId(42L)
            .expanded(true)
            .sortCriteria(List.of(new SortCriterion("Year", "desc")))
            .build();
    when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    CitationSortState result = service.save(state);

    assertEquals("1:CITATIONS:id-smith2020:42", result.getId());
    verify(repository).save(state);
  }
}
