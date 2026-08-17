package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class BulkReferenceUploadFromACMDLServiceTests {

  private BulkReferenceUploadFromACMDLService service;
  private BibTexEntryRepository bibTexEntryRepository;
  private CitationGraphService citationGraphService;
  private Job job;
  private JobContext ctx;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    citationGraphService = mock(CitationGraphService.class);
    service =
        new BulkReferenceUploadFromACMDLService(
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

  private static String bibliographyWithOneEntry(String externalLinksInnerHtml, String bodyText) {
    return """
        <section id="bibliography">
          <div class="biblioentry">%s
            <div class="external-links">%s</div>
          </div>
        </section>
        """
        .formatted(bodyText, externalLinksInnerHtml);
  }

  // ---- parseBiblioEntries() ----

  @Test
  void parseBiblioEntries_finds_each_biblioentry_within_the_bibliography_section() {
    String html =
        """
        <section id="bibliography">
          <div class="biblioentry">One</div>
          <div class="biblioentry">Two</div>
        </section>
        """;

    List<Element> entries = BulkReferenceUploadFromACMDLService.parseBiblioEntries(html);

    assertEquals(2, entries.size());
    assertEquals("One", entries.get(0).text());
    assertEquals("Two", entries.get(1).text());
  }

  @Test
  void parseBiblioEntries_finds_entries_nested_inside_wrapper_elements() {
    String html =
        """
        <div class="outer">
          <section id="bibliography">
            <ol>
              <li><div class="biblioentry">Nested</div></li>
            </ol>
          </section>
        </div>
        """;

    List<Element> entries = BulkReferenceUploadFromACMDLService.parseBiblioEntries(html);

    assertEquals(1, entries.size());
    assertEquals("Nested", entries.get(0).text());
  }

  @Test
  void parseBiblioEntries_returns_an_empty_list_when_there_is_no_bibliography_section() {
    String html = "<div class=\"biblioentry\">Not inside a bibliography section</div>";

    assertEquals(0, BulkReferenceUploadFromACMDLService.parseBiblioEntries(html).size());
  }

  @Test
  void parseBiblioEntries_returns_an_empty_list_when_the_bibliography_section_is_empty() {
    String html = "<section id=\"bibliography\"></section>";

    assertEquals(0, BulkReferenceUploadFromACMDLService.parseBiblioEntries(html).size());
  }

  // ---- extractRawDoi() ----

  private static Element soleBiblioEntry(String externalLinksInnerHtml) {
    String html = bibliographyWithOneEntry(externalLinksInnerHtml, "");
    return BulkReferenceUploadFromACMDLService.parseBiblioEntries(html).get(0);
  }

  @Test
  void extractRawDoi_extracts_from_a_digital_library_link() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>");

    assertEquals(
        "10.1145/1404520.1404522", BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_extracts_from_a_crossref_link_when_there_is_no_digital_library_link() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-crossref\">"
                + "<a href=\"https://doi.org/10.1080/08993408.2015.1033159\">Crossref</a></div>");

    assertEquals(
        "https://doi.org/10.1080/08993408.2015.1033159",
        BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_extracts_and_url_decodes_a_google_scholar_link() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-google-scholar\">"
                + "<a href=\"https://scholar.google.com/scholar_lookup?doi=10.1145%2F1404520.1404522\">"
                + "Google Scholar</a></div>");

    assertEquals(
        "10.1145/1404520.1404522", BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_prefers_the_digital_library_link_over_crossref_and_google_scholar() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-crossref\">"
                + "<a href=\"https://doi.org/10.1/wrong\">Crossref</a></div>"
                + "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>");

    assertEquals(
        "10.1145/1404520.1404522", BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_prefers_crossref_over_google_scholar() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-google-scholar\">"
                + "<a href=\"https://scholar.google.com/scholar_lookup?doi=10.1%2Fwrong\">GS</a></div>"
                + "<div class=\"core-xlink-crossref\">"
                + "<a href=\"https://doi.org/10.1145/3770762.3772609\">Crossref</a></div>");

    assertEquals(
        "https://doi.org/10.1145/3770762.3772609",
        BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_returns_null_when_there_is_no_external_links_div() {
    String html =
        "<section id=\"bibliography\"><div class=\"biblioentry\">No links here</div></section>";
    Element entry = BulkReferenceUploadFromACMDLService.parseBiblioEntries(html).get(0);

    assertNull(BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_returns_null_when_external_links_has_none_of_the_known_link_types() {
    Element entry = soleBiblioEntry("<div class=\"core-xlink-other\">Something else</div>");

    assertNull(BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
  }

  @Test
  void extractRawDoi_returns_null_when_the_google_scholar_link_has_no_doi_param() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-google-scholar\">"
                + "<a href=\"https://scholar.google.com/scholar_lookup?q=something\">GS</a></div>");

    assertNull(BulkReferenceUploadFromACMDLService.extractRawDoi(entry));
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
  void bulkUpload_logs_a_zero_summary_when_there_is_no_bibliography_section() {
    mockCurrentPaperExists("harris2020");

    service.bulkUpload(1, "harris2020", "<div>no bibliography here</div>", ctx);

    assertTrue(
        job.getLog()
            .contains("Starting Bulk Reference Upload from ACM DL for harris2020 in project 1"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 0 entries, 0 added, 0 linked to existing entries, 0 errors."));
  }

  @Test
  void bulkUpload_flags_an_entry_with_no_doi_as_an_error() {
    mockCurrentPaperExists("harris2020");
    String html = bibliographyWithOneEntry("", "");

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(job.getLog().contains("no DOI found in this entry's external links"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 0 added, 0 linked to existing entries, 1 errors."));
    verify(citationGraphService, never()).tryResolveByDoi(any());
  }

  @Test
  void bulkUpload_flags_an_entry_whose_extracted_doi_does_not_parse_as_a_doi() {
    mockCurrentPaperExists("harris2020");
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-crossref\">"
                + "<a href=\"https://doi.org/not-a-valid-doi-format\">Crossref</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(
        job.getLog().contains("https://doi.org/not-a-valid-doi-format is not a recognizable DOI."));
    verify(citationGraphService, never()).tryResolveByDoi(any());
  }

  @Test
  void bulkUpload_flags_an_entry_whose_doi_cannot_be_resolved_by_any_provider() {
    mockCurrentPaperExists("harris2020");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.empty());
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(
        job.getLog()
            .contains("DOI 10.1145/1404520.1404522 could not be resolved by any provider."));
  }

  @Test
  void bulkUpload_flags_an_entry_whose_resolved_work_has_no_recoverable_title() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork blankTitleWork = work("10.1145/1404520.1404522", "");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, blankTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(blankTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(null);
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(job.getLog().contains("no title is available from any provider"));
    verify(citationGraphService, never()).resolveOrCreateEntry(any(), any(Integer.class), any());
  }

  @Test
  void bulkUpload_flags_an_entry_whose_resolved_work_has_a_null_title_and_no_recovery() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork nullTitleWork = work("10.1145/1404520.1404522", null);
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, nullTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(nullTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(null);
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(job.getLog().contains("no title is available from any provider"));
  }

  @Test
  void bulkUpload_truncates_entry_text_over_eighty_characters_in_error_messages() {
    mockCurrentPaperExists("harris2020");
    String longText = "x".repeat(100);
    String html = bibliographyWithOneEntry("", longText);

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(job.getLog().contains("\"" + "x".repeat(80) + "...\""));
  }

  @Test
  void bulkUpload_does_not_truncate_entry_text_of_exactly_eighty_characters() {
    mockCurrentPaperExists("harris2020");
    String exactlyEighty = "x".repeat(80);
    String html = bibliographyWithOneEntry("", exactlyEighty);

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(job.getLog().contains("\"" + exactlyEighty + "\""));
    assertTrue(!job.getLog().contains(exactlyEighty + "..."));
  }

  @Test
  void bulkUpload_recovers_a_missing_title_via_another_resolver() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork blankTitleWork = work("10.1145/1404520.1404522", "");
    ResolvedWork recoveredWork = work("10.1145/1404520.1404522", "A Recovered Title");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, blankTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(blankTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(recoveredWork);
    when(citationGraphService.resolveOrCreateEntry(eq(recoveredWork), eq(1), any()))
        .thenReturn(
            new CitationGraphService.ResolveOrCreateResult(
                "recovered2020", "id-recovered2020", true));
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    verify(citationGraphService).resolveOrCreateEntry(eq(recoveredWork), eq(1), any());
    verify(citationGraphService).saveCitationEdge(1, "mongo-1", "id-recovered2020");
    assertTrue(job.getLog().contains("Added new entry recovered2020: A Recovered Title"));
  }

  @Test
  void bulkUpload_flags_an_entry_that_resolves_to_the_current_paper_itself() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/1404520.1404522", "Array Programming");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("harris2020", "mongo-1", false));
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(job.getLog().contains("resolves to the current paper itself"));
    verify(citationGraphService, never()).saveCitationEdge(any(Integer.class), any(), any());
  }

  @Test
  void bulkUpload_adds_a_new_entry_and_saves_a_citation_edge_from_the_current_paper() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/1404520.1404522", "A Pedagogy for Assessing");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(
            new CitationGraphService.ResolveOrCreateResult("reimer2025", "id-reimer2025", true));
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    // Reversed direction from Bulk Citations: the current paper cites this new entry.
    verify(citationGraphService).saveCitationEdge(1, "mongo-1", "id-reimer2025");
    assertTrue(job.getLog().contains("Added new entry reimer2025: A Pedagogy for Assessing"));
    assertTrue(
        job.getLog()
            .contains("Done: checked 1 entry, 1 added, 0 linked to existing entries, 0 errors."));
  }

  @Test
  void bulkUpload_links_to_an_existing_entry_and_still_creates_a_citation_edge() {
    mockCurrentPaperExists("harris2020");
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/1404520.1404522", "Already Known Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(
            new CitationGraphService.ResolveOrCreateResult("known2020", "id-known2020", false));
    String html =
        bibliographyWithOneEntry(
            "<div class=\"core-xlink-digital-library\">"
                + "<a href=\"/doi/10.1145/1404520.1404522\">DL</a></div>",
            "");

    service.bulkUpload(1, "harris2020", html, ctx);

    verify(citationGraphService).saveCitationEdge(1, "mongo-1", "id-known2020");
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
        .thenReturn(
            new CitationGraphService.ResolveOrCreateResult("added2020", "id-added2020", true));
    String html =
        """
        <section id="bibliography">
          <div class="biblioentry">
            <div class="external-links">
              <div class="core-xlink-digital-library"><a href="/doi/10.1145/1">DL</a></div>
            </div>
          </div>
          <div class="biblioentry">
            <div class="external-links"></div>
          </div>
        </section>
        """;

    service.bulkUpload(1, "harris2020", html, ctx);

    assertTrue(
        job.getLog()
            .contains("Done: checked 2 entries, 1 added, 0 linked to existing entries, 1 errors."));
  }

  // ---- processEntry() outcomes, asserted directly ----

  private static final CitationGraphService.ExistingEntries EMPTY_EXISTING =
      new CitationGraphService.ExistingEntries(new HashMap<>(), new HashSet<>());

  private static Element digitalLibraryEntry(String doi) {
    return soleBiblioEntry(
        "<div class=\"core-xlink-digital-library\"><a href=\"/doi/%s\">DL</a></div>"
            .formatted(doi));
  }

  @Test
  void processEntry_returns_error_when_there_is_no_doi() {
    Element entry = soleBiblioEntry("");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.ERROR, outcome);
  }

  @Test
  void processEntry_returns_error_when_the_extracted_doi_does_not_parse() {
    Element entry =
        soleBiblioEntry(
            "<div class=\"core-xlink-crossref\">"
                + "<a href=\"https://doi.org/not-a-valid-doi-format\">Crossref</a></div>");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.ERROR, outcome);
  }

  @Test
  void processEntry_returns_error_when_the_doi_cannot_be_resolved() {
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.empty());
    Element entry = digitalLibraryEntry("10.1145/1404520.1404522");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.ERROR, outcome);
  }

  @Test
  void processEntry_returns_error_when_no_title_is_available() {
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork blankTitleWork = work("10.1145/1404520.1404522", "");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, blankTitleWork)));
    when(citationGraphService.tryRecoverMissingTitle(eq(blankTitleWork), eq(resolver), eq(ctx)))
        .thenReturn(null);
    Element entry = digitalLibraryEntry("10.1145/1404520.1404522");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.ERROR, outcome);
  }

  @Test
  void processEntry_returns_error_when_it_resolves_to_the_current_paper_itself() {
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/1404520.1404522", "Array Programming");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(new CitationGraphService.ResolveOrCreateResult("harris2020", "mongo-1", false));
    Element entry = digitalLibraryEntry("10.1145/1404520.1404522");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.ERROR, outcome);
  }

  @Test
  void processEntry_returns_added_for_a_newly_created_entry() {
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/1404520.1404522", "A New Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(
            new CitationGraphService.ResolveOrCreateResult("newkey2020", "id-newkey2020", true));
    Element entry = digitalLibraryEntry("10.1145/1404520.1404522");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.ADDED, outcome);
  }

  @Test
  void processEntry_returns_linked_for_an_existing_entry() {
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork resolvedWork = work("10.1145/1404520.1404522", "Already Known Paper");
    when(citationGraphService.tryResolveByDoi("10.1145/1404520.1404522"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, resolvedWork)));
    when(citationGraphService.resolveOrCreateEntry(eq(resolvedWork), eq(1), any()))
        .thenReturn(
            new CitationGraphService.ResolveOrCreateResult("known2020", "id-known2020", false));
    Element entry = digitalLibraryEntry("10.1145/1404520.1404522");

    var outcome = service.processEntry(entry, 1, currentPaper("harris2020"), EMPTY_EXISTING, ctx);

    assertEquals(BulkReferenceUploadFromACMDLService.Outcome.LINKED, outcome);
  }
}
