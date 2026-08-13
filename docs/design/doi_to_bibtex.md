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
