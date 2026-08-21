import {
  DEFAULT_CITATION_FILTER,
  CITATION_FILTER_LINK_OPTIONS,
  CITATION_FILTER_DUPLICATE_OPTIONS,
  getEntryRelevance,
  matchesCitationFilter,
} from "main/utils/citationFilter";

function entry(overrides = {}) {
  return {
    id: "e1",
    keyValuePairs: {
      author: "Jane Q. Smith",
      title: "A Great Paper",
      ...overrides.keyValuePairs,
    },
    ...overrides,
  };
}

describe("citationFilter constants", () => {
  test("DEFAULT_CITATION_FILTER starts fully permissive (nothing filtered out)", () => {
    expect(DEFAULT_CITATION_FILTER.relevance).toEqual([
      "High",
      "Medium",
      "Low",
      "None",
      "Unreviewed",
    ]);
    expect(DEFAULT_CITATION_FILTER.link).toBe("all");
    expect(DEFAULT_CITATION_FILTER.duplicates).toBe("all");
    expect(DEFAULT_CITATION_FILTER.search).toBe("");
    expect(DEFAULT_CITATION_FILTER.tagIds).toEqual([]);
    expect(DEFAULT_CITATION_FILTER.tagMode).toBe("or");
  });

  test("CITATION_FILTER_LINK_OPTIONS and CITATION_FILTER_DUPLICATE_OPTIONS have the expected values", () => {
    expect(CITATION_FILTER_LINK_OPTIONS).toEqual([
      "all",
      "doi",
      "url",
      "invalid",
      "missing",
    ]);
    expect(CITATION_FILTER_DUPLICATE_OPTIONS).toEqual(["all", "dup", "no-dup"]);
  });
});

describe("getEntryRelevance", () => {
  test("returns the citelines_relevance keyValuePair when present", () => {
    expect(
      getEntryRelevance(
        entry({ keyValuePairs: { citelines_relevance: "High" } }),
      ),
    ).toBe("High");
  });

  test("defaults to Unreviewed when absent", () => {
    expect(getEntryRelevance(entry())).toBe("Unreviewed");
  });

  test("does not throw when the entry has no keyValuePairs at all", () => {
    expect(getEntryRelevance({ id: "e1" })).toBe("Unreviewed");
  });
});

