# Going from doi to BibTex

We would like to build a service that can go from DOI to BibTex using either the OpenAlex API, the Crossref API, and/or the Semantic Scholar Graph API.

We should abstract this into a service so that the implementation can be changed and fallbacks can be created as needed.

# Can Open Alex translate doi to BibTex entry?

**Not directly in a single native output.**

While the OpenAlex API **does** accept a DOI directly as an input to fetch a work's metadata, it strictly returns data formatted in **JSON**. It does not support direct content negotiation (e.g., `Accept: application/x-bibtex`) to export raw `.bib` text natively.

You have two simple ways to get a BibTeX entry depending on your workflow:

---

### Option 1: Retrieve JSON from OpenAlex and format as BibTeX

You can query OpenAlex using the DOI at the `/works/` endpoint:

```http
GET https://api.openalex.org/works/https://doi.org/10.1038/nrd842

```

Then, convert the resulting JSON fields (`title`, `authorships`, `publication_year`, `primary_location`, etc.) into a BibTeX string programmatically using Python:

```python
import requests

doi = "10.1038/nrd842"
url = f"https://api.openalex.org/works/https://doi.org/{doi}"

response = requests.get(url).json()

# Extract metadata
title = response.get("title")
year = response.get("publication_year")
authors = " and ".join([a["author"]["display_name"] for a in response.get("authorships", [])])
journal = response.get("primary_location", {}).get("source", {}).get("display_name", "")

# Construct BibTeX entry
bibtex = f"""@article{{openalex_{response['id'].split('/')[-1]},
  author = {{{authors}}},
  title = {{{title}}},
  journal = {{{journal}}},
  year = {{{year}}},
  doi = {{{doi}}}
}}"""

print(bibtex)

```

---

### Option 2: Get BibTeX directly using standard DOI Content Negotiation

If you already have the DOI and specifically need a ready-to-use BibTeX string without parsing JSON manually, you can bypass OpenAlex and query the **DOI resolver (Crossref/DataCite)** directly using HTTP content negotiation:

#### Via Terminal / cURL:

```bash
curl -LH "Accept: application/x-bibtex" https://doi.org/10.1038/nrd842

```

#### Via Python:

```python
import requests

doi = "10.1038/nrd842"
headers = {"Accept": "application/x-bibtex"}

response = requests.get(f"https://doi.org/{doi}", headers=headers)
print(response.text)

```

# Can Crossref go from DOI to BibTex entry?

**Yes, absolutely.** Crossref supports converting a DOI directly into a formatted BibTeX entry.

You can retrieve BibTeX directly from Crossref in two simple ways: using Crossref's direct API transformation endpoint or using standard **HTTP Content Negotiation** via `doi.org`.

---

### Method 1: Direct Crossref REST API Endpoint

Crossref provides a dedicated `/transform/` route in their REST API that converts metadata directly into BibTeX without needing custom HTTP headers:

```http
GET https://api.crossref.org/works/{doi}/transform/application/x-bibtex

```

#### Example (cURL):

```bash
curl -L https://api.crossref.org/works/10.1038/nrd842/transform/application/x-bibtex

```

---

### Method 2: DOI Content Negotiation (`Accept` Header)

Crossref is one of the underlying registration agencies for `doi.org`. When you query `doi.org` with an `Accept: application/x-bibtex` header, Crossref handles the request and returns the BibTeX string.

#### Example (cURL):

```bash
curl -LH "Accept: application/x-bibtex" https://doi.org/10.1038/nrd842

```

*(Note: `-L` is required because `doi.org` redirects the request to Crossref.)*

#### Alternative Header Format:

You can also request BibTeX formatted via Crossref's Citation Style Language (CSL) processor:

```bash
curl -LH "Accept: text/x-bibliography; style=bibtex" https://doi.org/10.1038/nrd842

```

---

### Python Code Example

Using the Python `requests` library, you can fetch the BibTeX string in a single request:

