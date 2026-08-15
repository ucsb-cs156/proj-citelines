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
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
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
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

public class CheckLinksServiceTests {

  private static final String HANDLE = "10.1145/3411764.3445601";
  private static final String ACM_URL = "https://dl.acm.org/doi/" + HANDLE;
  private static final String TITLE = "Listening to early career software developers";

  private CheckLinksService checkLinksService;
  private BibTexEntryRepository bibTexEntryRepository;
  private RestTemplate restTemplate;
  private RestTemplate noRedirectRestTemplate;
  private Job job;
  private JobContext ctx;

  private CheckLinksService serviceWith(String sourceRepo, String mailto) {
    return new CheckLinksService(
        bibTexEntryRepository,
        restTemplate,
        noRedirectRestTemplate,
        new LaTeXNormalizationService(),
        0,
        sourceRepo,
        mailto);
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

  private void mockHandle(String handle, ResponseEntity<String> response) {
    when(noRedirectRestTemplate.exchange(
            eq("https://doi.org/api/handles/" + handle),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenReturn(response);
  }

  private void mockHandleThrows(String handle, RuntimeException exception) {
    when(noRedirectRestTemplate.exchange(
            eq("https://doi.org/api/handles/" + handle),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenThrow(exception);
  }

  private static String dblpUrl(String title) {
    return CheckLinksService.DBLP_SEARCH_URL
        + "?format=json&q="
        + java.net.URLEncoder.encode(title, java.nio.charset.StandardCharsets.UTF_8);
  }

  private void mockDblp(String title, ResponseEntity<String> response) {
    when(restTemplate.exchange(
            eq(dblpUrl(title)), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
        .thenReturn(response);
  }

  private void mockDblpThrows(String title, RuntimeException exception) {
    when(restTemplate.exchange(
            eq(dblpUrl(title)), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
        .thenThrow(exception);
  }

  private static final String OPENALEX_NO_MATCH = "{\"meta\":{\"count\":0}}";

  private static String openAlexUrl(String landingPageUrl) {
    return CheckLinksService.OPENALEX_WORKS_URL
        + "?filter=locations.landing_page_url:"
        + java.net.URLEncoder.encode(landingPageUrl, java.nio.charset.StandardCharsets.UTF_8);
  }

  private void mockOpenAlex(String landingPageUrl, ResponseEntity<String> response) {
    when(restTemplate.exchange(
            eq(openAlexUrl(landingPageUrl)),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenReturn(response);
  }

  private void mockOpenAlexThrows(String landingPageUrl, RuntimeException exception) {
    when(restTemplate.exchange(
            eq(openAlexUrl(landingPageUrl)),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenThrow(exception);
  }

  private static String openAlexMatch(String title) {
    return "{\"meta\":{\"count\":1},\"results\":[{\"title\":\"" + title + "\"}]}";
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
    verify(restTemplate)
        .exchange(
            eq("https://example.org/ok"),
            eq(HttpMethod.HEAD),
            any(HttpEntity.class),
            eq(Void.class));
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
    assertEquals("en-US,en;q=0.5", headers.getFirst(HttpHeaders.ACCEPT_LANGUAGE));
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
  void flags_a_url_when_the_head_request_fails_with_a_dns_resolution_failure() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://not.a.real.domain"));
    BibTexEntry entry = entry("badhost2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://not.a.real.domain",
        new ResourceAccessException(
            "I/O error on HEAD request for \"https://not.a.real.domain\": not.a.real.domain",
            new UnknownHostException("not.a.real.domain")));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    assertTrue(
        job.getLog()
            .contains("Invalid URL (unknown host) for badhost2020: https://not.a.real.domain"));
  }

  @Test
  void does_not_flag_a_url_when_the_head_request_fails_with_a_non_dns_io_error() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/timeout"));
    BibTexEntry entry = entry("timeout2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://example.org/timeout",
        new ResourceAccessException(
            "I/O error on HEAD request for \"https://example.org/timeout\": Connect timed out",
            new SocketTimeoutException("Connect timed out")));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(
        job.getLog()
            .contains("Could not check URL for timeout2020 (https://example.org/timeout):"));
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

  @Test
  void uses_the_bare_user_agent_when_neither_repo_nor_mailto_is_configured() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/good"));
    BibTexEntry entry = entry("good2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{}", HttpStatus.OK));

    serviceWith("", "").checkLinks(1, ctx);

    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(noRedirectRestTemplate)
        .exchange(
            eq("https://doi.org/10.1234/good"),
            eq(HttpMethod.GET),
            captor.capture(),
            eq(String.class));
    assertEquals("Citelines/1.0", captor.getValue().getHeaders().getFirst(HttpHeaders.USER_AGENT));
  }

  @Test
  void includes_both_repo_and_mailto_in_the_doi_user_agent_when_both_are_configured() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/good"));
    BibTexEntry entry = entry("good2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockDoi("10.1234/good", new ResponseEntity<>("{}", HttpStatus.OK));

    serviceWith("https://github.com/ucsb-cs156/proj-citelines", "you@example.com")
        .checkLinks(1, ctx);

    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(noRedirectRestTemplate)
        .exchange(
            eq("https://doi.org/10.1234/good"),
            eq(HttpMethod.GET),
            captor.capture(),
            eq(String.class));
    String userAgent = captor.getValue().getHeaders().getFirst(HttpHeaders.USER_AGENT);
    assertEquals(
        "Citelines/1.0 (+https://github.com/ucsb-cs156/proj-citelines; mailto:you@example.com)",
        userAgent);
  }

  @Test
  void does_not_flag_when_the_get_fallback_fails_with_a_non_404_error() {
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
            HttpServerErrorException.create(
                HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(
        job.getLog()
            .contains(
                "Could not check URL for nohead2020 (https://example.org/head-not-allowed):"));
  }

  @Test
  void flags_a_url_via_get_fallback_when_the_get_request_fails_with_a_dns_resolution_failure() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://not.a.real.domain"));
    BibTexEntry entry = entry("badhost2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHeadThrows(
        "https://not.a.real.domain",
        HttpClientErrorException.create(
            HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed", null, null, null));
    when(restTemplate.exchange(
            eq("https://not.a.real.domain"),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class)))
        .thenThrow(
            new ResourceAccessException(
                "I/O error on GET request for \"https://not.a.real.domain\": not.a.real.domain",
                new UnknownHostException("not.a.real.domain")));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    assertTrue(
        job.getLog()
            .contains("Invalid URL (unknown host) for badhost2020: https://not.a.real.domain"));
  }

  @Test
  void does_not_flag_a_url_via_get_fallback_when_the_get_request_fails_with_a_non_dns_io_error() {
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
            new ResourceAccessException(
                "I/O error on GET request for \"https://example.org/head-not-allowed\": Connect timed out",
                new SocketTimeoutException("Connect timed out")));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(
        job.getLog()
            .contains(
                "Could not check URL for nohead2020 (https://example.org/head-not-allowed):"));
  }

  @Test
  void extractHandle_finds_a_handle_in_a_typical_acm_url() {
    assertEquals(HANDLE, CheckLinksService.extractHandle(ACM_URL));
  }

  @Test
  void extractHandle_finds_a_handle_in_an_abs_style_url() {
    assertEquals(HANDLE, CheckLinksService.extractHandle("https://dl.acm.org/doi/abs/" + HANDLE));
  }

  @Test
  void extractHandle_strips_a_trailing_slash() {
    assertEquals(HANDLE, CheckLinksService.extractHandle(ACM_URL + "/"));
  }

  @Test
  void extractHandle_stops_at_a_query_string() {
    assertEquals(HANDLE, CheckLinksService.extractHandle(ACM_URL + "?param=1"));
  }

  @Test
  void extractHandle_excludes_trailing_prose_punctuation() {
    assertEquals(HANDLE, CheckLinksService.extractHandle("See " + ACM_URL + " (accessed 2024)."));
  }

  @Test
  void extractHandle_returns_null_when_no_handle_is_embedded() {
    assertNull(CheckLinksService.extractHandle("https://example.org/no-doi-here"));
  }

  @Test
  void extractHandle_returns_null_when_stripping_trailing_slashes_leaves_no_suffix() {
    assertNull(CheckLinksService.extractHandle("https://example.org/10.1234//"));
  }

  @Test
  void does_not_flag_a_url_when_the_embedded_handle_exists() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandle(HANDLE, new ResponseEntity<>("{\"responseCode\":1}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate, never())
        .exchange(any(String.class), any(HttpMethod.class), any(HttpEntity.class), eq(Void.class));
  }

  @Test
  void flags_a_url_when_the_embedded_handle_does_not_exist() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    verify(restTemplate, never())
        .exchange(any(String.class), any(HttpMethod.class), any(HttpEntity.class), eq(Void.class));
    assertTrue(
        job.getLog()
            .contains("Invalid URL (no such handle " + HANDLE + ") for acm2020: " + ACM_URL));
  }

  @Test
  void confirms_a_legacy_handle_via_open_alex_when_the_matched_title_agrees() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(openAlexMatch(TITLE), HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate, never())
        .exchange(eq(ACM_URL), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class));
    verify(restTemplate, never())
        .exchange(
            eq(dblpUrl(TITLE)), any(HttpMethod.class), any(HttpEntity.class), eq(String.class));
    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(restTemplate)
        .exchange(eq(openAlexUrl(ACM_URL)), eq(HttpMethod.GET), captor.capture(), eq(String.class));
    assertTrue(
        captor.getValue().getHeaders().getFirst(HttpHeaders.USER_AGENT).contains("proj-citelines"));
    assertTrue(
        job.getLog()
            .contains(
                "Confirmed handle "
                    + HANDLE
                    + " for acm2020 via OpenAlex (landing page URL match; not registered in the Handle System)"));
  }

  @Test
  void confirms_a_legacy_handle_via_open_alex_even_with_differing_title_punctuation_and_case() {
    Map<String, String> kvp =
        new HashMap<>(Map.of("url", ACM_URL, "title", "{Listening} to Early-Career Developers."));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(
        ACM_URL,
        new ResponseEntity<>(openAlexMatch("listening to early career developers"), HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void does_not_confirm_via_open_alex_when_the_title_normalizes_to_nothing() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", "???"));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(openAlexMatch("???"), HttpStatus.OK));
    mockDblp(
        "???", new ResponseEntity<>("{\"result\":{\"hits\":{\"@total\":\"0\"}}}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void does_not_confirm_via_open_alex_when_the_reported_count_is_zero_even_with_a_stray_result() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(
        ACM_URL,
        new ResponseEntity<>(
            "{\"meta\":{\"count\":0},\"results\":[{\"title\":\"" + TITLE + "\"}]}", HttpStatus.OK));
    mockDblp(
        TITLE, new ResponseEntity<>("{\"result\":{\"hits\":{\"@total\":\"0\"}}}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void falls_back_to_dblp_when_open_alex_matches_the_url_but_not_the_title() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(
        ACM_URL,
        new ResponseEntity<>(openAlexMatch("A Completely Different Paper"), HttpStatus.OK));
    mockDblp(
        TITLE,
        new ResponseEntity<>(
            "{\"result\":{\"hits\":{\"hit\":[{\"info\":{\"doi\":\"" + HANDLE + "\"}}]}}}",
            HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate).exchange(eq(dblpUrl(TITLE)), eq(HttpMethod.GET), any(), eq(String.class));
  }

  @Test
  void falls_back_to_dblp_when_the_open_alex_lookup_fails() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlexThrows(ACM_URL, new RestClientException("connection refused"));
    mockDblp(
        TITLE,
        new ResponseEntity<>(
            "{\"result\":{\"hits\":{\"hit\":[{\"info\":{\"doi\":\"" + HANDLE + "\"}}]}}}",
            HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate)
        .exchange(eq(dblpUrl(TITLE)), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class));
    assertTrue(
        job.getLog()
            .contains(
                "Could not corroborate handle "
                    + HANDLE
                    + " for acm2020 via OpenAlex: connection refused"));
  }

  @Test
  void falls_back_to_dblp_when_the_open_alex_response_is_malformed() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>("not json", HttpStatus.OK));
    mockDblp(
        TITLE,
        new ResponseEntity<>(
            "{\"result\":{\"hits\":{\"hit\":[{\"info\":{\"doi\":\"" + HANDLE + "\"}}]}}}",
            HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate)
        .exchange(eq(dblpUrl(TITLE)), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class));
    assertTrue(
        job.getLog()
            .contains(
                "Could not corroborate handle "
                    + HANDLE
                    + " for acm2020 via OpenAlex: malformed OpenAlex response"));
  }

  @Test
  void sends_the_mailto_parameter_for_the_open_alex_lookup_when_configured() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    String urlWithMailto = openAlexUrl(ACM_URL) + "&mailto=you%40example.com";
    when(restTemplate.exchange(
            eq(urlWithMailto), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
        .thenReturn(new ResponseEntity<>(openAlexMatch(TITLE), HttpStatus.OK));

    serviceWith("", "you@example.com").checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void confirms_a_legacy_handle_via_dblp_when_a_hit_cites_the_same_doi() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(OPENALEX_NO_MATCH, HttpStatus.OK));
    mockDblp(
        TITLE,
        new ResponseEntity<>(
            "{\"result\":{\"hits\":{\"hit\":[{\"info\":{\"doi\":\"" + HANDLE + "\"}}]}}}",
            HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate, never())
        .exchange(eq(ACM_URL), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class));
    verify(restTemplate, never())
        .exchange(eq(ACM_URL), any(HttpMethod.class), any(HttpEntity.class), eq(String.class));
    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(restTemplate)
        .exchange(eq(dblpUrl(TITLE)), eq(HttpMethod.GET), captor.capture(), eq(String.class));
    assertTrue(
        captor.getValue().getHeaders().getFirst(HttpHeaders.USER_AGENT).contains("proj-citelines"));
    assertTrue(
        job.getLog()
            .contains(
                "Confirmed handle "
                    + HANDLE
                    + " for acm2020 via DBLP (not registered in the Handle System, but DBLP catalogs it)"));
  }

  @Test
  void confirms_a_legacy_handle_via_dblp_when_a_hit_cites_the_same_electronic_edition_link() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(OPENALEX_NO_MATCH, HttpStatus.OK));
    mockDblp(
        TITLE,
        new ResponseEntity<>(
            "{\"result\":{\"hits\":{\"hit\":[{\"info\":{\"doi\":\"10.9999/other\",\"ee\":\""
                + ACM_URL
                + "\"}}]}}}",
            HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void flags_a_url_when_no_dblp_hit_matches_the_handle() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(OPENALEX_NO_MATCH, HttpStatus.OK));
    mockDblp(
        TITLE,
        new ResponseEntity<>(
            "{\"result\":{\"hits\":{\"hit\":[{\"info\":{\"doi\":\"10.9999/other\",\"ee\":\"https://example.org/other\"}}]}}}",
            HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void flags_a_url_when_dblp_returns_no_hits_at_all() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(OPENALEX_NO_MATCH, HttpStatus.OK));
    mockDblp(
        TITLE, new ResponseEntity<>("{\"result\":{\"hits\":{\"@total\":\"0\"}}}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void does_not_query_open_alex_or_dblp_when_the_title_is_blank() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", ""));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    verify(restTemplate, never())
        .exchange(
            any(String.class), any(HttpMethod.class), any(HttpEntity.class), eq(String.class));
  }

  @Test
  void flags_a_url_when_the_dblp_lookup_fails() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(OPENALEX_NO_MATCH, HttpStatus.OK));
    mockDblpThrows(TITLE, new RestClientException("connection refused"));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    assertTrue(
        job.getLog()
            .contains(
                "Could not corroborate handle "
                    + HANDLE
                    + " for acm2020 via DBLP: connection refused"));
  }

  @Test
  void flags_a_url_when_the_dblp_response_is_malformed() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL, "title", TITLE));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(
        HANDLE,
        HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));
    mockOpenAlex(ACM_URL, new ResponseEntity<>(OPENALEX_NO_MATCH, HttpStatus.OK));
    mockDblp(TITLE, new ResponseEntity<>("not json", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    assertTrue(
        job.getLog()
            .contains(
                "Could not corroborate handle "
                    + HANDLE
                    + " for acm2020 via DBLP: malformed DBLP response"));
  }

  @Test
  void strips_a_trailing_slash_before_querying_the_handle_api() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL + "/"));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandle(HANDLE, new ResponseEntity<>("{\"responseCode\":1}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(noRedirectRestTemplate)
        .exchange(
            eq("https://doi.org/api/handles/" + HANDLE),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(String.class));
  }

  @Test
  void falls_back_to_the_direct_url_check_when_the_handle_lookup_fails() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandleThrows(HANDLE, new RestClientException("connection refused"));
    mockUrlHead(ACM_URL, new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate)
        .exchange(eq(ACM_URL), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class));
    assertTrue(
        job.getLog()
            .contains("Could not verify handle " + HANDLE + " for acm2020: connection refused"));
  }

  @Test
  void falls_back_to_the_direct_url_check_when_the_handle_api_response_is_malformed() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandle(HANDLE, new ResponseEntity<>("not json", HttpStatus.OK));
    mockUrlHead(ACM_URL, new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate)
        .exchange(eq(ACM_URL), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class));
    assertTrue(
        job.getLog()
            .contains(
                "Could not verify handle "
                    + HANDLE
                    + " for acm2020: malformed Handle API response"));
  }

  @Test
  void
      falls_back_to_the_direct_url_check_when_the_handle_api_returns_an_unexpected_response_code() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandle(HANDLE, new ResponseEntity<>("{\"responseCode\":2}", HttpStatus.OK));
    mockUrlHead(ACM_URL, new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(restTemplate)
        .exchange(eq(ACM_URL), eq(HttpMethod.HEAD), any(HttpEntity.class), eq(Void.class));
    assertTrue(
        job.getLog()
            .contains(
                "Could not verify handle "
                    + HANDLE
                    + " for acm2020: unexpected Handle API responseCode 2"));
  }

  @Test
  void sends_the_doi_user_agent_for_the_handle_lookup() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", ACM_URL));
    BibTexEntry entry = entry("acm2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockHandle(HANDLE, new ResponseEntity<>("{\"responseCode\":1}", HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
    verify(noRedirectRestTemplate)
        .exchange(
            eq("https://doi.org/api/handles/" + HANDLE),
            eq(HttpMethod.GET),
            captor.capture(),
            eq(String.class));
    assertTrue(
        captor.getValue().getHeaders().getFirst(HttpHeaders.USER_AGENT).contains("proj-citelines"));
  }

  @Test
  void does_not_query_the_handle_api_when_the_url_has_no_embedded_handle() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/ok"));
    BibTexEntry entry = entry("ok2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    mockUrlHead("https://example.org/ok", new ResponseEntity<>(HttpStatus.OK));

    checkLinksService.checkLinks(1, ctx);

    verify(noRedirectRestTemplate, never())
        .exchange(
            any(String.class), any(HttpMethod.class), any(HttpEntity.class), eq(String.class));
  }
}
