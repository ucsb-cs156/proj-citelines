package edu.ucsb.cs.citelines.services;

import lombok.extern.slf4j.Slf4j;
import org.jbibtex.LaTeXParser;
import org.jbibtex.LaTeXPrinter;
import org.jbibtex.ParseException;
import org.jbibtex.TokenMgrException;
import org.springframework.stereotype.Service;

/**
 * Converts LaTeX-escaped text (e.g. {@code Schr{\"{o}}der}, {@code \'Alvarez}) into plain Unicode
 * (e.g. {@code Schröder}, {@code Álvarez}), via JBibTeX's {@link LaTeXParser}/{@link LaTeXPrinter}.
 * Used by {@link BibTexSynthesisService} to clean up author/title/venue text synthesized from a
 * {@link CitationMetadataResolver} — see {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}.
 *
 * <p>Deliberately not applied to user-pasted BibTeX ({@link BibTexConverterService}'s path): a user
 * who typed LaTeX escapes presumably wants them preserved as typed.
 */
@Slf4j
@Service
public class LaTeXNormalizationService {

  /**
   * Normalizes {@code raw} LaTeX-escaped text to plain Unicode. Returns {@code raw} unchanged if it
   * is blank, or if it fails to parse as LaTeX (malformed input shouldn't fail a citation job — it
   * just means this one field keeps its raw form).
   */
  public String normalize(String raw) {
    if (raw == null || raw.isBlank()) {
      return raw;
    }
    try {
      return new LaTeXPrinter().print(new LaTeXParser().parse(raw));
    } catch (ParseException | TokenMgrException e) {
      log.debug("Could not parse LaTeX text, leaving as-is: {}", raw);
      return raw;
    }
  }
}
