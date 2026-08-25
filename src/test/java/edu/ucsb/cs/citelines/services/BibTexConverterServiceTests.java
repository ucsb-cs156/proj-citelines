package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BibTexConverterServiceTests {

  private BibTexConverterService bibTexConverterService;

  @BeforeEach
  void setUp() {
    bibTexConverterService = new BibTexConverterService();
    bibTexConverterService.doiService = new DOIService();
  }

  @Test
  void parses_a_single_entry() {
    String raw =
        """
        @article{smith2020,
          author = {Jane Smith},
          title = {A Great Paper},
          year = {2020}
        }
        """;

    List<BibTexEntry> entries = bibTexConverterService.parseToEntries(raw, 42);

    assertEquals(1, entries.size());
    BibTexEntry entry = entries.get(0);
    assertEquals(42, entry.getProjectId());
    assertEquals("article", entry.getEntryType());
    assertEquals("smith2020", entry.getCiteKey());
    assertEquals("Jane Smith", entry.getKeyValuePairs().get("author"));
    assertEquals("A Great Paper", entry.getKeyValuePairs().get("title"));
    assertEquals("2020", entry.getKeyValuePairs().get("year"));
  }

  @Test
  void field_names_are_lowercased() {
    String raw =
        """
        @Article{key1,
          Author = {Jane Smith},
          TITLE = {A Great Paper}
        }
        """;

    BibTexEntry entry = bibTexConverterService.parseToEntries(raw, 1).get(0);

    assertEquals("article", entry.getEntryType());
    assertTrue(entry.getKeyValuePairs().containsKey("author"));
    assertTrue(entry.getKeyValuePairs().containsKey("title"));
  }

  @Test
  void parses_multiple_entries_in_one_paste() {
    String raw =
        """
        @article{smith2020,
          title = {A Great Paper}
        }
        @book{jones2019,
          title = {A Different Book}
        }
        """;

    List<BibTexEntry> entries = bibTexConverterService.parseToEntries(raw, 7);

    assertEquals(2, entries.size());
    assertTrue(entries.stream().anyMatch(e -> e.getCiteKey().equals("smith2020")));
    assertTrue(entries.stream().anyMatch(e -> e.getCiteKey().equals("jones2019")));
    entries.forEach(e -> assertEquals(7, e.getProjectId()));
  }

  @Test
  void normalizes_a_recognizable_doi_field() {
    String raw =
        """
        @article{smith2020,
          doi = {https://doi.org/10.1038/S41586-020-2649-2}
        }
        """;

    BibTexEntry entry = bibTexConverterService.parseToEntries(raw, 1).get(0);

    assertEquals("10.1038/s41586-020-2649-2", entry.getKeyValuePairs().get("doi"));
  }

  @Test
  void leaves_an_unrecognizable_doi_field_value_unchanged() {
    String raw =
        """
        @article{smith2020,
          doi = {not-a-doi-at-all}
        }
        """;

    BibTexEntry entry = bibTexConverterService.parseToEntries(raw, 1).get(0);

    assertEquals("not-a-doi-at-all", entry.getKeyValuePairs().get("doi"));
  }

  @Test
  void throws_for_null_input() {
    IllegalArgumentException ex =
        assertThrows(
            IllegalArgumentException.class, () -> bibTexConverterService.parseToEntries(null, 1));
    assertEquals("BibTeX text must not be empty.", ex.getMessage());
  }

  @Test
  void throws_for_blank_input() {
    assertThrows(
        IllegalArgumentException.class, () -> bibTexConverterService.parseToEntries("   ", 1));
  }

  @Test
  void throws_a_friendly_error_for_malformed_bibtex() {
    String raw = "@article{smith2020, title = {Missing closing brace";

    IllegalArgumentException ex =
        assertThrows(
            IllegalArgumentException.class, () -> bibTexConverterService.parseToEntries(raw, 1));
    assertTrue(ex.getMessage().startsWith("Could not parse BibTeX:"));
  }

  @Test
  void throws_when_no_entries_are_found() {
    String raw = "% just a comment, no entries here";

    IllegalArgumentException ex =
        assertThrows(
            IllegalArgumentException.class, () -> bibTexConverterService.parseToEntries(raw, 1));
    assertEquals("No BibTeX entries were found in the pasted text.", ex.getMessage());
  }

  @Test
  void converts_an_entry_back_to_bibtex_text() throws Exception {
    BibTexEntry entry =
        BibTexEntry.builder()
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper", "year", "2020"))
            .build();

    String bibtex = bibTexConverterService.convertEntryToBibTexString(entry);

    assertTrue(bibtex.contains("@article{smith2020"));
    assertTrue(bibtex.contains("title"));
    assertTrue(bibtex.contains("A Great Paper"));
  }

  @Test
  void converts_an_entry_with_no_fields_back_to_bibtex_text() throws Exception {
    BibTexEntry entry =
        BibTexEntry.builder()
            .projectId(1)
            .entryType("misc")
            .citeKey("empty2020")
            .keyValuePairs(Map.of())
            .build();

    String bibtex = bibTexConverterService.convertEntryToBibTexString(entry);

    assertTrue(bibtex.contains("@misc{empty2020"));
  }

  @Test
  void converts_an_entry_with_null_fields_back_to_bibtex_text() throws Exception {
    BibTexEntry entry =
        BibTexEntry.builder()
            .projectId(1)
            .entryType("misc")
            .citeKey("nullfields2020")
            .keyValuePairs(null)
            .build();

    String bibtex = bibTexConverterService.convertEntryToBibTexString(entry);

    assertTrue(bibtex.contains("@misc{nullfields2020"));
  }

  @Test
  void round_trips_an_entry_through_bibtex_text() throws Exception {
    BibTexEntry original =
        BibTexEntry.builder()
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper", "year", "2020"))
            .build();

    String bibtex = bibTexConverterService.convertEntryToBibTexString(original);
    BibTexEntry roundTripped = bibTexConverterService.parseToEntries(bibtex, 1).get(0);

    assertEquals(original.getEntryType(), roundTripped.getEntryType());
    assertEquals(original.getCiteKey(), roundTripped.getCiteKey());
    assertEquals(original.getKeyValuePairs(), roundTripped.getKeyValuePairs());
  }

  // Regression test for a real bug: a field value (e.g. an abstract) containing a literal "
  // used to always be written out "-delimited, producing invalid BibTeX that this same parser
  // then rejected on re-import (e.g. when saving after a Relevance change re-sends the exported
  // text unchanged) — a 400 with no server-side log line, since ApiController's exception
  // handler doesn't log.
  @Test
  void round_trips_an_entry_whose_value_contains_an_embedded_quote() throws Exception {
    BibTexEntry original =
        BibTexEntry.builder()
            .projectId(1)
            .entryType("misc")
            .citeKey("parnas2002")
            .keyValuePairs(
                Map.of(
                    "abstract", "...deserve to be called \"engineering\".",
                    "title", "Software aging"))
            .build();

    String bibtex = bibTexConverterService.convertEntryToBibTexString(original);
    BibTexEntry roundTripped = bibTexConverterService.parseToEntries(bibtex, 1).get(0);

    assertEquals(original.getKeyValuePairs(), roundTripped.getKeyValuePairs());
  }
}