```python
import requests

doi = "10.1038/nrd842"

# Option A: Direct API transform route
url = f"https://api.crossref.org/works/{doi}/transform/application/x-bibtex"
response = requests.get(url)

# Option B: Content negotiation
# headers = {"Accept": "application/x-bibtex"}
# response = requests.get(f"https://doi.org/{doi}", headers=headers)

if response.status_code == 200:
    print(response.text)
else:
    print("Failed to fetch BibTeX:", response.status_code)

```

# Can Semantic Scholar Graph go from DOI to BibTex entry?

**Yes, absolutely.** The Semantic Scholar Academic Graph API can accept a DOI as input and return a pre-formatted BibTeX entry directly in its JSON response.

---

### How It Works

1. **DOI Lookup:** Pass the DOI prefixed with `DOI:` directly as the `{paper_id}` in the API endpoint (e.g., `DOI:10.1038/nrd842`).
2. **Request the Field:** Include `fields=citationStyles` in your request parameters.
3. **Response:** Semantic Scholar returns a JSON payload containing a `citationStyles` object with a pre-built `bibtex` string.

---

### API Endpoint

```http
GET https://api.semanticscholar.org/graph/v1/paper/DOI:10.1038/nrd842?fields=citationStyles,title

```

---

### Example Response (JSON)

```json
{
  "paperId": "649def34f8be52c8b66281af98ae884c09aef38b",
  "title": "Example Paper Title",
  "citationStyles": {
    "bibtex": "@article{Name2023Title,\n author = {Author One and Author Two},\n title = {Example Paper Title},\n journal = {Nature Reviews Drug Discovery},\n year = {2023}\n}"
  }
}

```

---

### Python Code Example

```python
import requests

doi = "10.1038/nrd842"
url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}"
params = {"fields": "citationStyles,title"}

response = requests.get(url, params=params).json()

# Access the BibTeX string directly
bibtex_entry = response.get("citationStyles", {}).get("bibtex")

print(bibtex_entry)

```

# Which is the most straightforward? 

**Crossref (via DOI Content Negotiation)** is by far the most straightforward option in Java.

### Why Crossref Wins in Java

1. **Zero External Dependencies:** Because Java does not include a built-in JSON parser, APIs returning JSON (like Semantic Scholar or OpenAlex) require adding third-party libraries like Jackson or Gson to extract the BibTeX string. Crossref returns the raw `.bib` text directly in the HTTP response body.
2. **Minimal Code:** Using standard Java 11+ HTTP client, you can retrieve a complete BibTeX string in under 10 lines of code.

---

### Java Example (Native Java 11+)

No Jackson, Gson, or third-party libraries required:

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class DoiToBibtex {
    public static void main(String[] args) throws Exception {
        String doi = "10.1038/nrd842";
        
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS) // Required for doi.org redirects
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://doi.org/" + doi))
                .header("Accept", "application/x-bibtex")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            String bibtex = response.body();
            System.out.println(bibtex);
        } else {
            System.err.println("Request failed with status: " + response.statusCode());
        }
    }
}