describe("matchesCitationFilter", () => {
  test("the default filter matches everything", () => {
    expect(matchesCitationFilter(entry(), DEFAULT_CITATION_FILTER)).toBe(true);
  });

  describe("relevance", () => {
    test("matches only entries whose relevance is in the selected list", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, relevance: ["High"] };
      expect(
        matchesCitationFilter(
          entry({ keyValuePairs: { citelines_relevance: "High" } }),
          filter,
        ),
      ).toBe(true);
      expect(
        matchesCitationFilter(
          entry({ keyValuePairs: { citelines_relevance: "Low" } }),
          filter,
        ),
      ).toBe(false);
    });

    test("an empty relevance list matches nothing", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, relevance: [] };
      expect(matchesCitationFilter(entry(), filter)).toBe(false);
    });
  });

  describe("link", () => {
    test("doi matches an entry with a doi and no invalid flag", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "doi" };
      expect(
        matchesCitationFilter(
          entry({ keyValuePairs: { doi: "10.1/x" } }),
          filter,
        ),
      ).toBe(true);
    });

    test("doi does not match an entry whose doi is flagged invalid", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "doi" };
      expect(
        matchesCitationFilter(
          entry({
            keyValuePairs: { doi: "10.1/x", CITELINES_invalid_doi: "True" },
          }),
          filter,
        ),
      ).toBe(false);
    });

    test("url matches an entry with only a url and no invalid flag", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "url" };
      expect(
        matchesCitationFilter(
          entry({ keyValuePairs: { url: "https://example.org" } }),
          filter,
        ),
      ).toBe(true);
    });

    test("url does not match an entry that has both a doi and a url (doi takes precedence)", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "url" };
      expect(
        matchesCitationFilter(
          entry({
            keyValuePairs: { doi: "10.1/x", url: "https://example.org" },
          }),
          filter,
        ),
      ).toBe(false);
    });

    test("invalid matches an entry flagged with either an invalid doi or url", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "invalid" };
      expect(
        matchesCitationFilter(
          entry({ keyValuePairs: { CITELINES_invalid_url: "True" } }),
          filter,
        ),
      ).toBe(true);
      expect(matchesCitationFilter(entry(), filter)).toBe(false);
    });

    test("missing matches an entry with neither a doi nor a url", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "missing" };
      expect(matchesCitationFilter(entry(), filter)).toBe(true);
      expect(
        matchesCitationFilter(
          entry({ keyValuePairs: { doi: "10.1/x" } }),
          filter,
        ),
      ).toBe(false);
    });

    test("missing matches an entry with no keyValuePairs at all, without throwing", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "missing" };
      expect(matchesCitationFilter({ id: "e1" }, filter)).toBe(true);
    });

    test("all matches regardless of link value", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, link: "all" };
      expect(
        matchesCitationFilter(
          entry({
            keyValuePairs: { doi: "10.1/x", CITELINES_invalid_doi: "True" },
          }),
          filter,
        ),
      ).toBe(true);
      expect(matchesCitationFilter(entry(), filter)).toBe(true);
    });
  });

  describe("duplicates", () => {
    test("dup matches only entries with a possible-duplicate flag", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, duplicates: "dup" };
      expect(
        matchesCitationFilter(
          entry({ possibleDuplicateReason: "SAME_DOI" }),
          filter,
        ),
      ).toBe(true);
      expect(matchesCitationFilter(entry(), filter)).toBe(false);
    });

    test("no-dup matches only entries without a possible-duplicate flag", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, duplicates: "no-dup" };
      expect(matchesCitationFilter(entry(), filter)).toBe(true);
      expect(
        matchesCitationFilter(
          entry({ possibleDuplicateReason: "SAME_DOI" }),
          filter,
        ),
      ).toBe(false);
    });

    test("all matches both flagged and unflagged entries", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, duplicates: "all" };
      expect(
        matchesCitationFilter(
          entry({ possibleDuplicateReason: "SAME_DOI" }),
          filter,
        ),
      ).toBe(true);
      expect(matchesCitationFilter(entry(), filter)).toBe(true);
    });
  });

  describe("search", () => {
    test("matches case-insensitively against author or title", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, search: "great" };
      expect(matchesCitationFilter(entry(), filter)).toBe(true);

      const authorFilter = { ...DEFAULT_CITATION_FILTER, search: "SMITH" };
      expect(matchesCitationFilter(entry(), authorFilter)).toBe(true);

      const noMatch = { ...DEFAULT_CITATION_FILTER, search: "nonexistent" };
      expect(matchesCitationFilter(entry(), noMatch)).toBe(false);
    });

    test("blank/whitespace-only search matches everything", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, search: "   " };
      expect(matchesCitationFilter(entry(), filter)).toBe(true);
    });

    test("does not match when author/title are absent, even for a query that would match a wrong fallback value", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, search: "here" };
      expect(
        matchesCitationFilter({ id: "e1", keyValuePairs: {} }, filter),
      ).toBe(false);
    });
  });

  describe("tags", () => {
    test("or mode matches an entry with at least one selected tag", () => {
      const filter = {
        ...DEFAULT_CITATION_FILTER,
        tagIds: [1, 2],
        tagMode: "or",
      };
      expect(matchesCitationFilter(entry({ tagIds: [2] }), filter)).toBe(true);
      expect(matchesCitationFilter(entry({ tagIds: [3] }), filter)).toBe(false);
    });

    test("and mode matches only an entry with every selected tag", () => {
      const filter = {
        ...DEFAULT_CITATION_FILTER,
        tagIds: [1, 2],
        tagMode: "and",
      };
      expect(matchesCitationFilter(entry({ tagIds: [1, 2, 3] }), filter)).toBe(
        true,
      );
      expect(matchesCitationFilter(entry({ tagIds: [1] }), filter)).toBe(false);
    });

    test("no tagIds selected matches everything regardless of the entry's tags", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, tagIds: [] };
      expect(matchesCitationFilter(entry(), filter)).toBe(true);
    });

    test("an entry with no tagIds field at all does not match a non-empty tag filter", () => {
      const filter = { ...DEFAULT_CITATION_FILTER, tagIds: [1] };
      expect(matchesCitationFilter(entry(), filter)).toBe(false);
    });
  });

  test("requires every dimension to match at once", () => {
    const filter = {
      ...DEFAULT_CITATION_FILTER,
      relevance: ["High"],
      link: "doi",
    };
    const matchingEntry = entry({
      keyValuePairs: { doi: "10.1/x", citelines_relevance: "High" },
    });
    const wrongRelevance = entry({
      keyValuePairs: { doi: "10.1/x", citelines_relevance: "Low" },
    });
    expect(matchesCitationFilter(matchingEntry, filter)).toBe(true);
    expect(matchesCitationFilter(wrongRelevance, filter)).toBe(false);
  });
});
