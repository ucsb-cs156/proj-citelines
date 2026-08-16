package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

public class DuplicateDetectionServiceTests {

  private BibTexEntryRepository bibTexEntryRepository;
  private DuplicateDetectionService duplicateDetectionService;
  private JobContext ctx;
  private Job job;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = org.mockito.Mockito.mock(BibTexEntryRepository.class);
    duplicateDetectionService =
        new DuplicateDetectionService(bibTexEntryRepository, new DOIService());
    job = Job.builder().build();
    ctx = new JobContext(null, job);
    when(bibTexEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  private static BibTexEntry entry(String id, String citeKey, Map<String, String> keyValuePairs) {
    return BibTexEntry.builder()
        .id(id)
        .projectId(1)
        .citeKey(citeKey)
        .keyValuePairs(keyValuePairs)
        .build();
  }

  @Test
  void an_empty_project_logs_and_saves_nothing() {
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of());

    duplicateDetectionService.detectDuplicates(1, ctx);

    verify(bibTexEntryRepository, never()).saveAll(any());
    assertTrue(job.getLog().contains("Scanning 0 entries in project 1"));
    assertTrue(
        job.getLog().contains("0 DOI-based groups, 0 title-based groups, 0 entries flagged"));
  }

  @Test
  void a_single_entry_with_a_doi_is_not_flagged() {
    BibTexEntry only = entry("id1", "smith2020", Map.of("doi", "10.1038/nrd842"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(only));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(only.getPossibleDuplicateReason());
    verify(bibTexEntryRepository, never()).saveAll(any());
  }

  @Test
  void two_entries_with_the_same_doi_are_flagged_as_same_doi_duplicates() {
    BibTexEntry a = entry("id1", "smith2020", Map.of("doi", "10.1038/nrd842"));
    BibTexEntry b = entry("id2", "smithj2020", Map.of("doi", "10.1038/nrd842"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertEquals("SAME_DOI", a.getPossibleDuplicateReason());
    assertEquals(List.of("id2"), a.getPossibleDuplicateIds());
    assertEquals("SAME_DOI", b.getPossibleDuplicateReason());
    assertEquals(List.of("id1"), b.getPossibleDuplicateIds());

    ArgumentCaptor<List<BibTexEntry>> captor = ArgumentCaptor.forClass(List.class);
    verify(bibTexEntryRepository, times(1)).saveAll(captor.capture());
    assertEquals(2, captor.getValue().size());

    assertTrue(job.getLog().contains("1 DOI-based group, 0 title-based groups, 2 entries flagged"));
  }

  @Test
  void two_entries_with_different_dois_are_not_grouped_together() {
    BibTexEntry a = entry("id1", "smith2020", Map.of("doi", "10.1038/nrd842"));
    BibTexEntry b = entry("id2", "jones2020", Map.of("doi", "10.1145/3770762.3772529"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(a.getPossibleDuplicateReason());
    assertNull(b.getPossibleDuplicateReason());
    verify(bibTexEntryRepository, never()).saveAll(any());
  }

  @Test
  void doi_matching_is_normalized_across_different_representations() {
    BibTexEntry a = entry("id1", "smith2020", Map.of("doi", "https://doi.org/10.1038/NRD842"));
    BibTexEntry b = entry("id2", "smithj2020", Map.of("doi", "10.1038/nrd842"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertEquals("SAME_DOI", a.getPossibleDuplicateReason());
    assertEquals("SAME_DOI", b.getPossibleDuplicateReason());
  }

  @Test
  void three_entries_sharing_a_doi_each_list_the_other_two() {
    BibTexEntry a = entry("id1", "a2020", Map.of("doi", "10.1038/nrd842"));
    BibTexEntry b = entry("id2", "b2020", Map.of("doi", "10.1038/nrd842"));
    BibTexEntry c = entry("id3", "c2020", Map.of("doi", "10.1038/nrd842"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b, c));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertEquals(Set.of("id2", "id3"), new HashSet<>(a.getPossibleDuplicateIds()));
    assertEquals(Set.of("id1", "id3"), new HashSet<>(b.getPossibleDuplicateIds()));
    assertEquals(Set.of("id1", "id2"), new HashSet<>(c.getPossibleDuplicateIds()));
  }

  @Test
  void entries_with_an_unparseable_doi_fall_back_to_title_based_grouping() {
    BibTexEntry a =
        entry(
            "id1",
            "smith2020",
            Map.of("doi", "not-a-real-doi", "title", "A Great Paper, on Testing!"));
    BibTexEntry b =
        entry(
            "id2",
            "smithj2020",
            Map.of("doi", "also-not-a-doi", "title", "a great paper on testing"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertEquals("SIMILAR_TITLE", a.getPossibleDuplicateReason());
    assertEquals("SIMILAR_TITLE", b.getPossibleDuplicateReason());
  }

  @Test
  void two_entries_with_no_doi_but_matching_normalized_titles_are_flagged_as_similar_title() {
    BibTexEntry a = entry("id1", "smith2020", Map.of("title", "A Great Paper, on Testing!"));
    BibTexEntry b = entry("id2", "smithj2020", Map.of("title", "a great paper on testing"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertEquals("SIMILAR_TITLE", a.getPossibleDuplicateReason());
    assertEquals(List.of("id2"), a.getPossibleDuplicateIds());
    assertEquals("SIMILAR_TITLE", b.getPossibleDuplicateReason());

    assertTrue(job.getLog().contains("0 DOI-based groups, 1 title-based group, 2 entries flagged"));
  }

  @Test
  void an_entry_with_a_doi_is_never_grouped_by_title_even_if_titles_match() {
    BibTexEntry a =
        entry("id1", "smith2020", Map.of("doi", "10.1038/nrd842", "title", "Same Title"));
    BibTexEntry b = entry("id2", "jones2020", Map.of("title", "Same Title"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(a.getPossibleDuplicateReason());
    assertNull(b.getPossibleDuplicateReason());
    verify(bibTexEntryRepository, never()).saveAll(any());
  }

  @Test
  void entries_with_neither_a_doi_nor_a_title_are_not_grouped() {
    BibTexEntry a = entry("id1", "smith2020", Map.of());
    BibTexEntry b = entry("id2", "jones2020", Map.of());
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(a.getPossibleDuplicateReason());
    assertNull(b.getPossibleDuplicateReason());
    verify(bibTexEntryRepository, never()).saveAll(any());
  }

  @Test
  void an_entry_with_a_blank_title_and_no_doi_is_not_grouped() {
    BibTexEntry a = entry("id1", "smith2020", Map.of("title", "   "));
    BibTexEntry b = entry("id2", "jones2020", Map.of("title", "   "));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(a.getPossibleDuplicateReason());
    assertNull(b.getPossibleDuplicateReason());
  }

  @Test
  void an_entry_with_null_keyValuePairs_is_not_grouped_and_does_not_crash() {
    BibTexEntry a = entry("id1", "smith2020", null);
    BibTexEntry b = entry("id2", "jones2020", null);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(a.getPossibleDuplicateReason());
    assertNull(b.getPossibleDuplicateReason());
    verify(bibTexEntryRepository, never()).saveAll(any());
  }

  @Test
  void an_entry_with_a_blank_doi_falls_back_to_title_grouping() {
    BibTexEntry a = entry("id1", "smith2020", Map.of("doi", "  ", "title", "Same Title"));
    BibTexEntry b = entry("id2", "jones2020", Map.of("title", "Same Title"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertEquals("SIMILAR_TITLE", a.getPossibleDuplicateReason());
    assertEquals("SIMILAR_TITLE", b.getPossibleDuplicateReason());
  }

  @Test
  void an_entry_no_longer_part_of_a_group_has_its_stale_mark_cleared() {
    BibTexEntry a =
        BibTexEntry.builder()
            .id("id1")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("doi", "10.1038/nrd842"))
            .possibleDuplicateIds(List.of("id2"))
            .possibleDuplicateReason("SAME_DOI")
            .build();
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertNull(a.getPossibleDuplicateReason());
    assertNull(a.getPossibleDuplicateIds());

    ArgumentCaptor<List<BibTexEntry>> captor = ArgumentCaptor.forClass(List.class);
    verify(bibTexEntryRepository, times(1)).saveAll(captor.capture());
    assertEquals(List.of(a), captor.getValue());

    assertTrue(job.getLog().contains("1 entry cleared of a stale mark"));
  }

  @Test
  void a_still_valid_mark_does_not_count_as_cleared() {
    BibTexEntry a =
        BibTexEntry.builder()
            .id("id1")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("doi", "10.1038/nrd842"))
            .possibleDuplicateIds(List.of("id2"))
            .possibleDuplicateReason("SAME_DOI")
            .build();
    BibTexEntry b = entry("id2", "smithj2020", Map.of("doi", "10.1038/nrd842"));
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(a, b));

    duplicateDetectionService.detectDuplicates(1, ctx);

    assertTrue(job.getLog().contains("0 entries cleared of a stale mark"));
  }
}
