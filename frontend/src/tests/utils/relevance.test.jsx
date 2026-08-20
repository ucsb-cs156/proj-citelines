import {
  relevanceClassName,
  relevanceLabel,
  relevanceRank,
} from "main/utils/relevance";

describe("relevance utils", () => {
  test("relevanceRank ranks High highest and Unreviewed lowest", () => {
    expect(relevanceRank("High")).toBeGreaterThan(relevanceRank("Medium"));
    expect(relevanceRank("Medium")).toBeGreaterThan(relevanceRank("Low"));
    expect(relevanceRank("Low")).toBeGreaterThan(relevanceRank("None"));
    expect(relevanceRank("None")).toBeGreaterThan(relevanceRank("Unreviewed"));
  });

  test("relevanceRank falls back to Unreviewed's rank for an unrecognized value", () => {
    expect(relevanceRank("bogus")).toBe(relevanceRank("Unreviewed"));
  });

  test.each([
    ["High", "relevance-high"],
    ["Medium", "relevance-medium"],
    ["Low", "relevance-low"],
    ["None", "relevance-none"],
    ["Unreviewed", "relevance-unreviewed"],
  ])("relevanceClassName(%s) is %s", (relevance, expected) => {
    expect(relevanceClassName(relevance)).toBe(expected);
  });

  test("relevanceClassName falls back to Unreviewed's class for an unrecognized value", () => {
    expect(relevanceClassName("bogus")).toBe(relevanceClassName("Unreviewed"));
  });

  test.each([
    ["High", "High"],
    ["Medium", "Medium"],
    ["Low", "Low"],
    ["None", "None"],
    ["Unreviewed", "(unreviewed)"],
  ])("relevanceLabel(%s) is %s", (relevance, expected) => {
    expect(relevanceLabel(relevance)).toBe(expected);
  });
});
