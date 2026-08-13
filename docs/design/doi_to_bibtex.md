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
