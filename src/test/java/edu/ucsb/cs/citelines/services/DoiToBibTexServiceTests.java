package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.errors.DoiNotFoundException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class DoiToBibTexServiceTests {

  private DoiToBibTexService doiToBibTexService;
  private BibTexEntryRepository bibTexEntryRepository;
  private CitationGraphService citationGraphService;
  private OpenAlexService openAlexService;
  private SemanticScholarResolver semanticScholarResolver;
  private CrossrefResolver crossrefResolver;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    citationGraphService = mock(CitationGraphService.class);
    openAlexService = mock(OpenAlexService.class);
    semanticScholarResolver = mock(SemanticScholarResolver.class);
    crossrefResolver = mock(CrossrefResolver.class);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of());

    doiToBibTexService =
        new DoiToBibTexService(
            new DOIService(),
            new BibTexSynthesisService(new LaTeXNormalizationService()),
            bibTexEntryRepository,
            citationGraphService,
            openAlexService,
            semanticScholarResolver,
            crossrefResolver);
  }

  private static ResolvedWork resolvedWork() {
    return new ResolvedWork(
        "W3035965352",
        "10.1038/s41586-020-2649-2",
        "Array programming with NumPy",
        2020,
        "article",
        List.of("Charles R. Harris"),
        "Nature",
        List.of(),
        List.of(),
        List.of());
  }

  @Test
  void resolves_a_doi_found_by_the_first_resolver() {
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(resolvedWork()));

    String bibtex =
        doiToBibTexService.resolveToBibTex("https://doi.org/10.1038/s41586-020-2649-2", 1, null);

    assertTrue(bibtex.contains("harris2020"));
    assertTrue(bibtex.contains("Array programming with NumPy"));
  }

  @Test
  void falls_back_to_later_resolvers_when_earlier_ones_have_no_record() {
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.empty());
    when(crossrefResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(resolvedWork()));

    String bibtex = doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, null);

    assertTrue(bibtex.contains("harris2020"));
  }

  @Test
  void includes_a_CITELINES_relevance_field_when_relevance_is_provided() {
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(resolvedWork()));

    String bibtex = doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, "High");

    assertTrue(bibtex.contains("CITELINES_relevance = {High}"));
  }

  @Test
  void omits_the_CITELINES_relevance_field_when_relevance_is_an_empty_string() {
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(resolvedWork()));

    String bibtex = doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, "");

    assertTrue(!bibtex.contains("CITELINES_relevance"));
  }

  @Test
  void escapes_brace_characters_in_a_provided_relevance_value() {
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(resolvedWork()));

    String bibtex =
        doiToBibTexService.resolveToBibTex(
            "10.1038/s41586-020-2649-2", 1, "High},bogus_field={injected");

    assertTrue(
        bibtex.contains("CITELINES_relevance = {High\\},bogus_field=\\{injected},"),
        () -> "unexpected bibtex: " + bibtex);
  }

  @Test
  void generates_a_citeKey_that_does_not_collide_with_an_existing_one() {
    when(bibTexEntryRepository.findByProjectId(1))
        .thenReturn(List.of(BibTexEntry.builder().projectId(1).citeKey("harris2020").build()));
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(resolvedWork()));

    String bibtex = doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, null);

    assertTrue(bibtex.contains("harris2020a"));
  }

  @Test
  void throws_DoiNotFoundException_when_the_string_is_not_a_recognizable_doi() {
    assertThrows(
        DoiNotFoundException.class, () -> doiToBibTexService.resolveToBibTex("not a doi", 1, null));
  }

  @Test
  void throws_DoiNotFoundException_when_no_resolver_has_a_record() {
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.empty());
    when(crossrefResolver.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());

    DoiNotFoundException exception =
        assertThrows(
            DoiNotFoundException.class,
            () -> doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, null));
    assertEquals(
        "Could not find a citation for DOI: 10.1038/s41586-020-2649-2", exception.getMessage());
  }

  @Test
  void throws_DoiNotFoundException_when_a_resolver_returns_a_work_with_a_blank_title() {
    ResolvedWork blankTitleWork =
        new ResolvedWork(
            "id",
            "10.1038/s41586-020-2649-2",
            "",
            null,
            null,
            List.of(),
            null,
            List.of(),
            List.of(),
            List.of());
    when(openAlexService.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.of(blankTitleWork));
    when(semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2"))
        .thenReturn(Optional.empty());
    when(crossrefResolver.resolveByDoi("10.1038/s41586-020-2649-2")).thenReturn(Optional.empty());

    assertThrows(
        DoiNotFoundException.class,
        () -> doiToBibTexService.resolveToBibTex("10.1038/s41586-020-2649-2", 1, null));
  }

  @Test
  void finds_an_existing_entry_for_a_doi_already_in_the_project() {
    BibTexEntry existingEntry = BibTexEntry.builder().projectId(1).citeKey("harris2020").build();
    when(citationGraphService.loadExistingEntries(1))
        .thenReturn(
            new CitationGraphService.ExistingEntries(
                Map.of("10.1038/s41586-020-2649-2", existingEntry), Set.of("harris2020")));

    Optional<BibTexEntry> found =
        doiToBibTexService.findExistingEntryForDoi("10.1038/s41586-020-2649-2", 1);

    assertTrue(found.isPresent());
    assertEquals("harris2020", found.get().getCiteKey());
  }

  @Test
  void returns_empty_when_no_existing_entry_matches_the_doi() {
    when(citationGraphService.loadExistingEntries(1))
        .thenReturn(new CitationGraphService.ExistingEntries(Map.of(), Set.of()));

    Optional<BibTexEntry> found =
        doiToBibTexService.findExistingEntryForDoi("10.1038/s41586-020-2649-2", 1);

    assertFalse(found.isPresent());
  }

  @Test
  void returns_empty_without_consulting_the_project_when_the_string_is_not_a_recognizable_doi() {
    Optional<BibTexEntry> found = doiToBibTexService.findExistingEntryForDoi("not a doi", 1);

    assertFalse(found.isPresent());
    verify(citationGraphService, never()).loadExistingEntries(1);
  }
}
