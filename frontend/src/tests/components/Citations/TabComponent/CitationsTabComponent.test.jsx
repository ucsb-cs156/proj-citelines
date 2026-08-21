import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import CitationsTabComponent from "main/components/Citations/TabComponent/CitationsTabComponent";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";
import { tagsFixtures } from "fixtures/tagsFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTab(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CitationsTabComponent projectId={1} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CitationsTabComponent tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
    axiosMock
      .onGet("/api/bibtexentries/project?projectId=1")
      .reply(200, bibTexEntriesFixtures.threeEntries);
    axiosMock.onGet("/api/tags/project?projectId=1").reply(200, []);
  });

  test("renders the Add Citation via BibTex and Add Citation via DOI buttons, and the citation table", async () => {
    renderTab();

    expect(
      screen.getByTestId("CitationsTabComponent-post-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("CitationsTabComponent-doi-button"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "CitationsTabComponent-CitationTable-cell-row-0-col-citeKey",
        ),
      ).toHaveTextContent("smith202...");
    });
  });

  test("renders a CitationFilter panel above the table, expanded by default", async () => {
    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "CitationsTabComponent-CitationTable-cell-row-0-col-citeKey",
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId("CitationsTabComponent-CitationFilter-header"),
    ).toHaveTextContent("Citation Filters");
  });

  test("typing in the CitationFilter search box narrows what the CitationTable shows", async () => {
    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "CitationsTabComponent-CitationTable-cell-row-2-col-citeKey",
        ),
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByTestId("CitationsTabComponent-CitationFilter-search"),
      { target: { value: "jones" } },
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(
          "CitationsTabComponent-CitationTable-cell-row-1-col-citeKey",
        ),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByTestId(
        "CitationsTabComponent-CitationTable-cell-row-0-col-citeKey",
      ),
    ).toHaveTextContent("jones201...");
  });

  test("deselecting Unreviewed relevance hides every fixture entry (none have a relevance set)", async () => {
    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "CitationsTabComponent-CitationTable-cell-row-0-col-citeKey",
        ),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId(
        "CitationsTabComponent-CitationFilter-relevance-Unreviewed",
      ),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(
          "CitationsTabComponent-CitationTable-cell-row-0-col-citeKey",
        ),
      ).not.toBeInTheDocument();
    });
  });

  test("fetches the project's tags and shows them as pill badges in the CitationTable", async () => {
    axiosMock.onGet("/api/bibtexentries/project?projectId=1").reply(200, [
      {
        ...bibTexEntriesFixtures.threeEntries[0],
        tagIds: [tagsFixtures.threeTags[0].id],
      },
    ]);
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          `CitationsTabComponent-CitationTable-cell-row-0-col-tags-${tagsFixtures.threeTags[0].id}-badge`,
        ),
      ).toHaveTextContent(tagsFixtures.threeTags[0].tag);
    });
  });

  test("clicking Add Citation via BibTex opens a create modal and posting adds a citation", async () => {
    axiosMock
      .onPost("/api/bibtexentries/post")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderTab();

    fireEvent.click(screen.getByTestId("CitationsTabComponent-post-button"));

    await screen.findByTestId("BibTexEntryModal-bibtex");
    expect(screen.getByTestId("BibTexEntryModal-base")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "@article{smith2020, title = {A Title}}" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({ projectId: 1 });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation added successfully"),
    );
  });

  test("clicking Add Citation via DOI opens a create modal and posting adds a citation", async () => {
    axiosMock
      .onPost("/api/bibtexentries/postByDoi")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderTab();

    fireEvent.click(screen.getByTestId("CitationsTabComponent-doi-button"));

    await screen.findByTestId("DoiEntryModal-doi");
    expect(screen.getByTestId("DoiEntryModal-base")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("DoiEntryModal-doi"), {
      target: { value: "10.1038/s41586-020-2649-2" },
    });
    fireEvent.click(screen.getByTestId("DoiEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      relevance: "Unreviewed",
    });
    expect(axiosMock.history.post[0].data).toBe("10.1038/s41586-020-2649-2");
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation added successfully"),
    );
  });
});
