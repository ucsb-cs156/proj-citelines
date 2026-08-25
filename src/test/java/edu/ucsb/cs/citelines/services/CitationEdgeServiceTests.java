package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class CitationEdgeServiceTests {

  private CitationEdgeService service;
  private CitationEdgeRepository citationEdgeRepository;
  private BibTexEntryRepository bibTexEntryRepository;

  @BeforeEach
  void setup() {
    citationEdgeRepository = mock(CitationEdgeRepository.class);
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    service = new CitationEdgeService(citationEdgeRepository, bibTexEntryRepository);
  }

  @Test
  void referencesOf_returns_the_entries_cited_by_the_given_entry() {
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:id-smith2020:id-jones2019")
            .projectId(1)
            .citingEntryId("id-smith2020")
            .citedEntryId("id-jones2019")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitingEntryId(1, "id-smith2020"))
        .thenReturn(List.of(edge));
    BibTexEntry citedEntry =
        BibTexEntry.builder().id("id-jones2019").projectId(1).citeKey("jones2019").build();
    when(bibTexEntryRepository.findById("id-jones2019")).thenReturn(Optional.of(citedEntry));

    assertEquals(List.of(citedEntry), service.referencesOf(1, "id-smith2020"));
  }

  @Test
  void referencesOf_skips_edges_whose_cited_entry_no_longer_exists() {
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:id-smith2020:id-deleted2019")
            .projectId(1)
            .citingEntryId("id-smith2020")
            .citedEntryId("id-deleted2019")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitingEntryId(1, "id-smith2020"))
        .thenReturn(List.of(edge));
    when(bibTexEntryRepository.findById("id-deleted2019")).thenReturn(Optional.empty());

    assertEquals(List.of(), service.referencesOf(1, "id-smith2020"));
  }

  @Test
  void citationsOf_returns_the_entries_that_cite_the_given_entry() {
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:id-jones2019:id-smith2020")
            .projectId(1)
            .citingEntryId("id-jones2019")
            .citedEntryId("id-smith2020")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitedEntryId(1, "id-smith2020"))
        .thenReturn(List.of(edge));
    BibTexEntry citingEntry =
        BibTexEntry.builder().id("id-jones2019").projectId(1).citeKey("jones2019").build();
    when(bibTexEntryRepository.findById("id-jones2019")).thenReturn(Optional.of(citingEntry));

    assertEquals(List.of(citingEntry), service.citationsOf(1, "id-smith2020"));
  }

  @Test
  void citationsOf_skips_edges_whose_citing_entry_no_longer_exists() {
    CitationEdge edge =
        CitationEdge.builder()
            .id("1:id-deleted2019:id-smith2020")
            .projectId(1)
            .citingEntryId("id-deleted2019")
            .citedEntryId("id-smith2020")
            .build();
    when(citationEdgeRepository.findByProjectIdAndCitedEntryId(1, "id-smith2020"))
        .thenReturn(List.of(edge));
    when(bibTexEntryRepository.findById("id-deleted2019")).thenReturn(Optional.empty());

    assertEquals(List.of(), service.citationsOf(1, "id-smith2020"));
  }
}
