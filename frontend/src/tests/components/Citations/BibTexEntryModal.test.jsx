import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderModal(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BibTexEntryModal
          showModal={true}
          toggleShowModal={vi.fn()}
          projectId={1}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BibTexEntryModal tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders the Add Citation title, an empty textarea, and a Relevance dropdown defaulting to Unreviewed", () => {
    renderModal();

    expect(screen.getByText("Add Citation")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByTestId("BibTexEntryModal-bibtex")).toHaveValue("");
    expect(screen.getByTestId("BibTexEntryModal-relevance")).toHaveValue(
      "Unreviewed",
    );
  });

  test("the Relevance dropdown offers all five options", () => {
    renderModal();

    const select = screen.getByTestId("BibTexEntryModal-relevance");
    const optionLabels = Array.from(select.options).map((o) => o.value);
    expect(optionLabels).toEqual([
      "High",
      "Medium",
      "Low",
      "None",
      "Unreviewed",
    ]);
  });

  test("validates that bibtex text is required", async () => {
    renderModal();

    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => {
      expect(screen.getByText("BibTeX text is required.")).toBeInTheDocument();
    });
  });

  test("submits pasted text as a POST and shows a success toast", async () => {
    const toggleShowModal = vi.fn();
    axiosMock
      .onPost("/api/bibtexentries/post")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderModal({ toggleShowModal });

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "@article{smith2020, title = {A Title}}" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe("/api/bibtexentries/post");
    expect(axiosMock.history.post[0].params).toEqual({ projectId: 1 });
    const sentData = axiosMock.history.post[0].data;
    expect(sentData).toContain("@article{smith2020");
    expect(sentData).toContain("title = {A Title}");
    expect(sentData).toContain("CITELINES_relevance = {Unreviewed}");
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation added successfully"),
    );
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("includes the user-selected relevance value in the submitted bibtex", async () => {
    axiosMock
      .onPost("/api/bibtexentries/post")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderModal();

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "@article{smith2020, title = {A Title}}" },
    });
    fireEvent.change(screen.getByTestId("BibTexEntryModal-relevance"), {
      target: { value: "High" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].data).toContain(
      "CITELINES_relevance = {High}",
    );
  });

  test("shows the backend's parse error message inline, without closing", async () => {
    axiosMock.onPost("/api/bibtexentries/post").reply(400, {
      type: "IllegalArgumentException",
      message: "Could not parse BibTeX: broken",
    });
    const toggleShowModal = vi.fn();

    renderModal({ toggleShowModal });

    fireEvent.change(screen.getByTestId("BibTexEntryModal-bibtex"), {
      target: { value: "not valid bibtex" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-error")).toHaveTextContent(
        "Could not parse BibTeX: broken",
      );
    });
    expect(toggleShowModal).not.toHaveBeenCalledWith(false);
  });

  test("close button closes the modal and clears any error", () => {
    const toggleShowModal = vi.fn();
    renderModal({ toggleShowModal });

    fireEvent.click(screen.getByTestId("BibTexEntryModal-closeButton"));
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("when editing, fetches and pre-fills the existing entry's BibTeX text", async () => {
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {Existing}\n}\n");

    renderModal({ entryToEdit: bibTexEntriesFixtures.oneEntry });

    expect(screen.getByText("Edit Citation")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-bibtex")).toHaveValue(
        "@article{smith2020,\n  title = {Existing}\n}\n",
      );
    });
    expect(axiosMock.history.get[0].params).toEqual({
      id: bibTexEntriesFixtures.oneEntry.id,
      projectId: 1,
    });
  });

  test("when editing an entry with an existing relevance, strips it from the text and pre-fills the dropdown", async () => {
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(
        200,
        '@article{smith2020,\n\ttitle = "Existing",\n\tcitelines_relevance = "High"\n}',
      );

    renderModal({ entryToEdit: bibTexEntriesFixtures.oneEntry });

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-relevance")).toHaveValue(
        "High",
      );
    });
    const bibtexValue = screen.getByTestId("BibTexEntryModal-bibtex").value;
    expect(bibtexValue).not.toContain("citelines");
    expect(bibtexValue).toContain('title = "Existing"');
  });

  test("re-injects the (possibly changed) relevance and any other preserved CITELINES_ fields on submit", async () => {
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(
        200,
        '@article{smith2020,\n\ttitle = "Existing",\n\tcitelines_relevance = "Low",\n\tcitelines_position = "3"\n}',
      );
    axiosMock
      .onPut("/api/bibtexentries")
      .reply(200, bibTexEntriesFixtures.oneEntry);

    renderModal({ entryToEdit: bibTexEntriesFixtures.oneEntry });

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-relevance")).toHaveValue(
        "Low",
      );
    });

    fireEvent.change(screen.getByTestId("BibTexEntryModal-relevance"), {
      target: { value: "Medium" },
    });
    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    const sentData = axiosMock.history.put[0].data;
    expect(sentData).toContain("CITELINES_relevance = {Medium}");
    expect(sentData).toContain("CITELINES_position = {3}");
    expect(sentData).toContain('title = "Existing"');
  });

  test("submits edited text as a PUT with the entry id", async () => {
    axiosMock
      .onGet("/api/bibtexentries/export")
      .reply(200, "@article{smith2020,\n  title = {Existing}\n}\n");
    axiosMock
      .onPut("/api/bibtexentries")
      .reply(200, bibTexEntriesFixtures.oneEntry);

    renderModal({ entryToEdit: bibTexEntriesFixtures.oneEntry });

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-bibtex")).toHaveValue(
        "@article{smith2020,\n  title = {Existing}\n}\n",
      );
    });

    fireEvent.click(screen.getByTestId("BibTexEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    expect(axiosMock.history.put[0].params).toEqual({
      id: bibTexEntriesFixtures.oneEntry.id,
      projectId: 1,
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation updated successfully"),
    );
  });

  test("shows a fallback error message when fetching the existing entry fails", async () => {
    axiosMock.onGet("/api/bibtexentries/export").reply(500);

    renderModal({ entryToEdit: bibTexEntriesFixtures.oneEntry });

    await waitFor(() => {
      expect(screen.getByTestId("BibTexEntryModal-error")).toHaveTextContent(
        "Could not load the existing citation for editing.",
      );
    });
  });
});
