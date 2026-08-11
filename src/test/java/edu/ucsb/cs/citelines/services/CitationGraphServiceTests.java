package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import edu.ucsb.cs.citelines.collections.UnresolvedCitation;
import edu.ucsb.cs.citelines.collections.UnresolvedCitationRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

public class CitationGraphServiceTests {

  private CitationGraphService citationGraphService;
  private BibTexEntryRepository bibTexEntryRepository;
  private CitationEdgeRepository citationEdgeRepository;
  private UnresolvedCitationRepository unresolvedCitationRepository;
  private OpenAlexService openAlexService;

  @BeforeEach
  void setup() {
    citationGraphService = new CitationGraphService();
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    citationEdgeRepository = mock(CitationEdgeRepository.class);
    unresolvedCitationRepository = mock(UnresolvedCitationRepository.class);
    openAlexService = mock(OpenAlexService.class);

    citationGraphService.bibTexEntryRepository = bibTexEntryRepository;
    citationGraphService.citationEdgeRepository = citationEdgeRepository;
    citationGraphService.unresolvedCitationRepository = unresolvedCitationRepository;
    citationGraphService.openAlexService = openAlexService;
    citationGraphService.bibTexSynthesisService = new BibTexSynthesisService();
    BibTexConverterService converterService = new BibTexConverterService();
    converterService.doiService = new DOIService();
    citationGraphService.bibTexConverterService = converterService;
  }

  private static BibTexEntry sourceEntry() {
    return BibTexEntry.builder()
        .id("mongo-id-1")
        .projectId(42)
        .entryType("article")
        .citeKey("harris2020")
        .keyValuePairs(
            Map.of("title", "Array programming with NumPy", "doi", "10.1038/s41586-020-2649-2"))
        .build();
  }

  private static OpenAlexWork sourceWork(List<String> referencedWorkIds) {
    return new OpenAlexWork(
        "W3035965352",
        "10.1038/s41586-020-2649-2",
        "Array programming with NumPy",
        2020,
        "article",
        List.of("Charles R. Harris"),
        "Nature",
        referencedWorkIds);
  }

  private static Job newJob() {
    return Job.builder().build();
  }

