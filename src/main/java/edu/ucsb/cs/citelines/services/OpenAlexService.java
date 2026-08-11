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
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Client for the OpenAlex API (https://api.openalex.org, no API key required), used to discover a
 * paper's outgoing references and incoming citations. See {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} for why OpenAlex alone was chosen for
 * this MVP.
 *
 * <p>Every call is paced and retried through {@link ApiRetryHelper}, using {@link
 * #CITELINES_API_DELAY_MS} as the minimum gap between calls (per the issue's requirement, this is
 * an instance field, not {@code static}, so it can be configured via {@code
 * citelines.api.delay-ms}/{@code CITELINES_API_DELAY_MS}).
 */
@Slf4j
@Service
public class OpenAlexService {

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
        new ApiRetryHelper("OpenAlex", "CITELINES_API_DELAY_MS", 2, 3, citelinesApiDelayMs);
  }

  /** Looks up a single work by DOI. Empty if OpenAlex has no record for that DOI. */
  public Optional<OpenAlexWork> getWorkByDoi(String doi) {
    String url = urlBuilder(BASE_URL + "/works/doi:" + doi).toUriString();
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
   * Works that cite the given OpenAlex work id, most-relevant first, capped at {@code maxResults}.
   */
  public List<OpenAlexWork> getWorksCiting(String openAlexId, int maxResults) {
    int perPage = Math.max(1, Math.min(maxResults, 200));
    String url =
        urlBuilder(BASE_URL + "/works")
            .queryParam("filter", "cites:" + stripPrefix(openAlexId))
            .queryParam("per_page", perPage)
            .toUriString();
    String body =
        retryHelper.execute(
            "GET /works?filter=cites:" + openAlexId,
            () -> restTemplate.getForObject(url, String.class));
    return parseWorksList(readTree(body));
  }

  /** Batch-fetches works by OpenAlex id (chunked into groups of {@value #BATCH_SIZE}). */
  public List<OpenAlexWork> getWorksByIds(List<String> openAlexIds) {
    List<OpenAlexWork> results = new ArrayList<>();
    for (int start = 0; start < openAlexIds.size(); start += BATCH_SIZE) {
      List<String> batch =
          openAlexIds.subList(start, Math.min(start + BATCH_SIZE, openAlexIds.size()));
      String idFilter = String.join("|", batch.stream().map(OpenAlexService::stripPrefix).toList());
      String url =
          urlBuilder(BASE_URL + "/works")
              .queryParam("filter", "ids.openalex:" + idFilter)
              .queryParam("per_page", batch.size())
              .toUriString();
      String body =
          retryHelper.execute(
              "GET /works?filter=ids.openalex:(batch of %d)".formatted(batch.size()),
              () -> restTemplate.getForObject(url, String.class));
      results.addAll(parseWorksList(readTree(body)));
    }
    return results;
  }

  private UriComponentsBuilder urlBuilder(String url) {
    UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(url);
    if (mailto != null && !mailto.isBlank()) {
      builder.queryParam("mailto", mailto);
    }
    return builder;
  }

  private List<OpenAlexWork> parseWorksList(JsonNode root) {
    List<OpenAlexWork> works = new ArrayList<>();
    for (JsonNode workNode : root.path("results")) {
      works.add(parseWork(workNode));
    }
    return works;
  }

  private OpenAlexWork parseWork(JsonNode node) {
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

    return new OpenAlexWork(
        stripPrefix(textOrNull(node, "id")),
        normalizeDoiOrNull(textOrNull(node, "doi")),
        textOrNull(node, "title"),
        node.path("publication_year").isInt() ? node.path("publication_year").asInt() : null,
        textOrNull(node, "type"),
        authorNames,
        textOrNull(node.path("primary_location").path("source"), "display_name"),
        referencedWorkIds);
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
