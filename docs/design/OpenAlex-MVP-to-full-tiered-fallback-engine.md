# The tiered citation engine: OpenAlex → Semantic Scholar → Crossref

Issue #13 shipped an MVP that called only OpenAlex; issue #29 asked for "the full citation engine
with fallbacks" this doc originally sketched. This is now that doc, rewritten to describe what was
actually built rather than what was merely proposed — including two places where implementing it
for real corrected the original proposal.

## What was built

- **`CitationMetadataResolver`** — a small interface (`name()`, `resolveByDoi(doi)`,
  `getReferences(sourceWork, max)`, `getCitations(sourceWork, max)`) implemented by three clients:
  `OpenAlexService`, `SemanticScholarResolver`, `CrossrefResolver`. All three normalize DOIs
  through the existing `DOIService.normalizeRawDOI`, which is what makes cross-resolver
  DOI-keyed deduplication reliable.
- **`ResolvedWork`** — a resolver-agnostic projection (renamed from the MVP's OpenAlex-specific
  `OpenAlexWork`), carrying `id`/`doi`/`title`/`year`/`type`/`authorNames`/`venue` plus two shapes
  for a work's own reference/citation graph: `referencedWorkIds` (native ids still needing a
  same-resolver follow-up fetch — OpenAlex's shape) and `embeddedReferences`/`embeddedCitations`
  (already-hydrated works returned inline in the same response — Crossref's and Semantic
  Scholar's shape). A resolver populates one or the other, never both.
- **`CitationGraphService`** now tries resolvers as a **waterfall**, not a union: for a source
  paper's DOI, `OpenAlex.resolveByDoi` is tried first; if it has no record, `SemanticScholar`;
  if that also has no record, `Crossref`. Whichever resolver succeeds supplies the
  reference/citation list for that job run. This was a deliberate choice over querying all three
  and merging results: OpenAlex and Semantic Scholar already have strong overlapping coverage (see
  `citation-apis.md`), so a merge would triple the request cost per run for little marginal
  coverage — and nothing is lost by not merging, since a later run naturally tries the next tier if
  an earlier one comes up empty, and DOI-keyed dedup recovers the same paper regardless of which
  run first discovered it.
- **Per-item fallback for one specific gap.** Within a resolver's result list, an item that comes
  back with a DOI but no title (OpenAlex's `missing_title` case, and the same shape from Crossref's
  DOI-only reference stubs) gets a second chance: the *other* two resolvers' `resolveByDoi` are
  tried with that same DOI before giving up. This is safe because it's an exact DOI lookup, not a
  fuzzy match — see "What's still not resolved" below for why this is the *only* gap that gets a
  second chance.
- **`LaTeXNormalizationService`** — converts LaTeX-escaped text (e.g. `Schr{\"o}der`) to plain
  Unicode (`Schröder`) via JBibTeX's `LaTeXParser`/`LaTeXPrinter` (already a project dependency).
  Wired into `BibTexSynthesisService`'s field sanitization, replacing the MVP's "just strip stray
  braces" behavior. Deliberately *not* applied to user-pasted BibTeX (`BibTexConverterService`'s
  path) — a user who typed LaTeX escapes by hand presumably wants them preserved as typed; this is
  only for text arriving from an upstream API that may itself be passing through literal LaTeX
  markup from older bibliographic deposits.
- **Crossref as both a metadata source and a references-discovery source.** Crossref's public API
  has no citing-works endpoint at all (`getCitations` always returns an empty list — confirmed
  against the live API, not merely assumed), but a work's own `reference` array comes back inline
  with its metadata. Real responses show three shapes: a bare DOI, a structured stub with
  `article-title`/`year`/`author` but no DOI, or pure `unstructured` free text with nothing
  parseable. All three become `ResolvedWork` stubs; the DOI-bearing ones get a shot at the
  missing-title fallback above, the structured-no-DOI ones are used as-is, and the
  unstructured-only ones are recorded unresolved (see below) — no attempt is made to parse
  `article-title` out of free text.
