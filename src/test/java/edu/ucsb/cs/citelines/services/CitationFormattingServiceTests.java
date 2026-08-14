package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CitationFormattingServiceTests {

  private CitationFormattingService citationFormattingService;
  private BibTexConverterService bibTexConverterService;

  private static final String SINGLE_ENTRY =
      """
      @article{smith2020,
        author = {Jane Smith},
        title = {A Great Paper},
        journal = {Journal of Testing},
        year = {2020}
      }
      """;

  @BeforeEach
  void setUp() {
    bibTexConverterService = new BibTexConverterService();
    bibTexConverterService.doiService = new DOIService();
    citationFormattingService = new CitationFormattingService();
    citationFormattingService.bibTexConverterService = bibTexConverterService;
  }

  @Test
  void formats_bibtex_using_the_default_style_and_output_format() {
    String result = citationFormattingService.formatBibTex(SINGLE_ENTRY, null, null);

    assertEquals("Smith, J. (2020). A Great Paper. Journal of Testing.", result);
  }

  @Test
  void formats_bibtex_using_a_common_alias_case_insensitively() {
    String upper = citationFormattingService.formatBibTex(SINGLE_ENTRY, "APA", null);
    String lower = citationFormattingService.formatBibTex(SINGLE_ENTRY, "apa", null);

    assertEquals(upper, lower);
    assertEquals("Smith, J. (2020). A Great Paper. Journal of Testing.", upper);
  }

  @Test
  void formats_bibtex_as_html_when_requested() {
    String result = citationFormattingService.formatBibTex(SINGLE_ENTRY, "MLA", "html");

    assertTrue(result.contains("A Great Paper"));
    assertTrue(result.contains("<div class=\"csl-entry\">"));
  }

  @Test
  void accepts_an_arbitrary_csl_style_identifier_not_in_common_aliases() {
    String result = citationFormattingService.formatBibTex(SINGLE_ENTRY, "nature", null);

    assertTrue(result.contains("Smith"));
  }

  @Test
  void formats_multiple_entries_in_citation_key_order() {
    String raw =
        """
        @article{smith2020,
          author = {Jane Smith},
          title = {A Great Paper},
          journal = {Journal of Testing},
          year = {2020}
        }
        @article{doe2019,
          author = {John Doe},
          title = {Another Paper},
          journal = {Journal of Examples},
          year = {2019}
        }
        """;

    String result = citationFormattingService.formatBibTex(raw, "IEEE", null);
    List<String> lines = result.lines().toList();

    assertEquals(2, lines.size());
    assertTrue(lines.get(0).contains("Smith"));
    assertTrue(lines.get(1).contains("Doe"));
  }

  @Test
  void formats_a_stored_bibtex_entry() {
    BibTexEntry entry = bibTexConverterService.parseToEntries(SINGLE_ENTRY, 1).get(0);

    String result = citationFormattingService.formatEntry(entry, "APA", null);

    assertEquals("Smith, J. (2020). A Great Paper. Journal of Testing.", result);
  }

  @Test
  void throws_for_null_bibtex() {
    IllegalArgumentException ex =
        assertThrows(
            IllegalArgumentException.class,
            () -> citationFormattingService.formatBibTex(null, "APA", null));
    assertEquals("BibTeX text must not be empty.", ex.getMessage());
  }

  @Test
  void throws_for_blank_bibtex() {
    IllegalArgumentException ex =
        assertThrows(
            IllegalArgumentException.class,
            () -> citationFormattingService.formatBibTex("   ", "APA", null));
    assertEquals("BibTeX text must not be empty.", ex.getMessage());
  }

  @Test
  void throws_when_no_entries_are_found() {
    IllegalArgumentException ex =
        assertThrows(
            IllegalArgumentException.class,
            () -> citationFormattingService.formatBibTex("not bibtex at all", "APA", null));
    assertEquals("No BibTeX entries were found in the pasted text.", ex.getMessage());
  }

  @Test
  void throws_for_an_unknown_output_format() {
    assertThrows(
        IllegalArgumentException.class,
        () -> citationFormattingService.formatBibTex(SINGLE_ENTRY, "APA", "not-a-real-format"));
  }

  @Test
  void resolve_style_defaults_to_apa_for_blank_input() {
    assertEquals("apa", citationFormattingService.resolveStyle(null));
    assertEquals("apa", citationFormattingService.resolveStyle(""));
    assertEquals("apa", citationFormattingService.resolveStyle("   "));
  }

  @Test
  void resolve_style_passes_through_unrecognized_identifiers() {
    assertEquals("some-custom-style", citationFormattingService.resolveStyle("some-custom-style"));
  }
}
