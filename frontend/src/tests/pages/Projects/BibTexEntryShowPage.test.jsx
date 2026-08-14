import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BibTexEntryShowPage from "main/pages/Projects/BibTexEntryShowPage";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

const ENTRY_ID = "64f1b2c3d4e5f6a7b8c9d0e1";

function renderAtSmith2020(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/project/1/bibtex/${ENTRY_ID}`]}>
        <Routes>
          <Route
            path="/project/:id/bibtex/:entryId"
            element={<BibTexEntryShowPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BibTexEntryShowPage tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, bibTexEntriesFixtures.oneEntry);
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
  });

  test("shows loading, then the entry's citekey, raw bibtex, and both buttons", async () => {
    renderAtSmith2020();

    expect(
      screen.getByTestId("BibTexEntryShowPage-loading"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryShowPage-title")).toHaveTextContent(
        "smith2020",
      );
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-bibtex"),
      ).toHaveTextContent("@article{smith2020,");
    });

    expect(
      screen.getByTestId("BibTexEntryShowPage-get-references-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryShowPage-get-citations-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryShowPage-references-heading"),
    ).toHaveTextContent("References (0)");
    expect(
      screen.getByTestId("BibTexEntryShowPage-citations-heading"),
    ).toHaveTextContent("Citations (0)");

    expect(
      axiosMock.history.get.find((r) => r.url === "/api/bibtexentries/entry")
        .params,
    ).toEqual({ projectId: "1", id: ENTRY_ID });
  });

  test("shows a Go to Project button linking back to the project page", async () => {
    renderAtSmith2020();

    const goToProjectButton = await screen.findByTestId(
      "BibTexEntryShowPage-go-to-project-button",
    );
    expect(goToProjectButton).toHaveAttribute("href", "/project/1");
  });

  test("strips CITELINES_ fields out of the displayed bibtex text", async () => {
    axiosMock.reset();
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, bibTexEntriesFixtures.oneEntry);
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(
        200,
        '@article{smith2020,\n\ttitle = "A Very Long Title",\n\tcitelines_relevance = "High"\n}',
      );
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);

    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-bibtex"),
      ).toHaveTextContent('title = "A Very Long Title"');
    });
    expect(
      screen.getByTestId("BibTexEntryShowPage-bibtex"),
    ).not.toHaveTextContent("citelines");
  });

  test("hovering Get References shows its tooltip text", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-get-references-button");

    fireEvent.mouseOver(
      screen.getByTestId("BibTexEntryShowPage-get-references-button"),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Get all papers that this paper cites"),
      ).toBeInTheDocument();
    });
  });

  test("hovering Get Citations shows its tooltip text", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-get-citations-button");

    fireEvent.mouseOver(
      screen.getByTestId("BibTexEntryShowPage-get-citations-button"),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Get all papers that cite this paper"),
      ).toBeInTheDocument();
    });
  });

  test("clicking Get References launches the job and shows a toast", async () => {
    axiosMock
      .onPost("/api/jobs/launch/getReferences")
      .reply(200, { id: 1, jobName: "GetReferencesJob" });

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-get-references-button");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-get-references-button"),
    );

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: "1",
      citeKey: "smith2020",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Get References job launched — check the Jobs tab for progress.",
      ),
    );
  });

  test("clicking Get Citations launches the job and shows a toast", async () => {
    axiosMock
      .onPost("/api/jobs/launch/getCitations")
      .reply(200, { id: 2, jobName: "GetCitationsJob" });

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-get-citations-button");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-get-citations-button"),
    );

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: "1",
      citeKey: "smith2020",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Get Citations job launched — check the Jobs tab for progress.",
      ),
    );
  });

  test("renders fetched references and citations in read-only tables", async () => {
    axiosMock.reset();
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, bibTexEntriesFixtures.oneEntry);
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock
      .onGet("/api/citationedges/references")
      .reply(200, [bibTexEntriesFixtures.threeEntries[1]]);
    axiosMock
      .onGet("/api/citationedges/citations")
      .reply(200, [bibTexEntriesFixtures.threeEntries[2]]);

    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "BibTexEntryShowPage-ReferencesTable-cell-row-0-col-citeKey-link",
        ),
      ).toHaveTextContent("jones201...");
    });
    expect(
      screen.getByTestId(
        "BibTexEntryShowPage-CitationsTable-cell-row-0-col-citeKey-link",
      ),
    ).toHaveTextContent("lee2021");
    expect(
      screen.getByTestId("BibTexEntryShowPage-references-heading"),
    ).toHaveTextContent("References (1)");
    expect(
      screen.getByTestId("BibTexEntryShowPage-citations-heading"),
    ).toHaveTextContent("Citations (1)");

    expect(
      screen.queryByTestId(
        "BibTexEntryShowPage-ReferencesTable-cell-row-0-col-edit-button",
      ),
    ).not.toBeInTheDocument();
  });

  test("shows an error modal and returns to the project page when the entry cannot be fetched", async () => {
    axiosMock.onGet("/api/bibtexentries/entry").reply(404, {});

    renderAtSmith2020();

    await waitFor(() => {
      expect(screen.getByText("Citation Not Found")).toBeInTheDocument();
    });
  });

  test("clicking Add Reference opens the modal, and submitting posts with relationship=reference", async () => {
    axiosMock
      .onPost("/api/bibtexentries/post")
      .reply(200, [bibTexEntriesFixtures.threeEntries[1]]);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-add-reference-button");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-add-reference-button"),
    );

    expect(screen.getByTestId("BibTexEntryModal-base")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "@article{jones2021, title = {A Title}}" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: "1",
      relatedCiteKey: "smith2020",
      relationship: "reference",
    });
  });

  test("clicking Add Citation opens the modal, and submitting posts with relationship=citation", async () => {
    axiosMock
      .onPost("/api/bibtexentries/post")
      .reply(200, [bibTexEntriesFixtures.threeEntries[2]]);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-add-citation-button");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-add-citation-button"),
    );

    expect(screen.getByTestId("BibTexEntryModal-base")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "@article{lee2021, title = {A Title}}" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: "1",
      relatedCiteKey: "smith2020",
      relationship: "citation",
    });
  });
});
