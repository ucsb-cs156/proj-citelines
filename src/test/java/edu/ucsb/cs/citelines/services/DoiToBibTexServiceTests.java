package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.errors.DoiNotFoundException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class DoiToBibTexServiceTests {

  private DoiToBibTexService doiToBibTexService;
  private BibTexEntryRepository bibTexEntryRepository;
  private OpenAlexService openAlexService;
  private SemanticScholarResolver semanticScholarResolver;
  private CrossrefResolver crossrefResolver;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    openAlexService = mock(OpenAlexService.class);
    semanticScholarResolver = mock(SemanticScholarResolver.class);
    crossrefResolver = mock(CrossrefResolver.class);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of());

    doiToBibTexService =
        new DoiToBibTexService(
            new DOIService(),
            new BibTexSynthesisService(new LaTeXNormalizationService()),
            bibTexEntryRepository,
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
  void throws_DoiNotFoundException_when_a_resolver_returns_a_work_with_no_title() {
    ResolvedWork blankTitleWork =
        new ResolvedWork(
            "id",
            "10.1038/s41586-020-2649-2",
            null,
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
}
