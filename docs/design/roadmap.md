# Roadmap

## Import to .bib file, Export to .bib file

It would be helpful to be able to export to a .bib file, and import from a .bib file.

## Duplicate check

First, when entering a new entry, it would be helpful to do a quick duplicate check by scanning the titles and authors 
for possibly duplicates, perhaps with something fuzzy?  What's the best algorithm for that?

Then, before storing, pop up a list of possible duplicates rather than storing the new record.   
Have a button that allows overriding the duplicate check.

It might also be helpful to be have a job that does a duplicate check of an entire project, probably manually assisted, using some heuristics.

* Maybe a job that identifies possibly duplicates and puts them in a table?
* Then a manual process where a human can, for each possible duplicate row, either clear the flag, or merge the references.

## Marking references as High, Medium, Low, and No relevance

When doing a sweep through references and citations, it's helpful to be able to mark them as high, medium, low, no relevance and unreviewed.

We can use a custom BibTex field to store this.

We should probably also allow the user to specify a relevance level when first entering the citation.

## Adding a place for custom comments

It would help to add a place for custom comments in Markdown that can be displayed as HTML in the browser.
