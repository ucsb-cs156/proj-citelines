package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
import java.util.HashMap;
import java.util.HashSet;
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
  private SemanticScholarResolver semanticScholarResolver;
  private CrossrefResolver crossrefResolver;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    citationEdgeRepository = mock(CitationEdgeRepository.class);
    unresolvedCitationRepository = mock(UnresolvedCitationRepository.class);
    openAlexService = mock(OpenAlexService.class);
    semanticScholarResolver = mock(SemanticScholarResolver.class);
    crossrefResolver = mock(CrossrefResolver.class);
    when(openAlexService.name()).thenReturn("OpenAlex");
    when(semanticScholarResolver.name()).thenReturn("SemanticScholar");
    when(crossrefResolver.name()).thenReturn("Crossref");
    // Simulates real Spring Data MongoDB behavior: save() assigns a generated id back onto the
    // entity when it doesn't already have one, which resolveOrCreateEntry relies on immediately
    // after saving a newly created entry.
    when(bibTexEntryRepository.save(any()))
        .thenAnswer(
            invocation -> {
              BibTexEntry entry = invocation.getArgument(0);
              if (entry.getId() == null) {
                entry.setId("generated-" + entry.getCiteKey());
              }
              return entry;
            });

    BibTexConverterService converterService = new BibTexConverterService();
    converterService.doiService = new DOIService();
    citationGraphService =
        new CitationGraphService(
            bibTexEntryRepository,
            citationEdgeRepository,
            unresolvedCitationRepository,
            openAlexService,
            semanticScholarResolver,
            crossrefResolver,
            new BibTexSynthesisService(new LaTeXNormalizationService()),
            converterService);
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

  private static ResolvedWork resolvedWork(
      String id,
      String doi,
      String title,
      Integer year,
      String type,
      List<String> authorNames,
      String venue,
      List<String> referencedWorkIds) {
    return new ResolvedWork(
        id, doi, title, year, type, authorNames, venue, referencedWorkIds, List.of(), List.of());
  }

  private static ResolvedWork sourceWork(List<String> referencedWorkIds) {
    return resolvedWork(
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
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork referencedWork =
        resolvedWork(
            "W1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            "Some Journal",
            List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("author2015", savedEntry.getValue().getCiteKey());
    assertEquals("A Referenced Paper", savedEntry.getValue().getKeyValuePairs().get("title"));

    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals("mongo-id-1", savedEdge.getValue().getCitingEntryId());
    assertEquals(savedEntry.getValue().getId(), savedEdge.getValue().getCitedEntryId());

    assertTrue(job.getLog().contains("Starting Get References for harris2020 in project 42"));
    assertTrue(
        job.getLog().contains("Found source work on OpenAlex: Array programming with NumPy"));
    assertTrue(job.getLog().contains("Added new entry author2015"));
    assertTrue(
        job.getLog()
            .contains("Done: 1 new entry added, 0 linked to existing entries, 0 unresolved."));
  }

  @Test
  void fetchReferences_links_to_an_existing_entry_with_the_same_doi_instead_of_duplicating() {
    BibTexEntry existingReferenced =
        BibTexEntry.builder()
            .id("existing-id-2015")
            .projectId(42)
            .entryType("article")
            .citeKey("existingkey2015")
            .keyValuePairs(Map.of("title", "A Referenced Paper", "doi", "10.1000/ref1"))
            .build();

    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42))
        .thenReturn(List.of(sourceEntry(), existingReferenced));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork referencedWork =
        resolvedWork(
            "W1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals("existing-id-2015", savedEdge.getValue().getCitedEntryId());
    assertTrue(job.getLog().contains("Linking to existing entry existingkey2015"));
    assertTrue(
        job.getLog()
            .contains("Done: 0 new entries added, 1 linked to existing entries, 0 unresolved."));
  }

  @Test
  void fetchReferences_records_unresolved_when_no_resolver_can_find_a_referenced_work() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1", "W2"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    // only W1 comes back; W2 is "not found"
    ResolvedWork referencedWork =
        resolvedWork(
            "W1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    assertEquals("not_found_by_any_resolver", unresolvedCaptor.getValue().getReason());
    assertEquals("W2", unresolvedCaptor.getValue().getResolverWorkId());
    assertEquals("OpenAlex", unresolvedCaptor.getValue().getResolverName());
    assertEquals("reference", unresolvedCaptor.getValue().getDirection());
    assertEquals("mongo-id-1", unresolvedCaptor.getValue().getSourceEntryId());
    assertTrue(job.getLog().contains("Could not resolve reference W2 in OpenAlex."));
  }

  @Test
  void fetchReferences_records_unresolved_for_a_resolved_work_with_no_title_and_no_doi() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork noTitleWork =
        resolvedWork("W1", null, null, null, "article", List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(noTitleWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    // no DOI at all to try another resolver with, so this is a bare not-found gap, not
    // "missing_title" (which implies a DOI is known but no resolver could supply a title for it)
    assertEquals("not_found_by_any_resolver", unresolvedCaptor.getValue().getReason());
    assertTrue(job.getLog().contains("Skipping W1: no title available."));
    assertTrue(
        job.getLog()
            .contains("Done: 0 new entries added, 0 linked to existing entries, 1 unresolved."));
  }

  @Test
  void fetchReferences_treats_a_blank_doi_the_same_as_no_doi_when_recovering_a_missing_title() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork blankDoiStub =
        resolvedWork("W1", "   ", null, null, "article", List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(blankDoiStub));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    org.mockito.Mockito.verifyNoInteractions(semanticScholarResolver, crossrefResolver);
  }

  @Test
  void fetchReferences_does_not_adopt_a_fallback_resolvers_result_if_its_title_is_also_blank() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork stub =
        resolvedWork("W1", "10.1000/ref1", null, null, null, List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(stub));
    ResolvedWork alsoBlankTitle =
        resolvedWork("S2-1", "10.1000/ref1", "   ", null, null, List.of(), null, List.of());
    when(semanticScholarResolver.resolveByDoi("10.1000/ref1"))
        .thenReturn(Optional.of(alsoBlankTitle));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    assertEquals("missing_title", unresolvedCaptor.getValue().getReason());
  }

  @Test
  void fetchReferences_describes_an_unresolvable_work_with_no_id_generically_in_the_log() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork noIdWork =
        resolvedWork(null, null, null, null, "article", List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(noIdWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Skipping an unidentified reference: no title available."));
  }

  @Test
  void fetchReferences_recovers_a_missing_title_via_a_fallback_resolver() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork stub =
        resolvedWork("W1", "10.1000/ref1", null, null, null, List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(stub));
    ResolvedWork recovered =
        resolvedWork(
            "S2-1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(semanticScholarResolver.resolveByDoi("10.1000/ref1")).thenReturn(Optional.of(recovered));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("A Referenced Paper", savedEntry.getValue().getKeyValuePairs().get("title"));
    verify(unresolvedCitationRepository, times(0)).save(any());
    assertTrue(job.getLog().contains("Recovered title for 10.1000/ref1 via SemanticScholar."));
  }

  @Test
  void fetchReferences_records_missing_title_when_no_fallback_resolver_recovers_it() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork stub =
        resolvedWork("W1", "10.1000/ref1", null, null, null, List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(stub));
    // semanticScholarResolver and crossrefResolver both default to Optional.empty() (unstubbed)

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    ArgumentCaptor<UnresolvedCitation> unresolvedCaptor =
        ArgumentCaptor.forClass(UnresolvedCitation.class);
    verify(unresolvedCitationRepository).save(unresolvedCaptor.capture());
    assertEquals("missing_title", unresolvedCaptor.getValue().getReason());
    assertEquals("W1", unresolvedCaptor.getValue().getResolverWorkId());
  }

  @Test
  void fetchReferences_records_unresolved_for_a_new_entry_with_no_doi() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork noDoiWork =
        resolvedWork(
            "W1",
            null,
            "A Paper With No DOI",
            2018,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(noDoiWork));

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
    ResolvedWork source = sourceWork(manyIds);
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of());

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Found 250 references; fetching only the first 200."));
    verify(openAlexService).getReferences(source, 200);
  }

  @Test
  void fetchReferences_does_not_truncate_at_exactly_the_200_reference_cap() {
    List<String> exactlyMax = new ArrayList<>();
    for (int i = 0; i < 200; i++) {
      exactlyMax.add("W" + i);
    }
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(exactlyMax);
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of());

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Found 200 references."));
    assertTrue(!job.getLog().contains("fetching only the first"));
  }

  @Test
  void fetchCitations_fetches_via_the_discovery_resolver_and_links_edges_in_the_other_direction() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    ResolvedWork source = sourceWork(List.of());
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork citingWork =
        resolvedWork(
            "W9",
            "10.1000/citing1",
            "A Citing Paper",
            2022,
            "article",
            List.of("Bob Author"),
            null,
            List.of());
    when(openAlexService.getCitations(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(citingWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchCitations(42, "harris2020", ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals(savedEntry.getValue().getId(), savedEdge.getValue().getCitingEntryId());
    assertEquals("mongo-id-1", savedEdge.getValue().getCitedEntryId());
    assertTrue(job.getLog().contains("Found 1 citations (capped at 200)."));
  }

  @Test
  void fetchReferences_falls_back_to_semantic_scholar_when_openalex_has_no_record() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());
    ResolvedWork s2Source = sourceWork(List.of());
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(s2Source));
    ResolvedWork referencedWork =
        resolvedWork(
            "S2-1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(semanticScholarResolver.getReferences(s2Source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(
        job.getLog()
            .contains("Found source work on SemanticScholar: Array programming with NumPy"));
    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("author2015", savedEntry.getValue().getCiteKey());
  }

  @Test
  void fetchReferences_uses_crossref_as_a_last_resort_discovery_resolver() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.empty());
    ResolvedWork crossrefSource = sourceWork(List.of());
    when(crossrefResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(crossrefSource));
    ResolvedWork referencedWork =
        resolvedWork(
            "e_1",
            "10.1000/ref1",
            "A Referenced Paper",
            2015,
            "article",
            List.of("Ann Author"),
            null,
            List.of());
    when(crossrefResolver.getReferences(crossrefSource, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(referencedWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(
        job.getLog().contains("Found source work on Crossref: Array programming with NumPy"));
    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("author2015", savedEntry.getValue().getCiteKey());
  }

  @Test
  void fetchCitations_logs_instead_of_erroring_when_the_discovery_resolver_is_crossref() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.empty());
    ResolvedWork crossrefSource = sourceWork(List.of());
    when(crossrefResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(crossrefSource));
    // crossrefResolver.getCitations is unstubbed -> defaults to an empty list, matching the real
    // CrossrefResolver's behavior (no citing-works endpoint exists in Crossref's public API)

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchCitations(42, "harris2020", ctx);

    assertTrue(job.getLog().contains("Crossref does not provide citation data."));
    assertTrue(!job.getLog().contains("Found 0 citations"));
    assertTrue(
        job.getLog()
            .contains("Done: 0 new entries added, 0 linked to existing entries, 0 unresolved."));
  }

  @Test
  void throws_and_logs_when_no_resolver_has_a_record_for_the_doi() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.empty());
    when(crossrefResolver.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    assertThrows(
        IllegalStateException.class,
        () -> citationGraphService.fetchReferences(42, "harris2020", ctx));
    assertTrue(
        job.getLog()
            .contains(
                "No record found for DOI 10.1038/s41586-020-2649-2 in any of: OpenAlex,"
                    + " SemanticScholar, Crossref"));
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
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
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
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
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
    ResolvedWork source = sourceWork(List.of("W1"));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.of(source));
    ResolvedWork blankTitleWork =
        resolvedWork("W1", null, "   ", null, "article", List.of(), null, List.of());
    when(openAlexService.getReferences(source, CitationGraphService.MAX_RESULTS))
        .thenReturn(List.of(blankTitleWork));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    verify(bibTexEntryRepository, times(0)).save(any());
    verify(unresolvedCitationRepository).save(any());
  }

  @Test
  void fetchReferences_with_no_references_at_all_does_not_error() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "harris2020"))
        .thenReturn(Optional.of(sourceEntry()));
    when(bibTexEntryRepository.findByProjectId(42)).thenReturn(List.of(sourceEntry()));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(sourceWork(List.of())));

    Job job = newJob();
    JobContext ctx = new JobContext(null, job);
    citationGraphService.fetchReferences(42, "harris2020", ctx);

    assertTrue(
        job.getLog()
            .contains("Done: 0 new entries added, 0 linked to existing entries, 0 unresolved."));
  }

  @Test
  void
      resolveOrCreateEntry_indexes_a_new_entry_by_doi_so_a_later_call_with_the_same_doi_links_to_it() {
    CitationGraphService.ExistingEntries existing =
        new CitationGraphService.ExistingEntries(new HashMap<>(), new HashSet<>());
    ResolvedWork work =
        resolvedWork(
            "W1", "10.1/x", "A Paper", 2020, "article", List.of("Jane Doe"), null, List.of());

    CitationGraphService.ResolveOrCreateResult first =
        citationGraphService.resolveOrCreateEntry(work, 42, existing);
    CitationGraphService.ResolveOrCreateResult second =
        citationGraphService.resolveOrCreateEntry(work, 42, existing);

    assertTrue(first.created());
    assertFalse(second.created());
    assertEquals(first.citeKey(), second.citeKey());
    verify(bibTexEntryRepository, times(1)).save(any());
  }

  @Test
  void saveCitationEdge_saves_a_direct_citing_cited_edge() {
    citationGraphService.saveCitationEdge(42, "id-reimer2025", "id-harris2020");

    ArgumentCaptor<CitationEdge> savedEdge = ArgumentCaptor.forClass(CitationEdge.class);
    verify(citationEdgeRepository).save(savedEdge.capture());
    assertEquals(
        CitationEdge.makeId(42, "id-reimer2025", "id-harris2020"), savedEdge.getValue().getId());
    assertEquals(42, savedEdge.getValue().getProjectId());
    assertEquals("id-reimer2025", savedEdge.getValue().getCitingEntryId());
    assertEquals("id-harris2020", savedEdge.getValue().getCitedEntryId());
  }
}
