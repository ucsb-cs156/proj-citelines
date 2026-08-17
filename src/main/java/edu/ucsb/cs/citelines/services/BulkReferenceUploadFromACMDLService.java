package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

/**
 * Parses the HTML of an ACM Digital Library paper's References section (specifically, the inner
 * HTML of the node containing {@code <section id="bibliography">}) and, for each entry a DOI can be
 * extracted from, resolves full metadata and adds a new {@link BibTexEntry} recording the current
 * paper as citing it — so a user can paste a paper's whole References list at once instead of
 * adding each reference one at a time. See issue #80.
 *
 * <p>Within {@code <section id="bibliography">}, each {@code <div class="biblioentry">} is one
 * reference. Its DOI is looked for, in order, within its {@code <div class="external-links">}:
 *
 * <ol>
 *   <li>a {@code <div class="core-xlink-digital-library">}'s link, e.g. {@code <a
 *       href="/doi/10.1145/1404520.1404522">}
 *   <li>failing that, a {@code <div class="core-xlink-crossref">}'s link, e.g. {@code <a
 *       href="https://doi.org/10.1080/...">Crossref</a>}
 *   <li>failing that, a {@code <div class="core-xlink-google-scholar">}'s link, whose {@code doi}
 *       query parameter is URL-encoded and must be decoded first, e.g. {@code
 *       ...scholar_lookup?doi=10.1145%2F1404520.1404522}
 * </ol>
 *
 * <p>Resolve-or-create-then-link reuses the same {@link CitationGraphService} logic {@link
 * BulkCitationUploadFromACMDLViewAllService} uses, just with the edge direction reversed — the
 * *current* paper cites each newly-added reference, rather than each newly-added entry citing the
 * current paper.
 */
@Service
public class BulkReferenceUploadFromACMDLService {

  private static final Pattern GOOGLE_SCHOLAR_DOI_PARAM = Pattern.compile("[?&]doi=([^&]+)");

  private final BibTexEntryRepository bibTexEntryRepository;
  private final CitationGraphService citationGraphService;
  private final DOIService doiService;

