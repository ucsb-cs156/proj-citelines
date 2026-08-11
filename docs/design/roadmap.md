# Roadmap

## Import to .bib file, Export to .bib file

It would be helpful to be able to export to a .bib file, and import from a .bib file.

We can add custom fields for the references and citations so that those can also be exported and imported (see About Custom BibTeX fields, below).

```
CITELINES_references = {citekey1,citekey2,citekey3,...},
CITELINES_citations = {citekey10,citekey11,citekey12,...},
```

## Duplicate check

First, when entering a new entry, it would be helpful to do a quick duplicate check by scanning the titles and authors 
for possibly duplicates, perhaps with something fuzzy?  What's the best algorithm for that?

Then, before storing, pop up a list of possible duplicates rather than storing the new record.   

Have a button that allows overriding the duplicate check.

It might also be helpful to be have a job that does a duplicate check of an entire project, probably manually assisted, using some heuristics.

* Maybe a job that identifies possibly duplicates and puts them in a postgres table?
* Then a manual process where a human can, for each possible duplicate row, either clear the flag, or merge the references.

## Marking references as High, Medium, Low, and No relevance

When doing a sweep through references and citations, it's helpful to be able to mark them as high, medium, low, none, and unreviewed.

We can use a custom BibTex field to store this (see below)

```
CITELINES_relevance="unreviewed",
```

We should probably also allow the user to specify a relevance level when first entering the citation via a separate dropdown,
so they don't have to manually enter it when copying/pasting BibTex from online sources (e.g. ACM DL, IEEE Xplore, etc.)

## Adding a place for custom comments

It would help to add a place for custom comments in Markdown that can be displayed as HTML in the browser.

```
CITELINES_comments={
Markdown text goes here.  I wonder if it will respect line breaks
# Like this one
* I guess
* we'll have to
* wait and see
},
```

It's not clear whether we will need to escape special characters inside the Markdown, as long as we are not passing this content to LaTeX.

But, we will probably want to make a separate editing window for the Markdown, i.e. when editing a BibTex Entry, pull out the CITATION_ fields and not allow those to be directly edited, but instead have, for example:

* A dropdown for adjusting the CITATION_relevance
* A markdown window for editing the CITATION_comments
* No hand editing of the citations or references (that should be handled by a different part of the app)
* No hand editing of the position (that should be handled by dragging/dropping on the graph user interface).

## Adding the citation graph

Make a citation graph using the same graph library that's used in proj-scaffold, with older references higher, and newer ones lower.

Make a color scheme for high, medium, low, no, and unchecked.  Have a default, but allow the scheme to be modfied by the user.

Long term, perhaps allow defining custom schemes scoped per project, giving them names, and importing them from other projects.

Make a job that automatically formats and places the nodes, and then also allow manual placement.

This would add to the BibTex:

```
CITELINES_position={100,300}
```

## Adding tags

Add the ability to add custom tags, and tag references with them.   User can select a short name, color, and long name for each tag.

# Notes

## About Custom BibTeX fields

Standard BibTeX silently ignores any field it doesn't recognize. BibTeX parsers do not choke on unknown fields, provided the syntax of the entry itself is valid.

When BibTeX parses an entry in a `.bib` file, it reads every field-value pair into memory. During document compilation, it checks the active bibliography style file (`.bst`).

* **If the field is defined in the `.bst` file** (e.g., `author`, `title`, `year`), BibTeX formats and includes it in your reference list.
* **If the field is unrecognized** (e.g., `my_custom_note`, `rating`, `file`), BibTeX simply ignores it when generating the `.bbl` output file.

This behavior is why reference managers (like Zotero, JabRef, and Mendeley) can safely inject custom metadata—such as `abstract`, `file`, `keywords`, or internal database IDs—into standard `.bib` files without breaking your LaTeX compilation.


### Key Considerations

1. **Syntax rules still apply:** Even if a field name is ignored, the parser must still be able to parse it.
* Field names should use basic alphanumeric characters, hyphens, or underscores (avoid spaces or special characters).
* Values must be properly enclosed in curly braces `{...}` or double quotes `"..."`.
* Unescaped string concatenation operators (`#`) or mismatched braces inside the custom field will still trigger compilation errors.


2. **Accessing custom fields in BibLaTeX:** If you use `biblatex` with `biber` instead of traditional `bibtex`, unknown fields are also ignored by default. However, `biblatex` gives you the ability to map or print custom fields in your references using `\DeclareFieldFormat` and custom drivers if you ever decide you want them visible.
