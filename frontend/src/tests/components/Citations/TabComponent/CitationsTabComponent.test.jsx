import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import CitationsTabComponent from "main/components/Citations/TabComponent/CitationsTabComponent";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";

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
  });

  test("renders the Add Citation button and the citation table", async () => {
    renderTab();

    expect(
      screen.getByTestId("CitationsTabComponent-post-button"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "CitationsTabComponent-CitationTable-cell-row-0-col-citeKey",
        ),
      ).toHaveTextContent("smith202...");
    });
  });

  test("clicking Add Citation opens a create modal and posting adds a citation", async () => {
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
});
