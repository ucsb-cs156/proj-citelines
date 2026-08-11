package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class BibTexSynthesisServiceTests {

  private BibTexSynthesisService synthesisService;
  private BibTexConverterService converterService;

  @BeforeEach
  void setup() {
    synthesisService = new BibTexSynthesisService();
    converterService = new BibTexConverterService();
    converterService.doiService = new DOIService();
  }

  private static OpenAlexWork article() {
    return new OpenAlexWork(
        "W3035965352",
        "10.1038/s41586-020-2649-2",
        "Array programming with NumPy",
        2020,
        "article",
        List.of("Charles R. Harris", "K. Jarrod Millman"),
        "Nature",
        List.of());
  }

  @Test
  void synthesizes_a_bibtex_string_that_the_real_converter_can_parse_back() {
    String bibtex = synthesisService.synthesizeRawBibTex(article(), "harris2020");

    List<BibTexEntry> parsed = converterService.parseToEntries(bibtex, 42);
    assertEquals(1, parsed.size());
    BibTexEntry entry = parsed.get(0);
    assertEquals("article", entry.getEntryType());
    assertEquals("harris2020", entry.getCiteKey());
    assertEquals("Array programming with NumPy", entry.getKeyValuePairs().get("title"));
    assertEquals(
        "Harris, Charles R. and Millman, K. Jarrod", entry.getKeyValuePairs().get("author"));
    assertEquals("2020", entry.getKeyValuePairs().get("year"));
    assertEquals("Nature", entry.getKeyValuePairs().get("journal"));
    assertEquals("10.1038/s41586-020-2649-2", entry.getKeyValuePairs().get("doi"));
  }

  @Test
  void maps_proceedings_article_to_inproceedings_with_a_booktitle_field() {
    OpenAlexWork work =
        new OpenAlexWork(
            "W1",
            null,
            "A Conference Paper",
            2021,
            "proceedings-article",
            List.of(),
            "ICSE",
            List.of());

    String bibtex = synthesisService.synthesizeRawBibTex(work, "anon2021");
    assertTrue(bibtex.startsWith("@inproceedings{anon2021,"));

    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);
    assertEquals("inproceedings", entry.getEntryType());
    assertEquals("ICSE", entry.getKeyValuePairs().get("booktitle"));
  }

  @Test
  void maps_an_unrecognized_type_to_misc() {
    OpenAlexWork work =
        new OpenAlexWork(
            "W1", null, "Something Unusual", null, "dataset", List.of(), null, List.of());

    String bibtex = synthesisService.synthesizeRawBibTex(work, "unusual");
    assertTrue(bibtex.startsWith("@misc{unusual,"));
  }

  @Test
  void omits_optional_fields_that_are_absent() {
    OpenAlexWork work =
        new OpenAlexWork(
            "W1", null, "Bare Title Only", null, "article", List.of(), null, List.of());

    String bibtex = synthesisService.synthesizeRawBibTex(work, "bare");
    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);

    assertEquals("Bare Title Only", entry.getKeyValuePairs().get("title"));
    assertTrue(!entry.getKeyValuePairs().containsKey("author"));
    assertTrue(!entry.getKeyValuePairs().containsKey("year"));
    assertTrue(!entry.getKeyValuePairs().containsKey("journal"));
    assertTrue(!entry.getKeyValuePairs().containsKey("doi"));
  }

  @Test
  void throws_if_title_is_missing() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, null, null, "article", List.of(), null, List.of());
    assertThrows(
        IllegalArgumentException.class, () -> synthesisService.synthesizeRawBibTex(work, "x"));
  }

  @Test
  void throws_if_title_is_blank() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, "   ", null, "article", List.of(), null, List.of());
    assertThrows(
        IllegalArgumentException.class, () -> synthesisService.synthesizeRawBibTex(work, "x"));
  }

  @Test
  void treats_a_null_author_list_the_same_as_no_authors() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, "Title", null, "article", null, null, List.of());
    String bibtex = synthesisService.synthesizeRawBibTex(work, "x");
    assertTrue(!bibtex.contains("author"));
  }

  @Test
  void omits_venue_and_doi_when_blank_rather_than_null() {
    OpenAlexWork work =
        new OpenAlexWork("W1", "  ", "Title", null, "article", List.of(), "  ", List.of());
    BibTexEntry entry =
        converterService.parseToEntries(synthesisService.synthesizeRawBibTex(work, "x"), 1).get(0);
    assertTrue(!entry.getKeyValuePairs().containsKey("journal"));
    assertTrue(!entry.getKeyValuePairs().containsKey("doi"));
  }

  @Test
  void strips_stray_braces_from_title_and_venue() {
    OpenAlexWork work =
        new OpenAlexWork(
            "W1", null, "A {Weird} Title", 2020, "article", List.of(), "A {Venue}", List.of());

    String bibtex = synthesisService.synthesizeRawBibTex(work, "weird2020");
    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);
    assertEquals("A Weird Title", entry.getKeyValuePairs().get("title"));
    assertEquals("A Venue", entry.getKeyValuePairs().get("journal"));
  }

  @Test
  void generateUniqueCiteKey_uses_first_author_lastname_and_year() {
    String citeKey = synthesisService.generateUniqueCiteKey(article(), Set.of());
    assertEquals("harris2020", citeKey);
  }

  @Test
  void generateUniqueCiteKey_disambiguates_with_a_letter_suffix() {
    String citeKey = synthesisService.generateUniqueCiteKey(article(), Set.of("harris2020"));
    assertEquals("harris2020a", citeKey);
  }

  @Test
  void
      generateUniqueCiteKey_falls_back_through_all_26_letters_then_increments_past_a_taken_number() {
    Set<String> taken = new java.util.HashSet<>();
    taken.add("harris2020");
    for (char c = 'a'; c <= 'z'; c++) {
      taken.add("harris2020" + c);
    }
    taken.add("harris20202");
    String citeKey = synthesisService.generateUniqueCiteKey(article(), taken);
    assertEquals("harris20203", citeKey);
  }

  @Test
  void generateUniqueCiteKey_falls_back_to_entry_and_no_year_when_both_are_missing() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, "Title", null, "article", List.of(), null, List.of());
    assertEquals("entry", synthesisService.generateUniqueCiteKey(work, Set.of()));
  }

  @Test
  void generateUniqueCiteKey_falls_back_to_entry_when_the_author_list_is_null() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, "Title", 2020, "article", null, null, List.of());
    assertEquals("entry2020", synthesisService.generateUniqueCiteKey(work, Set.of()));
  }

  @Test
  void generateUniqueCiteKey_falls_back_to_entry_when_the_first_authors_name_has_no_letters() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, "Title", 2020, "article", List.of("."), null, List.of());
    assertEquals("entry2020", synthesisService.generateUniqueCiteKey(work, Set.of()));
  }

  @Test
  void formats_a_single_word_author_name_without_a_comma() {
    OpenAlexWork work =
        new OpenAlexWork("W1", null, "Title", 2020, "article", List.of("Cher"), null, List.of());
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(work, "cher2020"), 1)
            .get(0);
    assertEquals("Cher", entry.getKeyValuePairs().get("author"));
  }
}
