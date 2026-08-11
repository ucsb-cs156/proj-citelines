# From the OpenAlex-only MVP to a full tiered fallback engine

`docs/design/references-and-citations-workflow.md` recommends a tiered fallback engine —
Crossref (primary BibTeX) → Semantic Scholar (secondary) → OpenAlex (tertiary, for the citation
graph itself) — with local BibTeX normalization, LaTeX-to-Unicode cleanup, and a UI flag for
references that resolve to a raw string instead of a structured record. Building all of that is a
substantial project on its own. What actually shipped (issue #13) is a smaller MVP: **OpenAlex
only**. This doc explains that choice, what it costs us, how to see the cost in real usage data,
and where the fuller design would slot in on top of what already exists.

## What was built

- `OpenAlexService` — a thin client for `https://api.openalex.org`. No API key required (see
  `docs/README_API_CONFIG.md`). Three calls: look up a work by DOI, list the works that cite a
  given work (`filter=cites:...`), and batch-fetch works by id (`filter=ids.openalex:A|B|C`, 50
  at a time). Every call goes through the pre-existing `ApiRetryHelper` for pacing and
  429/5xx backoff.
- `BibTexSynthesisService` — turns the small `OpenAlexWork` projection OpenAlex returns into a
  raw BibTeX string (mapping OpenAlex's `type` to a BibTeX entry type, reformatting author names,
  generating a deduplicated citeKey), which is then fed through the **existing**
  `BibTexConverterService.parseToEntries` — so a synthesized entry gets exactly the same
  validation/normalization as one a user pasted by hand.
- `CitationGraphService` — orchestrates a "Get References"/"Get Citations" run: resolve the
  source entry's DOI on OpenAlex, resolve each related work, dedupe against the project's
  existing entries by DOI, save new `BibTexEntry`s and `CitationEdge`s, and log progress via the
  job's `JobContext`.
- `GetReferencesJob` / `GetCitationsJob` — the two background jobs, launched from the
  BibTexEntryShowPage and tracked on the project's Jobs tab.

## Why OpenAlex alone is a reasonable MVP

Per `docs/design/citation-apis.md` and `references-and-citations-workflow.md`:

- OpenAlex is the one API that returns **both** directions natively: `referenced_works` inline on
  the work object, and incoming citations via a single `filter=cites:` query — no separate
  "search" pass to first resolve an identifier.
- It returns full structured JSON per work, so local BibTeX synthesis needs only one hydration
  pass, not Crossref's separate "get BibTeX text" call plus a fallback JSON call.
- It requires no signup or key, unlike Semantic Scholar (key recommended for real usage) —
  nothing to fail to configure, no doc explaining how to obtain one.
- Per `citation-apis.md`'s own notes, OpenAlex has strong ACM/IEEE/CS coverage, aggregating
  Crossref data while backfilling gaps Crossref alone tends to have for CS conference papers.

## What this MVP gives up

The tiered design's value-adds that OpenAlex alone does **not** provide:

1. **A second (and third) chance to resolve a work OpenAlex doesn't have at all.** OpenAlex is
   large but not exhaustive; some references genuinely have no OpenAlex record.
2. **Higher-fidelity BibTeX for works OpenAlex resolves with sparse metadata** — e.g. no DOI, or
   missing venue/pages — where Crossref's DOI content negotiation or Semantic Scholar's record
   might be more complete.
3. **LaTeX-to-Unicode cleanup** (e.g. `Schr{\"{o}}der` → `Schröder`) — not attempted at all in the
   MVP; `BibTexSynthesisService` only strips stray `{`/`}` characters.
4. **The "unresolved reference" UI badge** the original design describes, so a user can see
   inline, on the BibTexEntryShowPage itself, which entries need manual attention.

## Tracking the gap: `unresolved_citations`

Rather than silently dropping what OpenAlex can't fully resolve, every such case is recorded as
an `UnresolvedCitation` document (`edu.ucsb.cs.citelines.collections.UnresolvedCitation`), with a
`reason`:

| `reason` | Meaning | What a fallback tier could recover |
|---|---|---|
| `not_found_in_openalex` | A referenced work's OpenAlex id came back empty from the batch-by-id lookup | Item (1) above — a genuinely missing OpenAlex record |
| `missing_title` | OpenAlex returned a record with no title at all, so no usable entry could be synthesized | Item (1)/(2) — a thin/stub record |
| `missing_doi` | A new entry was created, but OpenAlex had no DOI for it | Item (2) — Crossref/Semantic Scholar might supply one |

Each "Get References"/"Get Citations" job also logs a one-line summary (`"Done: N new entries
added, M linked to existing entries, K unresolved."`), visible on the project's Jobs tab, so the
gap is visible immediately without a database query.

**To see the aggregate picture**, query by project via the read-only endpoint:

```
GET /api/citationedges/unresolved?projectId=<id>
```

or directly, matching the `mongo` shell convention in `docs/mongodb.md`:

```js
db.unresolved_citations.aggregate([
  { $match: { projectId: 1 } },
  { $group: { _id: "$reason", count: { $sum: 1 } } },
]);
```

The `reason` breakdown is the concrete marginal-benefit signal: if most rows are
`not_found_in_openalex`, a Crossref/Semantic Scholar fallback tier has real headroom to recover
them; if most are `missing_doi` with otherwise-usable entries, the higher-value work is
BibTeX-quality improvement, not graph-discovery coverage. There is currently no dedicated frontend
UI for browsing this data — it's exposed via the endpoint above and the per-job log — since issue
#13 didn't call for one; see below for where it would attach.

## The path to a full tiered fallback engine

The MVP's shape already isolates the pieces a fallback tier needs to slot into:

1. **Extract a resolver interface.** `OpenAlexService`'s "resolve a work's BibTeX-relevant
   metadata" responsibility (currently just `getWorkByDoi`/`getWorksByIds`/`getWorksCiting`) would
   become one implementation of a small `CitationMetadataResolver` interface
   (`Optional<OpenAlexWork> resolve(String doi)`, or a shared DTO renamed off `OpenAlexWork`).
   `CrossrefResolver` and `SemanticScholarResolver` would implement the same interface.
2. **Chain resolvers in `CitationGraphService`.** Where `fetchGraph` currently calls
   `openAlexService.getWorksByIds(...)`/`getWorksCiting(...)` and, on a gap, immediately writes an
   `UnresolvedCitation`, it would instead try each configured resolver in order (Crossref by DOI
   first if a DOI is already known from OpenAlex's own listing; Semantic Scholar next) before
   giving up and recording `UnresolvedCitation`. The existing `reason` values narrow exactly which
   resolvers are worth trying for which gap (skip Crossref for `not_found_in_openalex`, since that
   means OpenAlex itself had no id to hand it; do try it for `missing_doi`, since Crossref excels
   at DOI-based content negotiation).
3. **LaTeX normalization.** Add a `LaTeXNormalizationService` (JBibTeX ships `LaTeXParser`/
   `LaTeXPrinter`, per the original design doc's sample code) and run it over synthesized field
   values in `BibTexSynthesisService` before they're handed to `BibTexConverterService`.
4. **The "unresolved reference" UI badge.** With `GET /api/citationedges/unresolved` already
   returning structured, reason-tagged data, this becomes a frontend-only addition: a table or
   badge on the BibTexEntryShowPage (or the References/Citations tables themselves) reading from
   that endpoint — no backend changes needed beyond what's already shipped.
5. **Config.** Each new resolver gets its own optional API key following the
   `docs/README_API_CONFIG.md` pattern already established (e.g. `SEMANTIC_SCHOLAR_API_KEY`,
   `CROSSREF_MAILTO`), each paced independently via its own `ApiRetryHelper` instance (the
   pattern `OpenAlexService` already establishes).

None of this requires changing `CitationEdge`, the job classes, or the controllers — the fallback
engine is additive within `CitationGraphService` and a new resolver layer underneath it.
