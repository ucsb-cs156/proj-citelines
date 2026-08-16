package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

public class DblpResolverTests {

  // A trimmed-down but structurally real DBLP search response (fields our parser reads),
  // modeled on the shape CheckLinksService#dblpHitsCiteHandle already parses for handle
  // confirmation. Two hits: the first is a non-matching DOI (to confirm only an exact match is
  // accepted), the second is the actual match with multiple authors.
  private static final String SEARCH_JSON =
      """
      {
        "result": {
          "hits": {
            "hit": [
              {
                "info": {
                  "key": "conf/other/Unrelated21",
                  "doi": "10.1145/9999999.9999999",
                  "title": "An Unrelated Paper"
                }
              },
              {
                "info": {
                  "key": "conf/chi/LeakeL21",
                  "doi": "10.1145/3411764.3445601",
                  "title": "PatchProv: Supporting Improvisational Design Practices for Modern Quilting",
                  "venue": "CHI",
                  "year": "2021",
                  "pages": "1-14",
                  "volume": "1",
                  "number": "2",
                  "type": "Conference and Workshop Papers",
                  "authors": {
                    "author": [
                      {"text": "Mackenzie Leake"},
                      {"text": "Frances Lai"}
                    ]
                  }
                }
              }
            ]
          }
        }
      }
      """;

  private RestTemplate restTemplate;
  private DblpResolver dblpResolver;

  @BeforeEach
  void setup() {
    restTemplate = mock(RestTemplate.class);
    dblpResolver = new DblpResolver(restTemplate, 0);
  }

  @Test
  void name_is_DBLP() {
    assertEquals("DBLP", dblpResolver.name());
  }

  @Test
  void resolveByDoi_finds_the_hit_whose_info_doi_matches_exactly() {
    when(restTemplate.exchange(
            contains(DblpResolver.SEARCH_URL), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(SEARCH_JSON));

    Optional<ResolvedWork> result = dblpResolver.resolveByDoi("10.1145/3411764.3445601");

    assertTrue(result.isPresent());
    ResolvedWork work = result.get();
    assertEquals("conf/chi/LeakeL21", work.id());
    assertEquals("10.1145/3411764.3445601", work.doi());
    assertEquals(
        "PatchProv: Supporting Improvisational Design Practices for Modern Quilting", work.title());
    assertEquals("CHI", work.venue());
    assertEquals(2021, work.year());
    assertEquals("1-14", work.pages());
    assertEquals("1", work.volume());
    assertEquals("2", work.number());
    assertEquals("proceedings-article", work.type());
    assertEquals(List.of("Mackenzie Leake", "Frances Lai"), work.authorNames());
  }

  @Test
  void resolveByDoi_uses_the_doi_itself_as_the_search_query() {
    when(restTemplate.exchange(
            contains("q=10.1145%2F3411764.3445601"), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(SEARCH_JSON));

    assertTrue(dblpResolver.resolveByDoi("10.1145/3411764.3445601").isPresent());
  }

  @Test
  void resolveByDoi_returns_empty_when_no_hit_matches_the_doi() {
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(SEARCH_JSON));

    assertTrue(dblpResolver.resolveByDoi("10.1234/nonexistent").isEmpty());
  }

  @Test
  void resolveByDoi_returns_empty_when_there_are_no_hits_at_all() {
    String json = "{\"result\": {\"hits\": {}}}";
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertTrue(dblpResolver.resolveByDoi("10.1145/3411764.3445601").isEmpty());
  }

  @Test
  void resolveByDoi_returns_empty_when_the_response_is_not_valid_json() {
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok("not json"));

    assertTrue(dblpResolver.resolveByDoi("10.1145/3411764.3445601").isEmpty());
  }

