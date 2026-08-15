package edu.ucsb.cs.citelines.services;

import de.undercouch.citeproc.CSL;
import de.undercouch.citeproc.bibtex.BibTeXConverter;
import de.undercouch.citeproc.bibtex.BibTeXItemDataProvider;
import de.undercouch.citeproc.output.Bibliography;
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.jbibtex.BibTeXDatabase;
import org.jbibtex.Key;
import org.jbibtex.ParseException;
import org.jbibtex.TokenMgrException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Renders BibTeX entries into human-readable citations/bibliographies using the Citation Style
 * Language (CSL), via <a href="https://github.com/michel-kraemer/citeproc-java">citeproc-java</a>.
 * Rendering happens entirely offline (no network calls), using CSL styles bundled with the {@code
 * org.citationstyles:styles} dependency. See {@code docs/design/citation-apis.md}.
 */
@Slf4j
@Service
public class CitationFormattingService {

  @Autowired BibTexConverterService bibTexConverterService;

  /** Default CSL output format, one of the values accepted by {@link CSL#setOutputFormat}. */
  public static final String DEFAULT_OUTPUT_FORMAT = "text";

  /** Default CSL style, used when {@code styleFormat} is not recognized. */
  public static final String DEFAULT_STYLE = "apa";

  /**
   * Friendly, all-caps aliases for some commonly requested citation styles, mapped to the CSL style
   * identifiers bundled in {@code org.citationstyles:styles}. Any other, arbitrary CSL style
   * identifier (e.g. {@code "nature"} or {@code "vancouver-brackets"}) may also be passed directly
   * to {@link #formatBibTex}.
   *
   * <p>This is also the single place in the backend listing the citation formats a {@code Project}
   * may choose (see {@code Project#citationFormat}). The frontend mirrors this list in {@code
   * frontend/src/main/utils/citationFormats.js}; if you add/remove/rename a format here, update
   * that file to match.
   */
  public static final Map<String, String> COMMON_ALIASES =
      Map.ofEntries(
          Map.entry("APA", "apa"),
          Map.entry("MLA", "modern-language-association"),
          Map.entry("ACM", "association-for-computing-machinery"),
          Map.entry("IEEE", "ieee"),
          Map.entry("CHICAGO-AUTHOR-DATE", "chicago-author-date"),
          Map.entry("CHICAGO-FULLNOTE", "chicago-notes-bibliography"),
          Map.entry("HARVARD", "harvard-cite-them-right"),
          Map.entry("VANCOUVER", "dependent/vancouver-nlm"),
          Map.entry("NATURE", "nature"),
          Map.entry("SCIENCE", "science"));

  /**
   * Resolves a friendly style alias (see {@link #COMMON_ALIASES}, case-insensitive) to a CSL style
   * identifier. If {@code styleFormat} is not a recognized alias, it is passed through unchanged
   * (assumed to already be a valid CSL style identifier), and if it is blank, {@link
   * #DEFAULT_STYLE} is used.
   */
  public String resolveStyle(String styleFormat) {
    if (styleFormat == null || styleFormat.isBlank()) {
      return DEFAULT_STYLE;
    }
    return COMMON_ALIASES.getOrDefault(styleFormat.toUpperCase(), styleFormat);
  }

  /**
   * Formats raw BibTeX text into a rendered bibliography.
   *
   * @param rawBibTex the raw BibTeX text, containing one or more {@code @}-entries
   * @param styleFormat the citation style, either one of the {@link #COMMON_ALIASES} keys (e.g.
   *     {@code "APA"}), an arbitrary CSL style identifier (e.g. {@code "apa"}), or blank/{@code
   *     null} to use {@link #DEFAULT_STYLE}
   * @param outputFormat one of the formats accepted by {@link CSL#setOutputFormat} (e.g. {@code
   *     "text"} or {@code "html"}), or blank/{@code null} to use {@link #DEFAULT_OUTPUT_FORMAT}
   * @return the formatted bibliography entries, one per line, in citation key order
   * @throws IllegalArgumentException if {@code rawBibTex} is empty, not well-formed BibTeX, or if
   *     {@code styleFormat}/{@code outputFormat} do not resolve to a style/format known to CSL
   */
  public String formatBibTex(String rawBibTex, String styleFormat, String outputFormat) {
    if (rawBibTex == null || rawBibTex.isBlank()) {
      throw new IllegalArgumentException("BibTeX text must not be empty.");
    }

    String cslStyle = resolveStyle(styleFormat);
    String cslOutputFormat =
        outputFormat == null || outputFormat.isBlank() ? DEFAULT_OUTPUT_FORMAT : outputFormat;

    BibTeXDatabase database;
    try {
      database =
          new BibTeXConverter()
              .loadDatabase(new ByteArrayInputStream(rawBibTex.getBytes(StandardCharsets.UTF_8)));
    } catch (ParseException | TokenMgrException e) {
      throw new IllegalArgumentException("Could not parse BibTeX: " + e.getMessage(), e);
    }

    if (database.getEntries().isEmpty()) {
      throw new IllegalArgumentException("No BibTeX entries were found in the pasted text.");
    }

    BibTeXItemDataProvider provider = new BibTeXItemDataProvider();
    provider.addDatabase(database);

    CSL csl;
    try {
      csl = new CSL(provider, cslStyle);
      csl.setOutputFormat(cslOutputFormat);
    } catch (IOException e) {
      throw new IllegalArgumentException(
          "Could not load CSL style '" + cslStyle + "': " + e.getMessage(), e);
    }

    csl.registerCitationItems(
        database.getEntries().keySet().stream().map(Key::getValue).toArray(String[]::new));

    Bibliography bibliography = csl.makeBibliography();
    StringBuilder result = new StringBuilder();
    for (String entry : bibliography.getEntries()) {
      result.append(entry.trim()).append("\n");
    }
    return result.toString().trim();
  }

  /**
   * Convenience overload of {@link #formatBibTex(String, String, String)} that formats a single
   * stored {@link BibTexEntry} rather than raw BibTeX text.
   *
   * @throws IOException never in practice — see {@link
   *     BibTexConverterService#convertEntryToBibTexString}
   */
  public String formatEntry(BibTexEntry entry, String styleFormat, String outputFormat)
      throws IOException {
    String rawBibTex = bibTexConverterService.convertEntryToBibTexString(entry);
    return formatBibTex(rawBibTex, styleFormat, outputFormat);
  }
}
