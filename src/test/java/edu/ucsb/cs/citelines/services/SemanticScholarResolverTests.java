package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

public class SemanticScholarResolverTests {

  // A trimmed-down but structurally real Semantic Scholar Graph API response (fields our parser
  // reads), captured against the live API for DOI 10.1038/s41586-020-2649-2 while designing this
  // feature.
  private static final String WORK_JSON =
      """
      {
        "paperId": "204e3073870fae3d05bcbc2f6a8e263d9b72e776",
        "externalIds": {"DOI": "10.1038/s41586-020-2649-2", "CorpusId": 218889882},
        "title": "Array programming with NumPy",
        "venue": "Nature",
        "year": 2020,
        "publicationTypes": ["JournalArticle", "Review"],
        "authors": [
          {"authorId": "1", "name": "Charles R. Harris"},
          {"authorId": "2", "name": "K. Jarrod Millman"}
        ],
        "references": [
          {
            "paperId": "8d7f03c75bdb21d9a981cde8ae6a8359be2a67f8",
            "externalIds": {"DOI": "10.1109/MCSE.2021.3059232"},
            "title": "Reproducing GW150914",
            "venue": "Computing in science & engineering",
            "year": 2020,
            "authors": [{"authorId": "3", "name": "Duncan A. Brown"}]
          },
          {
            "paperId": "3c8a456509e6c0805354bd40a35e3f2dbf8069b1",
            "externalIds": {"ArXiv": "1912.01703"},
            "title": "PyTorch",
            "venue": "NeurIPS",
            "year": 2019,
            "authors": []
          }
        ],
        "citations": [
          {
            "paperId": "d4b4ffa0ddeaf8ea37ed6b52964d3a1e959c62ee",
            "externalIds": {"DOI": "10.1016/j.cnsns.2026.110611"},
            "title": "Finite element simulation driven reduced-order operator learning",
            "venue": "CNSNS",
            "year": 2026,
            "authors": [{"authorId": "4", "name": "Qijia Zhai"}]
          }
        ]
      }
      """;

  private RestTemplate restTemplate;
  private SemanticScholarResolver semanticScholarResolver;

  @BeforeEach
  void setup() {
    restTemplate = mock(RestTemplate.class);
    semanticScholarResolver = new SemanticScholarResolver(restTemplate, new DOIService(), 0, "");
  }

