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
    synthesisService = new BibTexSynthesisService(new LaTeXNormalizationService());
    converterService = new BibTexConverterService();
    converterService.doiService = new DOIService();
  }

  private static ResolvedWork work(
      String id,
      String doi,
      String title,
      Integer year,
      String type,
      List<String> authorNames,
      String venue) {
    return new ResolvedWork(
        id, doi, title, year, type, authorNames, venue, List.of(), List.of(), List.of());
  }

  private static ResolvedWork article() {
    return work(
        "W3035965352",
        "10.1038/s41586-020-2649-2",
        "Array programming with NumPy",
        2020,
        "article",
        List.of("Charles R. Harris", "K. Jarrod Millman"),
        "Nature");
  }

  private static ResolvedWork fullWork(String type) {
    return new ResolvedWork(
        "W1",
        null,
        "A Full Work",
        2021,
        type,
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
    ResolvedWork w =
        work("W1", null, "A Conference Paper", 2021, "proceedings-article", List.of(), "ICSE");

    String bibtex = synthesisService.synthesizeRawBibTex(w, "anon2021");
    assertTrue(bibtex.startsWith("@inproceedings{anon2021,"));

    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);
    assertEquals("inproceedings", entry.getEntryType());
    assertEquals("ICSE", entry.getKeyValuePairs().get("booktitle"));
  }

  @Test
  void maps_book_chapter_to_incollection_with_a_booktitle_field() {
    ResolvedWork w = work("W1", null, "A Chapter", 2019, "book-chapter", List.of(), "The Book");

    String bibtex = synthesisService.synthesizeRawBibTex(w, "anon2019");
    assertTrue(bibtex.startsWith("@incollection{anon2019,"));

    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);
    assertEquals("incollection", entry.getEntryType());
    assertEquals("The Book", entry.getKeyValuePairs().get("booktitle"));
  }

  @Test
  void maps_an_unrecognized_type_to_misc() {
    ResolvedWork w = work("W1", null, "Something Unusual", null, "dataset", List.of(), null);

    String bibtex = synthesisService.synthesizeRawBibTex(w, "unusual");
    assertTrue(bibtex.startsWith("@misc{unusual,"));
  }

  @Test
  void omits_optional_fields_that_are_absent() {
    ResolvedWork w = work("W1", null, "Bare Title Only", null, "article", List.of(), null);

    String bibtex = synthesisService.synthesizeRawBibTex(w, "bare");
    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);

    assertEquals("Bare Title Only", entry.getKeyValuePairs().get("title"));
    assertTrue(!entry.getKeyValuePairs().containsKey("author"));
    assertTrue(!entry.getKeyValuePairs().containsKey("year"));
    assertTrue(!entry.getKeyValuePairs().containsKey("journal"));
    assertTrue(!entry.getKeyValuePairs().containsKey("doi"));
  }

  @Test
  void throws_if_title_is_missing() {
    ResolvedWork w = work("W1", null, null, null, "article", List.of(), null);
    assertThrows(
        IllegalArgumentException.class, () -> synthesisService.synthesizeRawBibTex(w, "x"));
  }

  @Test
  void throws_if_title_is_blank() {
    ResolvedWork w = work("W1", null, "   ", null, "article", List.of(), null);
    assertThrows(
        IllegalArgumentException.class, () -> synthesisService.synthesizeRawBibTex(w, "x"));
  }

  @Test
  void treats_a_null_author_list_the_same_as_no_authors() {
    ResolvedWork w = work("W1", null, "Title", null, "article", null, null);
    String bibtex = synthesisService.synthesizeRawBibTex(w, "x");
    assertTrue(!bibtex.contains("author"));
  }

  @Test
  void omits_venue_and_doi_when_blank_rather_than_null() {
    ResolvedWork w = work("W1", "  ", "Title", null, "article", List.of(), "  ");
    BibTexEntry entry =
        converterService.parseToEntries(synthesisService.synthesizeRawBibTex(w, "x"), 1).get(0);
    assertTrue(!entry.getKeyValuePairs().containsKey("journal"));
    assertTrue(!entry.getKeyValuePairs().containsKey("doi"));
  }

  @Test
  void strips_stray_braces_from_title_and_venue() {
    ResolvedWork w = work("W1", null, "A {Weird} Title", 2020, "article", List.of(), "A {Venue}");

    String bibtex = synthesisService.synthesizeRawBibTex(w, "weird2020");
    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);
    assertEquals("A Weird Title", entry.getKeyValuePairs().get("title"));
    assertEquals("A Venue", entry.getKeyValuePairs().get("journal"));
  }

  @Test
  void normalizes_latex_escapes_in_title_venue_and_author() {
    ResolvedWork w =
        work(
            "W1",
            null,
            "A Schr{\\\"{o}}der Theorem",
            2020,
            "article",
            List.of("M{\\\"u}ller"),
            "Nystr{\\\"o}m Journal");

    String bibtex = synthesisService.synthesizeRawBibTex(w, "x");
    BibTexEntry entry = converterService.parseToEntries(bibtex, 1).get(0);
    assertEquals("A Schröder Theorem", entry.getKeyValuePairs().get("title"));
    assertEquals("Nyström Journal", entry.getKeyValuePairs().get("journal"));
    assertEquals("Müller", entry.getKeyValuePairs().get("author"));
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
  void generateUniqueCiteKey_tries_the_letter_z_before_falling_back_to_numbers() {
    Set<String> taken = new java.util.HashSet<>();
    taken.add("harris2020");
    for (char c = 'a'; c < 'z'; c++) {
      taken.add("harris2020" + c);
    }
    // only 'z' remains free among the 26 letters
    String citeKey = synthesisService.generateUniqueCiteKey(article(), taken);
    assertEquals("harris2020z", citeKey);
  }

  @Test
  void generateUniqueCiteKey_falls_back_to_entry_and_no_year_when_both_are_missing() {
    ResolvedWork w = work("W1", null, "Title", null, "article", List.of(), null);
    assertEquals("entry", synthesisService.generateUniqueCiteKey(w, Set.of()));
  }

  @Test
  void generateUniqueCiteKey_falls_back_to_entry_when_the_author_list_is_null() {
    ResolvedWork w = work("W1", null, "Title", 2020, "article", null, null);
    assertEquals("entry2020", synthesisService.generateUniqueCiteKey(w, Set.of()));
  }

  @Test
  void generateUniqueCiteKey_falls_back_to_entry_when_the_first_authors_name_has_no_letters() {
    ResolvedWork w = work("W1", null, "Title", 2020, "article", List.of("."), null);
    assertEquals("entry2020", synthesisService.generateUniqueCiteKey(w, Set.of()));
  }

  @Test
  void inproceedings_emits_publisher_address_pages_isbn_and_series() {
    BibTexEntry entry =
        converterService
            .parseToEntries(
                synthesisService.synthesizeRawBibTex(fullWork("proceedings-article"), "x"), 1)
            .get(0);

    assertEquals("Some Publisher", entry.getKeyValuePairs().get("publisher"));
    assertEquals("Some City", entry.getKeyValuePairs().get("address"));
    assertEquals("1-10", entry.getKeyValuePairs().get("pages"));
    assertEquals("978-0-00-000000-0", entry.getKeyValuePairs().get("isbn"));
    assertEquals("Some Series", entry.getKeyValuePairs().get("series"));
    assertTrue(!entry.getKeyValuePairs().containsKey("volume"));
    assertTrue(!entry.getKeyValuePairs().containsKey("number"));
  }

  @Test
  void article_emits_pages_volume_and_number_but_not_publisher_address_isbn_or_series() {
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(fullWork("article"), "x"), 1)
            .get(0);

    assertEquals("1-10", entry.getKeyValuePairs().get("pages"));
    assertEquals("12", entry.getKeyValuePairs().get("volume"));
    assertEquals("3", entry.getKeyValuePairs().get("number"));
    assertTrue(!entry.getKeyValuePairs().containsKey("publisher"));
    assertTrue(!entry.getKeyValuePairs().containsKey("address"));
    assertTrue(!entry.getKeyValuePairs().containsKey("isbn"));
    assertTrue(!entry.getKeyValuePairs().containsKey("series"));
  }

  @Test
  void book_emits_publisher_address_isbn_series_and_volume_but_not_pages_or_number() {
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(fullWork("book"), "x"), 1)
            .get(0);

    assertEquals("Some Publisher", entry.getKeyValuePairs().get("publisher"));
    assertEquals("12", entry.getKeyValuePairs().get("volume"));
    assertTrue(!entry.getKeyValuePairs().containsKey("pages"));
    assertTrue(!entry.getKeyValuePairs().containsKey("number"));
  }

  @Test
  void techreport_emits_publisher_address_and_number_but_not_pages_isbn_series_or_volume() {
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(fullWork("report"), "x"), 1)
            .get(0);

    assertEquals("Some Publisher", entry.getKeyValuePairs().get("publisher"));
    assertEquals("Some City", entry.getKeyValuePairs().get("address"));
    assertEquals("3", entry.getKeyValuePairs().get("number"));
    assertTrue(!entry.getKeyValuePairs().containsKey("pages"));
    assertTrue(!entry.getKeyValuePairs().containsKey("isbn"));
    assertTrue(!entry.getKeyValuePairs().containsKey("series"));
    assertTrue(!entry.getKeyValuePairs().containsKey("volume"));
  }

  @Test
  void an_unrecognized_type_emits_none_of_the_type_scoped_fields() {
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(fullWork("dataset"), "x"), 1)
            .get(0);

    assertTrue(!entry.getKeyValuePairs().containsKey("pages"));
    assertTrue(!entry.getKeyValuePairs().containsKey("publisher"));
    assertTrue(!entry.getKeyValuePairs().containsKey("isbn"));
    assertTrue(!entry.getKeyValuePairs().containsKey("series"));
    assertTrue(!entry.getKeyValuePairs().containsKey("address"));
    assertTrue(!entry.getKeyValuePairs().containsKey("volume"));
    assertTrue(!entry.getKeyValuePairs().containsKey("number"));
  }

  @Test
  void abstract_is_emitted_regardless_of_entry_type() {
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(fullWork("dataset"), "x"), 1)
            .get(0);

    assertEquals("An abstract.", entry.getKeyValuePairs().get("abstract"));
  }

  @Test
  void a_blank_abstract_is_omitted() {
    ResolvedWork w =
        new ResolvedWork(
            "W1", null, "Title", null, "article", List.of(), null, List.of(), List.of(), List.of(),
            "   ", null, null, null, null, null, null, null);

    String bibtex = synthesisService.synthesizeRawBibTex(w, "x");
    assertTrue(!bibtex.contains("abstract"));
  }

  @Test
  void free_text_type_scoped_fields_are_latex_normalized_and_stripped_of_stray_braces() {
    ResolvedWork w =
        new ResolvedWork(
            "W1",
            null,
            "Title",
            null,
            "book",
            List.of(),
            null,
            List.of(),
            List.of(),
            List.of(),
            null,
            "A {Weird} Publisher",
            null,
            null,
            null,
            "A {Weird} City",
            null,
            null);

    BibTexEntry entry =
        converterService.parseToEntries(synthesisService.synthesizeRawBibTex(w, "x"), 1).get(0);
    assertEquals("A Weird Publisher", entry.getKeyValuePairs().get("publisher"));
    assertEquals("A Weird City", entry.getKeyValuePairs().get("address"));
  }

  @Test
  void formats_a_single_word_author_name_without_a_comma() {
    ResolvedWork w = work("W1", null, "Title", 2020, "article", List.of("Cher"), null);
    BibTexEntry entry =
        converterService
            .parseToEntries(synthesisService.synthesizeRawBibTex(w, "cher2020"), 1)
            .get(0);
    assertEquals("Cher", entry.getKeyValuePairs().get("author"));
  }
}
