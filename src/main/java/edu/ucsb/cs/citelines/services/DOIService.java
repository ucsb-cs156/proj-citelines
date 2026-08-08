package edu.ucsb.cs.citelines.services;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Recognizes a DOI (Digital Object Identifier) expressed in any of several common formats and
 * normalizes it to its canonical bare form (ANSI/NISO Z39.84), e.g. {@code
 * 10.1038/s41586-020-2649-2}.
 *
 * <p>Recognized formats include:
 *
 * <ul>
 *   <li>Actionable web URLs, e.g. {@code https://doi.org/10.1038/s41586-020-2649-2} or the
 *       deprecated {@code http://dx.doi.org/10.1038/s41586-020-2649-2}
 *   <li>shortDOI URLs, e.g. {@code https://doi.org/c234} or {@code https://doi.org/10/c234}
 *   <li>Plain/bare DOI strings, e.g. {@code 10.1038/s41586-020-2649-2}
 *   <li>The {@code doi:} prefix, e.g. {@code doi:10.1038/s41586-020-2649-2}
 *   <li>The {@code urn:doi:} namespace, e.g. {@code urn:doi:10.1038/s41586-020-2649-2}
 *   <li>The (deprecated) {@code info:doi/} URI scheme, e.g. {@code
 *       info:doi/10.1038/s41586-020-2649-2}
 * </ul>
 */
@Service
public class DOIService {

  // Matches a bare/canonical DOI, wherever it appears within a larger string (e.g. embedded in a
  // URL, an HTML anchor, or a doi:/urn:doi:/info:doi/ prefixed identifier).
  private static final Pattern DOI_PATTERN =
      Pattern.compile("\\b10\\.\\d{4,}(?:\\.\\d+)*/[^\\s<>\"]+", Pattern.CASE_INSENSITIVE);

  // Matches a shortDOI, either as a bare "10/xxxx" identifier or as a doi.org URL, with or
  // without the leading "10/".
  private static final Pattern SHORT_DOI_PATTERN =
      Pattern.compile(
          "^(?:https?://(?:dx\\.)?doi\\.org/)?10/([a-zA-Z0-9]+)$", Pattern.CASE_INSENSITIVE);

  private static final Pattern SHORT_DOI_URL_PATTERN =
      Pattern.compile(
          "^https?://(?:dx\\.)?doi\\.org/([a-zA-Z0-9]+)$", Pattern.CASE_INSENSITIVE);

  /**
   * Normalizes a DOI given in any of the recognized formats to its canonical bare form.
   *
   * @param rawDoi the DOI, in any recognized format
   * @return the canonical, lower-cased, bare DOI (e.g. {@code 10.1038/s41586-020-2649-2})
   * @throws IllegalArgumentException if {@code rawDoi} cannot be recognized as a DOI in any of
   *     the supported formats
   */
  public String normalizeRawDOI(String rawDoi) {
    if (rawDoi != null) {
      String trimmed = rawDoi.trim();

      Matcher shortDoiMatcher = SHORT_DOI_PATTERN.matcher(trimmed);
      if (shortDoiMatcher.matches()) {
        return "10/" + shortDoiMatcher.group(1).toLowerCase();
      }

      Matcher shortDoiUrlMatcher = SHORT_DOI_URL_PATTERN.matcher(trimmed);
      if (shortDoiUrlMatcher.matches()) {
        return "10/" + shortDoiUrlMatcher.group(1).toLowerCase();
      }

      Matcher doiMatcher = DOI_PATTERN.matcher(trimmed);
      if (doiMatcher.find()) {
        return doiMatcher.group().toLowerCase();
      }
    }

    throw new IllegalArgumentException("Argument cannot be recognized as a DOI: " + rawDoi);
  }
}
