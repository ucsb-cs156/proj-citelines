package edu.ucsb.cs.citelines.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
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
 * <p>Both checks are designed to avoid tripping bot-management challenges (e.g. Cloudflare 403s)
 * rather than merely tolerating them:
 *
 * <ul>
 *   <li><b>DOI</b> ({@code CITELINES_invalid_doi=True} on a 404): rather than a plain {@code GET
 *       https://doi.org/<doi>} — which follows the resolver's redirect all the way to the
 *       publisher's (often WAF-protected) page — this asks {@code doi.org} to content-negotiate a
 *       machine-readable citation format ({@code Accept: application/citeproc+json}) and disables
 *       redirect-following, so a nonexistent DOI is reported directly by the resolver as a 404
 *       instead of chasing a redirect into a publisher's bot defenses.
 *   <li><b>URL</b> ({@code CITELINES_invalid_url=True} on a 404 or 410): if the URL contains a
 *       DOI/Handle-shaped identifier (e.g. an ACM DL or IEEE Xplore link embeds the paper's DOI in
 *       its path), that identifier is looked up directly against the Handle System's public REST
 *       API ({@code https://doi.org/api/handles/<handle>}) instead of requesting the URL itself —
 *       this sidesteps the publisher's own WAF entirely (ACM DL, IEEE Xplore, etc. are commonly
 *       behind Cloudflare and block automated requests with a 403 regardless of how browser-like
 *       the request headers are) and gets an authoritative exists/doesn't-exist answer straight
 *       from the identifier registry. Only when no such identifier is found, or the Handle API's
 *       answer is inconclusive, does this fall back to requesting the URL directly: a {@code HEAD}
 *       request first (falling back to {@code GET} only if the server rejects {@code HEAD} with a
 *       405) and browser-like request headers, to look as little like a bot as possible.
 * </ul>
 *
 * In both cases, a 403 or 429 — likely bot protection rather than a genuinely broken link — is
 * logged but never flags the entry as invalid; only a definitive "not found" response does. Any
 * other error (5xx, network failure, or a persistent 403/429 after {@link ApiRetryHelper}'s retries
 * are exhausted) is treated the same way: logged, not flagged.
 *
 * <p>Entries with neither a DOI nor a URL are skipped. A previously-set flag is cleared once the
 * link resolves cleanly.
 *
 * <p>Like {@link OpenAlexService} and the other {@code CitationMetadataResolver}s, every link fetch
 * is paced and retried through {@link ApiRetryHelper}, using {@code citelines.api.delay-ms}/{@code
 * CITELINES_API_DELAY_MS} both as the minimum gap between calls and as the starting delay for
 * exponential backoff on 5xx errors and rate-limit responses; since {@code doi.org} and arbitrary
 * publisher sites have been observed returning bare 403s as an anti-bot measure rather than a
 * proper 429, the helper is configured to back off on any 403 the same way it does on a 429.
 */
@Slf4j
@Service
public class CheckLinksService {

  static final String DOI_KEY = "doi";
  static final String URL_KEY = "url";
  static final String INVALID_DOI_KEY = "CITELINES_invalid_doi";
  static final String INVALID_URL_KEY = "CITELINES_invalid_url";
  static final String TRUE_VALUE = "True";

  // Content negotiation: asks doi.org to hand back machine-readable citation metadata directly,
  // rather than 302-redirecting on to the publisher's page.
  static final String DOI_ACCEPT_HEADER = "application/citeproc+json";

  // A realistic browser fingerprint for arbitrary-URL checks, so plain HTTP-client user agents
  // (which some sites block outright) aren't what triggers a false-positive block.
  static final String BROWSER_USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CitationChecker/1.0";
  static final String BROWSER_ACCEPT =
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  static final String BROWSER_ACCEPT_LANGUAGE = "en-US,en;q=0.5";

  // Matches a DOI/Handle-shaped identifier ("10." + a 4-9 digit registrant prefix + "/" + a
  // suffix) embedded anywhere in a URL, e.g. https://dl.acm.org/doi/10.1145/3411764.3445601 or
  // https://ieeexplore.ieee.org/document/10.1109/ACCESS.2020.1234567. The suffix excludes
  // characters that would end the identifier (whitespace, URL delimiters/query-string markers,
  // quotes, and bracket/paren punctuation that's more likely surrounding prose than part of the
  // identifier itself) so trailing punctuation like a closing parenthesis in "(see 10.1.2/x)"
  // isn't swept in.
  static final Pattern HANDLE_PATTERN = Pattern.compile("10\\.\\d{4,9}/[^\\s?#\"'<>()\\[\\]{}]+");

  private final BibTexEntryRepository bibTexEntryRepository;
  private final RestTemplate restTemplate;
  private final RestTemplate noRedirectRestTemplate;
  private final ApiRetryHelper retryHelper;
  private final String doiUserAgent;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public CheckLinksService(
      BibTexEntryRepository bibTexEntryRepository,
      RestTemplate restTemplate,
      RestTemplate noRedirectRestTemplate,
      @Value("${citelines.api.delay-ms:100}") int citelinesApiDelayMs,
      @Value("${app.sourceRepo:}") String sourceRepo,
      @Value("${citelines.api.checklinks.mailto:}") String mailto) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.restTemplate = restTemplate;
    this.noRedirectRestTemplate = noRedirectRestTemplate;
    this.retryHelper =
        new ApiRetryHelper(
            "CheckLinks",
            "CITELINES_API_DELAY_MS",
            citelinesApiDelayMs,
            5,
            citelinesApiDelayMs,
            /* treatAnyForbiddenAsRateLimit= */ true);
    this.doiUserAgent = buildDoiUserAgent(sourceRepo, mailto);
  }

  // sourceRepo/mailto are always non-null here: the constructor's @Value defaults resolve to ""
  // rather than null, so only isBlank() (not a null-check) needs to be tested.
  private static String buildDoiUserAgent(String sourceRepo, String mailto) {
    StringBuilder userAgent = new StringBuilder("Citelines/1.0");
    boolean hasSourceRepo = !sourceRepo.isBlank();
    boolean hasMailto = !mailto.isBlank();
    if (hasSourceRepo || hasMailto) {
      userAgent.append(" (");
      if (hasSourceRepo) {
        userAgent.append("+").append(sourceRepo);
      }
      if (hasMailto) {
        userAgent.append(hasSourceRepo ? "; " : "").append("mailto:").append(mailto);
      }
      userAgent.append(")");
    }
    return userAgent.toString();
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
    HttpHeaders headers = new HttpHeaders();
    headers.set(HttpHeaders.ACCEPT, DOI_ACCEPT_HEADER);
    headers.set(HttpHeaders.USER_AGENT, doiUserAgent);
    HttpEntity<Void> request = new HttpEntity<>(headers);
    try {
      ResponseEntity<String> response =
          retryHelper.execute(
              "GET " + url,
              () -> noRedirectRestTemplate.exchange(url, HttpMethod.GET, request, String.class));
      if (response.getStatusCode().is3xxRedirection()) {
        ctx.log(
            "Could not verify DOI for %s (%s): resolver returned %s instead of negotiated metadata"
                .formatted(citeKey, doi, response.getStatusCode()));
      }
      return false;
    } catch (HttpClientErrorException.NotFound e) {
      ctx.log("Invalid DOI for %s: %s".formatted(citeKey, doi));
      return true;
    } catch (RestClientException | ApiRetryHelper.ApiUnavailableException e) {
      ctx.log("Could not check DOI for %s (%s): %s".formatted(citeKey, doi, e.getMessage()));
      return false;
    }
  }

  private boolean isInvalidUrl(String url, String citeKey, JobContext ctx) {
    String handle = extractHandle(url);
    if (handle != null) {
      Boolean handleExists = checkHandleExists(handle, citeKey, ctx);
      if (handleExists != null) {
        if (!handleExists) {
          ctx.log("Invalid URL (no such handle %s) for %s: %s".formatted(handle, citeKey, url));
        }
        return !handleExists;
      }
    }
    return isInvalidUrlDirectly(url, citeKey, ctx);
  }

  // Package-visible for tests: extracts the first DOI/Handle-shaped identifier embedded in a URL
  // (e.g. an ACM DL or IEEE Xplore link), or null if none is found. A trailing slash is stripped —
  // the Handle API incorrectly reports a real handle as nonexistent when queried with one — and if
  // stripping it away leaves no "/" at all, the match is discarded as not actually handle-shaped.
  static String extractHandle(String url) {
    Matcher matcher = HANDLE_PATTERN.matcher(url);
    if (!matcher.find()) {
      return null;
    }
    String handle = matcher.group().replaceAll("/+$", "");
    return handle.contains("/") ? handle : null;
  }

  // Looks the handle up against the Handle System's public REST API, which doi.org also serves
  // requests to directly (rather than following the handle's redirect on to the publisher's
  // page), so this never touches a WAF-protected publisher site. Returns Boolean.TRUE/FALSE for a
  // definitive answer, or null when the check itself couldn't be completed (network error,
  // malformed response, retries exhausted) — callers fall back to the direct URL check in that
  // case, same as every other "could not check" path in this class.
  private Boolean checkHandleExists(String handle, String citeKey, JobContext ctx) {
    String url = "https://doi.org/api/handles/" + handle;
    HttpHeaders headers = new HttpHeaders();
    headers.set(HttpHeaders.USER_AGENT, doiUserAgent);
    HttpEntity<Void> request = new HttpEntity<>(headers);
    try {
      ResponseEntity<String> response =
          retryHelper.execute(
              "GET " + url,
              () -> noRedirectRestTemplate.exchange(url, HttpMethod.GET, request, String.class));
      JsonNode body = objectMapper.readTree(response.getBody());
      int responseCode = body.path("responseCode").asInt(-1);
      if (responseCode == 1) {
        return Boolean.TRUE;
      } else if (responseCode == 100) {
        return Boolean.FALSE;
      }
      ctx.log(
          "Could not verify handle %s for %s: unexpected Handle API responseCode %d"
              .formatted(handle, citeKey, responseCode));
      return null;
    } catch (JsonProcessingException e) {
      ctx.log(
          "Could not verify handle %s for %s: malformed Handle API response"
              .formatted(handle, citeKey));
      return null;
    } catch (RestClientException | ApiRetryHelper.ApiUnavailableException e) {
      ctx.log("Could not verify handle %s for %s: %s".formatted(handle, citeKey, e.getMessage()));
      return null;
    }
  }

  private boolean isInvalidUrlDirectly(String url, String citeKey, JobContext ctx) {
    HttpHeaders headers = new HttpHeaders();
    headers.set(HttpHeaders.USER_AGENT, BROWSER_USER_AGENT);
    headers.set(HttpHeaders.ACCEPT, BROWSER_ACCEPT);
    headers.set(HttpHeaders.ACCEPT_LANGUAGE, BROWSER_ACCEPT_LANGUAGE);
    HttpEntity<Void> request = new HttpEntity<>(headers);
    try {
      retryHelper.execute(
          "HEAD " + url,
          () -> {
            restTemplate.exchange(url, HttpMethod.HEAD, request, Void.class);
            return null;
          });
      return false;
    } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone e) {
      ctx.log("Invalid URL (%d) for %s: %s".formatted(e.getStatusCode().value(), citeKey, url));
      return true;
    } catch (HttpClientErrorException.MethodNotAllowed e) {
      return isInvalidUrlViaGet(url, request, citeKey, ctx);
    } catch (RestClientException | ApiRetryHelper.ApiUnavailableException e) {
      ctx.log("Could not check URL for %s (%s): %s".formatted(citeKey, url, e.getMessage()));
      return false;
    }
  }

  private boolean isInvalidUrlViaGet(
      String url, HttpEntity<Void> request, String citeKey, JobContext ctx) {
    try {
      retryHelper.execute(
          "GET " + url,
          () -> {
            restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            return null;
          });
      return false;
    } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Gone e) {
      ctx.log("Invalid URL (%d) for %s: %s".formatted(e.getStatusCode().value(), citeKey, url));
      return true;
    } catch (RestClientException | ApiRetryHelper.ApiUnavailableException e) {
      ctx.log("Could not check URL for %s (%s): %s".formatted(citeKey, url, e.getMessage()));
      return false;
    }
  }
}