  @Test
  void a_single_author_is_parsed_from_a_bare_object_rather_than_an_array() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "authors": {"author": {"text": "Solo Author"}}}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    ResolvedWork work = dblpResolver.resolveByDoi("10.1/x").get();
    assertEquals(List.of("Solo Author"), work.authorNames());
  }

  @Test
  void an_entry_with_no_authors_field_at_all_parses_with_an_empty_author_list() {
    String json =
        "{\"result\": {\"hits\": {\"hit\": [{\"info\": {\"doi\": \"10.1/x\", \"title\": \"T\"}}]}}}";
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(List.of(), dblpResolver.resolveByDoi("10.1/x").get().authorNames());
  }

  @Test
  void translates_journal_articles_to_article() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "type": "Journal Articles"}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals("article", dblpResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void translates_books_and_theses_to_book() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "type": "Books and Theses"}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals("book", dblpResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void passes_through_an_unmapped_type_unchanged() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "type": "Editorship"}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals("Editorship", dblpResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void an_explicit_json_null_venue_parses_as_null() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "venue": null}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(null, dblpResolver.resolveByDoi("10.1/x").get().venue());
  }

  @Test
  void a_missing_type_parses_as_null() {
    String json =
        "{\"result\": {\"hits\": {\"hit\": [{\"info\": {\"doi\": \"10.1/x\", \"title\": \"T\"}}]}}}";
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(null, dblpResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void a_json_integer_year_parses_correctly() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "year": 2021}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(2021, dblpResolver.resolveByDoi("10.1/x").get().year());
  }

  @Test
  void a_missing_year_field_parses_as_null() {
    String json =
        "{\"result\": {\"hits\": {\"hit\": [{\"info\": {\"doi\": \"10.1/x\", \"title\": \"T\"}}]}}}";
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(null, dblpResolver.resolveByDoi("10.1/x").get().year());
  }

  @Test
  void a_non_numeric_year_parses_as_null() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1/x", "title": "T", "year": "circa 2012"}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(null, dblpResolver.resolveByDoi("10.1/x").get().year());
  }

  @Test
  void the_resulting_works_doi_is_the_already_normalized_query_doi_not_a_reparsed_copy() {
    String json =
        """
        {"result": {"hits": {"hit": [
          {"info": {"doi": "10.1145/3411764.3445601", "title": "T"}}
        ]}}}
        """;
    when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(json));

    assertEquals(
        "10.1145/3411764.3445601",
        dblpResolver.resolveByDoi("10.1145/3411764.3445601").get().doi());
  }

  @Test
  void getReferences_always_returns_an_empty_list() {
    ResolvedWork source =
        new ResolvedWork(
            "id", null, "Title", null, null, List.of(), null, List.of(), List.of(), List.of());
    assertEquals(List.of(), dblpResolver.getReferences(source, 200));
  }

  @Test
  void getCitations_always_returns_an_empty_list() {
    ResolvedWork source =
        new ResolvedWork(
            "id", null, "Title", null, null, List.of(), null, List.of(), List.of(), List.of());
    assertEquals(List.of(), dblpResolver.getCitations(source, 200));
  }

  @Test
  void the_user_agent_header_is_set_on_the_search_request() {
    @SuppressWarnings("unchecked")
    org.mockito.ArgumentCaptor<org.springframework.http.HttpEntity<Void>> requestCaptor =
        org.mockito.ArgumentCaptor.forClass(org.springframework.http.HttpEntity.class);
    when(restTemplate.exchange(
            any(String.class), eq(HttpMethod.GET), requestCaptor.capture(), eq(String.class)))
        .thenReturn(ResponseEntity.ok(SEARCH_JSON));

    dblpResolver.resolveByDoi("10.1145/3411764.3445601");

    assertEquals(
        List.of("Citelines/1.0"),
        requestCaptor.getValue().getHeaders().get(org.springframework.http.HttpHeaders.USER_AGENT));
  }

  @Test
  void a_5xx_response_gives_up_after_retrying_and_throws() {
    RestTemplate slowRestTemplate = mock(RestTemplate.class);
    DblpResolver retryingResolver = new DblpResolver(slowRestTemplate, 0);
    when(slowRestTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(), eq(String.class)))
        .thenThrow(
            org.springframework.web.client.HttpServerErrorException.create(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "Service Unavailable",
                null,
                null,
                null));

    assertThrows(
        ApiRetryHelper.ApiUnavailableException.class,
        () -> retryingResolver.resolveByDoi("10.1145/3411764.3445601"));
  }
}
