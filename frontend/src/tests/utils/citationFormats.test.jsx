import {
  CITATION_FORMAT_OPTIONS,
  DEFAULT_CITATION_FORMAT,
  LAST_CITATION_FORMAT_STORAGE_KEY,
  getLastCitationFormat,
  setLastCitationFormat,
} from "main/utils/citationFormats";

describe("citationFormats tests", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("DEFAULT_CITATION_FORMAT is ACM and is one of the options", () => {
    expect(DEFAULT_CITATION_FORMAT).toEqual("ACM");
    expect(CITATION_FORMAT_OPTIONS).toContain(DEFAULT_CITATION_FORMAT);
  });

  test("getLastCitationFormat returns the default when nothing is stored", () => {
    expect(getLastCitationFormat()).toEqual(DEFAULT_CITATION_FORMAT);
  });

  test("getLastCitationFormat returns the default when the stored value is not a recognized format", () => {
    window.localStorage.setItem(LAST_CITATION_FORMAT_STORAGE_KEY, "BOGUS");
    expect(getLastCitationFormat()).toEqual(DEFAULT_CITATION_FORMAT);
  });

  test("setLastCitationFormat persists the choice for getLastCitationFormat to read back", () => {
    setLastCitationFormat("IEEE");
    expect(getLastCitationFormat()).toEqual("IEEE");
    expect(
      window.localStorage.getItem(LAST_CITATION_FORMAT_STORAGE_KEY),
    ).toEqual("IEEE");
  });
});
