import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import DoiEntryModal from "main/components/Citations/DoiEntryModal";
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
        <DoiEntryModal
          showModal={true}
          toggleShowModal={vi.fn()}
          projectId={1}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DoiEntryModal tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders the Add Citation via DOI title, an empty DOI field, and a Relevance dropdown defaulting to Unreviewed", () => {
    renderModal();

    expect(screen.getByText("Add Citation via DOI")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByTestId("DoiEntryModal-doi")).toHaveValue("");
    expect(screen.getByTestId("DoiEntryModal-relevance")).toHaveValue(
      "Unreviewed",
    );
  });

  test("the Relevance dropdown offers all five options", () => {
    renderModal();

    const select = screen.getByTestId("DoiEntryModal-relevance");
    const optionLabels = Array.from(select.options).map((o) => o.value);
    expect(optionLabels).toEqual([
      "High",
      "Medium",
      "Low",
      "None",
      "Unreviewed",
    ]);
  });

  test("validates that a DOI is required", async () => {
    renderModal();

    fireEvent.click(screen.getByTestId("DoiEntryModal-submit"));

    await waitFor(() => {
      expect(screen.getByText("DOI is required.")).toBeInTheDocument();
    });
  });

  test("submits the DOI as a POST and shows a success toast", async () => {
    const toggleShowModal = vi.fn();
    axiosMock
      .onPost("/api/bibtexentries/postByDoi")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderModal({ toggleShowModal });

    fireEvent.change(screen.getByTestId("DoiEntryModal-doi"), {
      target: { value: "10.1038/s41586-020-2649-2" },
    });
    fireEvent.click(screen.getByTestId("DoiEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe("/api/bibtexentries/postByDoi");
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      relevance: "Unreviewed",
    });
    expect(axiosMock.history.post[0].data).toBe("10.1038/s41586-020-2649-2");
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Citation added successfully"),
    );
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("includes the user-selected relevance value in the submitted params", async () => {
    axiosMock
      .onPost("/api/bibtexentries/postByDoi")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderModal();

    fireEvent.change(screen.getByTestId("DoiEntryModal-doi"), {
      target: { value: "10.1038/s41586-020-2649-2" },
    });
    fireEvent.change(screen.getByTestId("DoiEntryModal-relevance"), {
      target: { value: "High" },
    });
    fireEvent.click(screen.getByTestId("DoiEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      relevance: "High",
    });
  });

  test("when relationship is 'reference', shows the Add Reference via DOI title and includes relatedEntryId/relationship in the POST", async () => {
    axiosMock
      .onPost("/api/bibtexentries/postByDoi")
      .reply(200, [bibTexEntriesFixtures.oneEntry]);

    renderModal({ relatedEntryId: "id-smith2020", relationship: "reference" });

    expect(screen.getByText("Add Reference via DOI")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("DoiEntryModal-doi"), {
      target: { value: "10.1038/s41586-020-2649-2" },
    });
    fireEvent.click(screen.getByTestId("DoiEntryModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      relatedEntryId: "id-smith2020",
      relationship: "reference",
      relevance: "Unreviewed",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Reference added successfully"),
    );
  });

  test("shows the backend's 404 'DOI not found' message inline, without closing", async () => {
    axiosMock.onPost("/api/bibtexentries/postByDoi").reply(404, {
      type: "DoiNotFoundException",
      message: "Could not find a citation for DOI: 10.9999/nonexistent",
    });
    const toggleShowModal = vi.fn();

    renderModal({ toggleShowModal });

    fireEvent.change(screen.getByTestId("DoiEntryModal-doi"), {
      target: { value: "10.9999/nonexistent" },
    });
    fireEvent.click(screen.getByTestId("DoiEntryModal-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("DoiEntryModal-error")).toHaveTextContent(
        "Could not find a citation for DOI: 10.9999/nonexistent",
      );
    });
    expect(toggleShowModal).not.toHaveBeenCalledWith(false);
  });

  test("close button closes the modal and clears any error", () => {
    const toggleShowModal = vi.fn();
    renderModal({ toggleShowModal });

    fireEvent.click(screen.getByTestId("DoiEntryModal-closeButton"));
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });
});
