# Citation APIs

Several academic and bibliographic APIs allow you to look up paper citations, track reference networks, and extract metadata. Many of the most comprehensive platforms offer completely free access (or generous free tiers).  

## Free & Open APIs (Recommended)

1. OpenAlex API

    Coverage: ~240M+ works, 2.5B+ citations.  

    Best For: Comprehensive bibliometric graph analysis, tracking incoming/outgoing citations, and entity mapping (authors, institutions, concepts).

    Cost: 100% Free (CC0 license). No mandatory key required, though providing an email/key gives you higher rate limits (up to 100,000 requests/day).  

2. Semantic Scholar Graph API

    Coverage: ~200M+ papers and billions of citations.  

    Best For: AI-driven contextual research, SPECTER embeddings, paper summaries (TLDRs), and influential citations.  

    Cost: Free (Requires a free API key for higher rate limits).  

3. Crossref REST API

    Coverage: ~180M+ registered DOIs across journals, books, and conference proceedings.  

    Best For: Official DOI reference lookup and retrieving open citation data linked directly from publishers.

    Cost: Free public endpoint. Including a contact email in your request header (Polite Pool) speeds up response rates significantly.  

4. OpenCitations REST API

    Coverage: Billions of citation links focusing on open academic citation data.

    Best For: Querying exact reference counts, forward citations, and backward citations using DOIs or Open Citation Identifiers (OCIs).  

    Cost: 100% Free (CC0 metadata). API token is free upon registration.

5. PubMed E-utilities API

    Coverage: ~35M+ citations focused on biomedical and life sciences literature.

    Best For: Life sciences research and MEDLINE-indexed citations.

    Cost: Free provided by the U.S. National Library of Medicine (NLM).

## Commercial & Paid APIs

API / Service	Coverage	Pricing & Access Model	Notes
Scite.ai API	~300M+ works	Paid (Commercial)	Specializes in "Smart Citations"—categorizing citations as supporting, contrasting, or mentioning.
Dimensions API	~140M+ papers	Paid / Freemium for researchers	Links citations to grants, patents, and clinical trials. Free access available for non-commercial academic research projects upon approval.
Scopus API	100M+ items	Paid (Requires Elsevier subscription)	Highly curated peer-reviewed citation data; free basic metadata calls available if your institution subscribes.
Web of Science API	~90M+ items	Paid (Clarivate subscription)	Standard for impact factors and traditional academic metric evaluation.

## Summary Recommendation

* If you need general-purpose, unrestricted citation data, start with OpenAlex or Semantic Scholar.  
* If you specifically need DOI-to-metadata resolution, use Crossref.  
* If you want to study citation network structures, use OpenCitations.

## ACM Digital Library and IEEE Xplore coverage

Crossref has excellent coverage of items from both the ACM Digital Library and IEEE Xplore, 
though there are slight nuances regarding reference/citation data completeness between the two.

### ACM Digital Library Coverage

* **DOI & Metadata Coverage: Very High**. ACM deposits DOIs, titles, authors,
  publication dates, and abstracts into Crossref for virtually all of its journal articles and conference proceedings.
* **Citation/Reference Data: Very High**. ACM is a member of the Initiative for Open Citations (I4OC)
  and the Initiative for Open Abstracts (I4OA).
  They explicitly deposit structured reference lists and abstracts into Crossref for their publications.
* **Overall Fit**: If you query Crossref for an ACM paper DOI, you will routinely receive complete metadata
  along with its outgoing reference list.

### IEEE Xplore Coverage

* **DOI & Metadata Coverage: Very High**. IEEE is one of Crossref’s largest record depositors, with well over 1
  million registered records spanning IEEE journals, transactions, and massive conference proceeding archives.
* **Citation/Reference Data: Good to Moderate**. IEEE deposits core metadata (titles, authors, publication dates, affiliations)
  and DOIs consistently across all item types.
  IEEE participates in open citation sharing (I4OC), so journal articles generally include structured reference lists.
  However, reference deposits for older or smaller conference proceedings can occasionally be incomplete compared to their
  journal counterparts.

### Alternative Free Options for Computer Science & IEEE/ACM

If you find gaps in Crossref's citation graphs for computer science or electrical engineering, 
consider pairing it with:

* **OpenAlex**: Aggregates Crossref data while also crawling publisher pages, PubMed, and arXiv.
  It frequently backfills citation networks for CS conference papers
  that might lack structured reference fields in Crossref.
  
* **Semantic Scholar Graph API**: Exceptionally strong in CS, AI, and engineering fields.
  It extracts citations directly from PDF layouts, often catching citations even if the publisher's formal XML
  deposit to Crossref missed them.



