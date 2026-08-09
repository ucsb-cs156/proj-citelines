# Identifying Citations

## Prompt

I'm trying to build a citation manager, and I'm wondering, if I make DOI be the primary key for identifying citations, what things I'll be excluding, or will have to treat as special cases.   My domain is CS and CE literature mainly, with some Educational Psychology, math, and stats papers.

## Answer: 

Using a DOI as your primary key means you cannot uniquely identify or save a massive portion of literature in your target domain.
In Computer Science, Computer Engineering, Math, Stats, and Educational Psychology, the DOI is not a universal constant. If you force the DOI to be a unique primary key, your database will reject thousands of seminal papers, preprints, and classic texts, or force you into messy workarounds. [1] 
Here is a breakdown of exactly what you will exclude or have to treat as a special case.

### 1. Things You Will Exclude Completely (No DOI Exists)

* Preprint Repositories (arXiv / Cryptology ePrint): Crucial for CS, Math, and Stats. While some older arXiv papers are getting retrospective DOIs, millions of papers only have an arXiv ID (e.g., arXiv:2301.12345). [2] 
* Self-Published & Open-Source Artifacts: Many foundational CS tools, whitepapers, and documentation (e.g., the original Bitcoin whitepaper, specific RFCs, or GitHub repositories) have no DOI. [3] 
* Older Literature: Many classic Math, Stats, and early CS papers from the mid-20th century have never been assigned a DOI by their original publishers. [4, 5] 
* Theses and Dissertations: While some universities use Crossref to assign DOIs to PhD theses, the vast majority only have an institutional repository handle or a ProQuest ID.

### 2. Things That Require Special Treatment (Syntax & Formatting Failures)

* The 10.5555 Prefix (and similar placeholders): As seen with the CCSC paper, these are "local" or "metadata-only" DOIs. They resolve on the web, but standard citation APIs (like Crossref) will return 404 Not Found errors because they are not registered in the central global metadata pool. [6, 7, 8] 
* Case Sensitivity and Encoding Issues: DOIs are technically case-insensitive (10.1145/abc is the same as 10.1145/ABC), but publishers write them arbitrarily. Furthermore, older DOIs contain characters like <, >, (, and ) which break URL parsing and database indexing if not strictly sanitized. [9] 
* Duplicate DOIs for One Work: Publishers occasionally assign the exact same DOI to an entire conference proceedings book and to individual chapters within that book, destroying your database's uniqueness constraint.

### 3. Domain-Specific Edge Cases

* RFCs (Internet Engineering Task Force): Essential for CE and networking literature. They do not use traditional DOIs; they use RFC numbers (e.g., RFC 793).
* Educational Psychology Test Manuals: In Ed Psych, researchers frequently cite specific diagnostic tests, standardized assessment manuals, or corporate psychometric reports that completely lack DOIs.
* Multiple Versions (The CS Preprint Pipeline): In CS, a paper often exists as an arXiv preprint, an ACM conference paper, and an extended IEEE journal article. They will have different DOIs but represent the same intellectual work, complicating how your manager groups or merges duplicates.

### Recommended Database Architecture Fix
Instead of using the DOI as the primary key, use a surrogate key (like an auto-incremented integer or a UUID) as your database's primary key. Then, create an Identifiers table or JSON attribute column to store multiple optional keys:

| Field | Type | Example |
|---|---|---|
| id (Primary Key) | UUID | e83b2a1a-7b3c... |
| doi | String (Nullable, Indexed) | 10.1145/3199572 |
| arxiv_id | String (Nullable) | 2301.12345 |
| isbn | String (Nullable) | 978-3-16... |

How do you plan to ingest these citations into your manager (e.g., manual entry, PDF scraping, or browser extension), and would you like to map out the schema for handling those formats? [10, 11] 

