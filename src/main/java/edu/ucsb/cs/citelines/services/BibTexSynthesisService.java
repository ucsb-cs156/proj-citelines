package edu.ucsb.cs.citelines.services;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Builds a raw BibTeX string from an {@link OpenAlexWork}, so it can be fed through the existing,
 * already-tested {@link BibTexConverterService#parseToEntries} rather than hand-building a {@link
 * edu.ucsb.cs.citelines.collections.BibTexEntry} and duplicating its validation/normalization.
 *
 * <p>Field values are only lightly sanitized (stray {@code {}/{}} characters are stripped) — no
 * LaTeX escaping is attempted. See {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for where that would slot in.
 */
@Service
public class BibTexSynthesisService {

  private static final Map<String, String> ENTRY_TYPE_MAP =
      Map.of(
          "article", "article",
          "proceedings-article", "inproceedings",
          "book-chapter", "incollection",
          "book", "book",
          "dissertation", "phdthesis",
          "report", "techreport");

  /**
   * Builds a raw BibTeX string for the given work, using {@code citeKey} as its citation key.
   *
   * @throws IllegalArgumentException if the work has no title
   */
  public String synthesizeRawBibTex(OpenAlexWork work, String citeKey) {
    if (work.title() == null || work.title().isBlank()) {
      throw new IllegalArgumentException("Cannot synthesize a BibTeX entry without a title.");
    }

    String entryType = ENTRY_TYPE_MAP.getOrDefault(work.type(), "misc");

    StringBuilder bibtex = new StringBuilder();
    bibtex.append("@").append(entryType).append("{").append(citeKey).append(",\n");
    bibtex.append("  title = {").append(sanitize(work.title())).append("},\n");
    if (work.authorNames() != null && !work.authorNames().isEmpty()) {
      bibtex.append("  author = {").append(formatAuthors(work.authorNames())).append("},\n");
    }
    if (work.year() != null) {
      bibtex.append("  year = {").append(work.year()).append("},\n");
    }
    if (work.venue() != null && !work.venue().isBlank()) {
      bibtex
          .append("  ")
          .append(venueFieldName(entryType))
          .append(" = {")
          .append(sanitize(work.venue()))
          .append("},\n");
    }
    if (work.doi() != null && !work.doi().isBlank()) {
      bibtex.append("  doi = {").append(work.doi()).append("},\n");
    }
    bibtex.append("}\n");
    return bibtex.toString();
  }

  /**
   * Generates a citeKey ({@code lastname+year}, e.g. {@code "harris2020"}) for the given work,
   * disambiguated against {@code existingCiteKeys} by appending a letter (or, in the unlikely event
   * all 26 are taken, a number) suffix.
   */
  public String generateUniqueCiteKey(OpenAlexWork work, Set<String> existingCiteKeys) {
    String base = citeKeyBase(work);
    if (!existingCiteKeys.contains(base)) {
      return base;
    }
    for (char suffix = 'a'; suffix <= 'z'; suffix++) {
      String candidate = base + suffix;
      if (!existingCiteKeys.contains(candidate)) {
        return candidate;
      }
    }
    int counter = 2;
    while (existingCiteKeys.contains(base + counter)) {
      counter++;
    }
    return base + counter;
  }

  private String citeKeyBase(OpenAlexWork work) {
    String lastName = "entry";
    if (work.authorNames() != null && !work.authorNames().isEmpty()) {
      String[] parts = work.authorNames().get(0).trim().split("\\s+");
      String candidate = parts[parts.length - 1].toLowerCase().replaceAll("[^a-z0-9]", "");
      if (!candidate.isEmpty()) {
        lastName = candidate;
      }
    }
    String yearPart = work.year() != null ? String.valueOf(work.year()) : "";
    return lastName + yearPart;
  }

  private static String venueFieldName(String entryType) {
    return switch (entryType) {
      case "inproceedings", "incollection" -> "booktitle";
      default -> "journal";
    };
  }

  private static String formatAuthors(List<String> names) {
    return names.stream()
        .map(BibTexSynthesisService::formatAuthorName)
        .collect(Collectors.joining(" and "));
  }

  // Heuristic "Last, First Middle" reformatting; does not handle multi-word surnames/particles
  // (e.g. "van der Berg") specially.
  private static String formatAuthorName(String fullName) {
    String trimmed = fullName.trim();
    int lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace < 0) {
      return trimmed;
    }
    return trimmed.substring(lastSpace + 1) + ", " + trimmed.substring(0, lastSpace);
  }

  private static String sanitize(String value) {
    return value.replace("{", "").replace("}", "");
  }
}
