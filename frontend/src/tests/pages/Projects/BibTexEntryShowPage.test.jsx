import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BibTexEntryShowPage from "main/pages/Projects/BibTexEntryShowPage";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";

// CodeMirror (used internally by BibTexEntryComments' Markdown editor) needs a working
// Document.createRange, which jsdom does not provide — same polyfill react-simplemde-editor's
// own test suite uses.
Document.prototype.createRange = function () {
  return {
    setEnd: function () {},
    setStart: function () {},
    getBoundingClientRect: function () {
      return { right: 0 };
    },
    getClientRects: function () {
      return { length: 0, left: 0, right: 0 };
    },
  };
};

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
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);
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

  test("shows a BibTexEntryLink with the entry's keyValuePairs right below the header", async () => {
    renderAtSmith2020();

    const doiLink = await screen.findByTestId("BibTexEntryShowPage-doi-link");
    expect(doiLink).toHaveAttribute(
      "href",
      "https://doi.org/10.1038/s41586-020-2649-2",
    );
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
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

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
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

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

  test("shows no unresolved badge when there are no unresolved citations", async () => {
    renderAtSmith2020();

    await screen.findByTestId("BibTexEntryShowPage-references-heading");
    expect(
      screen.queryByTestId("BibTexEntryShowPage-references-unresolved-badge"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryShowPage-citations-unresolved-badge"),
    ).not.toBeInTheDocument();
  });

  test("shows an unresolved badge with the count for each direction", async () => {
    axiosMock.reset();
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, bibTexEntriesFixtures.oneEntry);
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, [
      { id: "u1", direction: "reference", reason: "missing_title" },
      { id: "u2", direction: "reference", reason: "missing_doi" },
      { id: "u3", direction: "citation", reason: "not_found_by_any_resolver" },
    ]);

    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-references-unresolved-badge"),
      ).toHaveTextContent("2 unresolved");
    });
    expect(
      screen.getByTestId("BibTexEntryShowPage-citations-unresolved-badge"),
    ).toHaveTextContent("1 unresolved");

    expect(
      axiosMock.history.get.find(
        (r) => r.url === "/api/citationedges/unresolved",
      ).params,
    ).toEqual({ projectId: "1", sourceCiteKey: "smith2020" });
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

  test("shows a Relevance dropdown defaulting to Unreviewed when no relevance field is present", async () => {
    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-relevance-select"),
      ).toHaveValue("Unreviewed");
    });
  });

  test("shows the entry's current relevance in the dropdown, and updating it PUTs the new value", async () => {
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
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);
    axiosMock
      .onPut("/api/bibtexentries")
      .reply(200, bibTexEntriesFixtures.oneEntry);

    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-relevance-select"),
      ).toHaveValue("High");
    });

    fireEvent.change(
      screen.getByTestId("BibTexEntryShowPage-relevance-select"),
      {
        target: { value: "Low" },
      },
    );

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    expect(axiosMock.history.put[0].params).toEqual({
      id: "64f1b2c3d4e5f6a7b8c9d0e1",
      projectId: "1",
    });
    expect(axiosMock.history.put[0].data).toContain(
      "CITELINES_relevance = {Low}",
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Relevance updated successfully"),
    );
  });

  test("shows a Delete button flush right at the top that opens a confirmation modal", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-delete-button");

    const deleteButton = screen.getByTestId(
      "BibTexEntryShowPage-delete-button",
    );
    expect(deleteButton).toHaveTextContent("Delete");
    expect(deleteButton).toHaveClass("btn-danger");
    expect(deleteButton).toHaveClass("btn-sm");

    fireEvent.click(deleteButton);

    expect(
      screen.getByText("Permanently delete this entry?"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryShowPage-delete-modal-confirm-button"),
    ).toHaveTextContent("Yes, Delete");
    expect(
      screen.getByTestId("BibTexEntryShowPage-delete-modal-cancel-button"),
    ).toHaveTextContent("No, Retain");
  });

  test("clicking No, Retain closes the confirmation modal without deleting", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-delete-button");

    fireEvent.click(screen.getByTestId("BibTexEntryShowPage-delete-button"));
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-delete-modal-cancel-button"),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Permanently delete this entry?"),
      ).not.toBeInTheDocument();
    });
    expect(axiosMock.history.delete.length).toBe(0);
  });

  test("clicking Yes, Delete deletes the entry and shows a toast", async () => {
    axiosMock
      .onDelete("/api/bibtexentries/delete")
      .reply(200, { message: "BibTexEntry with id 1 deleted" });

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-delete-button");

    fireEvent.click(screen.getByTestId("BibTexEntryShowPage-delete-button"));
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-delete-modal-confirm-button"),
    );

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].params).toEqual({
      id: "64f1b2c3d4e5f6a7b8c9d0e1",
      projectId: "1",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Entry deleted successfully"),
    );
  });

  test("shows an Edit button in the BibTex Entry card header formatted like the CitationTable's Edit button", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    const editButton = screen.getByTestId("BibTexEntryShowPage-edit-button");
    expect(editButton).toHaveTextContent("Edit");
    expect(editButton).toHaveClass("btn-outline-primary");
    expect(editButton).toHaveClass("btn-sm");
    expect(
      screen.getByTestId("BibTexEntryShowPage-BibtexCard-header"),
    ).toContainElement(editButton);
  });

  test("clicking the Edit button opens the edit modal, and submitting PUTs the updated bibtex", async () => {
    axiosMock
      .onPut("/api/bibtexentries")
      .reply(200, bibTexEntriesFixtures.oneEntry);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-edit-button");

    fireEvent.click(screen.getByTestId("BibTexEntryShowPage-edit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-base")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-bibtex").value).toContain(
        "A Very Long Title",
      );
    });

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "@article{smith2020, title = {Updated Title}}" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    expect(axiosMock.history.put[0].params).toEqual({
      id: "64f1b2c3d4e5f6a7b8c9d0e1",
      projectId: "1",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation updated successfully"),
    );
  });

  test("clicking the Edit button in the card header does not toggle the card open/closed", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-edit-button");

    expect(
      screen.getByTestId("BibTexEntryShowPage-BibtexCard-header"),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByTestId("BibTexEntryShowPage-edit-button"));

    expect(
      screen.getByTestId("BibTexEntryShowPage-BibtexCard-header"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("the BibTex Entry card is open by default, and the other three cards are closed by default", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-BibtexCard-header"),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByTestId("BibTexEntryShowPage-ReferencesCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByTestId("BibTexEntryShowPage-CitationsCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("each card can be opened/closed independently of the others, and PUTs the new state", async () => {
    axiosMock
      .onPut("/api/bibtexentries")
      .reply(200, bibTexEntriesFixtures.oneEntry);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");
    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-bibtex"),
      ).toHaveTextContent("@article{smith2020,");
    });

    // Closing the BibTex card...
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-BibtexCard-header"),
    );
    // ...doesn't affect the (still closed) Comments card...
    expect(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    ).toHaveAttribute("aria-expanded", "false");

    // ...and opening the Comments card doesn't reopen (or otherwise affect) the BibTex card.
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    );
    expect(
      screen.getByTestId("BibTexEntryShowPage-BibtexCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    ).toHaveAttribute("aria-expanded", "true");

    await waitFor(() => expect(axiosMock.history.put.length).toBe(2));
    expect(axiosMock.history.put[0].data).toContain(
      "CITELINES_card_bibtex = {Closed}",
    );
    expect(axiosMock.history.put[1].data).toContain(
      "CITELINES_card_comments = {Open}",
    );
  });

  test("wires up a working BibtexEntryComments instance inside the Comments card", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-BibTexEntryComments-base"),
    ).toBeInTheDocument();
  });
});
