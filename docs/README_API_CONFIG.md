# External API Configuration

This app calls three external citation APIs — [OpenAlex](https://openalex.org),
[Semantic Scholar](https://www.semanticscholar.org), and [Crossref](https://www.crossref.org) — to
fetch the papers a BibTeX entry cites ("Get References") and the papers that cite it ("Get
Citations"). They're tried in that order as a fallback chain: if OpenAlex has no record for a
paper's DOI, Semantic Scholar is tried next, then Crossref. See
`docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md` for the design behind this, and
`docs/design/citation-apis.md` for the survey of citation APIs it's drawn from.

## Do you need an API key?

**No, for any of the three.** All three APIs' relevant endpoints are free and require no signup or
authentication to use at their default rate limits. Nothing needs to be configured to make the
"Get References"/"Get Citations" jobs work. Optional settings below tune rate limits and pacing
for each.

## Rate-limit and error backoff (all three APIs)

Every call to any of the three APIs goes through `ApiRetryHelper`, which — beyond the
minimum-delay pacing described below — also implements randomized exponential backoff, satisfying
API terms-of-service clauses (e.g. Semantic Scholar's) that require it:

- A 429 response, a 403 whose body mentions "rate limit", or a 5xx server error triggers a retry.
- Each API's own `*_DELAY_MS` setting (below) is the starting backoff delay, not just the steady-
  state pacing interval — the two are deliberately the same configured value, so raising a
  service's delay setting also makes it start backing off more patiently.
- The delay doubles on each retry, with ±25% random jitter applied to each sleep (e.g. a 500ms
  step actually sleeps somewhere in [375ms, 625ms]), so that concurrent callers backing off from
  the same rate limit don't all retry in lockstep.
- Retries are capped at 5 attempts; after that, the call fails with a one-line error naming which
  configuration variable to raise.
- A 429/403-rate-limit response additionally doubles that API's steady-state pacing interval
  permanently (for the life of the running process), so subsequent calls slow down even after the
  immediate retry succeeds.

### `OPENALEX_MAILTO` (optional)

OpenAlex asks API users to include a contact email as a `mailto` query parameter, in exchange for
being routed to their faster, higher-rate-limit "polite pool." This is a courtesy, not a
credential — any email works, including a shared team address.

- **Localhost**: add to `.env` (see `.env.SAMPLE`):
  ```
  OPENALEX_MAILTO=you@example.com
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> OPENALEX_MAILTO=you@example.com
  ```

If unset, requests are still sent — just without the `mailto` parameter, at OpenAlex's default
(lower) rate limit.

### `CITELINES_API_DELAY_MS` (optional, default `100`)

The minimum delay, in milliseconds, enforced between consecutive OpenAlex calls (see
`OpenAlexService.CITELINES_API_DELAY_MS` and `ApiRetryHelper`, which also backs off and retries
automatically on 5xx errors and rate-limit responses). The default of 100ms is conservative for a
free, keyless API. If a "Get References"/"Get Citations" job's log shows rate-limit warnings,
raise this value.

- **Localhost**: add to `.env`:
  ```
  CITELINES_API_DELAY_MS=250
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> CITELINES_API_DELAY_MS=250
  ```

### `CROSSREF_MAILTO` (optional)

Same purpose as `OPENALEX_MAILTO`, for Crossref's own "polite pool" — a courtesy contact email in
exchange for a higher rate limit. Not required.

- **Localhost**: add to `.env`:
  ```
  CROSSREF_MAILTO=you@example.com
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> CROSSREF_MAILTO=you@example.com
  ```

### `CROSSREF_API_DELAY_MS` (optional, default `100`)

The minimum delay, in milliseconds, between consecutive Crossref calls, paced independently from
OpenAlex's and Semantic Scholar's delays (each API is rate-limited separately, so each gets its
own pacing setting).

- **Localhost**: add to `.env`:
  ```
  CROSSREF_API_DELAY_MS=250
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> CROSSREF_API_DELAY_MS=250
  ```

### `SEMANTIC_SCHOLAR_API_KEY` (optional)

Semantic Scholar's Graph API works without a key, but its unauthenticated rate limit is low
enough to matter for anything beyond occasional use. A free key
([request one here](https://www.semanticscholar.org/product/api#api-key)) raises the limit
substantially and is sent as an `x-api-key` header.

- **Localhost**: add to `.env`:
  ```
  SEMANTIC_SCHOLAR_API_KEY=your-key-here
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> SEMANTIC_SCHOLAR_API_KEY=your-key-here
  ```

If unset, requests are still sent, unauthenticated, at Semantic Scholar's default (lower) rate
limit.

### `SEMANTIC_SCHOLAR_API_DELAY_MS` (optional, default `100`)

The minimum delay, in milliseconds, between consecutive Semantic Scholar calls.

- **Localhost**: add to `.env`:
  ```
  SEMANTIC_SCHOLAR_API_DELAY_MS=250
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> SEMANTIC_SCHOLAR_API_DELAY_MS=250
  ```

## The "Check Links" job

`CheckLinksService` (via `CheckLinksJob`) checks each entry's DOI (or URL, if it has no DOI) and
flags it if the link looks broken. Both checks are designed to avoid tripping bot-management
challenges (e.g. Cloudflare 403s) rather than merely tolerating them:

- **DOI**: instead of a plain `GET https://doi.org/<doi>` (which follows the resolver's redirect
  all the way to the publisher's, often WAF-protected, page), it asks `doi.org` to
  content-negotiate a machine-readable citation format (`Accept: application/citeproc+json`) and
  disables redirect-following, so a nonexistent DOI is reported directly by the resolver as a 404
  instead of chasing a redirect into a publisher's bot defenses.
- **URL**: checked with a `HEAD` request first (falling back to `GET` only if the server rejects
  `HEAD` with a 405), using browser-like request headers.

In both cases, a 403 or 429 is logged but never flags the entry as invalid, since it more likely
indicates bot protection than a genuinely broken link — only a definitive 404/410 does. It shares
`CITELINES_API_DELAY_MS` (above) for pacing/backoff, and also treats a bare 403 the same as a 429
for backoff purposes, since `doi.org` and arbitrary publisher sites have been observed returning
one as an anti-bot measure instead of the other.

### `CHECKLINKS_MAILTO` (optional)

An optional contact email included in the `User-Agent` sent with the Check Links job's DOI
content-negotiation requests, alongside `app.sourceRepo`'s URL. Not required.

- **Localhost**: add to `.env`:
  ```
  CHECKLINKS_MAILTO=you@example.com
  ```
- **Dokku**:
  ```
  dokku config:set --no-restart <app-name> CHECKLINKS_MAILTO=you@example.com
  ```

## Where this is used

- `edu.ucsb.cs.citelines.services.OpenAlexService`,
  `edu.ucsb.cs.citelines.services.SemanticScholarResolver`,
  `edu.ucsb.cs.citelines.services.CrossrefResolver` — the three HTTP clients, each implementing
  `CitationMetadataResolver`.
- `edu.ucsb.cs.citelines.services.CitationGraphService` — orchestrates a "Get References"/"Get
  Citations" run: looks up the source entry's DOI, tries each resolver in order, synthesizes and
  saves new `BibTexEntry` documents, and records `CitationEdge`s between them.
- `edu.ucsb.cs.citelines.jobs.GetReferencesJob` / `GetCitationsJob` — the background jobs
  launched from the BibTexEntryShowPage's "Get References"/"Get Citations" buttons, tracked via
  the project's Jobs tab.
- `edu.ucsb.cs.citelines.services.CheckLinksService` / `edu.ucsb.cs.citelines.jobs.CheckLinksJob`
  — the "Check Links" job, launched per-project from the Jobs tab.
