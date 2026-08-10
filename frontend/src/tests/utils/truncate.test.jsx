import { truncate } from "main/utils/truncate";

describe("truncate tests", () => {
  test("returns the original text unchanged when it fits within maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("returns the original text unchanged when it is exactly maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  test("shortens text longer than maxLength and appends ...", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  test("returns an empty string for null", () => {
    expect(truncate(null, 5)).toBe("");
  });

  test("returns an empty string for undefined", () => {
    expect(truncate(undefined, 5)).toBe("");
  });

  test("returns an empty string unchanged when maxLength is 0 or more", () => {
    expect(truncate("", 5)).toBe("");
  });

  test("matches the issue's author example: 15 chars, then ...", () => {
    const author = "Jane Q. Smith and John Doe";
    expect(truncate(author, 15)).toBe("Jane Q. Smith a...");
  });

  test("matches the issue's title example: 20 chars, then ...", () => {
    const title = "A Very Long Title That Goes On and On";
    expect(truncate(title, 20)).toBe("A Very Long Title Th...");
  });
});
