package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Parses the text ACM Digital Library's "Cited By &gt; View All" page produces (an alternating
 * sequence of one or more ACM-Ref-formatted citation lines, then the citing paper's {@code
 * https://doi.org/...} link, repeated for each citing paper) and, for each DOI that passes a sanity
 * check, resolves full metadata and adds a new {@link BibTexEntry} recording it as citing the
 * current paper — so a user can paste ACM DL's whole "cited by" list at once instead of adding each
 * citing paper one at a time.
 *
 * <p>Three things are flagged as errors rather than silently dropped or (worse) silently mis-added,
 * per entry:
 *
 * <ul>
 *   <li>no DOI line follows the reference text at all (a trailing, unpaired block of text at the
 *       end of the pasted input) or the line doesn't parse as a DOI in any format {@link
 *       DOIService} recognizes;
 *   <li>the DOI doesn't resolve on any of {@link CitationGraphService}'s tiered resolvers (the same
 *       waterfall — OpenAlex, then Semantic Scholar, then Crossref — used to fetch References/
 *       Citations) — since building a {@link BibTexEntry} needs that metadata anyway, "no resolver
 *       has ever heard of this DOI" doubles as this feature's DOI-validity check, rather than a
 *       separate one;
 *   <li>the resolved title doesn't appear (case/punctuation-insensitive) anywhere in the paired
 *       reference text — catching a paste where the ACM-Ref/DOI pairing has drifted out of
 *       alignment (e.g. a stray blank line ACM DL didn't actually put there) before it silently
 *       attributes the wrong paper's citation.
 * </ul>
 *
 * <p>A block of reference text with no title-bearing DOI to sanity-check it against (i.e. a
 * standalone {@code https://doi.org/...} line with no preceding reference text) skips only that
 * check, not the whole entry — the DOI itself still gets resolved and added normally.
 *
 * <p>Resolve-or-create-then-link reuses exactly the logic {@link CitationGraphService} uses for
 * "Get Citations" ({@link CitationGraphService#tryResolveByDoi}, {@link
 * CitationGraphService#tryRecoverMissingTitle}, {@link CitationGraphService#resolveOrCreateEntry},
 * {@link CitationGraphService#saveCitationEdge}) rather than a second copy of it. A resolved DOI
 * that turns out to be the current paper's own entry (e.g. ACM DL glitching a paper into its own
 * "cited by" list) is skipped as an error rather than saved as a self-referential edge.
 */
@Service
public class BulkCitationUploadFromACMDLViewAllService {

  // Matches a whole line that is (only) a doi.org resolver URL — deliberately stricter than
  // DOIService's own DOI_PATTERN (which finds a DOI anywhere within a larger string), so that a
  // reference line whose title happens to mention something DOI-shaped is never mistaken for the
  // DOI line itself. Once a line matches here, DOIService.normalizeRawDOI extracts and validates
  // the actual DOI value.
  private static final Pattern DOI_LINE_PATTERN =
      Pattern.compile("^https?://(?:dx\\.)?doi\\.org/\\S+$", Pattern.CASE_INSENSITIVE);

  private final BibTexEntryRepository bibTexEntryRepository;
  private final CitationGraphService citationGraphService;
  private final DOIService doiService;

  public BulkCitationUploadFromACMDLViewAllService(
      BibTexEntryRepository bibTexEntryRepository,
      CitationGraphService citationGraphService,
      DOIService doiService) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.citationGraphService = citationGraphService;
    this.doiService = doiService;
  }

  /** One reference-text-then-DOI-line pair from the pasted input; either field may be null. */
  record ParsedEntry(String refText, String doiLine) {}

  // Package-visible so tests can assert processEntry's exact return value per branch directly,
  // rather than only through bulkUpload's aggregate tallies (see processEntry's doc).
  enum Outcome {
    ADDED,
    LINKED,
    ERROR
  }

  /**
   * Splits {@code rawText} into alternating (reference text, DOI line) pairs. Package-visible for
   * direct unit testing, same as {@link CheckLinksService#extractHandle}.
   *
   * <p>Blank lines are ignored entirely (tolerating stray ones a real copy-paste might introduce).
   * Non-blank lines accumulate as one entry's reference text until a line that is itself a doi.org
   * URL is seen, which closes out that entry; reference text may therefore span multiple physical
   * lines. A trailing accumulated block with no following DOI line becomes a final entry with a
   * null {@code doiLine} rather than being dropped silently.
   */
  static List<ParsedEntry> parse(String rawText) {
    List<ParsedEntry> entries = new ArrayList<>();
    StringBuilder refBuffer = new StringBuilder();
    for (String rawLine : rawText.split("\\r?\\n")) {
      String line = rawLine.trim();
      if (line.isEmpty()) {
        continue;
      }
      if (DOI_LINE_PATTERN.matcher(line).matches()) {
        String ref = refBuffer.toString().trim();
        entries.add(new ParsedEntry(ref.isEmpty() ? null : ref, line));
        refBuffer.setLength(0);
      } else {
        if (!refBuffer.isEmpty()) {
          refBuffer.append(' ');
        }
        refBuffer.append(line);
      }
    }
    String leftover = refBuffer.toString().trim();
    if (!leftover.isEmpty()) {
      entries.add(new ParsedEntry(leftover, null));
    }
    return entries;
  }

  public void bulkUpload(
      int projectId, String currentPaperCiteKey, String rawText, JobContext ctx) {
    ctx.log(
        "Starting Bulk Citation Upload from ACM DL for %s in project %d"
            .formatted(currentPaperCiteKey, projectId));
    BibTexEntry currentPaper =
        bibTexEntryRepository
            .findByProjectIdAndCiteKey(projectId, currentPaperCiteKey)
            .orElseThrow(
                () -> {
                  ctx.log("Entry not found: " + currentPaperCiteKey);
                  return new IllegalStateException("Entry not found: " + currentPaperCiteKey);
                });

    List<ParsedEntry> parsedEntries = parse(rawText);
    CitationGraphService.ExistingEntries existing =
        citationGraphService.loadExistingEntries(projectId);

    int added = 0;
    int linked = 0;
    int errors = 0;
    for (ParsedEntry parsedEntry : parsedEntries) {
      Outcome outcome = processEntry(parsedEntry, projectId, currentPaper, existing, ctx);
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
                parsedEntries.size(),
                parsedEntries.size() == 1 ? "y" : "ies",
                added,
                linked,
                errors));
  }

  // Package-visible so tests can assert the exact returned Outcome per branch directly — needed
  // to distinguish a genuine Outcome.ERROR from a null return (a real Pitest mutation) when
  // bulkUpload's tally loop treats both identically via its trailing catch-all else.
  Outcome processEntry(
      ParsedEntry parsedEntry,
      int projectId,
      BibTexEntry currentPaper,
      CitationGraphService.ExistingEntries existing,
      JobContext ctx) {
    String description = describeEntry(parsedEntry);

    if (parsedEntry.doiLine() == null) {
      ctx.log("Skipping %s: no DOI found for this reference.".formatted(description));
      return Outcome.ERROR;
    }

    String doi;
    try {
      doi = doiService.normalizeRawDOI(parsedEntry.doiLine());
    } catch (IllegalArgumentException e) {
      ctx.log(
          "Skipping %s: %s is not a recognizable DOI."
              .formatted(description, parsedEntry.doiLine()));
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

    if (parsedEntry.refText() != null
        && !refTextMatchesTitle(parsedEntry.refText(), work.title())) {
      ctx.log(
          "Skipping %s: resolved title \"%s\" does not appear to match the pasted reference."
              .formatted(description, work.title()));
      return Outcome.ERROR;
    }

    CitationGraphService.ResolveOrCreateResult result =
        citationGraphService.resolveOrCreateEntry(work, projectId, existing);
    if (result.entryId().equals(currentPaper.getId())) {
      ctx.log(
          "Skipping %s: DOI %s resolves to the current paper itself.".formatted(description, doi));
      return Outcome.ERROR;
    }

    citationGraphService.saveCitationEdge(projectId, result.entryId(), currentPaper.getId());
    if (result.created()) {
      ctx.log("Added new entry %s: %s".formatted(result.citeKey(), work.title()));
      return Outcome.ADDED;
    }
    ctx.log("Linking to existing entry %s: %s".formatted(result.citeKey(), work.title()));
    return Outcome.LINKED;
  }

  private static boolean refTextMatchesTitle(String refText, String resolvedTitle) {
    String normalizedTitle = normalizeForComparison(resolvedTitle);
    return !normalizedTitle.isBlank() && normalizeForComparison(refText).contains(normalizedTitle);
  }

  private static String normalizeForComparison(String value) {
    return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  // parse() never produces a ParsedEntry with both fields null, so refText/doiLine here always
  // has at least one branch to take.
  private static String describeEntry(ParsedEntry parsedEntry) {
    if (parsedEntry.refText() != null) {
      return "\"%s\"".formatted(truncate(parsedEntry.refText(), 80));
    }
    return parsedEntry.doiLine();
  }

  private static String truncate(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength) + "...";
  }
}
