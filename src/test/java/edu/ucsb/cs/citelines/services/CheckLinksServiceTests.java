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
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

public class CheckLinksServiceTests {

  private CheckLinksService checkLinksService;
  private BibTexEntryRepository bibTexEntryRepository;
  private RestTemplate restTemplate;
  private Job job;
  private JobContext ctx;

  @BeforeEach
  void setup() {
    bibTexEntryRepository = mock(BibTexEntryRepository.class);
    restTemplate = mock(RestTemplate.class);
    checkLinksService = new CheckLinksService(bibTexEntryRepository, restTemplate, 0);
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

  @Test
  void flags_a_doi_whose_page_says_doi_not_found() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/bad"));
    BibTexEntry entry = entry("bad2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/bad"), eq(String.class)))
        .thenReturn(
            "<html><body>DOI Not Found - This DOI cannot be found in the DOI System</body></html>");

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
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/good"), eq(String.class)))
        .thenReturn("<html><body>Some Paper Title</body></html>");

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
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/good"), eq(String.class)))
        .thenReturn("<html><body>Some Paper Title</body></html>");

    checkLinksService.checkLinks(1, ctx);

    assertFalse(kvp.containsKey("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, times(1)).save(entry);
  }

  @Test
  void flags_a_url_that_returns_404() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/missing"));
    BibTexEntry entry = entry("missing2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://example.org/missing"), eq(String.class)))
        .thenThrow(
            HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertEquals("True", kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, times(1)).save(entry);
    assertTrue(
        job.getLog().contains("Invalid URL (404) for missing2020: https://example.org/missing"));
  }

  @Test
  void does_not_flag_a_url_that_resolves_normally() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/ok"));
    BibTexEntry entry = entry("ok2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://example.org/ok"), eq(String.class)))
        .thenReturn("<html><body>OK</body></html>");

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void prefers_doi_over_url_when_both_present() {
    Map<String, String> kvp =
        new HashMap<>(Map.of("doi", "10.1234/good", "url", "https://example.org/unused"));
    BibTexEntry entry = entry("both2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/good"), eq(String.class)))
        .thenReturn("<html><body>Some Paper Title</body></html>");

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, never()).getForObject(eq("https://example.org/unused"), eq(String.class));
  }

  @Test
  void skips_entries_with_no_doi_or_url() {
    Map<String, String> kvp = new HashMap<>(Map.of("title", "No Link Here"));
    BibTexEntry entry = entry("nolink2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, never()).getForObject(any(String.class), eq(String.class));
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
  void does_not_flag_when_the_doi_lookup_fails_with_a_non_404_error() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/error"));
    BibTexEntry entry = entry("error2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/error"), eq(String.class)))
        .thenThrow(
            HttpServerErrorException.create(
                HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(job.getLog().contains("Could not check DOI for error2020 (10.1234/error):"));
  }

  @Test
  void does_not_flag_when_the_url_lookup_fails_with_a_non_404_error() {
    Map<String, String> kvp = new HashMap<>(Map.of("url", "https://example.org/error"));
    BibTexEntry entry = entry("error2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://example.org/error"), eq(String.class)))
        .thenThrow(
            HttpServerErrorException.create(
                HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", null, null, null));

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_url"));
    verify(bibTexEntryRepository, never()).save(any());
    assertTrue(
        job.getLog().contains("Could not check URL for error2020 (https://example.org/error):"));
  }

  @Test
  void does_not_flag_a_doi_page_that_only_contains_one_of_the_two_not_found_phrases() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/partial"));
    BibTexEntry entry = entry("partial2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/partial"), eq(String.class)))
        .thenReturn("<html><body>DOI Not Found</body></html>");

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void does_not_flag_a_doi_when_the_resolver_returns_no_body() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "10.1234/nobody"));
    BibTexEntry entry = entry("nobody2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/nobody"), eq(String.class)))
        .thenReturn(null);

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp.get("CITELINES_invalid_doi"));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void falls_back_to_url_when_the_doi_is_blank() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "", "url", "https://example.org/ok"));
    BibTexEntry entry = entry("blankdoi2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://example.org/ok"), eq(String.class)))
        .thenReturn("<html><body>OK</body></html>");

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, times(1)).getForObject(eq("https://example.org/ok"), eq(String.class));
    assertNull(kvp.get("CITELINES_invalid_url"));
  }

  @Test
  void skips_entries_whose_doi_and_url_are_both_blank() {
    Map<String, String> kvp = new HashMap<>(Map.of("doi", "", "url", ""));
    BibTexEntry entry = entry("blankboth2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));

    checkLinksService.checkLinks(1, ctx);

    verify(restTemplate, never()).getForObject(any(String.class), eq(String.class));
    verify(bibTexEntryRepository, never()).save(any());
  }

  @Test
  void does_not_save_again_when_a_doi_remains_flagged_as_invalid() {
    Map<String, String> kvp =
        new HashMap<>(Map.of("doi", "10.1234/bad", "CITELINES_invalid_doi", "True"));
    BibTexEntry entry = entry("bad2020", kvp);
    when(bibTexEntryRepository.findByProjectId(1)).thenReturn(List.of(entry));
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/bad"), eq(String.class)))
        .thenReturn(
            "<html><body>DOI Not Found - This DOI cannot be found in the DOI System</body></html>");

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
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/good1"), eq(String.class)))
        .thenReturn("<html><body>Some Paper Title</body></html>");
    when(restTemplate.getForObject(eq("https://doi.org/10.1234/good2"), eq(String.class)))
        .thenReturn("<html><body>Some Paper Title</body></html>");

    checkLinksService.checkLinks(1, ctx);

    assertNull(kvp1.get("CITELINES_invalid_doi"));
    assertNull(kvp2.get("CITELINES_invalid_doi"));
    assertTrue(job.getLog().contains("Done: checked 2 links, 0 flagged as suspicious."));
  }
}
