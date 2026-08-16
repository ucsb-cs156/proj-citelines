package edu.ucsb.cs.citelines.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Client for DBLP's public search API (https://dblp.org/search/publ/api, no API key required),
 * tried last in the resolver chain — see {@code
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md} and issue #66. DBLP curates the CS
 * literature catalog independently of Crossref/OpenAlex/Semantic Scholar, so it can have cleaner
 * {@code venue}/{@code pages}/{@code volume}/{@code number} data than a very recently registered
 * DOI has on the other three — at the cost of narrower (CS-adjacent-venues-only) coverage, and no
 * {@code abstract}/{@code publisher}/{@code isbn} at all (not part of DBLP's schema).
 *
 * <p>DBLP has no dedicated by-DOI lookup endpoint, only free-text search — {@link #resolveByDoi}
 * queries using the DOI itself as the search text (DBLP's index includes each record's DOI, so this
 * reliably surfaces it as a hit if DBLP has the record at all) and accepts only a hit whose own
 * {@code info.doi} field matches exactly — the same confirm-by-exact-field-match approach {@link
 * CheckLinksService#confirmHandleViaDblp} already uses for handle verification, reused here instead
 * of a second copy of it.
 */
@Slf4j
@Service
public class DblpResolver implements CitationMetadataResolver {

  static final String SEARCH_URL = "https://dblp.org/search/publ/api";

  // DBLP's own type vocabulary translated into the vocabulary BibTexSynthesisService's
  // ENTRY_TYPE_MAP understands. Any type not listed here (e.g. "Editorship", "Informal and Other
  // Publications") is passed through unchanged and simply falls back to "misc" there.
  private static final Map<String, String> TYPE_TRANSLATION =
      Map.of(
          "Journal Articles", "article",
          "Conference and Workshop Papers", "proceedings-article",
          "Books and Theses", "book");

  private final RestTemplate restTemplate;
  private final ApiRetryHelper retryHelper;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public DblpResolver(
      RestTemplate restTemplate, @Value("${citelines.api.dblp.delay-ms:100}") int delayMs) {
    this.restTemplate = restTemplate;
    this.retryHelper = new ApiRetryHelper("DBLP", "DBLP_API_DELAY_MS", delayMs, 5, delayMs);
  }

  @Override
  public String name() {
    return "DBLP";
  }

  @Override
  public Optional<ResolvedWork> resolveByDoi(String doi) {
    String url = SEARCH_URL + "?format=json&q=" + URLEncoder.encode(doi, StandardCharsets.UTF_8);
    HttpHeaders headers = new HttpHeaders();
    headers.set(HttpHeaders.USER_AGENT, "Citelines/1.0");
    HttpEntity<Void> request = new HttpEntity<>(headers);
    String body =
        retryHelper.execute(
            "GET " + url,
            () -> {
              ResponseEntity<String> response =
                  restTemplate.exchange(url, HttpMethod.GET, request, String.class);
              return response.getBody();
            });
    return findMatchingHit(body, doi).map(info -> parseHit(info, doi));
  }

  /** DBLP's public API has no reference-list endpoint. */
  @Override
  public List<ResolvedWork> getReferences(ResolvedWork sourceWork, int maxResults) {
    return List.of();
  }

  /** DBLP's public API has no citing-works endpoint. */
  @Override
  public List<ResolvedWork> getCitations(ResolvedWork sourceWork, int maxResults) {
    return List.of();
  }

  private Optional<JsonNode> findMatchingHit(String body, String doi) {
    JsonNode hits;
    try {
      hits = objectMapper.readTree(body).path("result").path("hits").path("hit");
    } catch (JsonProcessingException e) {
      log.debug("Could not parse DBLP response as JSON");
      return Optional.empty();
    }
    for (JsonNode hit : hits) {
      JsonNode info = hit.path("info");
      if (doi.equalsIgnoreCase(textOrNull(info, "doi"))) {
        return Optional.of(info);
      }
    }
    return Optional.empty();
  }

  // `doi` is the already-normalized value resolveByDoi was called with, not re-extracted from
  // info.doi: findMatchingHit only ever passes through a hit whose own info.doi already matched
  // it exactly, so re-parsing/re-normalizing that same string here would be redundant.
  private ResolvedWork parseHit(JsonNode info, String doi) {
    return new ResolvedWork(
        textOrNull(info, "key"),
        doi,
        textOrNull(info, "title"),
        intOrNull(info, "year"),
        translateType(textOrNull(info, "type")),
        authorNames(info),
        textOrNull(info, "venue"),
        List.of(),
        List.of(),
        List.of(),
        null,
        null,
        textOrNull(info, "pages"),
        null,
        null,
        null,
        textOrNull(info, "volume"),
        textOrNull(info, "number"));
  }

  // DBLP's JSON API represents `authors.author` as a single object when there's exactly one
  // author, or an array of such objects when there's more than one — a well-known quirk of DBLP's
  // API (and of many similarly-generated XML-to-JSON APIs), handled defensively here rather than
  // assuming either shape.
  private static List<String> authorNames(JsonNode info) {
    List<String> names = new ArrayList<>();
    JsonNode author = info.path("authors").path("author");
    if (author.isArray()) {
      for (JsonNode item : author) {
        addAuthorName(names, item);
      }
    } else {
      addAuthorName(names, author);
    }
    return names;
  }

  private static void addAuthorName(List<String> names, JsonNode authorNode) {
    String name = authorNode.isObject() ? textOrNull(authorNode, "text") : authorNode.asText(null);
    if (name != null) {
      names.add(name);
    }
  }

  private static String translateType(String dblpType) {
    if (dblpType == null) {
      return null;
    }
    return TYPE_TRANSLATION.getOrDefault(dblpType, dblpType);
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
}
