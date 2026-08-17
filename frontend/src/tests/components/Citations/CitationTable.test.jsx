import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import CitationTable from "main/components/Citations/CitationTable";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTable(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CitationTable projectId={1} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CitationTable tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders without crashing for empty table", () => {
    renderTable({ citations: [] });
  });

  test("renders expected columns, truncated citekey/author/title, year, and a doi link", () => {
    renderTable({ citations: bibTexEntriesFixtures.threeEntries });

    [
      "citeKey",
      "flags",
      "link",
      "year",
      "author",
      "title",
      "edit",
      "delete",
    ].forEach((colId) =>
      expect(
        screen.getByTestId(`CitationTable-header-${colId}`),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("CitationTable-header-entryType"),
    ).not.toBeInTheDocument();

    const citeKeyLink = screen.getByTestId(
      "CitationTable-cell-row-0-col-citeKey-link",
    );
    expect(citeKeyLink).toHaveTextContent("smith202...");
    expect(citeKeyLink).toHaveAttribute(
      "href",
      "/project/1/bibtex/64f1b2c3d4e5f6a7b8c9d0e1",
    );
    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-year"),
    ).toHaveTextContent("2020");
    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-author"),
    ).toHaveTextContent("Jane Q. Smith a...");
    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-title"),
    ).toHaveTextContent("A Very Long Title Th...");

    const doiLink = screen.getByTestId("CitationTable-cell-row-0-col-doi-link");
    expect(doiLink).toHaveTextContent("doi");
    expect(doiLink).toHaveAttribute(
      "href",
      "https://doi.org/10.1038/s41586-020-2649-2",
    );
    expect(doiLink).toHaveAttribute("target", "_blank");
  });

  test("the Flags column is empty for an entry with no flagged fields set", () => {
    renderTable({ citations: [bibTexEntriesFixtures.threeEntries[0]] });

    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-flags"),
    ).toHaveTextContent("");
    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-flags-dup-badge"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-flags-link-badge"),
    ).not.toBeInTheDocument();
  });

  test("the Flags column shows a red dup? pill badge when possibleDuplicateIds is set", () => {
    const flaggedEntry = {
      ...bibTexEntriesFixtures.threeEntries[0],
      possibleDuplicateIds: ["64f1b2c3d4e5f6a7b8c9d0e2"],
    };
    renderTable({ citations: [flaggedEntry] });

    const badge = screen.getByTestId(
      "CitationTable-cell-row-0-col-flags-dup-badge",
    );
    expect(badge).toHaveTextContent("dup?");
    expect(badge).toHaveStyle("background-color: #dc3545");
  });

  test("the Flags column shows a dup? badge when possibleDuplicateReason is set, even without possibleDuplicateIds", () => {
    const flaggedEntry = {
      ...bibTexEntriesFixtures.threeEntries[0],
      possibleDuplicateReason: "SAME_DOI",
    };
    renderTable({ citations: [flaggedEntry] });

    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-flags-dup-badge"),
    ).toHaveTextContent("dup?");
  });

  test("the Flags column shows a bright yellow link? pill badge when CITELINES_invalid_doi is True", () => {
    const invalidDoiEntry = {
      ...bibTexEntriesFixtures.threeEntries[0],
      keyValuePairs: {
        ...bibTexEntriesFixtures.threeEntries[0].keyValuePairs,
        CITELINES_invalid_doi: "True",
      },
    };
    renderTable({ citations: [invalidDoiEntry] });

    const badge = screen.getByTestId(
      "CitationTable-cell-row-0-col-flags-link-badge",
    );
    expect(badge).toHaveTextContent("link?");
    expect(badge).toHaveStyle("background-color: #ffff00");
  });

  test("the Flags column shows a link? badge when CITELINES_invalid_url is True", () => {
    const invalidUrlEntry = {
      ...bibTexEntriesFixtures.threeEntries[1],
      keyValuePairs: {
        ...bibTexEntriesFixtures.threeEntries[1].keyValuePairs,
        CITELINES_invalid_url: "True",
      },
    };
    renderTable({ citations: [invalidUrlEntry] });

    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-flags-link-badge"),
    ).toHaveTextContent("link?");
  });

  test("the Flags column shows both badges together when an entry has both flags", () => {
    const bothFlagsEntry = {
      ...bibTexEntriesFixtures.threeEntries[0],
      possibleDuplicateReason: "SAME_DOI",
      keyValuePairs: {
        ...bibTexEntriesFixtures.threeEntries[0].keyValuePairs,
        CITELINES_invalid_doi: "True",
      },
    };
    renderTable({ citations: [bothFlagsEntry] });

    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-flags-dup-badge"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-flags-link-badge"),
    ).toBeInTheDocument();
  });

  test("the Link column no longer shows a warning emoji for an invalid doi", () => {
    const invalidDoiEntry = {
      ...bibTexEntriesFixtures.threeEntries[0],
      keyValuePairs: {
        ...bibTexEntriesFixtures.threeEntries[0].keyValuePairs,
        CITELINES_invalid_doi: "True",
      },
    };
    renderTable({ citations: [invalidDoiEntry] });

    const doiLink = screen.getByTestId("CitationTable-cell-row-0-col-doi-link");
    expect(doiLink).toHaveTextContent("doi");
    expect(doiLink).not.toHaveTextContent("⚠️");
  });

  // TanStack Table's Row#index reflects each row's position in the *original* (unsorted) data,
  // not its current display position, so a "-cell-row-N-col-X" testid always identifies the same
  // underlying row regardless of sort order. To observe actual sort order, query all cells for a
  // column by a regex (matching every row's testid) — getAllByTestId returns matches in DOM order,
  // which does reflect the current sort.
  function citeKeyLinksInDomOrder() {
    return screen
      .getAllByTestId(/^CitationTable-cell-row-\d+-col-citeKey-link$/)
      .map((el) => el.textContent);
  }

  test("clicking the Flags column header sorts unflagged and flagged rows into distinct groups", () => {
    const flaggedEntry = {
      ...bibTexEntriesFixtures.threeEntries[1],
      possibleDuplicateReason: "SAME_DOI",
    };
    renderTable({
      citations: [flaggedEntry, bibTexEntriesFixtures.threeEntries[0]],
    });
    expect(citeKeyLinksInDomOrder()).toEqual(["jones201...", "smith202..."]);

    fireEvent.click(
      screen.getByTestId("CitationTable-header-flags-sort-header"),
    );

    expect(citeKeyLinksInDomOrder()).toEqual(["smith202...", "jones201..."]);
  });

  test("clicking the Cite Key column header sorts rows lexicographically by the full citeKey", () => {
    renderTable({ citations: bibTexEntriesFixtures.threeEntries });
    expect(citeKeyLinksInDomOrder()).toEqual([
      "smith202...",
      "jones201...",
      "lee2021",
    ]);

    fireEvent.click(
      screen.getByTestId("CitationTable-header-citeKey-sort-header"),
    );

    expect(citeKeyLinksInDomOrder()).toEqual([
      "jones201...",
      "lee2021",
      "smith202...",
    ]);
  });

  test("clicking the Link column header sorts rows by doi/url/blank", () => {
    renderTable({ citations: bibTexEntriesFixtures.threeEntries });

    fireEvent.click(
      screen.getByTestId("CitationTable-header-link-sort-header"),
    );

    // Ascending: "doi" sorts before "url" — smith2020 and lee2021 (both doi) stay ahead of
    // jones2019 (url), in their original relative order (stable sort).
    expect(citeKeyLinksInDomOrder()).toEqual([
      "smith202...",
      "lee2021",
      "jones201...",
    ]);
  });

  test("clicking the Link column header sorts a blank link ahead of both doi and url", () => {
    const noLinkEntry = {
      ...bibTexEntriesFixtures.threeEntries[0],
      id: "64f1b2c3d4e5f6a7b8c9d0e5",
      citeKey: "noLink2022",
      keyValuePairs: { author: "No Link", title: "No Link Paper" },
    };
    renderTable({
      citations: [...bibTexEntriesFixtures.threeEntries, noLinkEntry],
    });

    fireEvent.click(
      screen.getByTestId("CitationTable-header-link-sort-header"),
    );

    // Ascending: "" (blank) sorts before "doi", which sorts before "url".
    expect(citeKeyLinksInDomOrder()).toEqual([
      "noLink20...",
      "smith202...",
      "lee2021",
      "jones201...",
    ]);
  });

  test("a short citekey is not truncated or given an ellipsis", () => {
    renderTable({ citations: [bibTexEntriesFixtures.threeEntries[2]] });

    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-citeKey-link"),
    ).toHaveTextContent("lee2021");
  });

  test("the citekey link targets the entry's id even when the citekey itself contains a slash", () => {
    renderTable({
      citations: [bibTexEntriesFixtures.entryWithSlashInCiteKey],
    });

    const citeKeyLink = screen.getByTestId(
      "CitationTable-cell-row-0-col-citeKey-link",
    );
    expect(citeKeyLink).toHaveAttribute(
      "href",
      "/project/1/bibtex/64f1b2c3d4e5f6a7b8c9d0e4",
    );
  });

  test("readOnly mode hides the Edit/Delete columns and buttons", () => {
    renderTable({
      citations: bibTexEntriesFixtures.threeEntries,
      readOnly: true,
    });

    expect(
      screen.queryByTestId("CitationTable-header-edit"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationTable-header-delete"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-edit-button"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-delete-button"),
    ).not.toBeInTheDocument();
  });

  test("renders no doi link when the entry has no doi field but shows a url link when url is present", () => {
    renderTable({ citations: [bibTexEntriesFixtures.threeEntries[1]] });

    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-doi-link"),
    ).not.toBeInTheDocument();

    const urlLink = screen.getByTestId("CitationTable-cell-row-0-col-url-link");
    expect(urlLink).toHaveTextContent("url");
    expect(urlLink).toHaveAttribute("href", "https://example.org/jones2019");
    expect(urlLink).toHaveAttribute("target", "_blank");
  });

  test("renders no doi or url link when neither field is present", () => {
    const entryWithoutDoiOrUrl = {
      ...bibTexEntriesFixtures.threeEntries[1],
      keyValuePairs: {
        ...bibTexEntriesFixtures.threeEntries[1].keyValuePairs,
        url: undefined,
      },
    };
    renderTable({ citations: [entryWithoutDoiOrUrl] });

    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-doi-link"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-url-link"),
    ).not.toBeInTheDocument();
  });

  test("clicking Edit opens the modal pre-filled from the export endpoint", async () => {
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Title}\n}\n");

    renderTable({ citations: bibTexEntriesFixtures.threeEntries });

    fireEvent.click(
      screen.getByTestId("CitationTable-cell-row-0-col-edit-button"),
    );

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-bibtex")).toHaveValue(
        "@article{smith2020,\n  title = {A Title}\n}\n",
      );
    });
    expect(screen.getByText("Edit Citation")).toBeInTheDocument();
  });

  test("owner can delete a citation after confirming", async () => {
    axiosMock.onDelete("/api/bibtexentries/delete").reply(200, {});

    renderTable({ citations: bibTexEntriesFixtures.threeEntries });

    fireEvent.click(
      screen.getByTestId("CitationTable-cell-row-0-col-delete-button"),
    );

    await screen.findByText(/Please confirm/);
    fireEvent.click(
      screen.getByTestId("CitationTable-delete-modal-confirm-button"),
    );

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].params).toEqual({
      id: "64f1b2c3d4e5f6a7b8c9d0e1",
      projectId: 1,
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation deleted successfully"),
    );
  });

  test("Do not delete button hides the modal without deleting", async () => {
    renderTable({ citations: bibTexEntriesFixtures.threeEntries });

    fireEvent.click(
      screen.getByTestId("CitationTable-cell-row-0-col-delete-button"),
    );
    await screen.findByText(/Please confirm/);
    fireEvent.click(screen.getByText("Do not delete"));

    await waitFor(() => {
      expect(screen.queryByText(/Please confirm/)).not.toBeInTheDocument();
    });
    expect(axiosMock.history.delete.length).toBe(0);
  });

  test("shows a toast with the backend message when delete fails", async () => {
    axiosMock
      .onDelete("/api/bibtexentries/delete")
      .reply(500, { message: "boom" });

    renderTable({ citations: bibTexEntriesFixtures.threeEntries });

    fireEvent.click(
      screen.getByTestId("CitationTable-cell-row-0-col-delete-button"),
    );
    await screen.findByText(/Please confirm/);
    fireEvent.click(
      screen.getByTestId("CitationTable-delete-modal-confirm-button"),
    );

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Could not delete citation:\nboom",
      ),
    );
  });
});
