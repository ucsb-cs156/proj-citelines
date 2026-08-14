package edu.ucsb.cs.citelines.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Client for the Crossref REST API (https://api.crossref.org, no API key required), tried after
 * OpenAlex and Semantic Scholar in the resolver chain — see {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md}.
 *
 * <p>Crossref's public API has no citing-works endpoint at all ({@link #getCitations} always
 * returns an empty list), but a work's own {@code reference} array is returned inline in the same
 * response that resolves it — some items carry a {@code DOI}, some carry inline {@code
 * article-title}/{@code year}/{@code author} with no DOI, some are pure {@code unstructured} free
 * text with nothing parseable. All three shapes become {@link ResolvedWork} stubs in {@link
 * #resolveByDoi}'s {@code embeddedReferences}, so {@link #getReferences} needs no extra network
 * call — it just returns what was already parsed.
 */
@Slf4j
@Service
public class CrossrefResolver implements CitationMetadataResolver {

  private static final String BASE_URL = "https://api.crossref.org";

  // Crossref's own type vocabulary overlaps with, but isn't identical to, OpenAlex's — translated
  // here into the vocabulary BibTexSynthesisService's ENTRY_TYPE_MAP already understands. Any type
  // not listed here (e.g. "posted-content", "peer-review") is passed through unchanged and simply
  // falls back to "misc" there, which is the correct behavior for an unmapped type either way.
  private static final Map<String, String> TYPE_TRANSLATION =
      Map.of(
          "journal-article", "article",
          "monograph", "book");

  private final RestTemplate restTemplate;
  private final DOIService doiService;
  private final String mailto;
  private final ApiRetryHelper retryHelper;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public CrossrefResolver(
      RestTemplate restTemplate,
      DOIService doiService,
      @Value("${citelines.api.crossref.delay-ms:100}") int delayMs,
      @Value("${citelines.api.crossref.mailto:}") String mailto) {
    this.restTemplate = restTemplate;
    this.doiService = doiService;
    this.mailto = mailto;
    this.retryHelper = new ApiRetryHelper("Crossref", "CROSSREF_API_DELAY_MS", delayMs, 5, delayMs);
  }

  @Override
  public String name() {
    return "Crossref";
  }

  @Override
  public Optional<ResolvedWork> resolveByDoi(String doi) {
    String url = BASE_URL + "/works/" + doi + mailtoSuffix();
    try {
      String body =
          retryHelper.execute(
              "GET /works/" + doi, () -> restTemplate.getForObject(url, String.class));
      return Optional.of(parseWork(readTree(body).path("message")));
    } catch (HttpClientErrorException.NotFound e) {
      return Optional.empty();
    }
  }

  @Override
  public List<ResolvedWork> getReferences(ResolvedWork sourceWork, int maxResults) {
    List<ResolvedWork> embedded = sourceWork.embeddedReferences();
    return embedded.subList(0, Math.min(embedded.size(), maxResults));
  }

  /** Crossref's public API has no citing-works endpoint. */
  @Override
  public List<ResolvedWork> getCitations(ResolvedWork sourceWork, int maxResults) {
    return List.of();
  }

  private String mailtoSuffix() {
    return mailto != null && !mailto.isBlank() ? "?mailto=" + mailto : "";
  }

  private ResolvedWork parseWork(JsonNode node) {
    List<String> authorNames = new ArrayList<>();
    for (JsonNode author : node.path("author")) {
      String name = authorFullName(author);
      if (name != null) {
        authorNames.add(name);
      }
    }

    List<ResolvedWork> embeddedReferences = new ArrayList<>();
    for (JsonNode refNode : node.path("reference")) {
      embeddedReferences.add(parseReferenceItem(refNode));
    }

    return new ResolvedWork(
        textOrNull(node, "DOI"),
        normalizeDoiOrNull(textOrNull(node, "DOI")),
        firstOrNull(node.path("title")),
        yearFrom(node),
        translateType(textOrNull(node, "type")),
        authorNames,
        firstOrNull(node.path("container-title")),
        List.of(),
        embeddedReferences,
        List.of());
  }

  // A Crossref `reference` array item is one of three shapes: DOI-only (most common — the
  // referenced work's own metadata isn't inlined at all, just its DOI), structured-with-no-DOI
  // (inline `article-title`/`year`/`author`), or pure `unstructured` free text with nothing
  // parseable (left as an all-null stub, handled the same as any other unresolvable item).
  private ResolvedWork parseReferenceItem(JsonNode refNode) {
    String doi = normalizeDoiOrNull(textOrNull(refNode, "DOI"));
    String articleTitle = textOrNull(refNode, "article-title");
    String author = textOrNull(refNode, "author");
    return new ResolvedWork(
        textOrNull(refNode, "key"),
        doi,
        articleTitle,
        intOrNull(refNode, "year"),
        null,
        author != null ? List.of(author) : List.of(),
        textOrNull(refNode, "journal-title"),
        List.of(),
        List.of(),
        List.of());
  }

  private static String authorFullName(JsonNode author) {
    String given = textOrNull(author, "given");
    String family = textOrNull(author, "family");
    if (family == null) {
      return given;
    }
    return given != null ? given + " " + family : family;
  }

  private static String translateType(String crossrefType) {
    if (crossrefType == null) {
      return null;
    }
    return TYPE_TRANSLATION.getOrDefault(crossrefType, crossrefType);
  }

  private static Integer yearFrom(JsonNode node) {
    for (String field : List.of("published-print", "published-online", "published", "issued")) {
      JsonNode dateParts = node.path(field).path("date-parts").path(0).path(0);
      if (dateParts.isInt()) {
        return dateParts.asInt();
      }
    }
    return null;
  }

  private static String firstOrNull(JsonNode arrayNode) {
    JsonNode first = arrayNode.path(0);
    return first.isMissingNode() || first.isNull() ? null : first.asText();
  }

  private String normalizeDoiOrNull(String rawDoi) {
    if (rawDoi == null) {
      return null;
    }
    try {
      return doiService.normalizeRawDOI(rawDoi);
    } catch (IllegalArgumentException e) {
      log.debug("Could not normalize DOI from Crossref: {}", rawDoi);
      return null;
    }
  }

  private static String textOrNull(JsonNode node, String field) {
    JsonNode child = node.path(field);
    return child.isMissingNode() || child.isNull() ? null : child.asText();
  }

  private static Integer intOrNull(JsonNode node, String field) {
    JsonNode child = node.path(field);
    if (child.isInt()) {
      return child.asInt();
    }
    if (child.isTextual()) {
      try {
        return Integer.parseInt(child.asText());
      } catch (NumberFormatException e) {
        return null;
      }
    }
    return null;
  }

  private JsonNode readTree(String json) {
    try {
      return objectMapper.readTree(json);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Could not parse Crossref API response as JSON", e);
    }
  }
}