```

---

### Comparison Summary for Java Developers

| API | Direct BibTeX Output? | Extra Java Dependencies Needed? | Work Required in Java |
| --- | --- | --- | --- |
| **Crossref** | **Yes** | **None** (Native HTTP Client) | Standard HTTP GET + read response body as string. |
| **Semantic Scholar** | Yes (inside JSON) | Jackson / Gson / `org.json` | Make HTTP GET → Parse JSON → Extract `citationStyles.bibtex`. |
| **OpenAlex** | No | Jackson / Gson / `org.json` | Make HTTP GET → Parse JSON → Manually build BibTeX string. |

# What this project actually does (see issue #66)

Everything above was written before this feature existed, comparing hypothetical approaches. This
section describes what was actually built.

## Field-by-field synthesis, not a transform/citationStyles shortcut

Despite Crossref's `/works/{doi}/transform/application/x-bibtex` and Semantic Scholar's
`citationStyles.bibtex` both being genuine, tempting shortcuts, neither is used. Two reasons:

- **Coverage.** This project resolves a DOI through a waterfall — OpenAlex first, then Semantic
  Scholar, then Crossref, then DBLP — precisely because no single one of them covers everything
  (see `OpenAlex-MVP-to-full-tiered-fallback-engine.md`). A transform/citationStyles shortcut only
  covers whichever DOIs *that specific resolver* has, so it can never replace the waterfall — it
  could only ever be a special case for the subset of DOIs Crossref (or Semantic Scholar) happens
  to resolve, while every other DOI still needs field-by-field synthesis regardless. That would
  make entries visibly *less* consistent depending on which resolver happened to find a given
  paper, not more.
- **The output still needs reprocessing anyway.** This project injects its own citeKey (generated
  from author/year, disambiguated against the project's existing entries — see
  `BibTexSynthesisService#generateUniqueCiteKey`) and its own `CITELINES_*` fields into every
  synthesized entry. A transform/citationStyles string would still have to be re-parsed and rebuilt
  to carry those, so using it instead of field-by-field synthesis wouldn't actually skip any real
  work.

So every resolver — `OpenAlexService`, `SemanticScholarResolver`, `CrossrefResolver`,
`DblpResolver` — implements the same `CitationMetadataResolver` interface, parsing its own API's
JSON into the same resolver-agnostic `ResolvedWork` record, which `BibTexSynthesisService` then
turns into BibTeX identically regardless of which resolver produced it.

## Fields captured from each resolver

| Field | OpenAlex | Semantic Scholar | Crossref | DBLP |
|---|---|---|---|---|
| title, authors, year, venue, doi | yes | yes | yes | yes |
| abstract | yes (reconstructed from `abstract_inverted_index`) | yes | yes (JATS tags stripped) | no |
| publisher | yes (`primary_location.source.host_organization_name`) | no | yes | no |
| pages | yes (`biblio.first_page`/`last_page`) | no | yes | yes |
| isbn | yes (`ids.isbn`) | no | yes | no |
| series | no | no | yes (`event.name`) | no |
| address | no | no | yes (`event.location`) | no |
| volume, number | yes (`biblio.volume`/`issue`) | no | yes (`volume`/`issue`) | yes |

Author-supplied `keywords` (e.g. what ACM DL shows on its own page) are not available from any of
these four APIs at all — not a gap in this implementation, just data none of them expose.

`BibTexSynthesisService` only emits each field for entry types where it's a meaningful BibTeX
field — e.g. `isbn`/`series`/`address` for `inproceedings`/`book`/`incollection`, not `article` —
rather than unconditionally, per its own `HAS_*` field-scoping sets.

## DBLP as a fourth resolver tier

`DblpResolver` is added after Crossref. DBLP has no by-DOI lookup endpoint, only free-text search
(`https://dblp.org/search/publ/api`) — it's queried using the DOI itself as the search text, and
only a hit whose own `info.doi` matches exactly is accepted, the same
confirm-by-exact-field-match approach `CheckLinksService#confirmHandleViaDblp` already used for
link-checking, reused here rather than duplicated. DBLP's coverage is narrower (CS-adjacent venues
only) and it has none of `abstract`/`publisher`/`isbn`/`series`, but its `venue`/`pages`/`volume`/
`number` are often cleaner than what a very-recently-registered DOI has on the other three.

## Upgrading existing entries

Since these fields didn't exist when earlier entries were resolved, a project-scoped "Upgrade
BibTeX Entries" job (`BibTexEntryUpgradeService`, launched from the project's Jobs tab) re-resolves
every entry that has a DOI against the now-richer waterfall and fills in whatever fields the entry
is currently missing. It never overwrites a field that already has a value, even if a resolver now
reports something different for it — an existing value may already have been reviewed or
hand-edited, and the job has no way to tell "reviewed and correct" apart from "just never
updated."
