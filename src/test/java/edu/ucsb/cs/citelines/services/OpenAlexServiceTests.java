package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

public class OpenAlexServiceTests {

  // A trimmed-down but structurally real OpenAlex Work object (fields our parser reads), captured
  // against the live API for DOI 10.1038/s41586-020-2649-2 while designing this feature.
  private static final String WORK_BY_DOI_JSON =
      """
      {
        "id": "https://openalex.org/W3035965352",
        "doi": "https://doi.org/10.1038/s41586-020-2649-2",
        "title": "Array programming with NumPy",
        "publication_year": 2020,
        "type": "article",
        "authorships": [
          {"author": {"display_name": "Charles R. Harris"}},
          {"author": {"display_name": "K. Jarrod Millman"}}
        ],
        "primary_location": {"source": {"display_name": "Nature"}},
        "referenced_works": ["https://openalex.org/W1", "https://openalex.org/W2"]
      }
      """;

  private static final String WORKS_LIST_JSON =
      """
      {
        "meta": {"count": 2},
        "results": [
          {
            "id": "https://openalex.org/W3177828909",
            "doi": "https://doi.org/10.1038/s41586-021-03819-2",
            "title": "Highly accurate protein structure prediction with AlphaFold",
            "publication_year": 2021,
            "type": "article",
            "authorships": [],
            "referenced_works": []
          },
          {
            "id": "https://openalex.org/W4",
            "title": "A paper with no DOI",
            "publication_year": 2019,
            "type": "preprint",
            "authorships": [],
            "referenced_works": []
          }
        ]
      }
      """;

  private RestTemplate restTemplate;
  private OpenAlexService openAlexService;

  @BeforeEach
  void setup() {
    restTemplate = mock(RestTemplate.class);
    openAlexService = new OpenAlexService(restTemplate, new DOIService(), 0, "");
  }

  @Test
  void getWorkByDoi_parses_a_full_work() {
    when(restTemplate.getForObject(
            contains("/works/doi:10.1038/s41586-020-2649-2"), eq(String.class)))
        .thenReturn(WORK_BY_DOI_JSON);

    Optional<OpenAlexWork> result = openAlexService.getWorkByDoi("10.1038/s41586-020-2649-2");

    assertTrue(result.isPresent());
    OpenAlexWork work = result.get();
    assertEquals("W3035965352", work.id());
    assertEquals("10.1038/s41586-020-2649-2", work.doi());
    assertEquals("Array programming with NumPy", work.title());
    assertEquals(2020, work.year());
    assertEquals("article", work.type());
    assertEquals(List.of("Charles R. Harris", "K. Jarrod Millman"), work.authorNames());
    assertEquals("Nature", work.venue());
    assertEquals(List.of("W1", "W2"), work.referencedWorkIds());
  }

