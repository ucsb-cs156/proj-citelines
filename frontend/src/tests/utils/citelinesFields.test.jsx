import {
  RELEVANCE_OPTIONS,
  DEFAULT_RELEVANCE,
  extractCitelinesFields,
  injectCitelinesFields,
} from "main/utils/citelinesFields";

describe("citelinesFields", () => {
  describe("RELEVANCE_OPTIONS / DEFAULT_RELEVANCE", () => {
    test("has the five documented options, in order", () => {
      expect(RELEVANCE_OPTIONS).toEqual([
        "High",
        "Medium",
        "Low",
        "None",
        "Unreviewed",
      ]);
    });

    test("defaults to Unreviewed", () => {
      expect(DEFAULT_RELEVANCE).toBe("Unreviewed");
    });
  });

  describe("extractCitelinesFields", () => {
    test("returns Unreviewed and no preserved fields for a plain entry, unchanged byte-for-byte", () => {
      const raw = `@article{smith2020,
  author = {Jane Smith},
  title = {A Great Paper},
  year = {2020},
}
`;
      const { strippedBibtex, relevance, preservedFields } =
        extractCitelinesFields(raw);
      expect(relevance).toBe("Unreviewed");
      expect(preservedFields).toEqual({});
      expect(strippedBibtex).toBe(raw);
    });

    test("extracts an existing relevance value and strips it from the displayed text", () => {
      const raw = `@article{smith2020,
  author = {Jane Smith},
  title = {A Great Paper},
  citelines_relevance = {High},
}
`;
      const { strippedBibtex, relevance } = extractCitelinesFields(raw);
      expect(relevance).toBe("High");
      expect(strippedBibtex).not.toContain("citelines_relevance");
      expect(strippedBibtex).not.toContain("High");
      expect(strippedBibtex).toContain("author = {Jane Smith}");
    });

    test("is case-insensitive when matching the relevance value", () => {
      const raw = `@article{smith2020, title = {T}, citelines_relevance = {mEdIuM}}`;
      expect(extractCitelinesFields(raw).relevance).toBe("Medium");
    });

    test("falls back to Unreviewed for an unrecognized relevance value", () => {
      const raw = `@article{smith2020, title = {T}, citelines_relevance = {bogus}}`;
      expect(extractCitelinesFields(raw).relevance).toBe("Unreviewed");
    });

    test("preserves other CITELINES_ fields (case-insensitively) without displaying them", () => {
      const raw = `@article{smith2020,
  title = {T},
  CITELINES_position = {42},
  CITELINES_references = {ref1,ref2},
  CITELINES_citations = {cite1},
}
`;
      const { strippedBibtex, preservedFields } = extractCitelinesFields(raw);
      expect(preservedFields).toEqual({
        citelines_position: "42",
        citelines_references: "ref1,ref2",
        citelines_citations: "cite1",
      });
      expect(strippedBibtex).not.toContain("citelines");
      expect(strippedBibtex).not.toContain("position");
    });

    test("handles a value containing a comma inside braces without splitting it", () => {
      const raw = `@article{smith2020, author = {Smith, Jane and Doe, John}, title = {T}}`;
      const { strippedBibtex } = extractCitelinesFields(raw);
      expect(strippedBibtex).toContain("author = {Smith, Jane and Doe, John}");
    });

    test("handles a quoted value containing a nested brace without splitting it", () => {
      const raw = `@article{smith2020, author = "Smith, {Jr.}", title = {T}}`;
      const { strippedBibtex } = extractCitelinesFields(raw);
      expect(strippedBibtex).toContain('author = "Smith, {Jr.}"');
    });

    test("handles a value containing nested braces without splitting it", () => {
      const raw = `@article{smith2020, title = {A {Nested} {Title}}, citelines_relevance = {Low}}`;
      const { strippedBibtex, relevance } = extractCitelinesFields(raw);
      expect(relevance).toBe("Low");
      expect(strippedBibtex).toContain("title = {A {Nested} {Title}}");
    });

    test("only strips the first entry when given multiple (edit mode is always single-entry)", () => {
      const raw = `@article{a2020, title = {A}, citelines_relevance = {High}}\n@article{b2021, title = {B}}`;
      const { strippedBibtex } = extractCitelinesFields(raw);
      expect(strippedBibtex).toContain("title = {A}");
      expect(strippedBibtex).not.toContain("citelines_relevance");
    });

    test("handles the exact format the real backend export endpoint produces (quoted values, tab indent, no trailing comma)", () => {
      // Captured verbatim from BibTexConverterService.convertEntryToBibTexString.
      const raw =
        '@article{smith2020,\n\tauthor = "Jane Smith",\n\ttitle = "A Great Paper",\n\tyear = "2020",\n\tcitelines_relevance = "High"\n}';
      const { strippedBibtex, relevance } = extractCitelinesFields(raw);
      expect(relevance).toBe("High");
      expect(strippedBibtex).not.toContain("citelines");
      expect(strippedBibtex).toContain('author = "Jane Smith"');
      expect(strippedBibtex).toContain('title = "A Great Paper"');
      expect(strippedBibtex).toContain('year = "2020"');
    });

    test("round-trips through a real BibTeX-shaped null/empty input without throwing", () => {
      expect(extractCitelinesFields("")).toEqual({
        strippedBibtex: "",
        relevance: "Unreviewed",
        preservedFields: {},
      });
      expect(extractCitelinesFields(null)).toEqual({
        strippedBibtex: "",
        relevance: "Unreviewed",
        preservedFields: {},
      });
      expect(extractCitelinesFields(undefined)).toEqual({
        strippedBibtex: "",
        relevance: "Unreviewed",
        preservedFields: {},
      });
    });

    test("handles a bare (unbraced, unquoted) numeric field value", () => {
      const raw = `@article{smith2020, year = 2020, citelines_relevance = {High}}`;
      const { strippedBibtex, relevance } = extractCitelinesFields(raw);
      expect(relevance).toBe("High");
      expect(strippedBibtex).toContain("year = 2020");
    });

    test("stops scanning cleanly when '@' is never followed by '{' anywhere in the text", () => {
      const raw = "@nobrace here";
      expect(extractCitelinesFields(raw)).toEqual({
        strippedBibtex: raw,
        relevance: "Unreviewed",
        preservedFields: {},
      });
    });

    test("preserves a malformed field chunk with no '=' as-is", () => {
      const raw = `@article{smith2020, title = {T}, garbage}`;
      const { strippedBibtex } = extractCitelinesFields(raw);
      expect(strippedBibtex).toContain("garbage");
    });

    test("returns the input unchanged for text with no recognizable entry", () => {
      const raw = "not bibtex at all";
      expect(extractCitelinesFields(raw)).toEqual({
        strippedBibtex: raw,
        relevance: "Unreviewed",
        preservedFields: {},
      });
    });
  });

  describe("injectCitelinesFields", () => {
    test("adds a CITELINES_relevance field to a plain entry", () => {
      const raw = `@article{smith2020,
  author = {Jane Smith},
  title = {A Great Paper},
}
`;
      const result = injectCitelinesFields(raw, "High");
      expect(result).toContain("CITELINES_relevance = {High}");
      expect(result).toContain("author = {Jane Smith}");
    });

    test("re-injects preserved fields alongside relevance", () => {
      const raw = `@article{smith2020, title = {T}}`;
      const result = injectCitelinesFields(raw, "Medium", {
        citelines_position: "42",
        citelines_references: "ref1,ref2",
      });
      expect(result).toContain("CITELINES_relevance = {Medium}");
      expect(result).toContain("CITELINES_position = {42}");
      expect(result).toContain("CITELINES_references = {ref1,ref2}");
    });

    test("does not duplicate a CITELINES_ field the user left in the edited text", () => {
      const raw = `@article{smith2020, title = {T}, citelines_relevance = {Low}}`;
      const result = injectCitelinesFields(raw, "High");
      const matches = result.match(/relevance/gi) ?? [];
      expect(matches.length).toBe(1);
      expect(result).toContain("CITELINES_relevance = {High}");
    });

    test("injects into every entry when the text has more than one", () => {
      const raw = `@article{a2020, title = {A}}\n@article{b2021, title = {B}}`;
      const result = injectCitelinesFields(raw, "None");
      const matches = result.match(/CITELINES_relevance = \{None\}/g) ?? [];
      expect(matches.length).toBe(2);
    });

    test("is a no-op for empty or unrecognizable input", () => {
      expect(injectCitelinesFields("", "High")).toBe("");
      expect(injectCitelinesFields(null, "High")).toBe("");
      expect(injectCitelinesFields("not bibtex", "High")).toBe("not bibtex");
    });

    test("injects correctly into the exact format the real backend export endpoint produces", () => {
      const raw =
        '@article{smith2020,\n\tauthor = "Jane Smith",\n\ttitle = "A Great Paper"\n}';
      const result = injectCitelinesFields(raw, "Low");
      expect(result).toContain("CITELINES_relevance = {Low}");
      expect(result).toContain('author = "Jane Smith"');
      expect(result).toContain('title = "A Great Paper"');

      const reExtracted = extractCitelinesFields(result);
      expect(reExtracted.relevance).toBe("Low");
    });

    test("round-trips: extract then inject reproduces an equivalent relevance value", () => {
      const raw = `@article{smith2020, title = {T}, citelines_relevance = {High}, citelines_position = {1}}`;
      const { strippedBibtex, relevance, preservedFields } =
        extractCitelinesFields(raw);
      const rebuilt = injectCitelinesFields(
        strippedBibtex,
        relevance,
        preservedFields,
      );
      const reExtracted = extractCitelinesFields(rebuilt);
      expect(reExtracted.relevance).toBe("High");
      expect(reExtracted.preservedFields).toEqual({ citelines_position: "1" });
    });
  });
});
