package edu.ucsb.cs.citelines.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Client for the Semantic Scholar Graph API (https://api.semanticscholar.org/graph/v1, an optional
 * API key raises the rate limit — see {@code docs/README_API_CONFIG.md}), tried after OpenAlex in
 * the resolver chain — see {@code docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}.
 *
 * <p>Unlike OpenAlex, a single call returns both {@code references} and {@code citations} inline
 * (requested via the {@code fields} query parameter), so {@link #getReferences}/{@link
 * #getCitations} need no extra network call beyond the one that resolved the source work — they
 * just return what {@link #resolveByDoi} already parsed. Both fields come back as JSON {@code null}
 * (not an empty array) for a publisher-restricted paper — confirmed against the live API — so
 * parsing must null-check, not just empty-check.
 */
@Slf4j
@Service
public class SemanticScholarResolver implements CitationMetadataResolver {

  private static final String BASE_URL = "https://api.semanticscholar.org/graph/v1/paper";
  private static final String FIELDS =
      "title,year,venue,externalIds,publicationTypes,authors,abstract,"
          + "references.title,references.year,references.externalIds,references.authors,references.venue,"
          + "citations.title,citations.year,citations.externalIds,citations.authors,citations.venue";

  private final RestTemplate restTemplate;
  private final DOIService doiService;
  private final String apiKey;
  private final ApiRetryHelper retryHelper;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public SemanticScholarResolver(
      RestTemplate restTemplate,
      DOIService doiService,
      @Value("${citelines.api.semanticscholar.delay-ms:100}") int delayMs,
      @Value("${citelines.api.semanticscholar.api-key:}") String apiKey) {
    this.restTemplate = restTemplate;
    this.doiService = doiService;
    this.apiKey = apiKey;
    this.retryHelper =
        new ApiRetryHelper("SemanticScholar", "SEMANTIC_SCHOLAR_API_DELAY_MS", delayMs, 5, delayMs);
  }

  @Override
  public String name() {
    return "SemanticScholar";
  }

  @Override
  public Optional<ResolvedWork> resolveByDoi(String doi) {
    String url = BASE_URL + "/DOI:" + doi + "?fields=" + FIELDS;
    HttpEntity<Void> request = new HttpEntity<>(headers());
    try {
      String body =
          retryHelper.execute(
              "GET /paper/DOI:" + doi,
              () -> {
                ResponseEntity<String> response =
                    restTemplate.exchange(url, HttpMethod.GET, request, String.class);
                return response.getBody();
              });
      return Optional.of(parseWork(readTree(body)));
    } catch (HttpClientErrorException.NotFound e) {
      return Optional.empty();
    }
  }

  @Override
  public List<ResolvedWork> getReferences(ResolvedWork sourceWork, int maxResults) {
    return cap(sourceWork.embeddedReferences(), maxResults);
  }

  @Override
  public List<ResolvedWork> getCitations(ResolvedWork sourceWork, int maxResults) {
    return cap(sourceWork.embeddedCitations(), maxResults);
  }

  private static List<ResolvedWork> cap(List<ResolvedWork> works, int maxResults) {
    return works.subList(0, Math.min(works.size(), maxResults));
  }

  private HttpHeaders headers() {
    HttpHeaders headers = new HttpHeaders();
    if (apiKey != null && !apiKey.isBlank()) {
      headers.set("x-api-key", apiKey);
    }
    return headers;
  }

  private ResolvedWork parseWork(JsonNode node) {
    List<String> authorNames = new ArrayList<>();
    for (JsonNode author : node.path("authors")) {
      String name = textOrNull(author, "name");
      if (name != null) {
        authorNames.add(name);
      }
    }

    return new ResolvedWork(
        textOrNull(node, "paperId"),
        normalizeDoiOrNull(textOrNull(node.path("externalIds"), "DOI")),
        textOrNull(node, "title"),
        node.path("year").isInt() ? node.path("year").asInt() : null,
        translateType(node.path("publicationTypes")),
        authorNames,
        textOrNull(node, "venue"),
        List.of(),
        parseEmbeddedList(node.path("references")),
        parseEmbeddedList(node.path("citations")),
        textOrNull(node, "abstract"),
        null,
        null,
        null,
        null,
        null,
        null,
        null);
  }

  // A reference/citation item shares its parent's shape, minus publicationTypes (never requested
  // for embedded items) and referenced/citing lists of its own (this project only needs one hop).
  private ResolvedWork parseEmbeddedItem(JsonNode node) {
    List<String> authorNames = new ArrayList<>();
    for (JsonNode author : node.path("authors")) {
      String name = textOrNull(author, "name");
      if (name != null) {
        authorNames.add(name);
      }
    }
    return new ResolvedWork(
        textOrNull(node, "paperId"),
        normalizeDoiOrNull(textOrNull(node.path("externalIds"), "DOI")),
        textOrNull(node, "title"),
        node.path("year").isInt() ? node.path("year").asInt() : null,
        null,
        authorNames,
        textOrNull(node, "venue"),
        List.of(),
        List.of(),
        List.of());
  }

  // `references`/`citations` are JSON null (not []) when the publisher has restricted them.
  private List<ResolvedWork> parseEmbeddedList(JsonNode arrayNode) {
    if (arrayNode.isMissingNode() || arrayNode.isNull()) {
      return List.of();
    }
    List<ResolvedWork> works = new ArrayList<>();
    for (JsonNode item : arrayNode) {
      works.add(parseEmbeddedItem(item));
    }
    return works;
  }

  // publicationTypes is a list (e.g. ["JournalArticle","Conference"]); translated to the single
  // OpenAlex-style vocabulary string BibTexSynthesisService's ENTRY_TYPE_MAP understands, in
  // priority order. An unmapped/absent set of types falls back to "misc" there, same as Crossref.
  private static String translateType(JsonNode publicationTypes) {
    List<String> types = new ArrayList<>();
    for (JsonNode t : publicationTypes) {
      types.add(t.asText());
    }
    if (types.contains("Conference")) {
      return "proceedings-article";
    }
    if (types.contains("JournalArticle")) {
      return "article";
    }
    if (types.contains("Book")) {
      return "book";
    }
    return null;
  }

  private String normalizeDoiOrNull(String rawDoi) {
    if (rawDoi == null) {
      return null;
    }
    try {
      return doiService.normalizeRawDOI(rawDoi);
    } catch (IllegalArgumentException e) {
      log.debug("Could not normalize DOI from Semantic Scholar: {}", rawDoi);
      return null;
    }
  }

  private static String textOrNull(JsonNode node, String field) {
    JsonNode child = node.path(field);
    return child.isMissingNode() || child.isNull() ? null : child.asText();
  }

  private JsonNode readTree(String json) {
    try {
      return objectMapper.readTree(json);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Could not parse Semantic Scholar API response as JSON", e);
    }
  }
}
