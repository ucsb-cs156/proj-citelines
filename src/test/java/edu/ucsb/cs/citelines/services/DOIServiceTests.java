package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

public class DOIServiceTests {

  private final DOIService doiService = new DOIService();

  private static final String CANONICAL = "10.1038/s41586-020-2649-2";

  @Test
  public void a_bare_doi_is_returned_unchanged() {
    assertEquals(CANONICAL, doiService.normalizeRawDOI("10.1038/s41586-020-2649-2"));
  }

  @Test
  public void a_bare_doi_with_mixed_case_is_lower_cased() {
    assertEquals(CANONICAL, doiService.normalizeRawDOI("10.1038/S41586-020-2649-2"));
  }

  @Test
  public void an_https_doi_org_url_is_normalized() {
    assertEquals(
        CANONICAL, doiService.normalizeRawDOI("https://doi.org/10.1038/s41586-020-2649-2"));
  }

  @Test
  public void a_legacy_dx_doi_org_url_is_normalized() {
    assertEquals(
        CANONICAL, doiService.normalizeRawDOI("http://dx.doi.org/10.1038/s41586-020-2649-2"));
  }

  @Test
  public void an_html_anchor_around_a_doi_org_url_is_normalized() {
    assertEquals(
        CANONICAL,
        doiService.normalizeRawDOI(
            "<a href=\"https://doi.org/10.1038/s41586-020-2649-2\">https://doi.org/10.1038/s41586-020-2649-2</a>"));
  }

  @Test
  public void a_shortdoi_url_without_10_prefix_is_normalized() {
    assertEquals("10/c234", doiService.normalizeRawDOI("https://doi.org/c234"));
  }

  @Test
  public void a_shortdoi_url_with_10_prefix_is_normalized() {
    assertEquals("10/c234", doiService.normalizeRawDOI("https://doi.org/10/c234"));
  }

  @Test
  public void a_bare_shortdoi_is_normalized() {
    assertEquals("10/c234", doiService.normalizeRawDOI("10/C234"));
  }

  @Test
  public void a_doi_colon_prefixed_string_is_normalized() {
    assertEquals(CANONICAL, doiService.normalizeRawDOI("doi:10.1038/s41586-020-2649-2"));
  }

  @Test
  public void a_urn_doi_string_is_normalized() {
    assertEquals(CANONICAL, doiService.normalizeRawDOI("urn:doi:10.1038/s41586-020-2649-2"));
  }

  @Test
  public void an_info_doi_uri_is_normalized() {
    assertEquals(CANONICAL, doiService.normalizeRawDOI("info:doi/10.1038/s41586-020-2649-2"));
  }

  @Test
  public void surrounding_whitespace_is_ignored() {
    assertEquals(CANONICAL, doiService.normalizeRawDOI("  10.1038/s41586-020-2649-2  \n"));
  }

  @Test
  public void an_unrecognizable_string_throws_an_illegal_argument_exception() {
    IllegalArgumentException thrown =
        assertThrows(
            IllegalArgumentException.class, () -> doiService.normalizeRawDOI("not a doi at all"));
    assertEquals("Argument cannot be recognized as a DOI: not a doi at all", thrown.getMessage());
  }

  @Test
  public void an_empty_string_throws_an_illegal_argument_exception() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, () -> doiService.normalizeRawDOI(""));
    assertEquals("Argument cannot be recognized as a DOI: ", thrown.getMessage());
  }

  @Test
  public void a_null_argument_throws_an_illegal_argument_exception() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, () -> doiService.normalizeRawDOI(null));
    assertEquals("Argument cannot be recognized as a DOI: null", thrown.getMessage());
  }
}
