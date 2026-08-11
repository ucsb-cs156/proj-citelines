# External API Configuration

This app calls one external API — [OpenAlex](https://openalex.org) — to fetch the papers a
BibTeX entry cites ("Get References") and the papers that cite it ("Get Citations"). See
`docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md` for the design behind this, and
`docs/design/citation-apis.md` for the survey of citation APIs it's drawn from.

## Do you need an API key?

**No.** OpenAlex's `/works` endpoint is free and requires no signup, API key, or authentication
of any kind. Nothing needs to be configured to make the "Get References"/"Get Citations" jobs
work.

Two optional settings tune how the app talks to OpenAlex:

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

## Where this is used

- `edu.ucsb.cs.citelines.services.OpenAlexService` — the HTTP client.
- `edu.ucsb.cs.citelines.services.CitationGraphService` — orchestrates a "Get References"/"Get
  Citations" run: looks up the source entry's DOI, queries OpenAlex, synthesizes and saves new
  `BibTexEntry` documents, and records `CitationEdge`s between them.
- `edu.ucsb.cs.citelines.jobs.GetReferencesJob` / `GetCitationsJob` — the background jobs
  launched from the BibTexEntryShowPage's "Get References"/"Get Citations" buttons, tracked via
  the project's Jobs tab.
