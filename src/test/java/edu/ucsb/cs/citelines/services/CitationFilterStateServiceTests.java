package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.CitationFilterState;
import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import edu.ucsb.cs.citelines.collections.CitationFilterStateRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class CitationFilterStateServiceTests {

  private CitationFilterStateService service;
  private CitationFilterStateRepository repository;

  @BeforeEach
  void setup() {
    repository = mock(CitationFilterStateRepository.class);
    service = new CitationFilterStateService(repository);
  }

  @Test
  void getOrDefault_returns_the_saved_state_when_present() {
    CitationFilterState saved =
        CitationFilterState.builder()
            .id("1:PROJECT:")
            .projectId(1)
            .scope(Scope.PROJECT)
            .expanded(true)
            .relevance(List.of("High"))
            .link("doi")
            .duplicates("dup")
            .search("smith")
            .tagIds(List.of(2L))
            .tagMode("or")
            .build();
    when(repository.findById("1:PROJECT:")).thenReturn(Optional.of(saved));

    CitationFilterState result = service.getOrDefault(1, Scope.PROJECT, null);

    assertEquals(saved, result);
  }

  @Test
  void getOrDefault_returns_an_unsaved_default_when_nothing_is_stored() {
    when(repository.findById("1:REFERENCES:id-smith2020")).thenReturn(Optional.empty());

    CitationFilterState result = service.getOrDefault(1, Scope.REFERENCES, "id-smith2020");

    assertEquals("1:REFERENCES:id-smith2020", result.getId());
    assertEquals(1, result.getProjectId());
    assertEquals(Scope.REFERENCES, result.getScope());
    assertEquals("id-smith2020", result.getEntryId());
    assertEquals(false, result.isExpanded());
    assertEquals(List.of("High", "Medium", "Low", "None", "Unreviewed"), result.getRelevance());
    assertEquals("all", result.getLink());
    assertEquals("all", result.getDuplicates());
    assertEquals("", result.getSearch());
    assertEquals(List.of(), result.getTagIds());
    assertEquals("and", result.getTagMode());
    verify(repository, never()).save(any());
  }

  @Test
  void save_computes_the_deterministic_id_and_persists_the_state() {
    CitationFilterState state =
        CitationFilterState.builder()
            .projectId(1)
            .scope(Scope.CITATIONS)
            .entryId("id-smith2020")
            .expanded(true)
            .relevance(List.of("High"))
            .link("all")
            .duplicates("all")
            .search("")
            .tagIds(List.of())
            .tagMode("and")
            .build();
    when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    CitationFilterState result = service.save(state);

    assertEquals("1:CITATIONS:id-smith2020", result.getId());
    verify(repository).save(state);
  }
}