  @Test
  void getWorkByDoi_returns_empty_on_404() {
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class)))
        .thenThrow(
            HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    assertTrue(openAlexService.getWorkByDoi("10.1234/nonexistent").isEmpty());
  }

  @Test
  void getWorksCiting_parses_a_results_list_and_caps_per_page() {
    when(restTemplate.getForObject(contains("filter=cites:W3035965352"), eq(String.class)))
        .thenReturn(WORKS_LIST_JSON);

    List<OpenAlexWork> results = openAlexService.getWorksCiting("W3035965352", 500);

    assertEquals(2, results.size());
    assertEquals(
        "Highly accurate protein structure prediction with AlphaFold", results.get(0).title());
    assertEquals("10.1038/s41586-021-03819-2", results.get(0).doi());
    // second result has no doi field at all
    assertEquals("A paper with no DOI", results.get(1).title());

    verify(restTemplate).getForObject(contains("per_page=200"), eq(String.class));
  }

  @Test
  void getWorksByIds_batches_requests_of_more_than_50_ids() {
    when(restTemplate.getForObject(contains("ids.openalex:"), eq(String.class)))
        .thenReturn(WORKS_LIST_JSON);

    List<String> ids = new java.util.ArrayList<>();
    for (int i = 0; i < 75; i++) {
      ids.add("https://openalex.org/W" + i);
    }

    List<OpenAlexWork> results = openAlexService.getWorksByIds(ids);

    // two batches (50 + 25), each returning the 2 results in WORKS_LIST_JSON
    assertEquals(4, results.size());
    verify(restTemplate, org.mockito.Mockito.times(2))
        .getForObject(contains("ids.openalex:"), eq(String.class));
  }

  @Test
  void getWorksByIds_makes_exactly_one_request_for_exactly_50_ids() {
    when(restTemplate.getForObject(contains("ids.openalex:"), eq(String.class)))
        .thenReturn(WORKS_LIST_JSON);

    List<String> ids = new java.util.ArrayList<>();
    for (int i = 0; i < 50; i++) {
      ids.add("W" + i);
    }

    openAlexService.getWorksByIds(ids);

    verify(restTemplate, org.mockito.Mockito.times(1))
        .getForObject(contains("ids.openalex:"), eq(String.class));
  }

  @Test
  void the_batch_id_filters_pipe_delimiter_is_never_percent_encoded() {
    // Regression test: UriComponentsBuilder percent-encodes "|" to "%7C", which OpenAlex's filter
    // parser does not handle — it silently returns only the first id's match instead of an error,
    // confirmed against the live API while building this service. A literal "|" is required.
    when(restTemplate.getForObject(contains("ids.openalex:W1|W2"), eq(String.class)))
        .thenReturn(WORKS_LIST_JSON);

    openAlexService.getWorksByIds(List.of("W1", "W2"));

    verify(restTemplate)
        .getForObject(
            org.mockito.ArgumentMatchers.argThat((String u) -> !u.contains("%7C")),
            eq(String.class));
  }

  @Test
  void the_citing_works_filter_url_is_never_percent_encoded() {
    when(restTemplate.getForObject(contains("filter=cites:W1"), eq(String.class)))
        .thenReturn(WORKS_LIST_JSON);

    openAlexService.getWorksCiting("W1", 10);

    verify(restTemplate)
        .getForObject(
            org.mockito.ArgumentMatchers.argThat(
                (String u) ->
                    u.equals("https://api.openalex.org/works?filter=cites:W1&per_page=10")),
            eq(String.class));
  }

  @Test
  void mailto_is_appended_when_configured() {
    OpenAlexService withMailto =
        new OpenAlexService(restTemplate, new DOIService(), 0, "test@example.com");
    when(restTemplate.getForObject(contains("mailto=test@example.com"), eq(String.class)))
        .thenReturn(WORK_BY_DOI_JSON);

    assertTrue(withMailto.getWorkByDoi("10.1038/s41586-020-2649-2").isPresent());
  }

  @Test
  void a_null_mailto_is_treated_the_same_as_a_blank_one() {
    OpenAlexService withNullMailto = new OpenAlexService(restTemplate, new DOIService(), 0, null);
    when(restTemplate.getForObject(argThat((String u) -> !u.contains("mailto")), eq(String.class)))
        .thenReturn(WORK_BY_DOI_JSON);

    assertTrue(withNullMailto.getWorkByDoi("10.1038/s41586-020-2649-2").isPresent());
  }

  @Test
  void skips_an_authorship_with_no_display_name() {
    String json =
        """
        {
          "id": "https://openalex.org/W1",
          "title": "Title",
          "authorships": [{"author": {}}]
        }
        """;
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class))).thenReturn(json);

    OpenAlexWork work = openAlexService.getWorkByDoi("10.1234/x").get();
    assertTrue(work.authorNames().isEmpty());
  }

  @Test
  void a_missing_publication_year_parses_as_null() {
    String json = "{\"id\": \"https://openalex.org/W1\", \"title\": \"Title\"}";
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class))).thenReturn(json);

    OpenAlexWork work = openAlexService.getWorkByDoi("10.1234/x").get();
    assertEquals(null, work.year());
  }

  @Test
  void an_unparseable_doi_field_is_dropped_rather_than_kept_raw() {
    String json =
        "{\"id\": \"https://openalex.org/W1\", \"title\": \"Title\", \"doi\": \"not-a-doi\"}";
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class))).thenReturn(json);

    OpenAlexWork work = openAlexService.getWorkByDoi("10.1234/x").get();
    assertEquals(null, work.doi());
  }

  @Test
  void an_explicit_json_null_doi_parses_as_null() {
    String json = "{\"id\": \"https://openalex.org/W1\", \"title\": \"Title\", \"doi\": null}";
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class))).thenReturn(json);

    OpenAlexWork work = openAlexService.getWorkByDoi("10.1234/x").get();
    assertEquals(null, work.doi());
  }

  @Test
  void a_work_with_no_id_field_parses_with_a_null_id() {
    String json = "{\"title\": \"Title\"}";
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class))).thenReturn(json);

    OpenAlexWork work = openAlexService.getWorkByDoi("10.1234/x").get();
    assertEquals(null, work.id());
  }

  @Test
  void throws_a_clear_error_when_the_response_body_is_not_valid_json() {
    when(restTemplate.getForObject(contains("/works/doi:"), eq(String.class)))
        .thenReturn("not json");

    assertThrows(IllegalStateException.class, () -> openAlexService.getWorkByDoi("10.1234/x"));
  }
}
