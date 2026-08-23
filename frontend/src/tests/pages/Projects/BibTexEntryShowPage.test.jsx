import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BibTexEntryShowPage from "main/pages/Projects/BibTexEntryShowPage";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";
import { tagsFixtures } from "fixtures/tagsFixtures";

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
    axiosMock
      .onGet("/api/bibtexentries/formatted")
      .reply(200, "Smith, J. A Very Long Title.");
    axiosMock
      .onGet("/api/projects/1")
      .reply(200, { id: 1, citationFormat: "ACM" });
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);
    axiosMock.onGet("/api/tags/project?projectId=1").reply(200, []);
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

  test("shows a Formatted Reference card with the project's citation format and the formatted citation", async () => {
    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-FormattedReferenceCard"),
      ).toHaveTextContent("Formatted Reference");
    });
    expect(
      screen.getByTestId("BibTexEntryShowPage-formatted-citation-label"),
    ).toHaveTextContent("Formatted Citation (ACM)");
    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-formatted-citation"),
      ).toHaveTextContent("Smith, J. A Very Long Title.");
    });

    expect(
      axiosMock.history.get.find(
        (r) => r.url === "/api/bibtexentries/formatted",
      ).params,
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
    await screen.findByTestId("BibTexEntryShowPage-title");

    // References/Citations cards are closed (and lazily unmounted) by default.
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-ReferencesCard-header"),
    );
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-CitationsCard-header"),
    );

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
      axiosMock.history.get.find(
        (r) => r.url === "/api/citationedges/references",
      ).params,
    ).toEqual({ projectId: "1", id: ENTRY_ID });
    expect(
      axiosMock.history.get.find(
        (r) => r.url === "/api/citationedges/citations",
      ).params,
    ).toEqual({ projectId: "1", id: ENTRY_ID });

    expect(
      screen.queryByTestId(
        "BibTexEntryShowPage-ReferencesTable-cell-row-0-col-edit-button",
      ),
    ).not.toBeInTheDocument();
  });

  test("shows tags as pill badges in the References and Citations read-only tables", async () => {
    axiosMock.reset();
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, bibTexEntriesFixtures.oneEntry);
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock.onGet("/api/citationedges/references").reply(200, [
      {
        ...bibTexEntriesFixtures.threeEntries[1],
        tagIds: [tagsFixtures.threeTags[0].id],
      },
    ]);
    axiosMock.onGet("/api/citationedges/citations").reply(200, [
      {
        ...bibTexEntriesFixtures.threeEntries[2],
        tagIds: [tagsFixtures.threeTags[1].id],
      },
    ]);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    // References/Citations cards are closed (and lazily unmounted) by default.
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-ReferencesCard-header"),
    );
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-CitationsCard-header"),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(
          `BibTexEntryShowPage-ReferencesTable-cell-row-0-col-tags-${tagsFixtures.threeTags[0].id}-badge`,
        ),
      ).toHaveTextContent(tagsFixtures.threeTags[0].tag);
    });
    expect(
      screen.getByTestId(
        `BibTexEntryShowPage-CitationsTable-cell-row-0-col-tags-${tagsFixtures.threeTags[1].id}-badge`,
      ),
    ).toHaveTextContent(tagsFixtures.threeTags[1].tag);
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
    ).toEqual({
      projectId: "1",
      sourceEntryId: ENTRY_ID,
    });
  });

  test("hovering an unresolved badge shows a tooltip explaining what it means", async () => {
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
      { id: "u3", direction: "citation", reason: "not_found_by_any_resolver" },
    ]);

    renderAtSmith2020();

    await screen.findByTestId(
      "BibTexEntryShowPage-references-unresolved-badge",
    );

    fireEvent.mouseOver(
      screen.getByTestId("BibTexEntryShowPage-references-unresolved-badge"),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/but can't fully identify it/),
      ).toBeInTheDocument();
    });

    fireEvent.mouseOver(
      screen.getByTestId("BibTexEntryShowPage-citations-unresolved-badge"),
    );
    await waitFor(() => {
      expect(
        screen.getAllByText(/but can't fully identify it/).length,
      ).toBeGreaterThan(0);
    });
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
      relatedEntryId: ENTRY_ID,
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
      relatedEntryId: ENTRY_ID,
      relationship: "citation",
    });
  });

  test("clicking Bulk Citations from ACM DL View All opens the modal, and submitting launches the job with the current entry's citeKey", async () => {
    axiosMock
      .onPost("/api/jobs/launch/bulkCitationUploadFromAcmDlViewAll")
      .reply(200, { id: 99 });

    renderAtSmith2020();
    await screen.findByTestId(
      "BibTexEntryShowPage-bulk-citation-upload-button",
    );

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-bulk-citation-upload-button"),
    );

    expect(
      screen.getByTestId("BulkCitationUploadModal-base"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("BulkCitationUploadModal-rawText"), {
      target: {
        value:
          "Reimer Y et al. A Paper.\nhttps://doi.org/10.1145/3770762.3772609",
      },
    });
    fireEvent.click(screen.getByTestId("BulkCitationUploadModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe(
      "/api/jobs/launch/bulkCitationUploadFromAcmDlViewAll",
    );
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: "1",
      citeKey: "smith2020",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Bulk citation upload job launched — check the Jobs tab for progress.",
      ),
    );
  });

  test("clicking Bulk References from ACM DL opens the modal, and submitting launches the job with the current entry's citeKey", async () => {
    axiosMock
      .onPost("/api/jobs/launch/bulkReferenceUploadFromAcmDl")
      .reply(200, { id: 99 });

    renderAtSmith2020();
    await screen.findByTestId(
      "BibTexEntryShowPage-bulk-reference-upload-button",
    );

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-bulk-reference-upload-button"),
    );

    expect(
      screen.getByTestId("BulkReferenceUploadModal-base"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("BulkReferenceUploadModal-rawHtml"), {
      target: {
        value:
          '<section id="bibliography"><div class="biblioentry"></div></section>',
      },
    });
    fireEvent.click(screen.getByTestId("BulkReferenceUploadModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe(
      "/api/jobs/launch/bulkReferenceUploadFromAcmDl",
    );
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: "1",
      citeKey: "smith2020",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Bulk reference upload job launched — check the Jobs tab for progress.",
      ),
    );
  });

  test("shows a Relevance dropdown defaulting to Unreviewed when no relevance field is present", async () => {
    renderAtSmith2020();

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-relevance-select"),
      ).toHaveValue("Unreviewed");
    });
  });

  test("colors each Relevance dropdown option per issue #54's central relevance CSS classes", async () => {
    renderAtSmith2020();

    const select = await screen.findByTestId(
      "BibTexEntryShowPage-relevance-select",
    );
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.value)).toEqual([
      "High",
      "Medium",
      "Low",
      "None",
      "Unreviewed",
    ]);
    expect(options[0]).toHaveClass("relevance-high");
    expect(options[1]).toHaveClass("relevance-medium");
    expect(options[2]).toHaveClass("relevance-low");
    expect(options[3]).toHaveClass("relevance-none");
    expect(options[4]).toHaveClass("relevance-unreviewed");
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

  test("the BibTex Entry card is open by default, and the other cards are closed by default", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-AbstractCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
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

  test("a closed-by-default card's content is not mounted until it's opened for the first time, and stays mounted after re-closing", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    // Closed by default: BibTexEntryComments (a heavyweight CodeMirror-based editor) isn't
    // mounted at all yet, not just hidden — see CollapsibleCard's lazy-mount comment.
    expect(
      screen.queryByTestId("BibTexEntryShowPage-BibTexEntryComments-base"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    );
    expect(
      screen.getByTestId("BibTexEntryShowPage-BibTexEntryComments-base"),
    ).toBeInTheDocument();

    // Closing it again doesn't unmount it a second time (state like an in-progress draft would
    // otherwise be lost every time the card is collapsed).
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    );
    expect(
      screen.getByTestId("BibTexEntryShowPage-BibTexEntryComments-base"),
    ).toBeInTheDocument();
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

    // Comments card is closed (and lazily unmounted) by default.
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-CommentsCard-header"),
    );

    expect(
      screen.getByTestId("BibTexEntryShowPage-BibTexEntryComments-base"),
    ).toBeInTheDocument();
  });

  test("the Raw BibTeX (debug) card is closed by default", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-RawEntryCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("opening the Raw BibTeX (debug) card shows the full entry as JSON, including fields not shown elsewhere on the page", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-RawEntryCard-header"),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-RawEntryCard-header"),
      ).toHaveAttribute("aria-expanded", "true");
    });
    const json = screen.getByTestId("BibTexEntryShowPage-raw-entry-json");
    expect(json).toHaveTextContent('"id": "64f1b2c3d4e5f6a7b8c9d0e1"');
    expect(json).toHaveTextContent('"entryType": "article"');
    expect(json).toHaveTextContent('"doi": "10.1038/s41586-020-2649-2"');
  });

  test("toggling the Raw BibTeX (debug) card does not PUT any changes to the backend", async () => {
    axiosMock
      .onPut("/api/bibtexentries")
      .reply(200, bibTexEntriesFixtures.oneEntry);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-RawEntryCard-header"),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-RawEntryCard-header"),
      ).toHaveAttribute("aria-expanded", "true");
    });

    expect(axiosMock.history.put.length).toBe(0);
  });

  test("does not show a Possible Duplicates card when the entry has no duplicate flags", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.queryByTestId("BibTexEntryShowPage-PossibleDuplicatesCard"),
    ).not.toBeInTheDocument();
  });

  test("shows a Possible Duplicates card, open by default with a pastel red header, when the entry is flagged", async () => {
    const OTHER_ID = "64f1b2c3d4e5f6a7b8c9d0e9";
    axiosMock.reset();
    axiosMock.onGet("/api/bibtexentries/entry").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      possibleDuplicateIds: [OTHER_ID],
      possibleDuplicateReason: "SIMILAR_TITLE",
    });
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock
      .onGet("/api/bibtexentries/formatted", {
        params: { projectId: "1", id: ENTRY_ID },
      })
      .reply(200, "Smith, J. A Very Long Title.");
    axiosMock
      .onGet("/api/bibtexentries/formatted", {
        params: { projectId: "1", id: OTHER_ID },
      })
      .reply(200, "Other, A. The Other Paper.");
    axiosMock
      .onGet("/api/projects/1")
      .reply(200, { id: 1, citationFormat: "ACM" });
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-PossibleDuplicatesCard-header"),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByTestId("BibTexEntryShowPage-PossibleDuplicatesCard-header"),
    ).toHaveStyle("background-color: #f8d7da");

    expect(
      screen.getByTestId(
        `BibTexEntryShowPage-PossibleDuplicatesCard-item-${OTHER_ID}`,
      ),
    ).toBeInTheDocument();

    const citationLink = await screen.findByTestId(
      `BibTexEntryShowPage-PossibleDuplicatesCard-citation-${OTHER_ID}`,
    );
    expect(citationLink).toHaveTextContent("Other, A. The Other Paper.");
    expect(citationLink).toHaveAttribute(
      "href",
      `/project/1/bibtex/${OTHER_ID}`,
    );
    expect(
      screen.getByTestId(
        `BibTexEntryShowPage-PossibleDuplicatesCard-reason-${OTHER_ID}`,
      ),
    ).toHaveTextContent("Reason: Similar Title");
  });

  test("lists multiple possible duplicates, one after another", async () => {
    const OTHER_ID_1 = "64f1b2c3d4e5f6a7b8c9d0e9";
    const OTHER_ID_2 = "64f1b2c3d4e5f6a7b8c9d0ea";
    axiosMock.reset();
    axiosMock.onGet("/api/bibtexentries/entry").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      possibleDuplicateIds: [OTHER_ID_1, OTHER_ID_2],
      possibleDuplicateReason: "SAME_DOI",
    });
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock
      .onGet("/api/bibtexentries/formatted", {
        params: { projectId: "1", id: ENTRY_ID },
      })
      .reply(200, "Smith, J. A Very Long Title.");
    axiosMock
      .onGet("/api/bibtexentries/formatted", {
        params: { projectId: "1", id: OTHER_ID_1 },
      })
      .reply(200, "First Duplicate Citation.");
    axiosMock
      .onGet("/api/bibtexentries/formatted", {
        params: { projectId: "1", id: OTHER_ID_2 },
      })
      .reply(200, "Second Duplicate Citation.");
    axiosMock
      .onGet("/api/projects/1")
      .reply(200, { id: 1, citationFormat: "ACM" });
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      await screen.findByTestId(
        `BibTexEntryShowPage-PossibleDuplicatesCard-citation-${OTHER_ID_1}`,
      ),
    ).toHaveTextContent("First Duplicate Citation.");
    expect(
      await screen.findByTestId(
        `BibTexEntryShowPage-PossibleDuplicatesCard-citation-${OTHER_ID_2}`,
      ),
    ).toHaveTextContent("Second Duplicate Citation.");
    expect(
      screen.getByTestId(
        `BibTexEntryShowPage-PossibleDuplicatesCard-reason-${OTHER_ID_1}`,
      ),
    ).toHaveTextContent("Reason: Same DOI");
    expect(
      screen.getByTestId(
        `BibTexEntryShowPage-PossibleDuplicatesCard-reason-${OTHER_ID_2}`,
      ),
    ).toHaveTextContent("Reason: Same DOI");
  });

  test("the Possible Duplicates card can be collapsed like the other cards", async () => {
    axiosMock.reset();
    axiosMock.onGet("/api/bibtexentries/entry").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      possibleDuplicateReason: "SAME_DOI",
    });
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock
      .onGet("/api/bibtexentries/formatted")
      .reply(200, "Smith, J. A Very Long Title.");
    axiosMock
      .onGet("/api/projects/1")
      .reply(200, { id: 1, citationFormat: "ACM" });
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    // possibleDuplicateIds is absent (only possibleDuplicateReason is set), so the card shows
    // no duplicate items at all — the flag alone is enough to show the card.
    expect(
      screen.queryAllByTestId(/PossibleDuplicatesCard-item-/),
    ).toHaveLength(0);

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-PossibleDuplicatesCard-header"),
    );

    expect(
      screen.getByTestId("BibTexEntryShowPage-PossibleDuplicatesCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("the Abstract card shows a word count of 0 when the entry has no abstract", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-AbstractCard-header"),
    ).toHaveTextContent("Abstract (0 words)");
  });

  test("the Abstract card shows the word count and text for an entry with an abstract", async () => {
    axiosMock.reset();
    axiosMock.onGet("/api/bibtexentries/entry").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      keyValuePairs: {
        ...bibTexEntriesFixtures.oneEntry.keyValuePairs,
        abstract: "This abstract has exactly six words.",
      },
    });
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock
      .onGet("/api/bibtexentries/formatted")
      .reply(200, "Smith, J. A Very Long Title.");
    axiosMock
      .onGet("/api/projects/1")
      .reply(200, { id: 1, citationFormat: "ACM" });
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-AbstractCard-header"),
    ).toHaveTextContent("Abstract (6 words)");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-AbstractCard-header"),
    );
    expect(
      screen.getByTestId("BibTexEntryShowPage-abstract-text"),
    ).toHaveTextContent("This abstract has exactly six words.");
  });

  test("clicking the Abstract Edit button opens the AbstractEditModal pre-filled with the current abstract", async () => {
    axiosMock.reset();
    axiosMock.onGet("/api/bibtexentries/entry").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      keyValuePairs: {
        ...bibTexEntriesFixtures.oneEntry.keyValuePairs,
        abstract: "Existing abstract text.",
      },
    });
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {A Very Long Title}\n}\n");
    axiosMock
      .onGet("/api/bibtexentries/formatted")
      .reply(200, "Smith, J. A Very Long Title.");
    axiosMock
      .onGet("/api/projects/1")
      .reply(200, { id: 1, citationFormat: "ACM" });
    axiosMock.onGet("/api/citationedges/references").reply(200, []);
    axiosMock.onGet("/api/citationedges/citations").reply(200, []);
    axiosMock.onGet("/api/citationedges/unresolved").reply(200, []);

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-abstract-edit-button"),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryShowPage-AbstractEditModal-base"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("BibTexEntryShowPage-AbstractEditModal-abstract"),
    ).toHaveValue("Existing abstract text.");
  });

  test("clicking the Abstract Edit button in the card header does not toggle the card open/closed", async () => {
    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    expect(
      screen.getByTestId("BibTexEntryShowPage-AbstractCard-header"),
    ).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-abstract-edit-button"),
    );

    expect(
      screen.getByTestId("BibTexEntryShowPage-AbstractCard-header"),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("saving a new abstract via the modal PATCHes it and refetches the entry", async () => {
    axiosMock
      .onPatch("/api/bibtexentries/abstract")
      .reply(200, { ...bibTexEntriesFixtures.oneEntry });

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-abstract-edit-button"),
    );
    await screen.findByTestId("BibTexEntryShowPage-AbstractEditModal-base");

    fireEvent.change(
      screen.getByTestId("BibTexEntryShowPage-AbstractEditModal-abstract"),
      { target: { value: "A brand new abstract." } },
    );
    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-AbstractEditModal-submit"),
    );

    await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
    expect(axiosMock.history.patch[0].data).toBe("A brand new abstract.");
    expect(axiosMock.history.patch[0].params).toEqual({
      id: ENTRY_ID,
      projectId: "1",
    });
  });

  test("shows a TagSelector with the project's tags and the entry's assigned tags", async () => {
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, { ...bibTexEntriesFixtures.oneEntry, tagIds: [1] });
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);

    renderAtSmith2020();

    await screen.findByTestId("BibTexEntryShowPage-TagSelector-assigned-tag-1");
    expect(
      screen.queryByTestId("BibTexEntryShowPage-TagSelector-assigned-tag-2"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-TagSelector-add-tag-dropdown"),
    );
    expect(
      await screen.findByTestId(
        "BibTexEntryShowPage-TagSelector-available-tag-2",
      ),
    ).toBeInTheDocument();
  });

  test("clicking a tag in the Add Tag dropdown POSTs to associate it and refetches the entry", async () => {
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);
    axiosMock.onPost("/api/bibtexentries/tags").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      tagIds: [1],
    });

    renderAtSmith2020();
    await screen.findByTestId("BibTexEntryShowPage-title");

    fireEvent.click(
      screen.getByTestId("BibTexEntryShowPage-TagSelector-add-tag-dropdown"),
    );
    fireEvent.click(
      await screen.findByTestId(
        "BibTexEntryShowPage-TagSelector-available-tag-1",
      ),
    );

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe("/api/bibtexentries/tags");
    expect(axiosMock.history.post[0].params).toEqual({
      id: ENTRY_ID,
      projectId: "1",
      tagId: 1,
    });
  });

  test("clicking the remove button on an assigned tag DELETEs to remove it and refetches the entry", async () => {
    axiosMock
      .onGet("/api/bibtexentries/entry")
      .reply(200, { ...bibTexEntriesFixtures.oneEntry, tagIds: [1] });
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);
    axiosMock.onDelete("/api/bibtexentries/tags").reply(200, {
      ...bibTexEntriesFixtures.oneEntry,
      tagIds: [],
    });

    renderAtSmith2020();

    fireEvent.click(
      await screen.findByTestId("BibTexEntryShowPage-TagSelector-remove-tag-1"),
    );

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].url).toBe("/api/bibtexentries/tags");
    expect(axiosMock.history.delete[0].params).toEqual({
      id: ENTRY_ID,
      projectId: "1",
      tagId: 1,
    });
  });
});
