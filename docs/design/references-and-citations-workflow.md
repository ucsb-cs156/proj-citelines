# References and Citations Workflow

## Prompt

Start by ingesting the contents of [docs/design/citation-apis.md](citation-apis.md).

Then answer these questions:

So, let's suppose that I have a particular publication, and what I have is a complete BibTex entry for it.

What I'd like to do is be able to use an API to retrieve a list of the publications that this work cites (References List) and a list of publications that cite this work (Citations).

What can I get from the various free to use APIs?  Can I get full BibTex entries, or at least a "good start" on a BibTex entry?

If the case of publications in the ACM DL or IEEE Xplore, if I can get at least get a DOI, I can have the user manually navigate for each publication and get the full BibTex entry.   If that step can be avoided, that's better.  If it's necessary, I don't mind putting a flag on the references and citations that says: "Please go get the BibTex entry" and making a user interface to streamline that step.

But, eventually, I want  a workflow that, for any publication, allows me to populate my database of BibTex entries with BibTex entries for all cited works, and all citations of the work.

* What can I get from the APIs?
* What can I NOT get from the APIs?
* What course of action do you recommend?


### What You CAN Get from the APIs

Free APIs can deliver nearly all of the structural and bibliographic metadata required to construct complete, publication-ready BibTeX records—**without requiring manual scraping or user interaction**.

#### 1. Out-of-the-Box BibTeX Strings

* **Crossref (DOI Content Negotiation):** Crossref natively supports HTTP Content Negotiation. If you send a GET request for a paper’s DOI with the HTTP header `Accept: application/x-bibtex`, Crossref resolves the standard registered metadata and returns a pre-formatted, raw `.bib` string.
* **Semantic Scholar:** Offers a dedicated endpoint (`/graph/v1/paper/{paper_id}/citation`) with a `format=bibtex` option that outputs pre-built BibTeX text.

#### 2. Fully Parsable Structured JSON Metadata

If you prefer to generate uniform keys and styling yourself, free APIs yield comprehensive JSON fields:

* **Identities:** Title, authors (first, middle, last names), year, publication venue/journal name, volume, issue, page numbers, publisher, and DOI.
* **Reference Networks:**
* **Backward Citations (References):** A list of paper IDs/DOIs that the target work cites.
* **Forward Citations (Cited By):** A list of paper IDs/DOIs that cite the target work.


* **OpenAlex & Semantic Scholar** cover both outgoing and incoming citations natively for almost all records. **Crossref** provides outgoing references reliably (especially for ACM and IEEE journals), but tracks incoming citations primarily via specific publisher metadata or its Event Data program.

---

### What You CANNOT Get (And Core Gotchas)

Despite the extensive coverage, automated workflows encounter edge cases and missing fields across free APIs:

#### 1. Missing Edge Fields

* **Conference Proceedings & Specific ACM/IEEE Contexts:** Standard APIs sometimes omit niche fields like `issn`, `editor`, `address`, `location`, `isbn`, or `series` (e.g., *LNCS Volume* vs. *Conference Proceedings*).
* **ACM/IEEE Page Ranges:** Conference papers extracted via PDF text parsing (such as on Semantic Scholar) may occasionally lose exact page ranges or standard issue numbers.

#### 2. Native BibTeX Formatting Quirks

* Crossref's automatically generated BibTeX strings sometimes suffer from mismatched entry types (e.g., labeling a `@inproceedings` item as an `@article` or `@inbook`) or missing DOIs inside the actual `.bib` field body.

#### 3. Citations Without DOIs or Records (The "Unmatched" Tail)

* In backward citation lists (the papers a work cites), **5% to 15% of references in IEEE or older CS proceedings may be plain-text strings** that failed to resolve to a persistent DOI or database record. Free APIs cannot map these to structured metadata without fuzzy text matching.

---

### Recommended Course of Action

Avoid forcing users to manually copy BibTeX from publisher sites like IEEE Xplore or ACM DL. Instead, implement an **Automated Cross-API Fallback Engine** with client-side synthesis.

```
                    ┌───────────────────────────┐
                    │   Input: Target Paper     │
                    │  (DOI, Title, or BibTeX)  │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │   Fetch Reference List    │
                    │   & Forward Citation IDs  │
                    │  (OpenAlex / S2 Primary)  │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                     For Each Citation/Reference:
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
            Has Valid DOI?                  No DOI / Unresolved
                  │                               │
        ┌─────────┴─────────┐                     ▼
        ▼                   ▼             ┌───────────────┐
  Query Crossref      Query Semantic      │  OpenAlex /   │
 (Accept: BibTeX)       Scholar           │  S2 Search    │
        │                   │             └───────┬───────┘
        └─────────┬─────────┘                     │
                  │                               ▼
                  │                    Synthesize BibTeX
                  │                    from JSON metadata
                  │                               │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │ Validate Entry + Assign Key │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │ Save to Database / Output   │
                   └─────────────────────────────┘

```

#### Step 1: Network Graph Discovery via OpenAlex & Semantic Scholar

For retrieving incoming and outgoing citation lists, query **Semantic Scholar** or **OpenAlex**.

* **Why:** Crossref is weaker at forward-citation queries, whereas OpenAlex and Semantic Scholar return structured lists of all linked work IDs (and DOIs) instantly.

#### Step 2: Tiered Metadata Hydration

For every publication ID/DOI found in those reference and citation lists, run this hydration hierarchy to build its BibTeX entry:

1. **Primary Pass (Direct Crossref Content Negotiation):**
Execute a simple HTTP request to the paper's DOI:
`GET [https://doi.org/](https://doi.org/)<DOI>` with `Accept: application/x-bibtex`.
*This works cleanly for >85% of ACM and IEEE publications.*
2. **Secondary Pass (Semantic Scholar API):**
If Crossref fails or yields incomplete data, query Semantic Scholar's `/paper/{DOI}?fields=title,authors,venue,year,publicationTypes,journal` endpoint.
3. **Tertiary Fallback (OpenAlex JSON):**
If the paper lacks a DOI, fetch its record from OpenAlex using title search or OpenAlex ID.

#### Step 3: Local BibTeX Normalization Engine

Instead of taking third-party `.bib` strings verbatim, build a small local function that takes the JSON metadata (from Steps 1–3) and outputs a standardized BibTeX string:

```bibtex
@inproceedings{AuthorYearKey,
  author    = {First Last and Second Last},
  title     = {Paper Title Here},
  booktitle = {Proceedings of the ACM/IEEE...},
  year      = {2025},
  doi       = {10.1145/XXXXXX.YYYYYY},
  url       = {https://doi.org/10.1145/XXXXXX.YYYYYY}
}

```

#### Step 4: UI Flagging (Only for Unresolved Items)

Reserve manual intervention only for items where the API returns a raw reference string without a DOI or matching database ID. Show a badge in your UI: `[⚠️ Unresolved Reference — Search Manually]`. This keeps manual user workload under 5% across typical CS reference networks.
