# Sort & Filter Design

## Prompt

Design doc for [issue #104](https://github.com/ucsb-cs156/proj-citelines/issues/104):
incorporate the already-built `CitationFilter` (issue #59) and `CitationSort` (issue #102)
components into the Citations tab of `ResearcherProjectShowPage` and the References/Citations
cards of `BibTexEntryShowPage` — and determine what, if anything, the backend needs to change to
support that.

This document covers the analysis and the resulting breakdown into sub-issues. It does not
implement anything; each sub-issue listed at the bottom does its own implementation work.

## Current architecture

Three places in the app render a `<CitationTable>` of `BibTexEntry` objects, and all three follow
the same shape: one REST call fetches the *entire* list for that scope in a single response, with
no pagination, filter, or sort query parameters — filtering/sorting happens (if at all) entirely
in the browser, after the fact:

| Page / component                                     | List                                  | Endpoint                        | Query params      |
| ------------------------------------------------------ | -------------------------------------- | --------------------------------- | -------------------- |
| `ResearcherProjectShowPage` Citations tab → `CitationsTabComponent.jsx` | every entry in the project | `GET /api/bibtexentries/project` | `projectId` |
| `BibTexEntryShowPage` References card | entries this entry cites | `GET /api/citationedges/references` | `projectId`, `id` |
| `BibTexEntryShowPage` Citations card | entries that cite this entry | `GET /api/citationedges/citations` | `projectId`, `id` |

`CitationTable` itself also has its own, independent per-column click-to-sort, built into the
shared `OurTable` component via `@tanstack/react-table`'s `getSortedRowModel`. That sorting state
is internal/uncontrolled — the page has no visibility into or control over it today.

`CitationFilter` and `CitationSort` are both already fully built, tested, manually
browser-verified in Storybook, and merged — but **neither is wired into any page yet**. Both are
controlled components (`value`/`onChange`, matching `ColorChooser`'s convention), and both already
separate their pure logic into independently-tested utility modules:

- `main/utils/citationFilter.js`: `matchesCitationFilter(entry, filter)` — a single-entry
  predicate.
- `main/utils/citationSort.js`: `CITATION_SORT_OPTIONS`, plus the drag-and-drop reordering logic.
  There is **no comparator function yet** — `CitationSort` only produces the ordered array of
  criterion names (e.g. `["Author", "Title"]`); turning that into something that actually sorts
  entries is new work this issue's sub-issues need to do.

## Does the backend need to change?

**No** — not to support `CitationFilter`/`CitationSort` as they exist today. Reasoning:

- All three endpoints above already return their *complete* unfiltered, unsorted list in one
  response. There is no pagination to preserve or interact with.
- `matchesCitationFilter` and a new sort comparator are both pure functions over data already
  sitting in the browser's memory — applying them client-side costs nothing that a network round
  trip would otherwise cost, and requires no new endpoint or query parameter.
- Client-side filter+sort of an already-fully-loaded array is cheap at the data volumes this app
  currently deals with (a research project's citation list — tens to low hundreds of entries).
  `CitationTable` already renders the complete list today with no virtualization or paging, so
  filtering/sorting that same array in place is strictly less work than what already happens.

This directly answers the issue's own "how (if at all)" question, and it means two of the
sub-issues suggested in the parent issue's description — a "backend endpoint" issue and a
"frontend gets the contract the backend expects" issue — aren't needed. See **Non-goals** below
for when that conclusion should be revisited.

## What does need to change (frontend-only)

### 1. A sort comparator

`main/utils/citationSort.js` needs a new function turning the ordered `sortCriteria` array into an
`Array.prototype.sort`-compatible comparator.

**Update (issue #112):** `sortCriteria` is an array of `{field, direction}` objects — not plain
field-name strings as originally proposed here — because each selected criterion carries its own
independently-toggleable ascending/descending direction (see the superseded non-goal below). Each
field's comparator is defined once in its "ascending" sense and negated when that criterion's
`direction` is `"desc"`:

```js
// Single-criterion comparators, each (a, b) => negative | 0 | positive, defined ascending.
const CRITERION_COMPARATORS = {
  Relevance: (a, b) => relevanceRank(getEntryRelevance(a)) - relevanceRank(getEntryRelevance(b)),
  Year: (a, b) => numericYear(a) - numericYear(b),
  Author: (a, b) => localeCompareField(a, b, "author"),
  Title: (a, b) => localeCompareField(a, b, "title"),
};

export function sortCriteriaComparator(sortCriteria) {
  return (a, b) => {
    for (const { field, direction } of sortCriteria) {
      const cmp = CRITERION_COMPARATORS[field](a, b);
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0; // stable: Array.prototype.sort is spec-guaranteed stable in modern JS engines
  };
}
```

Default direction a newly-added criterion starts at (the user can toggle it from there):

- **Relevance** — descending (High → Unreviewed), matching the existing default direction of
  `CitationTable`'s own Relevance column (issue #54).
- **Year** — ascending (oldest first); a missing/non-numeric year is treated as infinitely large,
  so it sorts last ascending and first descending — the same way a spreadsheet column of numbers
  with blanks behaves when you flip the sort direction.
- **Author** / **Title** — ascending, case-insensitive, locale-aware (`localeCompare`).

### 2. Resolving the two sorting mechanisms

Once a page pre-sorts its `citations` array by `sortCriteriaComparator(sortCriteria)` before
handing it to `<CitationTable>`, that page also still has `CitationTable`'s own per-column
click-to-sort sitting on top of it (built into `OurTable`, and currently un-disableable). If left
as-is, clicking a column header would silently discard the `CitationSort` order and desync the
table's actual row order from what the `CitationSort` panel visually shows — confusing, and not
worth the complexity of reconciling the two into one shared sorting state.

**Recommendation:** add an `enableColumnSort` prop to `CitationTable` (default `true`, so every
existing usage is unaffected), which a page sets to `false` while `sortCriteria` is non-empty.
This needs a small passthrough on the shared `OurTable` component too (`enableSorting` option on
`useReactTable`, off by default only when explicitly requested) — a low-risk, backward-compatible
change since `OurTable` is used by other tables in the app that this issue doesn't otherwise
touch. This mirrors the existing `readOnly` prop `CitationTable` already has for toggling off the
Edit/Delete column.

### 3. Where filter/sort state lives, and where the glue code goes

Each page owns its own `filter`/`sortCriteria` state (`useState`, initialized from
`DEFAULT_CITATION_FILTER`/`DEFAULT_CITATION_SORT`) — the same pattern already used by every other
controlled component in this app. The actual "apply filter, then sort" glue is two lines:

```js
const visible = citations
  .filter((entry) => matchesCitationFilter(entry, filter))
  .sort(sortCriteriaComparator(sortCriteria));
```

`CitationsTabComponent.jsx` needs this once. `BibTexEntryShowPage.jsx` needs it twice (References
card, Citations card). Rather than extracting a shared hook/wrapper component up front, the
sub-issue breakdown below builds it inline for the first two uses and only extracts a shared
`useFilteredSortedCitations(entries)` hook (or similar) at the point where a third, genuinely
duplicated use appears — that's a small enough amount of duplication that guessing at the right
shared shape before seeing all three call sites risks getting the abstraction wrong.

## Non-goals for this issue

- **No persistence** of the chosen filter/sort across reloads, and no shareable URL encoding of
  them. `ResearcherProjectShowPage` already has a precedent for this kind of thing (issue #86's
  `?tab=` query parameter), so it's a natural, low-risk future enhancement — just not part of this
  issue's scope.
- ~~No per-criterion ascending/descending toggle.~~ **Superseded by issue #112.** The original
  reasoning was that `CitationSort`'s move-up/move-down buttons already let a user reorder
  criteria, and adding direction control too seemed like scope creep for the wiring work here.
  In review, that reasoning didn't hold up: the move buttons were redundant with drag-and-drop
  (which already reorders), so issue #112 repurposed them into a single ↑/↓ direction toggle per
  chip instead — reordering stays drag's job, and the (no-longer-redundant) arrows now control
  ascending/descending for that field. This is what makes "sort by any field, in any order, in
  either direction" actually possible, rather than each field being stuck at one hardcoded
  direction.
- **No backend pagination/filtering.** Revisit only if real per-project entry counts turn out to
  make client-side filtering/sorting noticeably slow — nothing in the app's current usage suggests
  that's a risk yet.

## Proposed sub-issues

Filed as GitHub sub-issues of #104. All are frontend-only.

1. **Wire `CitationFilter` into the Citations tab** (`CitationsTabComponent.jsx`). Add the
   `sortCriteriaComparator`-adjacent filter-only glue (`matchesCitationFilter` only, no sort yet),
   render `<CitationFilter>` above `<CitationTable>`, tests for the wiring (typing/toggling in the
   filter narrows what the table shows).
2. **Wire `CitationSort` into the same tab.** Add `sortCriteriaComparator` to
   `main/utils/citationSort.js` (with its own dedicated unit tests), the `enableColumnSort` prop
   on `CitationTable`/`OurTable`, render `<CitationSort>` alongside the now-existing
   `<CitationFilter>`, tests for sort-order wiring and for the column-click-sort being disabled
   while active.
3. **Wire both `CitationFilter` and `CitationSort` into `BibTexEntryShowPage`'s References and
   Citations cards.** By this point the comparator and filter predicate already exist and are
   tested; this sub-issue's own work is extracting the shared
   `useFilteredSortedCitations`-style hook (now that there are three call sites showing the real
   common shape) and wiring both cards through it, plus tests for both cards independently (a
   filter/sort change on one card must not affect the other).

Each sub-issue should include Storybook stories for its wiring (matching the manual-verification
approach already used for `CitationFilter`/`CitationSort` themselves) and Stryker mutation testing
on any new logic, per this repo's established conventions.
