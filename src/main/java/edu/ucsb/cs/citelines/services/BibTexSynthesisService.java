package edu.ucsb.cs.citelines.services;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Builds a raw BibTeX string from a {@link ResolvedWork}, so it can be fed through the existing,
 * already-tested {@link BibTexConverterService#parseToEntries} rather than hand-building a {@link
 * edu.ucsb.cs.citelines.collections.BibTexEntry} and duplicating its validation/normalization.
 *
 * <p>Field values are passed through {@link LaTeXNormalizationService} (some upstream bibliographic
 * data — especially older ACM/IEEE deposits — carries literal LaTeX escapes like {@code
 * Schr{\"o}der} even in an otherwise-JSON API response) and any leftover stray {@code {}/{}}
 * characters are stripped. See {@code docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}.
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

  // Which of the newly-synthesizable fields make sense for which entry type — e.g. an ISBN
  // belongs to the book/proceedings volume an inproceedings paper appeared in, not to the paper
  // itself, so it's never emitted for a plain article. An entry type not covered by one of these
  // sets (including the "misc" fallback for anything ENTRY_TYPE_MAP doesn't recognize) simply
  // never gets that field.
  private static final Set<String> HAS_PAGES = Set.of("article", "inproceedings", "incollection");
  private static final Set<String> HAS_PUBLISHER_OR_ADDRESS =
      Set.of("inproceedings", "book", "incollection", "techreport", "phdthesis");
  private static final Set<String> HAS_ISBN_OR_SERIES =
      Set.of("inproceedings", "book", "incollection");
  private static final Set<String> HAS_VOLUME = Set.of("article", "book", "incollection");
  private static final Set<String> HAS_NUMBER = Set.of("article", "techreport");

  private final LaTeXNormalizationService laTeXNormalizationService;

  public BibTexSynthesisService(LaTeXNormalizationService laTeXNormalizationService) {
    this.laTeXNormalizationService = laTeXNormalizationService;
  }

  /**
   * Builds a raw BibTeX string for the given work, using {@code citeKey} as its citation key.
   *
   * @throws IllegalArgumentException if the work has no title
   */
  public String synthesizeRawBibTex(ResolvedWork work, String citeKey) {
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
    appendField(bibtex, "abstract", work.abstractText(), true);
    if (HAS_PUBLISHER_OR_ADDRESS.contains(entryType)) {
      appendField(bibtex, "publisher", work.publisher(), true);
      appendField(bibtex, "address", work.address(), true);
    }
    if (HAS_PAGES.contains(entryType)) {
      appendField(bibtex, "pages", work.pages(), false);
    }
    if (HAS_ISBN_OR_SERIES.contains(entryType)) {
      appendField(bibtex, "isbn", work.isbn(), false);
      appendField(bibtex, "series", work.series(), true);
    }
    if (HAS_VOLUME.contains(entryType)) {
      appendField(bibtex, "volume", work.volume(), false);
    }
    if (HAS_NUMBER.contains(entryType)) {
      appendField(bibtex, "number", work.number(), false);
    }
    bibtex.append("}\n");
    return bibtex.toString();
  }

  // Free-text fields (abstract/publisher/address/series) are passed through sanitize() the same
  // as title/venue/author, since upstream data can carry the same LaTeX-escape/stray-brace issues
  // those do. Fields that are closer to identifiers than prose (pages/isbn/volume/number) are
  // written verbatim — sanitize()'s brace-stripping is unnecessary for them and LaTeX-escape
  // normalization has no meaningful effect on e.g. a page range or an ISBN.
  private void appendField(StringBuilder bibtex, String name, String value, boolean isFreeText) {
    if (value == null || value.isBlank()) {
      return;
    }
    bibtex
        .append("  ")
        .append(name)
        .append(" = {")
        .append(isFreeText ? sanitize(value) : value)
        .append("},\n");
  }

  /**
   * Generates a citeKey ({@code lastname+year}, e.g. {@code "harris2020"}) for the given work,
   * disambiguated against {@code existingCiteKeys} by appending a letter (or, in the unlikely event
   * all 26 are taken, a number) suffix.
   */
  public String generateUniqueCiteKey(ResolvedWork work, Set<String> existingCiteKeys) {
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

  private String citeKeyBase(ResolvedWork work) {
    String lastName = "entry";
    if (work.authorNames() != null && !work.authorNames().isEmpty()) {
      String[] parts = sanitize(work.authorNames().get(0)).trim().split("\\s+");
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

  private String formatAuthors(List<String> names) {
    return names.stream().map(this::formatAuthorName).collect(Collectors.joining(" and "));
  }

  // Heuristic "Last, First Middle" reformatting; does not handle multi-word surnames/particles
  // (e.g. "van der Berg") specially.
  private String formatAuthorName(String fullName) {
    String trimmed = sanitize(fullName).trim();
    int lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace == -1) {
      return trimmed;
    }
    return trimmed.substring(lastSpace + 1) + ", " + trimmed.substring(0, lastSpace);
  }

  private String sanitize(String value) {
    String normalized = laTeXNormalizationService.normalize(value);
    return normalized.replace("{", "").replace("}", "");
  }
}