  public BulkReferenceUploadFromACMDLService(
      BibTexEntryRepository bibTexEntryRepository,
      CitationGraphService citationGraphService,
      DOIService doiService) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.citationGraphService = citationGraphService;
    this.doiService = doiService;
  }

  // Package-visible so tests can assert processEntry's exact return value per branch directly,
  // same as BulkCitationUploadFromACMDLViewAllService.Outcome.
  enum Outcome {
    ADDED,
    LINKED,
    ERROR
  }

  /**
   * Extracts each {@code <div class="biblioentry">} within {@code <section id="bibliography">}, in
   * document order (an empty list if no bibliography section is present). Package-visible for
   * direct unit testing.
   */
  static List<Element> parseBiblioEntries(String rawHtml) {
    Document doc = Jsoup.parse(rawHtml);
    Element bibliography = doc.selectFirst("section#bibliography");
    if (bibliography == null) {
      return List.of();
    }
    return bibliography.select("div.biblioentry");
  }

  /**
   * Extracts the DOI for a single {@code <div class="biblioentry">}, per the priority order
   * documented on the class, or {@code null} if none of the three known link types is present (or
   * the entry has no {@code <div class="external-links">} at all). The returned value is the raw
   * extracted text, not yet validated/normalized as a DOI — see {@link DOIService#normalizeRawDOI}.
   * Package-visible for direct unit testing.
   */
  static String extractRawDoi(Element biblioEntry) {
    Element externalLinks = biblioEntry.selectFirst("div.external-links");
    if (externalLinks == null) {
      return null;
    }

    Element digitalLibrary = externalLinks.selectFirst("div.core-xlink-digital-library a[href]");
    if (digitalLibrary != null) {
      return digitalLibrary.attr("href").replaceFirst("^/doi/", "");
    }

    Element crossref = externalLinks.selectFirst("div.core-xlink-crossref a[href]");
    if (crossref != null) {
      return crossref.attr("href");
    }

    Element googleScholar = externalLinks.selectFirst("div.core-xlink-google-scholar a[href]");
    if (googleScholar != null) {
      return decodeGoogleScholarDoi(googleScholar.attr("href"));
    }

    return null;
  }

  private static String decodeGoogleScholarDoi(String href) {
    Matcher matcher = GOOGLE_SCHOLAR_DOI_PARAM.matcher(href);
    if (!matcher.find()) {
      return null;
    }
    return URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8);
  }

  public void bulkUpload(
      int projectId, String currentPaperCiteKey, String rawHtml, JobContext ctx) {
    ctx.log(
        "Starting Bulk Reference Upload from ACM DL for %s in project %d"
            .formatted(currentPaperCiteKey, projectId));
    BibTexEntry currentPaper =
        bibTexEntryRepository
            .findByProjectIdAndCiteKey(projectId, currentPaperCiteKey)
            .orElseThrow(
                () -> {
                  ctx.log("Entry not found: " + currentPaperCiteKey);
                  return new IllegalStateException("Entry not found: " + currentPaperCiteKey);
                });

    List<Element> biblioEntries = parseBiblioEntries(rawHtml);
    CitationGraphService.ExistingEntries existing =
        citationGraphService.loadExistingEntries(projectId);

    int added = 0;
    int linked = 0;
    int errors = 0;
    for (Element biblioEntry : biblioEntries) {
      Outcome outcome = processEntry(biblioEntry, projectId, currentPaper, existing, ctx);
      if (outcome == Outcome.ADDED) {
        added++;
      } else if (outcome == Outcome.LINKED) {
        linked++;
      } else {
        errors++;
      }
    }

    ctx.log(
        "Done: checked %d entr%s, %d added, %d linked to existing entries, %d errors."
            .formatted(
                biblioEntries.size(),
                biblioEntries.size() == 1 ? "y" : "ies",
                added,
                linked,
                errors));
  }

  // Package-visible so tests can assert the exact returned Outcome per branch directly — needed
  // to distinguish a genuine Outcome.ERROR from a null return (a real Pitest mutation) when
  // bulkUpload's tally loop treats both identically via its trailing catch-all else.
  Outcome processEntry(
      Element biblioEntry,
      int projectId,
      BibTexEntry currentPaper,
      CitationGraphService.ExistingEntries existing,
      JobContext ctx) {
    String description = describeEntry(biblioEntry);

    String rawDoi = extractRawDoi(biblioEntry);
    if (rawDoi == null) {
      ctx.log("Skipping %s: no DOI found in this entry's external links.".formatted(description));
      return Outcome.ERROR;
    }

    String doi;
    try {
      doi = doiService.normalizeRawDOI(rawDoi);
    } catch (IllegalArgumentException e) {
      ctx.log("Skipping %s: %s is not a recognizable DOI.".formatted(description, rawDoi));
      return Outcome.ERROR;
    }

    Optional<CitationGraphService.ResolverResult> resolved =
        citationGraphService.tryResolveByDoi(doi);
    if (resolved.isEmpty()) {
      ctx.log(
          "Skipping %s: DOI %s could not be resolved by any provider.".formatted(description, doi));
      return Outcome.ERROR;
    }

    CitationGraphService.ResolverResult resolverResult = resolved.get();
    ResolvedWork work = resolverResult.work();
    if (isBlank(work.title())) {
      ResolvedWork recovered =
          citationGraphService.tryRecoverMissingTitle(work, resolverResult.resolver(), ctx);
      if (recovered != null) {
        work = recovered;
      }
    }
    if (isBlank(work.title())) {
      ctx.log(
          "Skipping %s: DOI %s resolved, but no title is available from any provider."
              .formatted(description, doi));
      return Outcome.ERROR;
    }

    CitationGraphService.ResolveOrCreateResult result =
        citationGraphService.resolveOrCreateEntry(work, projectId, existing);
    if (result.entryId().equals(currentPaper.getId())) {
      ctx.log(
          "Skipping %s: DOI %s resolves to the current paper itself.".formatted(description, doi));
      return Outcome.ERROR;
    }

    // Reversed from BulkCitationUploadFromACMDLViewAllService: the current paper cites this
    // reference, not the other way around.
    citationGraphService.saveCitationEdge(projectId, currentPaper.getId(), result.entryId());
    if (result.created()) {
      ctx.log("Added new entry %s: %s".formatted(result.citeKey(), work.title()));
      return Outcome.ADDED;
    }
    ctx.log("Linking to existing entry %s: %s".formatted(result.citeKey(), work.title()));
    return Outcome.LINKED;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static String describeEntry(Element biblioEntry) {
    return "\"%s\"".formatted(truncate(biblioEntry.text(), 80));
  }

  private static String truncate(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength) + "...";
  }
}
