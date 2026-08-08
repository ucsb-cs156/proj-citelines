package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.utilities.Sleep;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

/**
 * Wraps calls to an external REST API (GitHub, PrairieLearn) with three defenses:
 *
 * <ul>
 *   <li><b>Pacing:</b> consecutive calls are kept at least {@code paceMs} apart, to stay under rate
 *       limits in the first place. The pacer only sleeps the <i>remaining</i> gap since the
 *       previous call, so an occasional interactive call is not delayed at all — only tight loops
 *       (like a repo sync) are slowed.
 *   <li><b>Backoff-retries on 5xx:</b> transient server errors (e.g. GitHub's 502 "Unicorn" page)
 *       are retried up to {@code retryMax} times, sleeping {@code retryInitialSleepSeconds} and
 *       doubling each time (8, 16, 32...). Only then does the call fail — with a one-line {@link
 *       ApiUnavailableException} instead of the provider's HTML error page.
 *   <li><b>Rate-limit reaction:</b> a 429, or a 403 whose body mentions "rate limit", counts as a
 *       retryable event and additionally doubles the pace <i>permanently</i> (for the life of the
 *       service instance), with a log suggestion to raise the pace's configuration variable.
 * </ul>
 *
 * <p>All other client errors (404 for a missing path, 401/403 for a bad token) are rethrown
 * untouched — callers depend on their semantics.
 */
@Slf4j
public class ApiRetryHelper {

  private final String apiName;
  private final String paceVariableName;
  private final long retryInitialSleepSeconds;
  private final int retryMax;
  private final AtomicLong paceMs;
  private final AtomicLong lastCallMs = new AtomicLong(0);
  private final LongSupplier nowMs;

  /** Thrown when the API is still failing after all retries; carries a clean one-line message. */
  public static class ApiUnavailableException extends RuntimeException {
    public ApiUnavailableException(String message) {
      super(message);
    }
  }

  public ApiRetryHelper(
      String apiName,
      String paceVariableName,
      long retryInitialSleepSeconds,
      int retryMax,
      long paceInitialMs) {
    this(
        apiName,
        paceVariableName,
        retryInitialSleepSeconds,
        retryMax,
        paceInitialMs,
        System::currentTimeMillis);
  }

  // Visible for tests: nowMs lets the pacing arithmetic run against a controlled clock.
  ApiRetryHelper(
      String apiName,
      String paceVariableName,
      long retryInitialSleepSeconds,
      int retryMax,
      long paceInitialMs,
      LongSupplier nowMs) {
    this.apiName = apiName;
    this.paceVariableName = paceVariableName;
    this.retryInitialSleepSeconds = retryInitialSleepSeconds;
    this.retryMax = retryMax;
    this.paceMs = new AtomicLong(paceInitialMs);
    this.nowMs = nowMs;
  }

  /**
   * Runs {@code call}, pacing it relative to the previous call and retrying per the class contract.
   * {@code description} identifies the request in log messages, e.g. {@code "GET
   * .../contents/questions"}.
   */
  public <T> T execute(String description, Supplier<T> call) {
    long sleepSeconds = retryInitialSleepSeconds;
    int retriesUsed = 0;
    while (true) {
      pace();
      try {
        return call.get();
      } catch (HttpServerErrorException e) {
        if (retriesUsed >= retryMax) {
          throw new ApiUnavailableException(
              "%s API returned %d (%s) for %s; giving up after %d attempts"
                  .formatted(
                      apiName,
                      e.getStatusCode().value(),
                      e.getStatusText(),
                      description,
                      retriesUsed + 1));
        }
        log.info(
            "{} API returned {} for {}; sleeping {} seconds before retrying",
            apiName,
            e.getStatusCode().value(),
            description,
            sleepSeconds);
        Sleep.sleepQuietly(sleepSeconds * 1000);
        sleepSeconds *= 2;
        retriesUsed++;
      } catch (HttpClientErrorException e) {
        if (!isRateLimited(e)) {
          throw e;
        }
        long newPace = paceMs.updateAndGet(pace -> pace * 2);
        log.warn(
            "{} API rate limit hit for {}; inter-call pace doubled to {} ms — consider increasing {}",
            apiName,
            description,
            newPace,
            paceVariableName);
        if (retriesUsed >= retryMax) {
          throw new ApiUnavailableException(
              "%s API rate limit still in effect for %s; giving up after %d attempts (consider increasing %s)"
                  .formatted(apiName, description, retriesUsed + 1, paceVariableName));
        }
        Sleep.sleepQuietly(sleepSeconds * 1000);
        sleepSeconds *= 2;
        retriesUsed++;
      }
    }
  }

  /** A 429, or a 403 whose body mentions "rate limit" (GitHub's secondary-limit signature). */
  private static boolean isRateLimited(HttpClientErrorException e) {
    if (e.getStatusCode().value() == 429) {
      return true;
    }
    return e.getStatusCode().value() == 403
        && e.getResponseBodyAsString().toLowerCase().contains("rate limit");
  }

  /** Sleeps just long enough that consecutive calls are at least paceMs apart. */
  private void pace() {
    long now = nowMs.getAsLong();
    long previous = lastCallMs.getAndSet(now);
    long remaining = previous + paceMs.get() - now;
    if (remaining > 0) {
      Sleep.sleepQuietly(remaining);
      lastCallMs.set(nowMs.getAsLong());
    }
  }
}