  private void stubResponse(String matchingUrlFragment, String body) {
    when(restTemplate.exchange(
            argThat((String u) -> u != null && u.contains(matchingUrlFragment)),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenReturn(new ResponseEntity<>(body, HttpStatus.OK));
  }

  @Test
  void name_is_SemanticScholar() {
    assertEquals("SemanticScholar", semanticScholarResolver.name());
  }

  @Test
  void resolveByDoi_parses_the_work_with_both_embedded_directions() {
    stubResponse("DOI:10.1038/s41586-020-2649-2", WORK_JSON);

    Optional<ResolvedWork> result =
        semanticScholarResolver.resolveByDoi("10.1038/s41586-020-2649-2");

    assertTrue(result.isPresent());
    ResolvedWork work = result.get();
    assertEquals("204e3073870fae3d05bcbc2f6a8e263d9b72e776", work.id());
    assertEquals("10.1038/s41586-020-2649-2", work.doi());
    assertEquals("Array programming with NumPy", work.title());
    assertEquals("Nature", work.venue());
    assertEquals(2020, work.year());
    assertEquals("article", work.type());
    assertEquals(List.of("Charles R. Harris", "K. Jarrod Millman"), work.authorNames());
    assertEquals(2, work.embeddedReferences().size());
    assertEquals(1, work.embeddedCitations().size());
    assertEquals(List.of(), work.referencedWorkIds());
  }

  @Test
  void an_embedded_reference_with_no_doi_still_parses_its_other_fields() {
    stubResponse("DOI:", WORK_JSON);
    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1038/x").get();

    ResolvedWork ref = work.embeddedReferences().get(1);
    assertEquals("PyTorch", ref.title());
    assertEquals(null, ref.doi());
    assertEquals("NeurIPS", ref.venue());
    assertEquals(2019, ref.year());
  }

  @Test
  void an_embedded_citation_parses_correctly() {
    stubResponse("DOI:", WORK_JSON);
    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1038/x").get();

    ResolvedWork citation = work.embeddedCitations().get(0);
    assertEquals(
        "Finite element simulation driven reduced-order operator learning", citation.title());
    assertEquals("10.1016/j.cnsns.2026.110611", citation.doi());
    assertEquals(List.of("Qijia Zhai"), citation.authorNames());
  }

  @Test
  void references_and_citations_null_for_a_publisher_restricted_paper_parse_as_empty_lists() {
    String json =
        """
        {
          "paperId": "p1",
          "externalIds": {"DOI": "10.1/x"},
          "title": "Restricted Paper",
          "publicationTypes": ["JournalArticle"],
          "authors": [],
          "references": null,
          "citations": null
        }
        """;
    stubResponse("DOI:", json);

    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1/x").get();

    assertEquals(List.of(), work.embeddedReferences());
    assertEquals(List.of(), work.embeddedCitations());
  }

  @Test
  void a_missing_references_field_parses_as_an_empty_list() {
    String json =
        """
        {"paperId": "p1", "externalIds": {"DOI": "10.1/x"}, "title": "T", "authors": []}
        """;
    stubResponse("DOI:", json);

    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1/x").get();

    assertEquals(List.of(), work.embeddedReferences());
    assertEquals(List.of(), work.embeddedCitations());
  }

  @Test
  void resolveByDoi_returns_empty_on_404() {
    when(restTemplate.exchange(
            org.mockito.ArgumentMatchers.anyString(),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenThrow(
            HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    assertTrue(semanticScholarResolver.resolveByDoi("10.1234/nonexistent").isEmpty());
  }

  @Test
  void getReferences_returns_the_embedded_references_with_no_extra_network_call() {
    stubResponse("DOI:", WORK_JSON);
    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1038/x").get();
    org.mockito.Mockito.clearInvocations(restTemplate);

    List<ResolvedWork> refs = semanticScholarResolver.getReferences(work, 200);

    assertEquals(2, refs.size());
    verifyNoInteractions(restTemplate);
  }

  @Test
  void getCitations_returns_the_embedded_citations_with_no_extra_network_call() {
    stubResponse("DOI:", WORK_JSON);
    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1038/x").get();
    org.mockito.Mockito.clearInvocations(restTemplate);

    List<ResolvedWork> citations = semanticScholarResolver.getCitations(work, 200);

    assertEquals(1, citations.size());
    verifyNoInteractions(restTemplate);
  }

  @Test
  void getReferences_returns_an_empty_list_when_embeddedReferences_is_empty() {
    ResolvedWork source =
        new ResolvedWork(
            "s", null, "S", null, null, List.of(), null, List.of(), List.of(), List.of());

    assertEquals(List.of(), semanticScholarResolver.getReferences(source, 200));
  }

  @Test
  void getReferences_caps_to_maxResults() {
    stubResponse("DOI:", WORK_JSON);
    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1038/x").get();

    List<ResolvedWork> refs = semanticScholarResolver.getReferences(work, 1);

    assertEquals(1, refs.size());
  }

  @Test
  void publicationTypes_conference_maps_to_proceedings_article() {
    String json =
        """
        {"paperId": "p1", "title": "T", "publicationTypes": ["Conference", "JournalArticle"], "authors": []}
        """;
    stubResponse("DOI:", json);

    assertEquals(
        "proceedings-article", semanticScholarResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void publicationTypes_book_maps_to_book_when_no_conference_or_journalArticle() {
    String json =
        "{\"paperId\": \"p1\", \"title\": \"T\", \"publicationTypes\": [\"Book\"], \"authors\": []}";
    stubResponse("DOI:", json);

    assertEquals("book", semanticScholarResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void an_unrecognized_publicationTypes_set_parses_as_a_null_type() {
    String json =
        "{\"paperId\": \"p1\", \"title\": \"T\", \"publicationTypes\": [\"Dataset\"], \"authors\": []}";
    stubResponse("DOI:", json);

    assertEquals(null, semanticScholarResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void a_missing_publicationTypes_field_parses_as_a_null_type() {
    String json = "{\"paperId\": \"p1\", \"title\": \"T\", \"authors\": []}";
    stubResponse("DOI:", json);

    assertEquals(null, semanticScholarResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void an_unparseable_doi_is_dropped_rather_than_kept_raw() {
    String json =
        "{\"paperId\": \"p1\", \"externalIds\": {\"DOI\": \"not-a-doi\"}, \"title\": \"T\", \"authors\": []}";
    stubResponse("DOI:", json);

    assertEquals(null, semanticScholarResolver.resolveByDoi("10.1/x").get().doi());
  }

  @Test
  void a_missing_externalIds_field_parses_with_a_null_doi() {
    String json = "{\"paperId\": \"p1\", \"title\": \"T\", \"authors\": []}";
    stubResponse("DOI:", json);

    assertEquals(null, semanticScholarResolver.resolveByDoi("10.1/x").get().doi());
  }

  @Test
  void skips_an_author_with_no_name_field() {
    String json =
        """
        {
          "paperId": "p1",
          "title": "T",
          "authors": [{"authorId": "1"}],
          "references": [{"paperId": "r1", "title": "R", "authors": [{"authorId": "2"}]}]
        }
        """;
    stubResponse("DOI:", json);

    ResolvedWork work = semanticScholarResolver.resolveByDoi("10.1/x").get();

    assertEquals(List.of(), work.authorNames());
    assertEquals(List.of(), work.embeddedReferences().get(0).authorNames());
  }

  @Test
  void an_embedded_item_with_no_year_field_parses_with_a_null_year() {
    String json =
        """
        {"paperId": "p1", "title": "T", "authors": [],
         "references": [{"paperId": "r1", "title": "R", "authors": []}]}
        """;
    stubResponse("DOI:", json);

    ResolvedWork ref =
        semanticScholarResolver.resolveByDoi("10.1/x").get().embeddedReferences().get(0);

    assertEquals(null, ref.year());
  }

  @Test
  void an_explicit_json_null_title_parses_as_null() {
    String json = "{\"paperId\": \"p1\", \"title\": null, \"authors\": []}";
    stubResponse("DOI:", json);

    assertEquals(null, semanticScholarResolver.resolveByDoi("10.1/x").get().title());
  }

  @Test
  void a_null_api_key_sends_no_x_api_key_header() {
    SemanticScholarResolver withNullKey =
        new SemanticScholarResolver(restTemplate, new DOIService(), 0, null);
    String json = "{\"paperId\": \"p1\", \"title\": \"T\", \"authors\": []}";
    when(restTemplate.exchange(
            org.mockito.ArgumentMatchers.anyString(),
            eq(HttpMethod.GET),
            argThat(
                (HttpEntity<?> entity) ->
                    entity != null && entity.getHeaders().get("x-api-key") == null),
            eq(String.class)))
        .thenReturn(new ResponseEntity<>(json, HttpStatus.OK));

    assertTrue(withNullKey.resolveByDoi("10.1/x").isPresent());
  }

  @Test
  void an_x_api_key_header_is_sent_when_configured() {
    SemanticScholarResolver withKey =
        new SemanticScholarResolver(restTemplate, new DOIService(), 0, "my-key");
    String json = "{\"paperId\": \"p1\", \"title\": \"T\", \"authors\": []}";
    when(restTemplate.exchange(
            org.mockito.ArgumentMatchers.anyString(),
            eq(HttpMethod.GET),
            argThat(
                (HttpEntity<?> entity) ->
                    entity != null && "my-key".equals(entity.getHeaders().getFirst("x-api-key"))),
            eq(String.class)))
        .thenReturn(new ResponseEntity<>(json, HttpStatus.OK));

    assertTrue(withKey.resolveByDoi("10.1/x").isPresent());
  }

  @Test
  void no_x_api_key_header_is_sent_when_not_configured() {
    String json = "{\"paperId\": \"p1\", \"title\": \"T\", \"authors\": []}";
    when(restTemplate.exchange(
            org.mockito.ArgumentMatchers.anyString(),
            eq(HttpMethod.GET),
            argThat(
                (HttpEntity<?> entity) ->
                    entity != null && entity.getHeaders().get("x-api-key") == null),
            eq(String.class)))
        .thenReturn(new ResponseEntity<>(json, HttpStatus.OK));

    assertTrue(semanticScholarResolver.resolveByDoi("10.1/x").isPresent());
  }

  @Test
  void throws_a_clear_error_when_the_response_body_is_not_valid_json() {
    when(restTemplate.exchange(
            org.mockito.ArgumentMatchers.anyString(),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenReturn(new ResponseEntity<>("not json", HttpStatus.OK));

    assertThrows(IllegalStateException.class, () -> semanticScholarResolver.resolveByDoi("10.1/x"));
  }
}