[1] [https://www.researchgate.net](https://www.researchgate.net/post/Is_DOI_compulsory_for_Published_paper)
[2] [https://www.proof-reading-service.com](https://www.proof-reading-service.com/blogs/academic-publishing/what-are-dois-for-research-papers-and-how-can-i-find-them)
[3] [https://www.researchgate.net](https://www.researchgate.net/post/Is_DOI_compulsory_for_Published_paper)
[4] [https://askwa.libanswers.com](https://askwa.libanswers.com/centralia/faq/339607)
[5] [https://www.researchgate.net](https://www.researchgate.net/post/Is_DOI_compulsory_for_Published_paper)
[6] [https://www.crossref.org](https://www.crossref.org/blog/whats-that-doi/)
[7] [https://www.youtube.com](https://www.youtube.com/watch?v=PgqtiY7oZ6k)
[8] [https://citely.ai](https://citely.ai/posts/how-to-check-if-an-ai-generated-citation-is-real-2026-guide)
[9] [https://documentation.ardc.edu.au](https://documentation.ardc.edu.au/doi/doi-faqs)
[10] [https://jefflibraries.libguides.com](https://jefflibraries.libguides.com/citationmanager_RefWorks)
[11] [https://guides.lib.unc.edu](https://guides.lib.unc.edu/ebsco-health/citing)

## Prompt

What if I include doi, arxiv_id, isbn, and as a fallback, url, as the way of identifying a citation?

## Answer

That is a much more robust approach, but combining these fields into a single identifier strategy introduces a major database problem: The Entity Resolution Problem (identifying when two records are actually the same thing). [1] 
If you use those four fields as a fallback chain, your system will struggle with duplicates, ghost records, and broken links.
Here is exactly how those four identifiers will break in the wild, along with a strategy to fix it.
### 1. The Trap of the Fallback Chain
If a user adds a paper via its arXiv_id, and later adds the final peer-reviewed version via its DOI, your system will treat them as two entirely separate citations.
In Computer Science, this happens constantly. A paper follows a pipeline: [2] 

   1. Version 1: Uploaded to arXiv (arxiv_id exists).
   2. Version 2: Accepted to an ACM conference (doi exists, arxiv_id is empty in ACM metadata).
   3. Version 3: A blogger links to the PDF directly on the author's university website (url exists). [3] 

If your system relies on a fallback chain to identify uniqueness, a single user could easily end up with three duplicate entries for the exact same paper in their library.
### 2. The Vulnerability of Each Field

* URLs change and rot: Academic URLs are notoriously unstable. Universities delete professor homepages, journals restructure their websites, and open-access links break. If a URL is your identifier, a broken link means a broken database record. Furthermore, https://arxiv.org and https://arxiv.org are the exact same paper but represent two completely different URLs. [4, 5, 6] 
* ISBNs are messy: A single computer science textbook often has 4+ different ISBNs (Hardcover, Paperback, Kindle, EPUB, and International Edition). If a student inputs the paperback and a professor inputs the Kindle version, your system will not know they are the same book.
* arXiv IDs have format shifts: Older papers use math/0301234 while newer ones use 2101.12345. You will need heavy regex sanitization to ensure variations don't bypass your uniqueness checks. [7] 

### 3. How to Structure Your Identification Logic
To make this work flawlessly, do not treat these identifiers as a fallback chain. Treat them as aliases pointing to a central record.
Here is the industry-standard way to architecture this:
### Step 1: Create an Identifiers Table
Instead of putting doi or arxiv_id columns directly on your Citations table, break them out into an Identifiers table with a many-to-one relationship.

[Identifiers Table]
- id (PK)
- citation_id (FK -> Citations.id)
- type (ENUM: 'doi', 'arxiv', 'isbn', 'url')
- value (String, sanitized and lowercase)

### Step 2: Implement "Upsert" Logic on Ingestion
When a user adds a citation, scan all provided identifiers against your database before creating a new record:

   1. Check explicit IDs: Does this DOI or arXiv_id already exist in the Identifiers table? If yes, attach the user's citation to the existing citation_id. [8, 9] 
   2. Normalize and check URLs: Strip tracking parameters and formatting from the URL (e.g., convert PDF links to abstract links). Check if that URL exists.
   3. The Metadata Cross-Check: If a user submits an arXiv_id, query the arXiv API to see if the authors updated the record with a journal-ref or a DOI. If they did, pull that DOI and check your database for that instead. [10] 

### Step 3: Use Content Hashing as the Ultimate Fallback
If a citation has no DOI, arXiv ID, ISBN, or stable URL (e.g., an old class handout or a specific diagnostic manual in Educational Psychology), you need a way to prevent duplicates. [11] 
Generate a deterministic Content Hash based on normalized metadata:
Hash = SHA256(lowercase(Title) + Year + lowercase(First_Author_Last_Name))
If a new entry matches an existing content hash, flag it as a potential duplicate and ask the user if they want to merge them. [12] 

[1] [https://www.youtube.com](https://www.youtube.com/watch?v=H_Mr6EOgSpA)
[2] [https://www.youtube.com](https://www.youtube.com/watch?v=GtEUzi1CYe4)
[3] [https://www.youtube.com](https://www.youtube.com/watch?v=cEGYw19FYn8)
[4] [https://amastyleinsider.com](https://amastyleinsider.com/blog/2012/01/17/digital-object-identifiers-dois-for-electronic-references)
[5] [https://directivepublications.org](https://directivepublications.org/blog/what-is-a-doi)
[6] [https://library.rgu.ac.uk](https://library.rgu.ac.uk/harvard-essentials-pathway/url-and-doi)
[7] [https://github.com](https://github.com/acl-org/acl-style-files/issues/9)
[8] [https://medialab.github.io](https://medialab.github.io/sciencescape/scopus_utils/)
[9] [https://citely.ai](https://citely.ai/citation-verification-methodology)
[10] [https://intuitionlabs.ai](https://intuitionlabs.ai/articles/research-paper-apis-scientific-literature)
[11] [https://pmc.ncbi.nlm.nih.gov](https://pmc.ncbi.nlm.nih.gov/articles/PMC4981598/)
[12] [https://www.youtube.com](https://www.youtube.com/watch?v=hIBN1fMBHzQ)

