package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

public class CrossrefResolverTests {

  // A trimmed-down but structurally real Crossref work object (fields our parser reads), captured
  // against the live API for DOI 10.1145/3411764.3445601 while designing this feature. The three
  // `reference` item shapes below (DOI-only, structured-no-DOI, unstructured-only) are exactly the
  // three shapes confirmed present in that real response's 65-item reference list.
  private static final String WORK_JSON =
      """
      {
        "status": "ok",
        "message-type": "work",
        "message": {
          "DOI": "10.1145/3411764.3445601",
          "type": "proceedings-article",
          "title": ["PatchProv: Supporting Improvisational Design Practices for Modern Quilting"],
          "author": [
            {"given": "Mackenzie", "family": "Leake"},
            {"given": "Frances", "family": "Lai"}
          ],
          "container-title": ["Proceedings of the 2021 CHI Conference on Human Factors in Computing Systems"],
          "published-print": {"date-parts": [[2021, 5, 6]]},
          "abstract": "<jats:p>A study of <jats:italic>improvisational</jats:italic> quilting.</jats:p>",
          "publisher": "Association for Computing Machinery",
          "page": "1-14",
          "ISBN": ["9781450380966"],
          "event": {"name": "CHI '21", "location": "Yokohama, Japan"},
          "volume": "12",
          "issue": "3",
          "reference": [
            {"key": "e_1", "doi-asserted-by": "publisher", "DOI": "10.1145/3313831.3376305"},
            {
              "key": "e_2",
              "article-title": "An approach to image segmentation",
              "author": "Chandhok Chinki",
              "year": "2012",
              "journal-title": "IJIT"
            },
            {
              "key": "e_3",
              "unstructured": "Some free-text citation with no structured fields at all."
            }
          ]
        }
      }
      """;

  private RestTemplate restTemplate;
  private CrossrefResolver crossrefResolver;

  @BeforeEach
  void setup() {
    restTemplate = mock(RestTemplate.class);
    crossrefResolver = new CrossrefResolver(restTemplate, new DOIService(), 0, "");
  }

  @Test
  void name_is_Crossref() {
    assertEquals("Crossref", crossrefResolver.name());
  }

  @Test
  void resolveByDoi_parses_the_work_and_its_embedded_references() {
    when(restTemplate.getForObject(contains("/works/10.1145/3411764.3445601"), eq(String.class)))
        .thenReturn(WORK_JSON);

    Optional<ResolvedWork> result = crossrefResolver.resolveByDoi("10.1145/3411764.3445601");

    assertTrue(result.isPresent());
    ResolvedWork work = result.get();
    assertEquals("10.1145/3411764.3445601", work.doi());
    assertEquals(
        "PatchProv: Supporting Improvisational Design Practices for Modern Quilting", work.title());
    assertEquals("proceedings-article", work.type());
    assertEquals(List.of("Mackenzie Leake", "Frances Lai"), work.authorNames());
    assertEquals(
        "Proceedings of the 2021 CHI Conference on Human Factors in Computing Systems",
        work.venue());
    assertEquals(2021, work.year());
    assertEquals(3, work.embeddedReferences().size());
    assertEquals(List.of(), work.embeddedCitations());
    assertEquals(List.of(), work.referencedWorkIds());
    assertEquals("A study of improvisational quilting.", work.abstractText());
    assertEquals("Association for Computing Machinery", work.publisher());
    assertEquals("1-14", work.pages());
    assertEquals("9781450380966", work.isbn());
    assertEquals("CHI '21", work.series());
    assertEquals("Yokohama, Japan", work.address());
    assertEquals("12", work.volume());
    assertEquals("3", work.number());
  }

  @Test
  void fields_with_no_data_in_the_response_parse_as_null() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    ResolvedWork work = crossrefResolver.resolveByDoi("10.1/x").get();

