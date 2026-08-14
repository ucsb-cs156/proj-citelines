package edu.ucsb.cs.citelines.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Client for the OpenAlex API (https://api.openalex.org, no API key required), used to discover a
 * paper's outgoing references and incoming citations. See {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for why OpenAlex is tried first in
 * the resolver chain.
 *
 * <p>Every call is paced and retried through {@link ApiRetryHelper}, using {@link
 * #CITELINES_API_DELAY_MS} both as the minimum gap between calls and as the starting delay for
 * exponential backoff (±25% jitter, doubling on each retry) on 5xx errors and rate-limit responses
 * (per the issue's requirement, this is an instance field, not {@code static}, so it can be
 * configured via {@code citelines.api.delay-ms}/{@code CITELINES_API_DELAY_MS}).
 *
 * <p>{@link #getReferences} hydrates {@code sourceWork.referencedWorkIds()} via a batch fetch and
 * returns only the ids OpenAlex actually resolved — {@link CitationGraphService} detects which (if
 * any) ids didn't come back by diffing against {@code sourceWork.referencedWorkIds()} itself, since
 * recording that gap as an {@code UnresolvedCitation} needs project/job context this class
 * intentionally has no dependency on.
 */
@Slf4j
@Service
public class OpenAlexService implements CitationMetadataResolver {

  private static final String BASE_URL = "https://api.openalex.org";
  private static final String OPENALEX_ID_PREFIX = "https://openalex.org/";
  private static final int BATCH_SIZE = 50;

  public final int CITELINES_API_DELAY_MS;

  private final RestTemplate restTemplate;
  private final DOIService doiService;
  private final String mailto;
  private final ApiRetryHelper retryHelper;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public OpenAlexService(
      RestTemplate restTemplate,
      DOIService doiService,
      @Value("${citelines.api.delay-ms:100}") int citelinesApiDelayMs,
      @Value("${citelines.api.openalex.mailto:}") String mailto) {
    this.restTemplate = restTemplate;
    this.doiService = doiService;
    this.CITELINES_API_DELAY_MS = citelinesApiDelayMs;
    this.mailto = mailto;
    this.retryHelper =
        new ApiRetryHelper(
            "OpenAlex", "CITELINES_API_DELAY_MS", citelinesApiDelayMs, 5, citelinesApiDelayMs);
  }

  @Override
  public String name() {
    return "OpenAlex";
  }

  /** Looks up a single work by DOI. Empty if OpenAlex has no record for that DOI. */
  @Override
  public Optional<ResolvedWork> resolveByDoi(String doi) {
    String url = BASE_URL + "/works/doi:" + doi + mailtoSuffix("?");
    try {
      String body =
          retryHelper.execute(
              "GET /works/doi:" + doi, () -> restTemplate.getForObject(url, String.class));
      return Optional.of(parseWork(readTree(body)));
    } catch (HttpClientErrorException.NotFound e) {
      return Optional.empty();
    }
  }

  /**
   * Hydrates {@code sourceWork.referencedWorkIds()} (capped at {@code maxResults}) via a batch
   * fetch, returning only the works OpenAlex actually resolved.
   */
  @Override
  public List<ResolvedWork> getReferences(ResolvedWork sourceWork, int maxResults) {
    List<String> refIds = sourceWork.referencedWorkIds();
    if (refIds.isEmpty()) {
      return List.of();
    }
    return getWorksByIds(refIds.subList(0, Math.min(refIds.size(), maxResults)));
  }

  /** Works that cite {@code sourceWork}, most-relevant first, capped at {@code maxResults}. */
  @Override
  public List<ResolvedWork> getCitations(ResolvedWork sourceWork, int maxResults) {
    int perPage = Math.max(1, Math.min(maxResults, 200));
    String url =
        BASE_URL
            + "/works?filter=cites:"
            + stripPrefix(sourceWork.id())
            + "&per_page="
            + perPage
            + mailtoSuffix("&");
    String body =
        retryHelper.execute(
            "GET /works?filter=cites:" + sourceWork.id(),
            () -> restTemplate.getForObject(url, String.class));
    return parseWorksList(readTree(body));
  }

  /** Batch-fetches works by OpenAlex id (chunked into groups of {@value #BATCH_SIZE}). */
  private List<ResolvedWork> getWorksByIds(List<String> openAlexIds) {
    List<ResolvedWork> results = new ArrayList<>();
    for (int start = 0; start < openAlexIds.size(); start += BATCH_SIZE) {
      List<String> batch =
          openAlexIds.subList(start, Math.min(start + BATCH_SIZE, openAlexIds.size()));
      String idFilter = String.join("|", batch.stream().map(OpenAlexService::stripPrefix).toList());
      String url =
          BASE_URL
              + "/works?filter=ids.openalex:"
              + idFilter
              + "&per_page="
              + batch.size()
              + mailtoSuffix("&");
      String body =
          retryHelper.execute(
              "GET /works?filter=ids.openalex:(batch of %d)".formatted(batch.size()),
              () -> restTemplate.getForObject(url, String.class));
      results.addAll(parseWorksList(readTree(body)));
    }
    return results;
  }

  /**
   * URLs are built by plain string concatenation, not {@link
   * org.springframework.web.util.UriComponentsBuilder}: OpenAlex's {@code filter} query parameter
   * uses {@code |} as an OR-delimiter, but its parser does not correctly handle that character
   * percent-encoded (as {@code UriComponentsBuilder} would produce) — a batch id filter silently
   * returns only its first match instead of all of them. A literal, unencoded {@code |} (as {@link
   * RestTemplate#getForObject(String, Class, Object...)} sends when handed a plain string with no
   * {@code {template}} placeholders) works correctly. Confirmed against the live API while building
   * this service.
   */
  private String mailtoSuffix(String separator) {
    return mailto != null && !mailto.isBlank() ? separator + "mailto=" + mailto : "";
  }

  private List<ResolvedWork> parseWorksList(JsonNode root) {
    List<ResolvedWork> works = new ArrayList<>();
    for (JsonNode workNode : root.path("results")) {
      works.add(parseWork(workNode));
    }
    return works;
  }

  private ResolvedWork parseWork(JsonNode node) {
    List<String> authorNames = new ArrayList<>();
    for (JsonNode authorship : node.path("authorships")) {
      String name = textOrNull(authorship.path("author"), "display_name");
      if (name != null) {
        authorNames.add(name);
      }
    }

    List<String> referencedWorkIds = new ArrayList<>();
    for (JsonNode refNode : node.path("referenced_works")) {
      referencedWorkIds.add(stripPrefix(refNode.asText()));
    }

    return new ResolvedWork(
        stripPrefix(textOrNull(node, "id")),
        normalizeDoiOrNull(textOrNull(node, "doi")),
        textOrNull(node, "title"),
        node.path("publication_year").isInt() ? node.path("publication_year").asInt() : null,
        textOrNull(node, "type"),
        authorNames,
        textOrNull(node.path("primary_location").path("source"), "display_name"),
        referencedWorkIds,
        List.of(),
        List.of());
  }

  private String normalizeDoiOrNull(String rawDoi) {
    if (rawDoi == null) {
      return null;
    }
    try {
      return doiService.normalizeRawDOI(rawDoi);
    } catch (IllegalArgumentException e) {
      log.debug("Could not normalize DOI from OpenAlex: {}", rawDoi);
      return null;
    }
  }

  private static String textOrNull(JsonNode node, String field) {
    JsonNode child = node.path(field);
    return child.isMissingNode() || child.isNull() ? null : child.asText();
  }

  private static String stripPrefix(String openAlexIdOrUrl) {
    if (openAlexIdOrUrl == null) {
      return null;
    }
    return openAlexIdOrUrl.startsWith(OPENALEX_ID_PREFIX)
        ? openAlexIdOrUrl.substring(OPENALEX_ID_PREFIX.length())
        : openAlexIdOrUrl;
  }

  private JsonNode readTree(String json) {
    try {
      return objectMapper.readTree(json);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Could not parse OpenAlex API response as JSON", e);
    }
  }
}
