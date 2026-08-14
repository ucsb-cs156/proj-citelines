package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

public class CheckLinksServiceTests {

  private CheckLinksService checkLinksService;
  private BibTexEntryRepository bibTexEntryRepository;
  private RestTemplate restTemplate;
  private RestTemplate noRedirectRestTemplate;
  private Job job;
  private JobContext ctx;

  private CheckLinksService serviceWith(String sourceRepo, String mailto) {
    return new CheckLinksService(
        bibTexEntryRepository, restTemplate, noRedirectRestTemplate, 0, sourceRepo, mailto);
  }

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    restTemplate = mock(RestTemplate.class);
    noRedirectRestTemplate = mock(RestTemplate.class);
    checkLinksService = serviceWith("https://github.com/ucsb-cs156/proj-citelines", "");
    job = Job.builder().build();
    ctx = new JobContext(null, job);
  }

  private static BibTexEntry entry(String citeKey, Map<String, String> keyValuePairs) {
    return BibTexEntry.builder()
        .id(citeKey)
        .projectId(1)
        .citeKey(citeKey)
        .keyValuePairs(keyValuePairs)
        .build();
  }

  private void mockDoi(String doi, ResponseEntity<String> response) {
    when(noRedirectRestTemplate.exchange(
            eq("https://doi.org/" + doi),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenReturn(response);
  }

  private void mockDoiThrows(String doi, RuntimeException exception) {
    when(noRedirectRestTemplate.exchange(
            eq("https://doi.org/" + doi),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenThrow(exception);
  }

  private void mockUrlHead(String url, ResponseEntity<Void> response) {
    when(restTemplate.exchange(eq(url), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class)))
        .thenReturn(response);
  }

  private void mockUrlHeadThrows(String url, RuntimeException exception) {
    when(restTemplate.exchange(eq(url), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class)))
        .thenThrow(exception);
  }

  @Test
  void flags_a_doi_that_returns_404() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/bad"));
    BibTexEntry entry = entry("bad2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoiThrows(
        "10.1234/bad",
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, times(1)).save(entry);
    assertTrue(job.getLog().contains("Invalid DOI for bad2020: 10.1234/bad"));
    assertTrue(job.getLog().contains("Done: checked 1 link, 1 flagged as suspicious."));
  }

  @Test
  void does_not_flag_a_doi_that_resolves_normally() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/good"));
    BibTexEntry entry = entry("good2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{\"title\":\"Some Paper\"}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void clears_a_previously_set_doi_flag_once_the_doi_resolves() {
    Map<String, String> kvp =
        new HashMap<>(Map.of("doi", "10.1234/good", "CITELINES_invalid_doi", "True"));
    BibTexEntry entry = entry("good2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{\"title\":\"Some Paper\"}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertFalse(kvp.containsKey("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, times(1)).save(entry);
  }

  @Test
  void does_not_flag_a_doi_whose_resolver_returns_an_unfollowed_redirect() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/redirect"));
    BibTexEntry entry = entry("redirect2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/redirect", new ResponseEntity<>(HttpStatus.FOUND));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(job.getLog().contains("Could not verify DOI for redirect2020 (10.1234/redirect):"));
  }

  @Test
  void does_not_flag_a_doi_when_the_lookup_is_forbidden() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/forbidden"));
    BibTexEntry entry = entry("forbidden2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoiThrows(
        "10.1234/forbidden",
        HttpClientErrorException.create(HttpStatus.FORBIDDEN, "Forbidden", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(job.getLog().contains("Could not check DOI for forbidden2020 (10.1234/forbidden):"));
  }

  @Test
  void does_not_flag_when_the_doi_lookup_fails_with_a_non_404_error() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/error"));
    BibTexEntry entry = entry("error2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoiThrows(
        "10.1234/error",
        HttpServerErrorException.create(
            HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(job.getLog().contains("Could not check DOI for error2020 (10.1234/error):"));
  }

  @Test
  void sends_content_negotiation_headers_for_the_doi_request() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/good"));
    BibTexEntry entry = entry("good2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(noRedirectRestTemplate)
        .exchange(
            eq("https://doi.org/10.1234/good"),
            eq(HttpMethod.GET),
            captor.capture(),
            eq(String.class));
    HttpHeaders headers = captor.getValue().getHeaders();
    assertEquals("application/citeproc+json", headers.getFirst(HttpHeaders.ACCEPT));
    assertTrue(headers.getFirst(HttpHeaders.USER_AGENT).contains("proj-citelines"));
  }

  @Test
  void includes_mailto_in_the_doi_user_agent_when_configured() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/good"));
    BibTexEntry entry = entry("good2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{}", HttpStatus.OK));

    serviceWith("", "you@example.com").checkLinks(1, ctx);

    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(noRedirectRestTemplate)
        .exchange(
            eq("https://doi.org/10.1234/good"),
            eq(HttpMethod.GET),
            captor.capture(),
            eq(String.class));
    assertTrue(
        captor
            .getValue()
            .getHeaders()
            .getFirst(HttpHeaders.USER_AGENT)
            .contains("mailto:you@example.com"));
  }

  @Test
  void flags_a_url_that_returns_404() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/missing"));
    BibTexEntry entry = entry("missing2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/missing",
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, times(1)).save(entry);
    assertTrue(
        job.getLog().contains("Invalid URL (404) for missing2020: https://example.org/missing"));
  }

  @Test
  void flags_a_url_that_returns_410_gone() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/gone"));
    BibTexEntry entry = entry("gone2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/gone",
        HttpClientErrorException.create(HttpStatus.GONE, "Gone", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    assertTrue(job.getLog().contains("Invalid URL (410) for gone2020: https://example.org/gone"));
  }

  @Test
  void does_not_flag_a_url_that_resolves_normally() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/ok"));
    BibTexEntry entry = entry("ok2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHead("https://example.org/ok", new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void sends_browser_like_headers_for_the_url_head_request() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/ok"));
    BibTexEntry entry = entry("ok2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHead("https://example.org/ok", new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(restTemplate)
        .exchange(
            eq("https://example.org/ok"), eq(HttpMethod.HEAD), captor.capture(), eq(Void.class));
    HttpHeaders headers = captor.getValue().getHeaders();
    assertTrue(headers.getFirst(HttpHeaders.USER_AGENT).contains("Mozilla"));
    assertTrue(headers.getFirst(HttpHeaders.ACCEPT).contains("text/html"));
  }

  @Test
  void falls_back_to_get_when_the_server_rejects_head() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/head-not-allowed"));
    BibTexEntry entry = entry("nohead2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/head-not-allowed",
        HttpClientErrorException.create(
            HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed", null, null, null));
    when(restTemplate.exchange(
            eq("https://example.org/head-not-allowed"),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenReturn(new ResponseEntity<>("<html>OK</html>", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate)
        .exchange(
            eq("https://example.org/head-not-allowed"),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class));
  }

  @Test
  void flags_a_url_as_invalid_via_get_fallback_when_head_is_rejected() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/head-not-allowed"));
    BibTexEntry entry = entry("nohead2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/head-not-allowed",
        HttpClientErrorException.create(
            HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed", null, null, null));
    when(restTemplate.exchange(
            eq("https://example.org/head-not-allowed"),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenThrow(
            HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    assertTrue(
        job.getLog()
            .contains("Invalid URL (404) for nohead2020: https://example.org/head-not-allowed"));
  }

  @Test
  void does_not_flag_a_url_when_the_check_is_forbidden() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/forbidden"));
    BibTexEntry entry = entry("forbidden2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/forbidden",
        HttpClientErrorException.create(HttpStatus.FORBIDDEN, "Forbidden", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(
        job.getLog()
            .contains("Could not check URL for forbidden2020 (https://example.org/forbidden):"));
  }

  @Test
  void does_not_flag_when_the_url_lookup_fails_with_a_non_404_error() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/error"));
    BibTexEntry entry = entry("error2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/error",
        HttpServerErrorException.create(
            HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(
        job.getLog().contains("Could not check URL for error2020 (https://example.org/error):"));
  }

  @Test
  void prefers_doi_over_url_when_both_present() {
    Map<String, String> kvp =
        new HashMap<>(Map.of("doi", "10.1234/good", "url", "https://example.org/unused"));
    BibTexEntry entry = entry("both2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, never())
        .exchange(
            eq("https://example.org/unused"),
            eq(HttpMethod.HEAD),
            any(HttpEntity.class),
            eq(Void.class));
  }

  @Test
  void skips_entries_with_no_doi_or_url() {
    Map<String, String> kvp = new HashMap<>(Map.of("title", "No Link Here"));
    BibTexEntry entry = entry("nolink2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, never())
        .exchange(any(String.class), any(HttpMethod.class), any(HttpEntity.class), eq(Void.class));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(job.getLog().contains("Checking links for 1 entries in project 1."));
  }

  @Test
  void skips_entries_with_null_key_value_pairs() {
    BibTexEntry entry = entry("nokvp2020", null);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));

    checkLinksService.checkLinks(1, ctx);

    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void falls_back_to_url_when_the_doi_is_blank() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "", "url", "https://example.org/ok"));
    BibTexEntry entry = entry("blankdoi2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHead("https://example.org/ok", new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate)
        .exchange(
            eq("https://example.org/ok"),
            eq(HttpMethod.HEAD),
            any(HttpEntity.class),
            eq(Void.class));
    assertNull(kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void skips_entries_whose_doi_and_url_are_both_blank() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "", "url", ""));
    BibTexEntry entry = entry("blankboth2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, never())
        .exchange(any(String.class), any(HttpMethod.class), any(HttpEntity.class), eq(Void.class));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void does_not_save_again_when_a_doi_remains_flagged_as_invalid() {
    Map<String, String> kvp =
        new HashMap<>(Map.of("doi", "10.1234/bad", "CITELINES_invalid_doi", "True"));
    BibTexEntry entry = entry("bad2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoiThrows(
        "10.1234/bad",
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void logs_a_plural_summary_when_more_than_one_link_is_checked() {
    Map<String, String> kvp1 = new HashMap<>(Map.of("doi", "10.1234/good1"));
    Map<String, String> kvp2 = new HashMap<>(Map.of("doi", "10.1234/good2"));
    BibTexEntry entry1 = entry("good2020a", kvp1);
    BibTexEntry entry2 = entry("good2020b", kvp2);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry1, entry2));
    mockDoi("10.1234/good1", new ResponseEntity<>("{}", HttpStatus.OK));
    mockDoi("10.1234/good2", new ResponseEntity<>("{}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp1.get("CITELINES_invalid_doi"));
    assertNull(kvp2.get("CITELINES_invalid_doi"));
    assertTrue(job.getLog().contains("Done: checked 2 links, 0 flagged as suspicious."));
  }
}
