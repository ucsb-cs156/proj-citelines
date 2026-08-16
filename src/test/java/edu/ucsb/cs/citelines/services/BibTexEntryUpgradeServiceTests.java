package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

public class BibTexEntryUpgradeServiceTests {

  private BibTexEntryUpgradeService service;
  private BibTexEntryRepository bibTexEntryRepository;
  private CitationGraphService citationGraphService;
  private Job job;
  private JobContext ctx;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    citationGraphService = mock(CitationGraphService.class);
    BibTexConverterService converterService = new BibTexConverterService();
    converterService.doiService = new DOIService();
    service =
        new BibTexEntryUpgradeService(
            bibTexEntryRepository,
            citationGraphService,
            new BibTexSynthesisService(new LaTeXNormalizationService()),
            converterService);
    job = Job.builder().build();
    ctx = new JobContext(null, job);
  }

  private static BibTexEntry entry(String citeKey, Map<String, String> keyValuePairs) {
    return BibTexEntry.builder()
        .id("id-" + citeKey)
        .projectId(1)
        .entryType("misc")
        .citeKey(citeKey)
        .keyValuePairs(keyValuePairs)
        .build();
  }

  private static ResolvedWork richWork() {
    return new ResolvedWork(
        "W1",
        "10.1/x",
        "A Full Title",
        2021,
        "proceedings-article",
        List.of("Ann Author"),
        "Some Venue",
        List.of(),
        List.of(),
        List.of(),
        "An abstract.",
        "Some Publisher",
        "1-10",
        "978-0-00-000000-0",
        "Some Series",
        "Some City",
        "12",
        "3");
  }

  // ---- upgradeEntry() outcomes, asserted directly ----

  @Test
  void upgradeEntry_returns_skipped_no_doi_when_keyValuePairs_is_null() {
    BibTexEntry e = entry("smith2020", null);

    assertEquals(BibTexEntryUpgradeService.Outcome.SKIPPED_NO_DOI, service.upgradeEntry(e, 1, ctx));
  }

  @Test
  void upgradeEntry_returns_skipped_no_doi_when_there_is_no_doi_key() {
    BibTexEntry e = entry("smith2020", new HashMap<>(Map.of("title", "T")));

    assertEquals(BibTexEntryUpgradeService.Outcome.SKIPPED_NO_DOI, service.upgradeEntry(e, 1, ctx));
  }

  @Test
  void upgradeEntry_returns_skipped_no_doi_when_the_doi_is_blank() {
    BibTexEntry e = entry("smith2020", new HashMap<>(Map.of("doi", "   ")));

    assertEquals(BibTexEntryUpgradeService.Outcome.SKIPPED_NO_DOI, service.upgradeEntry(e, 1, ctx));
  }

  @Test
  void upgradeEntry_returns_unresolved_when_no_resolver_has_a_record() {
    BibTexEntry e = entry("smith2020", new HashMap<>(Map.of("doi", "10.1/x")));
    when(citationGraphService.tryResolveByDoi("10.1/x")).thenReturn(Optional.empty());

    assertEquals(BibTexEntryUpgradeService.Outcome.UNRESOLVED, service.upgradeEntry(e, 1, ctx));
    assertTrue(job.getLog().contains("Could not re-resolve smith2020 (DOI 10.1/x)"));
  }

  @Test
  void upgradeEntry_returns_unresolved_when_the_resolved_work_has_a_blank_title() {
    BibTexEntry e = entry("smith2020", new HashMap<>(Map.of("doi", "10.1/x")));
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork blankTitleWork =
        new ResolvedWork(
            "W1", "10.1/x", "", null, null, List.of(), null, List.of(), List.of(), List.of());
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, blankTitleWork)));

    assertEquals(BibTexEntryUpgradeService.Outcome.UNRESOLVED, service.upgradeEntry(e, 1, ctx));
    assertTrue(job.getLog().contains("resolved, but no title is available"));
  }

  @Test
  void upgradeEntry_returns_unresolved_when_the_resolved_work_has_a_null_title() {
    BibTexEntry e = entry("smith2020", new HashMap<>(Map.of("doi", "10.1/x")));
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    ResolvedWork nullTitleWork =
        new ResolvedWork(
            "W1", "10.1/x", null, null, null, List.of(), null, List.of(), List.of(), List.of());
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, nullTitleWork)));

    assertEquals(BibTexEntryUpgradeService.Outcome.UNRESOLVED, service.upgradeEntry(e, 1, ctx));
    assertTrue(job.getLog().contains("resolved, but no title is available"));
  }

  @Test
  void upgradeEntry_returns_already_complete_when_nothing_new_is_available() {
    Map<String, String> existing = new HashMap<>();
    existing.put("doi", "10.1/x");
    existing.put("title", "A Full Title");
    existing.put("author", "Author, Ann");
    existing.put("year", "2021");
    existing.put("booktitle", "Some Venue");
    existing.put("abstract", "An abstract.");
    existing.put("publisher", "Some Publisher");
    existing.put("pages", "1-10");
    existing.put("isbn", "978-0-00-000000-0");
    existing.put("series", "Some Series");
    existing.put("address", "Some City");
    BibTexEntry e = entry("smith2020", existing);
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    assertEquals(
        BibTexEntryUpgradeService.Outcome.ALREADY_COMPLETE, service.upgradeEntry(e, 1, ctx));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void upgradeEntry_fills_in_missing_fields_and_saves() {
    Map<String, String> existing = new HashMap<>();
    existing.put("doi", "10.1/x");
    existing.put("title", "A Full Title");
    BibTexEntry e = entry("smith2020", existing);
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    BibTexEntryUpgradeService.Outcome outcome = service.upgradeEntry(e, 1, ctx);

    assertEquals(BibTexEntryUpgradeService.Outcome.IMPROVED, outcome);
    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    Map<String, String> saved = savedEntry.getValue().getKeyValuePairs();
    assertEquals("An abstract.", saved.get("abstract"));
    assertEquals("Some Publisher", saved.get("publisher"));
    assertEquals("1-10", saved.get("pages"));
    assertEquals("978-0-00-000000-0", saved.get("isbn"));
    assertEquals("Some Series", saved.get("series"));
    assertEquals("Some City", saved.get("address"));
    assertTrue(job.getLog().contains("Improved smith2020: added"));
  }

  @Test
  void upgradeEntry_treats_a_blank_existing_value_the_same_as_a_missing_one() {
    Map<String, String> existing = new HashMap<>();
    existing.put("doi", "10.1/x");
    existing.put("title", "A Full Title");
    existing.put("abstract", "   ");
    BibTexEntry e = entry("smith2020", existing);
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    assertEquals(BibTexEntryUpgradeService.Outcome.IMPROVED, service.upgradeEntry(e, 1, ctx));
    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("An abstract.", savedEntry.getValue().getKeyValuePairs().get("abstract"));
  }

  @Test
  void upgradeEntry_never_overwrites_an_existing_non_blank_value() {
    Map<String, String> existing = new HashMap<>();
    existing.put("doi", "10.1/x");
    existing.put("title", "My Own Hand-Edited Title");
    BibTexEntry e = entry("smith2020", existing);
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    service.upgradeEntry(e, 1, ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("My Own Hand-Edited Title", savedEntry.getValue().getKeyValuePairs().get("title"));
  }

  @Test
  void upgradeEntry_never_changes_entryType_or_citeKey() {
    Map<String, String> existing = new HashMap<>();
    existing.put("doi", "10.1/x");
    existing.put("title", "A Full Title");
    BibTexEntry e = entry("smith2020", existing);
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    service.upgradeEntry(e, 1, ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("misc", savedEntry.getValue().getEntryType());
    assertEquals("smith2020", savedEntry.getValue().getCiteKey());
  }

  @Test
  void upgradeEntry_never_touches_CITELINES_fields() {
    Map<String, String> existing = new HashMap<>();
    existing.put("doi", "10.1/x");
    existing.put("title", "A Full Title");
    existing.put("CITELINES_relevance", "High");
    BibTexEntry e = entry("smith2020", existing);
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/x"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    service.upgradeEntry(e, 1, ctx);

    ArgumentCaptor<BibTexEntry> savedEntry = ArgumentCaptor.forClass(BibTexEntry.class);
    verify(bibTexEntryRepository).save(savedEntry.capture());
    assertEquals("High", savedEntry.getValue().getKeyValuePairs().get("CITELINES_relevance"));
  }

  // ---- upgradeEntries() summary ----

  @Test
  void upgradeEntries_logs_a_correct_summary_with_mixed_outcomes() {
    Map<String, String> noDoi = new HashMap<>(Map.of("title", "No DOI"));
    Map<String, String> noDoi2 = new HashMap<>(Map.of("title", "Also No DOI"));
    Map<String, String> unresolvable = new HashMap<>(Map.of("doi", "10.1/unresolvable"));
    Map<String, String> alreadyComplete = new HashMap<>();
    alreadyComplete.put("doi", "10.1/complete");
    alreadyComplete.put("title", "A Full Title");
    alreadyComplete.put("author", "Author, Ann");
    alreadyComplete.put("year", "2021");
    alreadyComplete.put("booktitle", "Some Venue");
    alreadyComplete.put("abstract", "An abstract.");
    alreadyComplete.put("publisher", "Some Publisher");
    alreadyComplete.put("pages", "1-10");
    alreadyComplete.put("isbn", "978-0-00-000000-0");
    alreadyComplete.put("series", "Some Series");
    alreadyComplete.put("address", "Some City");
    Map<String, String> improvable = new HashMap<>();
    improvable.put("doi", "10.1/improvable");
    improvable.put("title", "A Full Title");

    when(bibTexEntryRepository.findByProjectId(1))
        .thenReturn(
            List.of(
                entry("nodoi2020", noDoi),
                entry("nodoi2021", noDoi2),
                entry("unresolvable2020", unresolvable),
                entry("complete2020", alreadyComplete),
                entry("improvable2020", improvable)));
    when(citationGraphService.tryResolveByDoi("10.1/unresolvable")).thenReturn(Optional.empty());
    CitationMetadataResolver resolver = mock(CitationMetadataResolver.class);
    when(citationGraphService.tryResolveByDoi("10.1/complete"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));
    when(citationGraphService.tryResolveByDoi("10.1/improvable"))
        .thenReturn(Optional.of(new CitationGraphService.ResolverResult(resolver, richWork())));

    service.upgradeEntries(1, ctx);

    assertTrue(job.getLog().contains("Checking 5 entries in project 1 for upgradable metadata."));
    assertTrue(
        job.getLog()
            .contains(
                "Done: checked 5 entries, 1 improved, 1 already complete, 2 skipped (no DOI), 1"
                    + " unresolved."));
    verify(bibTexEntryRepository, times(1)).save(any());
  }

  @Test
  void upgradeEntries_logs_a_singular_entry_count() {
    when(bibTexEntryRepository.findByProjectId(1))
        .thenReturn(List.of(entry("nodoi2020", new HashMap<>())));

    service.upgradeEntries(1, ctx);

    assertTrue(job.getLog().contains("Done: checked 1 entry, 0 improved"));
  }

  @Test
  void upgradeEntries_with_no_entries_logs_a_zero_summary() {
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of());

    service.upgradeEntries(1, ctx);

    assertTrue(
        job.getLog()
            .contains(
                "Done: checked 0 entries, 0 improved, 0 already complete, 0 skipped (no DOI), 0"
                    + " unresolved."));
  }
}
