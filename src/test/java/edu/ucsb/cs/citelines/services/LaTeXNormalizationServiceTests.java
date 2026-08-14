package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

public class LaTeXNormalizationServiceTests {

  private final LaTeXNormalizationService service = new LaTeXNormalizationService();

  @Test
  void normalizes_a_double_dot_umlaut() {
    assertEquals("Schröder", service.normalize("Schr{\\\"{o}}der"));
  }

  @Test
  void normalizes_an_acute_accent_with_no_braces() {
    assertEquals("Álvarez", service.normalize("\\'Alvarez"));
  }

  @Test
  void normalizes_a_braced_acute_accent() {
    assertEquals("é", service.normalize("{\\'e}"));
  }

  @Test
  void normalizes_a_braced_umlaut_mid_word() {
    assertEquals("Müller", service.normalize("M{\\\"u}ller"));
  }

  @Test
  void leaves_plain_text_unchanged() {
    assertEquals("Plain text with no LaTeX", service.normalize("Plain text with no LaTeX"));
  }

  @Test
  void falls_back_to_the_raw_text_when_it_fails_to_parse_as_latex() {
    assertEquals("unbalanced {brace", service.normalize("unbalanced {brace"));
  }

  @Test
  void returns_null_unchanged() {
    assertNull(service.normalize(null));
  }

  @Test
  void returns_blank_text_unchanged() {
    assertEquals("", service.normalize(""));
  }
}
