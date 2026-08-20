const bibTexEntriesFixtures = {
  oneEntry: {
    id: "64f1b2c3d4e5f6a7b8c9d0e1",
    projectId: 1,
    entryType: "article",
    citeKey: "smith2020",
    keyValuePairs: {
      author: "Jane Q. Smith and John Doe",
      title: "A Very Long Title That Goes On and On",
      year: "2020",
      doi: "10.1038/s41586-020-2649-2",
    },
  },
  threeEntries: [
    {
      id: "64f1b2c3d4e5f6a7b8c9d0e1",
      projectId: 1,
      entryType: "article",
      citeKey: "smith2020",
      keyValuePairs: {
        author: "Jane Q. Smith and John Doe",
        title: "A Very Long Title That Goes On and On",
        year: "2020",
        doi: "10.1038/s41586-020-2649-2",
      },
    },
    {
      id: "64f1b2c3d4e5f6a7b8c9d0e2",
      projectId: 1,
      entryType: "book",
      citeKey: "jones2019",
      keyValuePairs: {
        author: "Robert Jones",
        title: "A Different Book",
        year: "2019",
        url: "https://example.org/jones2019",
      },
    },
    {
      id: "64f1b2c3d4e5f6a7b8c9d0e3",
      projectId: 1,
      entryType: "inproceedings",
      citeKey: "lee2021",
      keyValuePairs: {
        author: "Grace Lee",
        title: "Short Title",
        year: "2021",
        doi: "10.1145/3411764.3445601",
      },
    },
  ],
  entryWithSlashInCiteKey: {
    id: "64f1b2c3d4e5f6a7b8c9d0e4",
    projectId: 1,
    entryType: "inproceedings",
    citeKey: "10.1145/3770762.3772609",
    keyValuePairs: {
      author: "Yolanda Reimer and Christopher Hundhausen",
      title: "A Pedagogy for Assessing Individual Contributions",
      year: "2026",
      doi: "10.1145/3770762.3772609",
    },
  },
  // Exercises every optional field BibTexEntryShowPage renders something for: an abstract, a
  // relevance rating, assigned tags, published comments, and a possible-duplicate flag pointing
  // back at `oneEntry` — see BibTexEntryShowPage.stories.jsx.
  fullyFeaturedEntry: {
    id: "64f1b2c3d4e5f6a7b8c9d0e9",
    projectId: 1,
    entryType: "article",
    citeKey: "fullyfeatured2024",
    tagIds: [1, 2],
    possibleDuplicateIds: ["64f1b2c3d4e5f6a7b8c9d0e1"],
    possibleDuplicateReason: "SIMILAR_TITLE",
    keyValuePairs: {
      author: "Alex Fully and Jordan Featured",
      title: "A Fully Featured Example Paper, for the Storybook Demo",
      year: "2024",
      doi: "10.1145/9999999.9999999",
      abstract:
        "This is a sample abstract used to demonstrate the Abstract card, " +
        "including its word count and edit modal, in the BibTexEntryShowPage " +
        "Storybook story.",
      CITELINES_relevance: "High",
      CITELINES_comments:
        "These are some **published** comments in _Markdown_.",
    },
  },
};

export default bibTexEntriesFixtures;
