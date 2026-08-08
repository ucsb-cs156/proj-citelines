package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;

import edu.ucsb.cs.citelines.services.ApiRetryHelper.ApiUnavailableException;
import edu.ucsb.cs.citelines.utilities.Sleep;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

public class ApiRetryHelperTests {

  // A controllable clock so the pacing arithmetic is deterministic.
  AtomicLong clock = new AtomicLong(1_000_000L);

  private ApiRetryHelper helper(long paceMs) {
    return new ApiRetryHelper("GitHub", "GITHUB_PACE_VAR", 8, 3, paceMs, clock::get);
  }

  private static HttpServerErrorException badGateway() {
    return HttpServerErrorException.create(
        HttpStatus.BAD_GATEWAY,
        "Bad Gateway",
        new HttpHeaders(),
        "<html>Unicorn! long useless page</html>".getBytes(StandardCharsets.UTF_8),
        StandardCharsets.UTF_8);
  }

  private static HttpClientErrorException clientError(HttpStatus status, String body) {
    return HttpClientErrorException.create(
        status,
        status.getReasonPhrase(),
        new HttpHeaders(),
        body.getBytes(StandardCharsets.UTF_8),
        StandardCharsets.UTF_8);
  }

  @Test
  public void a_successful_call_returns_its_value_without_sleeping() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      String result = helper(1000).execute("GET /x", () -> "value");
      assertEquals("value", result);
      sleepMock.verifyNoInteractions();
    }
  }

  @Test
  public void consecutive_calls_are_paced_by_the_remaining_gap() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      // sleeping advances the clock, like the real world
      sleepMock
          .when(() -> Sleep.sleepQuietly(org.mockito.ArgumentMatchers.anyLong()))
          .thenAnswer(
              invocation -> {
                clock.addAndGet((Long) invocation.getArgument(0));
                return null;
              });
      ApiRetryHelper helper = helper(1000);
      helper.execute("GET /a", () -> "a"); // first call: no previous call, no pacing
      clock.addAndGet(300); // 300ms later
      helper.execute("GET /b", () -> "b"); // must wait the remaining 700ms
      sleepMock.verify(() -> Sleep.sleepQuietly(700));

      // pacing is measured from when the previous call actually ran (after its sleep):
      // 500ms later, 500ms of the 1000ms gap remains
      clock.addAndGet(500);
      helper.execute("GET /c", () -> "c");
      sleepMock.verify(() -> Sleep.sleepQuietly(500));

      // a gap of exactly paceMs requires no sleep at all
      clock.addAndGet(1000);
      helper.execute("GET /d", () -> "d");
      sleepMock.verify(() -> Sleep.sleepQuietly(org.mockito.ArgumentMatchers.anyLong()), times(2));
    }
  }

  @Test
  public void calls_far_enough_apart_are_not_paced() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      ApiRetryHelper helper = helper(1000);
      helper.execute("GET /a", () -> "a");
      clock.addAndGet(5000);
      helper.execute("GET /b", () -> "b");
      sleepMock.verifyNoInteractions();
    }
  }

  @Test
  public void a_502_is_retried_with_doubling_backoff_until_it_succeeds() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      AtomicInteger attempts = new AtomicInteger();
      String result =
          helper(0)
              .execute(
                  "GET /x",
                  () -> {
                    if (attempts.incrementAndGet() <= 2) {
                      throw badGateway();
                    }
                    return "eventually";
                  });

      assertEquals("eventually", result);
      assertEquals(3, attempts.get());
      sleepMock.verify(() -> Sleep.sleepQuietly(8000));
      sleepMock.verify(() -> Sleep.sleepQuietly(16000));
    }
  }

  @Test
  public void after_all_retries_a_502_becomes_a_clean_one_line_exception() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      AtomicInteger attempts = new AtomicInteger();
      ApiUnavailableException thrown =
          assertThrows(
              ApiUnavailableException.class,
              () ->
                  helper(0)
                      .execute(
                          "GET /x",
                          () -> {
                            attempts.incrementAndGet();
                            throw badGateway();
                          }));

      // initial attempt + 3 retries, sleeping 8, 16, 32 seconds between them
      assertEquals(4, attempts.get());
      sleepMock.verify(() -> Sleep.sleepQuietly(8000));
      sleepMock.verify(() -> Sleep.sleepQuietly(16000));
      sleepMock.verify(() -> Sleep.sleepQuietly(32000));
      assertEquals(
          "GitHub API returned 502 (Bad Gateway) for GET /x; giving up after 4 attempts",
          thrown.getMessage());
      assertFalse(thrown.getMessage().contains("Unicorn"));
    }
  }

  @Test
  public void a_429_doubles_the_pace_permanently_and_is_retried() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      ApiRetryHelper helper = helper(1000);
      AtomicInteger attempts = new AtomicInteger();
      String result =
          helper.execute(
              "GET /x",
              () -> {
                if (attempts.incrementAndGet() == 1) {
                  throw clientError(HttpStatus.TOO_MANY_REQUESTS, "slow down");
                }
                return "ok";
              });
      assertEquals("ok", result);
      sleepMock.verify(() -> Sleep.sleepQuietly(8000)); // the retry backoff

      // pace is now 2000ms: a call 500ms after the last one must wait 1500ms
      clock.addAndGet(500);
      helper.execute("GET /y", () -> "y");
      sleepMock.verify(() -> Sleep.sleepQuietly(1500));
    }
  }

  @Test
  public void a_403_mentioning_rate_limit_counts_as_rate_limited() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      AtomicInteger attempts = new AtomicInteger();
      String result =
          helper(0)
              .execute(
                  "GET /x",
                  () -> {
                    if (attempts.incrementAndGet() == 1) {
                      throw clientError(
                          HttpStatus.FORBIDDEN, "You have exceeded a secondary rate limit");
                    }
                    return "ok";
                  });
      assertEquals("ok", result);
      assertEquals(2, attempts.get());
      sleepMock.verify(() -> Sleep.sleepQuietly(8000));
    }
  }

  @Test
  public void persistent_rate_limiting_gives_up_with_a_message_naming_the_pace_variable() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      ApiUnavailableException thrown =
          assertThrows(
              ApiUnavailableException.class,
              () ->
                  helper(0)
                      .execute(
                          "GET /x",
                          () -> {
                            throw clientError(HttpStatus.TOO_MANY_REQUESTS, "slow down");
                          }));
      assertEquals(
          "GitHub API rate limit still in effect for GET /x; giving up after 4 attempts (consider increasing GITHUB_PACE_VAR)",
          thrown.getMessage());
      // the retry backoff doubles between rate-limited attempts too
      sleepMock.verify(() -> Sleep.sleepQuietly(8000));
      sleepMock.verify(() -> Sleep.sleepQuietly(16000));
      sleepMock.verify(() -> Sleep.sleepQuietly(32000));
    }
  }

  @Test
  public void a_403_without_rate_limit_in_the_body_is_rethrown_untouched() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      HttpClientErrorException original =
          clientError(HttpStatus.FORBIDDEN, "Resource not accessible by personal access token");
      HttpClientErrorException thrown =
          assertThrows(
              HttpClientErrorException.class,
              () ->
                  helper(0)
                      .execute(
                          "GET /x",
                          () -> {
                            throw original;
                          }));
      assertSame(original, thrown);
      sleepMock.verifyNoInteractions();
    }
  }

  @Test
  public void a_404_is_rethrown_untouched() {
    try (MockedStatic<Sleep> sleepMock = mockStatic(Sleep.class)) {
      HttpClientErrorException original = clientError(HttpStatus.NOT_FOUND, "Not Found");
      HttpClientErrorException thrown =
          assertThrows(
              HttpClientErrorException.class,
              () ->
                  helper(0)
                      .execute(
                          "GET /x",
                          () -> {
                            throw original;
                          }));
      assertSame(original, thrown);
      sleepMock.verifyNoInteractions();
    }
  }

  @Test
  public void the_production_constructor_uses_the_system_clock() {
    ApiRetryHelper helper = new ApiRetryHelper("GitHub", "VAR", 8, 3, 0);
    assertEquals("ok", helper.execute("GET /x", () -> "ok"));
  }
}
