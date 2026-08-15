package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class BulkCitationUploadFromACMDLViewAllServiceTests {

  private BulkCitationUploadFromACMDLViewAllService service;
  private BibTexEntryRepository bibTexEntryRepository;
  private CitationGraphService citationGraphService;
  private Job job;
  private JobContext ctx;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    citationGraphService = mock(CitationGraphService.class);
    service =
        new BulkCitationUploadFromACMDLViewAllService(
            bibTexEntryRepository, citationGraphService, new DOIService());
    job = Job.builder().build();
    ctx = new JobContext(null, job);
  }

  private static BibTexEntry currentPaper(String citeKey) {
    return BibTexEntry.builder()
        .id("mongo-1")
        .projectId(1)
        .citeKey(citeKey)
        .keyValuePairs(new HashMap<>(Map.of()))
        .build();
  }

  private static ResolvedWork work(String doi, String title) {
    return new ResolvedWork(
        doi,
        doi,
        title,
        2020,
        "article",
        List.of("Jane Smith"),
        "Some Venue",
        List.of(),
        List.of(),
        List.of());
  }

  private void mockCurrentPaperExists(String citeKey) {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, citeKey))
        .thenReturn(Optional.of(currentPaper(citeKey)));
    when(citationGraphService.loadExistingEntries(1))
        .thenReturn(new CitationGraphService.ExistingEntries(new HashMap<>(), new HashSet<>()));
  }

  // ---- parse() ----

  @Test
  void parse_splits_a_typical_multi_entry_block_into_ref_and_doi_pairs() {
    String input =
        "Reimer Y et al. A Pedagogy for Assessing Individual Contributions. Proceedings V.1. (929-935).\n"
            + "https://doi.org/10.1145/3770762.3772609\n"
            + "Saha U et al. The Open Source Resume. Proceedings V.1. (964-970).\n"
            + "https://doi.org/10.1145/3770762.3772529\n";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(2, entries.size());
    assertEquals(
        "Reimer Y et al. A Pedagogy for Assessing Individual Contributions. Proceedings V.1. (929-935).",
        entries.get(0).refText());
    assertEquals("https://doi.org/10.1145/3770762.3772609", entries.get(0).doiLine());
    assertEquals(
        "Saha U et al. The Open Source Resume. Proceedings V.1. (964-970).",
        entries.get(1).refText());
    assertEquals("https://doi.org/10.1145/3770762.3772529", entries.get(1).doiLine());
  }

  @Test
  void parse_accumulates_multi_line_reference_text() {
    String input =
        "First line of the reference.\nSecond line of the reference.\nhttps://doi.org/10.1/x\n";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(1, entries.size());
    assertEquals(
        "First line of the reference. Second line of the reference.", entries.get(0).refText());
  }

  @Test
  void parse_ignores_blank_lines() {
    String input = "\n\nSome reference.\n\nhttps://doi.org/10.1/x\n\n\n";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(1, entries.size());
    assertEquals("Some reference.", entries.get(0).refText());
    assertEquals("https://doi.org/10.1/x", entries.get(0).doiLine());
  }

  @Test
  void parse_returns_an_entry_with_null_doi_line_for_trailing_unpaired_text() {
    String input = "https://doi.org/10.1/x\nA trailing reference with no DOI.";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(2, entries.size());
    assertEquals("A trailing reference with no DOI.", entries.get(1).refText());
    assertNull(entries.get(1).doiLine());
  }

  @Test
  void parse_returns_an_entry_with_null_ref_text_for_a_standalone_doi_line() {
    String input = "https://doi.org/10.1/x\n";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(1, entries.size());
    assertNull(entries.get(0).refText());
    assertEquals("https://doi.org/10.1/x", entries.get(0).doiLine());
  }

  @Test
  void parse_returns_an_empty_list_for_blank_input() {
    assertEquals(0, BulkCitationUploadFromACMDLViewAllService.parse("   \n   \n").size());
  }

  @Test
  void parse_recognizes_http_and_dx_doi_org_variants() {
    String input = "ref one\nhttp://doi.org/10.1/a\nref two\nhttp://dx.doi.org/10.1/b\n";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(2, entries.size());
    assertEquals("http://doi.org/10.1/a", entries.get(0).doiLine());
    assertEquals("http://dx.doi.org/10.1/b", entries.get(1).doiLine());
  }

  @Test
  void parse_does_not_treat_a_doi_org_mention_within_prose_as_a_boundary_line() {
    String input = "See https://doi.org/10.1/x for details.\nhttps://doi.org/10.2/y\n";

    List<BulkCitationUploadFromACMDLViewAllService.ParsedEntry> entries =
        BulkCitationUploadFromACMDLViewAllService.parse(input);

    assertEquals(1, entries.size());
    assertEquals("See https://doi.org/10.1/x for details.", entries.get(0).refText());
    assertEquals("https://doi.org/10.2/y", entries.get(0).doiLine());
  }

  // ---- bulkUpload() ----

  @Test
  void bulkUpload_throws_when_the_current_paper_does_not_exist() {
    when(bibTexEntryRepository.findByProjectIdAndCiteKey(1, "missing"))
        .thenReturn(Optional.empty());

    assertThrows(
        IllegalStateException.class, () -> service.bulkUpload(1, "missing", "anything", ctx));
    assertTrue(job.getLog().contains("Entry not found: missing"));
  }

  @Test
  void bulkUpload_logs_a_zero_summary_for_blank_input() {
    mockCurrentPaperExists("harris2020");

    service.bulkUpload(1, "harris2020", "   \n  ", ctx);

    assertTrue(
        job.getLog()
            .contains("Starting Bulk Citation Upload from ACM DL for harris2020 in project 1"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 0 entries, 0 added, 0 linked to existing entries, 0 errors."));
  }

  @Test
  void bulkUpload_flags_an_entry_with_no_doi_as_an_error() {
    mockCurrentPaperExists("harris2020");

    service.bulkUpload(1, "harris2020", "A trailing reference with no DOI.", ctx);

    assertTrue(job.getLog().contains("no DOI found for this reference"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
    verify(citationGraphService, never()).tryResolveByDoi(any());
  }

  @Test
  void bulkUpload_flags_an_entry_whose_doi_line_does_not_parse_as_a_doi() {
    mockCurrentPaperExists("harris2020");
    String input = "Some reference.\nhttps://doi.org/not-a-valid-doi-format\n";

    service.bulkUpload(1, "harris2020", input, ctx);

    assertTrue(
        job.getLog().contains("https://doi.org/not-a-valid-doi-format is not a recognizable DOI."));
    verify(citationGraphService, never()).tryResolveByDoi(any());
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
  }

  @Test
  void bulkUpload_flags_an_entry_whose_doi_cannot_be_resolved_by_any_provider() {
    mockCurrentPaperExists("harris2020");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.empty());

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    assertTrue(
        job.getLog()
            .contains(
                "https://doi.org/10.1145/3770762.3772609: DOI 10.1145/3770762.3772609 could not be resolved by any provider."));
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
  }

  @Test
  void bulkUpload_flags_an_entry_whose_resolved_work_has_no_recoverable_title() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork blankTitleWork = work("10.1145/3770762.3772609", "");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, blankTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(blankTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(null);

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    assertTrue(job.getLog().contains("no title is available from any provider"));
    verify(citationGraphService, never()).resolveOrCreateEntry(any(), any(Integer.class), any());
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
  }

  @Test
  void bulkUpload_flags_an_entry_whose_resolved_work_has_a_null_title_and_no_recovery() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork nullTitleWork = work("10.1145/3770762.3772609", null);
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, nullTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(nullTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(null);

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    assertTrue(job.getLog().contains("no title is available from any provider"));
  }

  @Test
  void bulkUpload_flags_an_entry_whose_resolved_title_normalizes_to_nothing() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork punctuationOnlyTitleWork = work("10.1145/3770762.3772609", "???");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(
            Optional.of(
                new CitationGraphService.ResolverResult(resolver, punctuationOnlyTitleWork)));
    String input = "Some reference text.\nhttps://doi.org/10.1145/3770762.3772609\n";

    service.bulkUpload(1, "harris2020", input, ctx);

    assertTrue(job.getLog().contains("does not appear to match the pasted reference"));
    verify(citationGraphService, never()).resolveOrCreateEntry(any(), any(Integer.class), any());
  }

  @Test
  void bulkUpload_recovers_a_missing_title_via_another_resolver() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork blankTitleWork = work("10.1145/3770762.3772609", "");
    ResolvedWork recoveredWork = work("10.1145/3770762.3772609", "A Recovered Title");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, blankTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(blankTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(recoveredWork);
    when(citationGraphService.resolveOrCreateEntry(eq(recoveredWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("recovered2020", true));

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    verify(citationGraphService).resolveOrCreateEntry(eq(recoveredWork), eq(1), any());
    verify(citationGraphService).saveCitationEdge(1, "recovered2020", "harris2020");
    assertTrue(job.getLog().contains("Added new entry recovered2020: A Recovered Title"));
  }

  @Test
  void bulkUpload_flags_an_entry_whose_resolved_title_does_not_match_the_pasted_reference() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/3770762.3772609", "A Completely Different Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    String input =
        "This reference is about something else entirely and definitely mentions a different"
            + " title than the resolved one, on purpose, to exceed eighty characters easily.\n"
            + "https://doi.org/10.1145/3770762.3772609\n";

    service.bulkUpload(1, "harris2020", input, ctx);

    assertTrue(job.getLog().contains("does not appear to match the pasted reference"));
    assertTrue(job.getLog().contains("..."));
    verify(citationGraphService, never()).resolveOrCreateEntry(any(), any(Integer.class), any());
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
  }

  @Test
  void bulkUpload_truncates_reference_text_over_eighty_characters_but_not_exactly_eighty() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/3770762.3772609", "A Completely Different Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    String exactlyEighty = "x".repeat(80);
    String input = exactlyEighty + "\nhttps://doi.org/10.1145/3770762.3772609\n";

    service.bulkUpload(1, "harris2020", input, ctx);

    assertTrue(job.getLog().contains("\"" + exactlyEighty + "\""));
    assertFalse(job.getLog().contains(exactlyEighty + "..."));
  }

  @Test
  void bulkUpload_skips_the_title_match_check_when_there_is_no_reference_text() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/3770762.3772609", "Any Title At All");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("newkey2020", true));

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    assertTrue(job.getLog().contains("Added new entry newkey2020: Any Title At All"));
  }

  @Test
  void bulkUpload_flags_an_entry_that_resolves_to_the_current_paper_itself() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/3770762.3772609", "Array Programming");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("harris2020", false));

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    assertTrue(job.getLog().contains("resolves to the current paper itself"));
    verify(citationGraphService, never()).saveCitationEdge(any(Integer.class), any(), any());
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
  }

  @Test
  void bulkUpload_adds_a_new_entry_and_links_a_citation_edge() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork =
        work("10.1145/3770762.3772609", "A Pedagogy for Assessing Contributions");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("reimer2025", true));
    String input =
        "Reimer Y et al. A Pedagogy for Assessing Contributions. Proceedings.\n"
            + "https://doi.org/10.1145/3770762.3772609\n";

    service.bulkUpload(1, "harris2020", input, ctx);

    verify(citationGraphService).saveCitationEdge(1, "reimer2025", "harris2020");
    assertTrue(
        job.getLog()
            .contains("Added new entry reimer2025: A Pedagogy for Assessing Contributions"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 1 added, 0 linked to existing entries, 0 errors."));
  }

  @Test
  void bulkUpload_links_to_an_existing_entry_and_still_creates_a_citation_edge() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/3770762.3772609", "Already Known Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/3770762.3772609"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("known2020", false));

    service.bulkUpload(1, "harris2020", "https://doi.org/10.1145/3770762.3772609\n", ctx);

    verify(citationGraphService).saveCitationEdge(1, "known2020", "harris2020");
    assertTrue(job.getLog().contains("Linking to existing entry known2020: Already Known Paper"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 1 linked to existing entries, 0 errors."));
  }

  @Test
  void bulkUpload_logs_a_correct_summary_with_mixed_outcomes() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork addedWork = work("10.1145/1", "Added Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/1"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, addedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(addedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("added2020", true));
    when(citationGraphService.tryResolveByDoi("10.1145/2")).thenReturn(Optional.empty());
    String input =
        "Added Paper.\nhttps://doi.org/10.1145/1\nSome Other Paper.\nhttps://doi.org/10.1145/2\n";

    service.bulkUpload(1, "harris2020", input, ctx);

    assertTrue(
        job.getLog()
            .contains("Done: checked 2 entries, 1 added, 0 linked to existing entries, 1 errors."));
  }
}
