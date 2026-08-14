package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Orchestrates the "Check Links" job: for every {@link BibTexEntry} in a project, resolves the link
 * that {@code CitationTable}'s "Link" column shows (DOI first, URL as a backup — see the frontend
 * {@code CitationTable.jsx}) and flags entries whose link looks broken, so the UI can surface a
 * warning next to them.
 *
 * <ul>
 *   <li>A DOI is flagged ({@code CITELINES_invalid_doi=True}) if {@code https://doi.org/<doi>}
 *       returns a page containing both "DOI Not Found" and "This DOI cannot be found in the DOI
 *       System" — the DOI resolver's own not-found page text, since it responds 200 even for
 *       unknown DOIs.
 *   <li>A URL is flagged ({@code CITELINES_invalid_url=True}) if fetching it returns a 404.
 * </ul>
 *
 * Entries with neither a DOI nor a URL are skipped. A previously-set flag is cleared if the link
 * now resolves cleanly.
 *
 * <p>Like {@link OpenAlexService} and the other {@code CitationMetadataResolver}s, every link fetch
 * is paced and retried through {@link ApiRetryHelper}, using {@code citelines.api.delay-ms}/{@code
 * CITELINES_API_DELAY_MS} both as the minimum gap between calls and as the starting delay for
 * exponential backoff on 5xx errors and rate-limit (429) responses.
 */
@Slf4j
@Service
public class CheckLinksService {

  static final String DOI_KEY = "doi";
  static final String URL_KEY = "url";
  static final String INVALID_DOI_KEY = "CITELINES_invalid_doi";
  static final String INVALID_URL_KEY = "CITELINES_invalid_url";
  static final String TRUE_VALUE = "True";

  private static final String DOI_NOT_FOUND_TEXT = "DOI Not Found";
  private static final String DOI_NOT_FOUND_DETAIL_TEXT =
      "This DOI cannot be found in the DOI System";

  private final BibTexEntryRepository bibTexEntryRepository;
  private final RestTemplate restTemplate;
  private final ApiRetryHelper retryHelper;

  public CheckLinksService(
      BibTexEntryRepository bibTexEntryRepository,
      RestTemplate restTemplate,
      @Value("${citelines.api.delay-ms:100}") int citelinesApiDelayMs) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.restTemplate = restTemplate;
    this.retryHelper =
        new ApiRetryHelper(
            "CheckLinks", "CITELINES_API_DELAY_MS", citelinesApiDelayMs, 5, citelinesApiDelayMs);
  }

  public void checkLinks(int projectId, JobContext ctx) {
    List<BibTexEntry> entries = bibTexEntryRepository.findByProjectId(projectId);
    ctx.log("Checking links for %d entries in project %d.".formatted(entries.size(), projectId));

    int checked = 0;
    int flagged = 0;
    for (BibTexEntry entry : entries) {
      Map<String, String> keyValuePairs = entry.getKeyValuePairs();
      if (keyValuePairs == null) {
        continue;
      }

      String doi = keyValuePairs.get(DOI_KEY);
      String url = keyValuePairs.get(URL_KEY);
      boolean invalid;
      String flagKey;
      if (doi != null && !doi.isBlank()) {
        invalid = isInvalidDoi(doi, entry.getCiteKey(), ctx);
        flagKey = INVALID_DOI_KEY;
      } else if (url != null && !url.isBlank()) {
        invalid = isInvalidUrl(url, entry.getCiteKey(), ctx);
        flagKey = INVALID_URL_KEY;
      } else {
        continue;
      }
      checked++;

      boolean changed;
      if (invalid) {
        changed = !TRUE_VALUE.equals(keyValuePairs.put(flagKey, TRUE_VALUE));
        flagged++;
      } else {
        changed = keyValuePairs.remove(flagKey) != null;
      }
      if (changed) {
        bibTexEntryRepository.save(entry);
      }
    }

    ctx.log(
        "Done: checked %d link%s, %d flagged as suspicious."
            .formatted(checked, checked == 1 ? "" : "s", flagged));
  }

  private boolean isInvalidDoi(String doi, String citeKey, JobContext ctx) {
    String url = "https://doi.org/" + doi;
    try {
      String body =
          retryHelper.execute("GET " + url, () -> restTemplate.getForObject(url, String.class));
      boolean invalid =
          body != null
              && body.contains(DOI_NOT_FOUND_TEXT)
              && body.contains(DOI_NOT_FOUND_DETAIL_TEXT);
      if (invalid) {
        ctx.log("Invalid DOI for %s: %s".formatted(citeKey, doi));
      }
      return invalid;
    } catch (RestClientException | ApiRetryHelper.ApiUnavailableException e) {
      ctx.log("Could not check DOI for %s (%s): %s".formatted(citeKey, doi, e.getMessage()));
      return false;
    }
  }

  private boolean isInvalidUrl(String url, String citeKey, JobContext ctx) {
    try {
      retryHelper.execute(
          "GET " + url,
          () -> {
            restTemplate.getForObject(url, String.class);
            return null;
          });
      return false;
    } catch (HttpClientErrorException.NotFound e) {
      ctx.log("Invalid URL (404) for %s: %s".formatted(citeKey, url));
      return true;
    } catch (RestClientException | ApiRetryHelper.ApiUnavailableException e) {
      ctx.log("Could not check URL for %s (%s): %s".formatted(citeKey, url, e.getMessage()));
      return false;
    }
  }
}
