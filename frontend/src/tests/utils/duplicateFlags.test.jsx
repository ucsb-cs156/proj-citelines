import {
  formatDuplicateReason,
  hasInvalidLinkFlag,
  hasPossibleDuplicateFlag,
} from "main/utils/duplicateFlags";

describe("duplicateFlags tests", () => {
  test("hasPossibleDuplicateFlag is false when neither field is set", () => {
    expect(hasPossibleDuplicateFlag({})).toBe(false);
  });

  test("hasPossibleDuplicateFlag is true when possibleDuplicateIds is set", () => {
    expect(hasPossibleDuplicateFlag({ possibleDuplicateIds: ["id1"] })).toBe(
      true,
    );
  });

  test("hasPossibleDuplicateFlag is true when possibleDuplicateReason is set, even without possibleDuplicateIds", () => {
    expect(
      hasPossibleDuplicateFlag({ possibleDuplicateReason: "SAME_DOI" }),
    ).toBe(true);
  });

  test("hasInvalidLinkFlag is false when neither invalid field is present", () => {
    expect(hasInvalidLinkFlag({ keyValuePairs: {} })).toBe(false);
    expect(hasInvalidLinkFlag({})).toBe(false);
  });

  test("hasInvalidLinkFlag is true when CITELINES_invalid_doi is True", () => {
    expect(
      hasInvalidLinkFlag({
        keyValuePairs: { CITELINES_invalid_doi: "True" },
      }),
    ).toBe(true);
  });

  test("hasInvalidLinkFlag is true when CITELINES_invalid_url is True", () => {
    expect(
      hasInvalidLinkFlag({
        keyValuePairs: { CITELINES_invalid_url: "True" },
      }),
    ).toBe(true);
  });

  test("hasInvalidLinkFlag is false when the invalid fields are present but not True", () => {
    expect(
      hasInvalidLinkFlag({
        keyValuePairs: {
          CITELINES_invalid_doi: "False",
          CITELINES_invalid_url: "False",
        },
      }),
    ).toBe(false);
  });

  test("formatDuplicateReason maps known reasons to human-readable labels", () => {
    expect(formatDuplicateReason("SAME_DOI")).toBe("Same DOI");
    expect(formatDuplicateReason("SIMILAR_TITLE")).toBe("Similar Title");
  });

  test("formatDuplicateReason falls back to the raw value for an unknown reason", () => {
    expect(formatDuplicateReason("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