- **`UnresolvedCitation` got two structural fixes** made necessary by having more than one
  resolver in the picture:
  - Its `reason` values are now resolver-agnostic: `not_found_by_any_resolver` (renamed from the
    MVP's `not_found_in_openalex`), `missing_title`, `missing_doi`. A new `resolverName` field
    records which resolver ultimately reported the gap.
  - It now has a **deterministic id** (`UnresolvedCitation.makeId`, mirroring
    `CitationEdge.makeId`), keyed by the most stable identifying value available (DOI, then the
    reporting resolver's native work id, then a normalized title). The MVP version had no such id,
    so repeated job runs silently accumulated duplicate rows — a latent bug, not a deliberate
    choice, and one that three fallback attempts per gap instead of one would have made worse if
    left unfixed.
- **`GET /api/citationedges/unresolved`** gained an optional `sourceCiteKey` parameter, and the
  BibTexEntryShowPage now shows a small "— N unresolved" badge next to the References/Citations
  counts when that entry has any, sourced from the endpoint — the "unresolved reference badge" the
  MVP doc originally deferred as a frontend-only follow-on. No new page, no new table; it reads the
  same data the endpoint already exposed.

## Two places the MVP doc's own proposal didn't survive contact with the real APIs

1. **"Do try Crossref for `missing_doi`" was wrong.** The MVP doc's original "path to a full
   engine" sketch suggested trying Crossref when an entry was created but had no DOI, reasoning
   that "Crossref's DOI content negotiation... might be more complete." But Crossref's lookup is
   DOI-keyed — there's nothing to hand it when the gap *is* the missing DOI. Recovering a DOI from
   only a title would require a bibliographic/fuzzy search, which none of the three resolvers'
   exact-lookup APIs provide, and which was deliberately not built (see below). `missing_doi`
   currently has no automated recovery path; only `missing_title` does.
2. **The "unresolved reference" badge needed no backend changes**, exactly as the MVP doc
   predicted — the `/unresolved` endpoint already existed. The only backend addition was the
   optional `sourceCiteKey` filter param, which is a convenience (avoids the frontend fetching and
   filtering the whole project's unresolved list to find one entry's), not a requirement.

## What's still not resolved, and why that's deliberate

No fuzzy or bibliographic title-search is implemented anywhere in this engine — not for a source
paper that has no DOI at all (still a hard `IllegalStateException`, unchanged from the MVP), and
not for a `missing_doi`/`not_found_by_any_resolver` gap item within a reference or citation list.
This was a real design choice, not an oversight: the issue that asked for this engine explicitly
named "avoiding creating duplicate entries for the same paper" as a goal alongside reliable
retrieval, and a title search has no exact-match guarantee the way a DOI lookup does — a
mismatched title match would create a wrong `BibTexEntry`, which is worse than leaving the gap
recorded in `unresolved_citations` for a human to resolve manually (e.g. via the "Add
Reference"/"Add Citation" manual-entry flow already on the BibTexEntryShowPage). If this is worth
revisiting later, the concrete signal to look at is the `reason` breakdown in `unresolved_citations`
(see the query below) — if `missing_doi` and `not_found_by_any_resolver` rows dominate and a
title-search tier would plausibly recover a meaningful fraction of them without introducing
mismatches, that's the evidence needed to justify the added complexity and risk.

Also still deliberately out of scope: field-level *enrichment* across resolvers (e.g., using
Crossref to backfill a missing `venue`/`pages` on an entry OpenAlex already successfully created).
The current engine is "first resolver to answer wins," not "merge the best field from each" — the
MVP doc's original item #2 ("higher-fidelity BibTeX... where Crossref's... might be more
complete") is the closest remaining gap between this implementation and the original full-tiered
proposal.

## `BibTexEntryCoalescingService`: kept entirely separate

Issue #29 explicitly asked whether `BibTexEntryCoalescingService` should be folded into this
engine's design. It wasn't, because it solves a different problem on a different axis:
`BibTexEntryCoalescingService` merges literal duplicate `BibTexEntry` documents stored under the
*same* `projectId`+`citeKey` — a storage-integrity safety net used when posting pasted BibTeX and
when resolving a citeKey for display, both pre-dating this engine. This engine's actual
duplicate-prevention concern is different: two *different* resolvers, run in two different job
executions, independently synthesizing an entry for the *same paper* under two *different*
citeKeys (since citeKeys are generated locally from author/year, not supplied by a resolver).
That's prevented by `CitationGraphService`'s own DOI-keyed dedup map (`existingByDoi`, built fresh
from the project's existing entries at the start of every job run) — a mechanism that predates this
engine too (from the MVP) and needed no changes to keep working correctly with three resolvers
instead of one, since every resolver normalizes DOIs into the same comparable form. Folding the two
mechanisms together would have conflated "the same document stored twice" with "the same paper
synthesized twice," which are genuinely different bugs with different fixes.

## Tracking the gap: `unresolved_citations`

| `reason` | Meaning | Recoverable? |
|---|---|---|
| `not_found_by_any_resolver` | No resolver had anything at all to go on for this item — either a bare native id with no DOI/title (OpenAlex's batch-fetch came back empty for it), or a title-less, DOI-less stub (e.g. a Crossref `unstructured`-only reference) | No — nothing any resolver's exact lookup can use |
| `missing_title` | A DOI is known, but no resolver (including the two not originally consulted) could supply a title for it | Attempted automatically, via the other two resolvers' `resolveByDoi`, before being recorded |
| `missing_doi` | A new entry was created (it has a title), but no resolver supplied a DOI for it | No — see "what's still not resolved" above |

Each row also now has `resolverName` (which resolver reported the gap) and a deterministic `id`
(so repeat job runs don't accumulate duplicates). Query by project, optionally filtered to one
entry's gaps, via:

```
GET /api/citationedges/unresolved?projectId=<id>
GET /api/citationedges/unresolved?projectId=<id>&sourceCiteKey=<citeKey>
```

or directly, matching the `mongo` shell convention in `docs/mongodb.md`:

```js
db.unresolved_citations.aggregate([
  { $match: { projectId: 1 } },
  { $group: { _id: { reason: "$reason", resolverName: "$resolverName" }, count: { $sum: 1 } } },
]);
```

## Configuration

Each resolver's optional API key/pacing settings are documented in `docs/README_API_CONFIG.md`,
following the same `${ENV:${env.ENV:default}}` idiom for all three: `OPENALEX_MAILTO`/
`CITELINES_API_DELAY_MS`, `CROSSREF_MAILTO`/`CROSSREF_API_DELAY_MS`,
`SEMANTIC_SCHOLAR_API_KEY`/`SEMANTIC_SCHOLAR_API_DELAY_MS`. None are required — all three APIs
work unauthenticated at their default (lower) rate limits.
