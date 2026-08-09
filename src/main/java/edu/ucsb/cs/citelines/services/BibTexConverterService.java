package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.jbibtex.BibTeXDatabase;
import org.jbibtex.BibTeXFormatter;
import org.jbibtex.BibTeXParser;
import org.jbibtex.Key;
import org.jbibtex.ObjectResolutionException;
import org.jbibtex.ParseException;
import org.jbibtex.StringValue;
import org.jbibtex.TokenMgrException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Converts between raw BibTeX text (as pasted by a user) and {@link BibTexEntry} documents, using
 * JBibTeX for the actual BibTeX parsing/formatting. See docs/design/bibtex.md.
 */
@Slf4j
@Service
public class BibTexConverterService {

  @Autowired DOIService doiService;

  /**
   * Parses raw BibTeX text into one {@link BibTexEntry} per entry found (a single paste may contain
   * more than one {@code @}-entry).
   *
   * @param rawBibTex the pasted BibTeX text
   * @param projectId the id of the Project these entries belong to
   * @return the parsed entries, not yet saved
   * @throws IllegalArgumentException if {@code rawBibTex} is empty, or is not well-formed BibTeX
   */
  public List<BibTexEntry> parseToEntries(String rawBibTex, int projectId) {
    if (rawBibTex == null || rawBibTex.isBlank()) {
      throw new IllegalArgumentException("BibTeX text must not be empty.");
    }

    BibTeXDatabase database;
    try {
      BibTeXParser parser = new BibTeXParser();
      database = parser.parse(new StringReader(rawBibTex));
    } catch (ParseException | TokenMgrException | ObjectResolutionException e) {
      throw new IllegalArgumentException("Could not parse BibTeX: " + e.getMessage(), e);
    }

    if (database.getEntries().isEmpty()) {
      throw new IllegalArgumentException("No BibTeX entries were found in the pasted text.");
    }

    List<BibTexEntry> entries = new ArrayList<>();
    database
        .getEntries()
        .forEach((key, entry) -> entries.add(toBibTexEntry(key, entry, projectId)));
    return entries;
  }

  private BibTexEntry toBibTexEntry(Key key, org.jbibtex.BibTeXEntry entry, int projectId) {
    Map<String, String> keyValuePairs = new LinkedHashMap<>();
    entry
        .getFields()
        .forEach(
            (fieldKey, fieldValue) -> {
              String name = fieldKey.getValue().toLowerCase();
              keyValuePairs.put(name, normalizeIfDoi(name, fieldValue.toUserString()));
            });

    return BibTexEntry.builder()
        .projectId(projectId)
        .entryType(entry.getType().getValue().toLowerCase())
        .citeKey(key.getValue())
        .keyValuePairs(keyValuePairs)
        .build();
  }

  // The doi field is optional and free-form; if present but not recognizable as a DOI, we keep
  // the raw value as-is rather than rejecting the whole entry over a formatting quirk.
  private String normalizeIfDoi(String fieldName, String value) {
    if (!"doi".equals(fieldName)) {
      return value;
    }
    try {
      return doiService.normalizeRawDOI(value);
    } catch (IllegalArgumentException e) {
      log.debug("Could not normalize doi field value '{}': {}", value, e.getMessage());
      return value;
    }
  }

  /**
   * Converts a stored {@link BibTexEntry} back into raw BibTeX text, e.g. for editing.
   *
   * @param entry the entry to convert
   * @return the entry, formatted as BibTeX text
   * @throws IOException never in practice — {@link BibTeXFormatter#format} writes to an in-memory
   *     {@link StringWriter}, which cannot fail — but the underlying library declares it, so it
   *     propagates rather than being wrapped in a catch block that could never be exercised.
   */
  public String convertEntryToBibTexString(BibTexEntry entry) throws IOException {
    BibTeXDatabase database = new BibTeXDatabase();
    org.jbibtex.BibTeXEntry bibEntry =
        new org.jbibtex.BibTeXEntry(new Key(entry.getEntryType()), new Key(entry.getCiteKey()));

    if (entry.getKeyValuePairs() != null) {
      entry
          .getKeyValuePairs()
          .forEach(
              (fieldName, value) ->
                  bibEntry.addField(
                      new Key(fieldName), new StringValue(value, StringValue.Style.QUOTED)));
    }

    database.addObject(bibEntry);

    StringWriter writer = new StringWriter();
    new BibTeXFormatter().format(database, writer);
    return writer.toString();
  }
}
