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

    ["citeKey", "doi", "year", "author", "title", "edit", "delete"].forEach(
      (colId) =>
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
    expect(citeKeyLink).toHaveAttribute("href", "/project/1/bibtex/smith2020");
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

  test("a short citekey is not truncated or given an ellipsis", () => {
    renderTable({ citations: [bibTexEntriesFixtures.threeEntries[2]] });

    expect(
      screen.getByTestId("CitationTable-cell-row-0-col-citeKey-link"),
    ).toHaveTextContent("lee2021");
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

  test("renders no doi link when the entry has no doi field", () => {
    renderTable({ citations: [bibTexEntriesFixtures.threeEntries[1]] });

    expect(
      screen.queryByTestId("CitationTable-cell-row-0-col-doi-link"),
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
