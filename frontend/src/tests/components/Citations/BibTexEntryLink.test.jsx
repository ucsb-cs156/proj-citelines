import { render, screen } from "@testing-library/react";

import BibTexEntryLink from "main/components/Citations/BibTexEntryLink";

describe("BibTexEntryLink tests", () => {
  test("renders the full DOI as a hyperlink when the entry has a DOI", () => {
    render(
      <BibTexEntryLink keyValuePairs={{ doi: "10.1038/s41586-020-2649-2" }} />,
    );

    const doiLink = screen.getByTestId("BibTexEntryLink-doi-link");
    expect(doiLink).toHaveAttribute(
      "href",
      "https://doi.org/10.1038/s41586-020-2649-2",
    );
    expect(doiLink).toHaveTextContent(
      "https://doi.org/10.1038/s41586-020-2649-2",
    );
    expect(doiLink).toHaveAttribute("target", "_blank");
    expect(doiLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.queryByTestId("BibTexEntryLink-url-link"),
    ).not.toBeInTheDocument();
  });

  test("renders the full URL as a hyperlink when the entry has no DOI but has a URL", () => {
    render(
      <BibTexEntryLink
        keyValuePairs={{ url: "https://example.org/jones2019" }}
      />,
    );

    const urlLink = screen.getByTestId("BibTexEntryLink-url-link");
    expect(urlLink).toHaveAttribute("href", "https://example.org/jones2019");
    expect(urlLink).toHaveTextContent("https://example.org/jones2019");
    expect(urlLink).toHaveAttribute("target", "_blank");
    expect(urlLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.queryByTestId("BibTexEntryLink-doi-link"),
    ).not.toBeInTheDocument();
  });

  test("prefers the DOI over the URL when the entry has both", () => {
    render(
      <BibTexEntryLink
        keyValuePairs={{
          doi: "10.1038/s41586-020-2649-2",
          url: "https://example.org/jones2019",
        }}
      />,
    );

    expect(screen.getByTestId("BibTexEntryLink-doi-link")).toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryLink-url-link"),
    ).not.toBeInTheDocument();
  });

  test("renders nothing when the entry has neither a DOI nor a URL", () => {
    const { container } = render(
      <BibTexEntryLink keyValuePairs={{ author: "Jane Q. Smith" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when keyValuePairs is undefined", () => {
    const { container } = render(<BibTexEntryLink />);

    expect(container).toBeEmptyDOMElement();
  });

  test("uses a custom testId prefix when provided", () => {
    render(
      <BibTexEntryLink
        keyValuePairs={{ doi: "10.1038/s41586-020-2649-2" }}
        testId="CustomLink"
      />,
    );

    expect(screen.getByTestId("CustomLink-doi-link")).toBeInTheDocument();
  });
});