  @Test
  void fetchReferences_adds_new_entries_and_links_edges() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of("W1"))));
    OpenAlexWork referencedWork =
        new OpenAlexWork(
            "W1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            "Some Journal",
            List.of());
    when(openAlexService.getWorksByIds(List.of("W1"))).thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("author2015", savedEntry.getValue().getCiteKey());
    assertEquals("A Referenced Paper", savedEntry.getValue().getKeyValuePairs().get("title"));

    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals("harris2020", savedEdge.getValue().getCitingCiteKey());
    assertEquals("author2015", savedEdge.getValue().getCitedCiteKey());

    assertTrue(job.getLog().contains("Added new entry author2015"));
    assertTrue(
        job.getLog()
            .contains("Done: 1 new entry added, 0 linked to existing entries, 0 unresolved."));
  }

  @Test
  void fetchReferences_links_to_an_existing_entry_with_the_same_doi_instead_of_duplicating() {
    BibTexEntry existingReferenced =
        BibTexEntry.builder()
            .projectId(42)
            .entryType("article")
            .citeKey("existingkey2015")
            .keyValuePairs(Map.of("title", "A Referenced Paper", "doi", "10.1000/ref1"))
            .build();

    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42))
        .thenReturn(List.of(sourceEntry(), existingReferenced));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of("W1"))));
    OpenAlexWork referencedWork =
        new OpenAlexWork(
            "W1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(openAlexService.getWorksByIds(List.of("W1"))).thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals("existingkey2015", savedEdge.getValue().getCitedCiteKey());
    assertTrue(job.getLog().contains("Linking to existing entry existingkey2015"));
  }

  @Test
  void fetchReferences_records_unresolved_when_openalex_cannot_find_a_referenced_work() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of("W1", "W2"))));
    // only W1 comes back; W2 is "not found"
    OpenAlexWork referencedWork =
        new OpenAlexWork(
            "W1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(openAlexService.getWorksByIds(List.of("W1", "W2"))).thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    assertEquals("not_found_in_openalex", unresolvedCaptor.getValue().getReason());
    assertEquals("W2", unresolvedCaptor.getValue().getOpenAlexWorkId());
    assertEquals("reference", unresolvedCaptor.getValue().getDirection());
    assertEquals("harris2020", unresolvedCaptor.getValue().getSourceCiteKey());
  }

  @Test
  void fetchReferences_records_unresolved_for_a_resolved_work_with_no_title() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of("W1"))));
    OpenAlexWork noTitleWork =
        new OpenAlexWork("W1", null, null, null, "article", List.of(), null, List.of());
    when(openAlexService.getWorksByIds(List.of("W1"))).thenReturn(List.of(noTitleWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    assertEquals("missing_title", unresolvedCaptor.getValue().getReason());
    assertTrue(
        job.getLog()
            .contains("Done: 0 new entries added, 0 linked to existing entries, 1 unresolved."));
  }

  @Test
  void fetchReferences_records_unresolved_for_a_new_entry_with_no_doi() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of("W1"))));
    OpenAlexWork noDoiWork =
        new OpenAlexWork(
            "W1",
            null,
            "A Paper With No DOI",
            2018,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(openAlexService.getWorksByIds(List.of("W1"))).thenReturn(List.of(noDoiWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(1)).save(any());
    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    assertEquals("missing_doi", unresolvedCaptor.getValue().getReason());
  }

  @Test
  void fetchReferences_caps_and_logs_when_more_than_200_references_are_found() {
    List<String> manyIds = new ArrayList<>();
    for (int i = 0; i < 250; i++) {
      manyIds.add("W" + i);
    }
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(manyIds)));
    when(openAlexService.getWorksByIds(any())).thenReturn(List.of());

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Found 250 references; fetching only the first 200."));
    verify(openAlexService).getWorksByIds(eq(manyIds.subList(0, 200)));
  }

  @Test
  void fetchCitations_fetches_via_works_citing_and_links_edges_in_the_other_direction() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of())));
    OpenAlexWork citingWork =
        new OpenAlexWork(
            "W9",
            "10.1000/citing1",
            "A Citing Paper",
            2022,
            "article",
            List.of("Bob Author"),
            null,
            List.of());
    when(openAlexService.getWorksCiting("W3035965352", CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(citingWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchCitations(42, "harris2020", ctx);

    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals("author2022", savedEdge.getValue().getCitingCiteKey());
    assertEquals("harris2020", savedEdge.getValue().getCitedCiteKey());
  }

  @Test
  void throws_and_logs_when_the_source_entry_does_not_exist() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "missing"))
        .thenReturn(Optional.empty());

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    assertThrows(
        IllegalStateException.class,
        () -> citationGraphService.fetchReferences(42, "missing", ctx));
    assertTrue(job.getLog().contains("Entry not found: missing"));
  }

  @Test
  void throws_and_logs_when_the_source_entry_has_no_doi() {
    BibTexEntry noDoiEntry =
        BibTexEntry.builder()
            .projectId(42)
            .citeKey("nodoi2020")
            .entryType("article")
            .keyValuePairs(Map.of("title", "No DOI Here"))
            .build();
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "nodoi2020"))
        .thenReturn(Optional.of(noDoiEntry));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    assertThrows(
        IllegalStateException.class,
        () -> citationGraphService.fetchReferences(42, "nodoi2020", ctx));
    assertTrue(job.getLog().contains("has no DOI"));
  }

  @Test
  void throws_and_logs_when_openalex_has_no_record_for_the_dois_doi() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    assertThrows(
        IllegalStateException.class,
        () -> citationGraphService.fetchReferences(42, "harris2020", ctx));
    assertTrue(job.getLog().contains("No OpenAlex record found for DOI"));
  }

  @Test
  void throws_when_the_source_entrys_keyValuePairs_is_entirely_null() {
    BibTexEntry noFieldsEntry =
        BibTexEntry.builder().projectId(42).citeKey("nofields2020").entryType("article").build();
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "nofields2020"))
        .thenReturn(Optional.of(noFieldsEntry));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    assertThrows(
        IllegalStateException.class,
        () -> citationGraphService.fetchReferences(42, "nofields2020", ctx));
    assertTrue(job.getLog().contains("has no DOI"));
  }

  @Test
  void
      ignores_an_existing_entry_whose_keyValuePairs_is_entirely_null_when_building_the_dedup_map() {
    BibTexEntry noFieldsExisting =
        BibTexEntry.builder().projectId(42).citeKey("nofields2018").entryType("article").build();
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42))
        .thenReturn(List.of(sourceEntry(), noFieldsExisting));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of())));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Found 0 references."));
  }

  @Test
  void throws_when_the_source_entry_has_a_blank_doi() {
    BibTexEntry blankDoiEntry =
        BibTexEntry.builder()
            .projectId(42)
            .citeKey("blankdoi2020")
            .entryType("article")
            .keyValuePairs(Map.of("title", "Blank DOI Here", "doi", "   "))
            .build();
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "blankdoi2020"))
        .thenReturn(Optional.of(blankDoiEntry));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    assertThrows(
        IllegalStateException.class,
        () -> citationGraphService.fetchReferences(42, "blankdoi2020", ctx));
    assertTrue(job.getLog().contains("has no DOI"));
  }

  @Test
  void ignores_existing_entries_that_have_no_doi_when_building_the_dedup_map() {
    BibTexEntry noDoiExisting =
        BibTexEntry.builder()
            .projectId(42)
            .citeKey("nodoi2018")
            .entryType("article")
            .keyValuePairs(Map.of("title", "No DOI At All"))
            .build();
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42))
        .thenReturn(List.of(sourceEntry(), noDoiExisting));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of())));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Found 0 references."));
  }

  @Test
  void fetchReferences_skips_a_resolved_work_with_a_blank_title() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of("W1"))));
    OpenAlexWork blankTitleWork =
        new OpenAlexWork("W1", null, "   ", null, "article", List.of(), null, List.of());
    when(openAlexService.getWorksByIds(List.of("W1"))).thenReturn(List.of(blankTitleWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    verify(unresolvedCitationRepository).save(any());
  }

  @Test
  void fetchReferences_with_no_references_at_all_does_not_call_openalex_again() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of())));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(openAlexService, times(0)).getWorksByIds(any());
    assertTrue(
        job.getLog()
            .contains("Done: 0 new entries added, 0 linked to existing entries, 0 unresolved."));
  }
}