    assertEquals(null, work.abstractText());
    assertEquals(null, work.publisher());
    assertEquals(null, work.pages());
    assertEquals(null, work.isbn());
    assertEquals(null, work.series());
    assertEquals(null, work.address());
    assertEquals(null, work.volume());
    assertEquals(null, work.number());
  }

  @Test
  void an_abstract_with_no_xml_tags_at_all_is_left_unchanged() {
    String json =
        "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"], \"abstract\": \"Plain text.\"}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals("Plain text.", crossrefResolver.resolveByDoi("10.1/x").get().abstractText());
  }

  @Test
  void the_first_embedded_reference_is_a_doi_only_stub() {
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(WORK_JSON);
    ResolvedWork work = crossrefResolver.resolveByDoi("10.1145/3411764.3445601").get();

    ResolvedWork ref = work.embeddedReferences().get(0);
    assertEquals("10.1145/3313831.3376305", ref.doi());
    assertEquals(null, ref.title());
    assertEquals("e_1", ref.id());
  }

  @Test
  void the_second_embedded_reference_is_structured_with_no_doi() {
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(WORK_JSON);
    ResolvedWork work = crossrefResolver.resolveByDoi("10.1145/3411764.3445601").get();

    ResolvedWork ref = work.embeddedReferences().get(1);
    assertEquals(null, ref.doi());
    assertEquals("An approach to image segmentation", ref.title());
    assertEquals(2012, ref.year());
    assertEquals(List.of("Chandhok Chinki"), ref.authorNames());
    assertEquals("IJIT", ref.venue());
  }

  @Test
  void the_third_embedded_reference_is_an_unstructured_only_stub() {
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(WORK_JSON);
    ResolvedWork work = crossrefResolver.resolveByDoi("10.1145/3411764.3445601").get();

    ResolvedWork ref = work.embeddedReferences().get(2);
    assertEquals(null, ref.doi());
    assertEquals(null, ref.title());
    assertEquals("e_3", ref.id());
    assertEquals(null, ref.year());
  }

  @Test
  void resolveByDoi_returns_empty_on_404() {
    when(restTemplate.getForObject(contains("/works/"), eq(String.class)))
        .thenThrow(
            HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    assertTrue(crossrefResolver.resolveByDoi("10.1234/nonexistent").isEmpty());
  }

  @Test
  void getReferences_returns_the_embedded_references_with_no_extra_network_call() {
    ResolvedWork ref1 = stubWork("10.1/a", "Ref A");
    ResolvedWork ref2 = stubWork("10.1/b", "Ref B");
    ResolvedWork source = sourceWithEmbeddedReferences(List.of(ref1, ref2));

    List<ResolvedWork> refs = crossrefResolver.getReferences(source, 200);

    assertEquals(List.of(ref1, ref2), refs);
    verifyNoInteractions(restTemplate);
  }

  @Test
  void getReferences_caps_to_maxResults() {
    ResolvedWork ref1 = stubWork("10.1/a", "Ref A");
    ResolvedWork ref2 = stubWork("10.1/b", "Ref B");
    ResolvedWork source = sourceWithEmbeddedReferences(List.of(ref1, ref2));

    List<ResolvedWork> refs = crossrefResolver.getReferences(source, 1);

    assertEquals(List.of(ref1), refs);
  }

  @Test
  void getReferences_returns_empty_list_when_there_are_no_embedded_references() {
    ResolvedWork source = sourceWithEmbeddedReferences(List.of());
    assertEquals(List.of(), crossrefResolver.getReferences(source, 200));
  }

  @Test
  void getCitations_always_returns_an_empty_list() {
    ResolvedWork source = sourceWithEmbeddedReferences(List.of(stubWork("10.1/a", "Ref A")));

    List<ResolvedWork> citations = crossrefResolver.getCitations(source, 200);

    assertEquals(List.of(), citations);
    verifyNoInteractions(restTemplate);
  }

  @Test
  void mailto_is_appended_when_configured() {
    CrossrefResolver withMailto =
        new CrossrefResolver(restTemplate, new DOIService(), 0, "test@example.com");
    when(restTemplate.getForObject(contains("mailto=test@example.com"), eq(String.class)))
        .thenReturn(WORK_JSON);

    assertTrue(withMailto.resolveByDoi("10.1145/3411764.3445601").isPresent());
  }

  @Test
  void a_null_mailto_is_treated_the_same_as_a_blank_one() {
    CrossrefResolver withNullMailto = new CrossrefResolver(restTemplate, new DOIService(), 0, null);
    when(restTemplate.getForObject(argThat((String u) -> !u.contains("mailto")), eq(String.class)))
        .thenReturn(WORK_JSON);

    assertTrue(withNullMailto.resolveByDoi("10.1145/3411764.3445601").isPresent());
  }

  @Test
  void translates_journal_article_to_article() {
    String json =
        "{\"message\": {\"DOI\": \"10.1/x\", \"type\": \"journal-article\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals("article", crossrefResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void translates_monograph_to_book() {
    String json =
        "{\"message\": {\"DOI\": \"10.1/x\", \"type\": \"monograph\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals("book", crossrefResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void passes_through_an_unmapped_type_unchanged() {
    String json =
        "{\"message\": {\"DOI\": \"10.1/x\", \"type\": \"posted-content\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals("posted-content", crossrefResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void a_missing_type_parses_as_null() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(null, crossrefResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void falls_back_to_published_online_when_published_print_is_absent() {
    String json =
        """
        {"message": {"DOI": "10.1/x", "title": ["T"], "published-online": {"date-parts": [[2019]]}}}
        """;
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(2019, crossrefResolver.resolveByDoi("10.1/x").get().year());
  }

  @Test
  void a_missing_year_anywhere_parses_as_null() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(null, crossrefResolver.resolveByDoi("10.1/x").get().year());
  }

  @Test
  void an_author_with_only_a_given_name_uses_just_that() {
    String json =
        "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"], \"author\": [{\"given\": \"Cher\"}]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(List.of("Cher"), crossrefResolver.resolveByDoi("10.1/x").get().authorNames());
  }

  @Test
  void an_author_with_only_a_family_name_uses_just_that() {
    String json =
        "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"], \"author\": [{\"family\": \"Cher\"}]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(List.of("Cher"), crossrefResolver.resolveByDoi("10.1/x").get().authorNames());
  }

  @Test
  void an_author_with_neither_a_given_nor_a_family_name_is_skipped() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"], \"author\": [{}]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(List.of(), crossrefResolver.resolveByDoi("10.1/x").get().authorNames());
  }

  @Test
  void a_completely_missing_title_field_parses_as_null() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\"}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(null, crossrefResolver.resolveByDoi("10.1/x").get().title());
  }

  @Test
  void an_explicit_json_null_title_array_item_parses_as_null() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [null]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(null, crossrefResolver.resolveByDoi("10.1/x").get().title());
  }

  @Test
  void an_explicit_json_null_type_parses_as_null() {
    String json = "{\"message\": {\"DOI\": \"10.1/x\", \"title\": [\"T\"], \"type\": null}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(null, crossrefResolver.resolveByDoi("10.1/x").get().type());
  }

  @Test
  void an_unparseable_doi_is_dropped_rather_than_kept_raw() {
    String json = "{\"message\": {\"DOI\": \"not-a-doi\", \"title\": [\"T\"]}}";
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    assertEquals(null, crossrefResolver.resolveByDoi("10.1/x").get().doi());
  }

  @Test
  void a_reference_years_string_value_parses_as_an_integer() {
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(WORK_JSON);
    ResolvedWork ref =
        crossrefResolver.resolveByDoi("10.1145/3411764.3445601").get().embeddedReferences().get(1);

    assertEquals(2012, ref.year());
  }

  @Test
  void a_reference_with_a_json_integer_year_parses_correctly() {
    String json =
        """
        {"message": {"DOI": "10.1/x", "title": ["T"], "reference": [
          {"key": "e_1", "article-title": "R", "year": 2012}
        ]}}
        """;
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    ResolvedWork ref = crossrefResolver.resolveByDoi("10.1/x").get().embeddedReferences().get(0);
    assertEquals(2012, ref.year());
  }

  @Test
  void a_reference_with_a_non_numeric_year_string_parses_as_null() {
    String json =
        """
        {"message": {"DOI": "10.1/x", "title": ["T"], "reference": [
          {"key": "e_1", "article-title": "R", "year": "circa 2012"}
        ]}}
        """;
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn(json);

    ResolvedWork ref = crossrefResolver.resolveByDoi("10.1/x").get().embeddedReferences().get(0);
    assertEquals(null, ref.year());
  }

  @Test
  void throws_a_clear_error_when_the_response_body_is_not_valid_json() {
    when(restTemplate.getForObject(contains("/works/"), eq(String.class))).thenReturn("not json");

    assertThrows(IllegalStateException.class, () -> crossrefResolver.resolveByDoi("10.1/x"));
  }

  private static ResolvedWork stubWork(String doi, String title) {
    return new ResolvedWork(
        doi, doi, title, null, null, List.of(), null, List.of(), List.of(), List.of());
  }

  private static ResolvedWork sourceWithEmbeddedReferences(List<ResolvedWork> embeddedReferences) {
    return new ResolvedWork(
        "source",
        null,
        "Source",
        null,
        null,
        List.of(),
        null,
        List.of(),
        embeddedReferences,
        List.of());
  }
}
