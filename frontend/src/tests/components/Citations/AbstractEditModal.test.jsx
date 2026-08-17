import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import AbstractEditModal from "main/components/Citations/AbstractEditModal";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

const ENTRY = {
  id: "64f1b2c3d4e5f6a7b8c9d0e1",
  projectId: 1,
  citeKey: "smith2020",
  keyValuePairs: { abstract: "An existing abstract." },
};

function renderModal(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AbstractEditModal
        showModal={true}
        toggleShowModal={() => {}}
        projectId={1}
        entry={ENTRY}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("AbstractEditModal tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders closed when showModal is false", () => {
    renderModal({ showModal: false });

    expect(
      screen.queryByTestId("AbstractEditModal-base"),
    ).not.toBeInTheDocument();
  });

  test("pre-fills the textarea with the entry's existing abstract", () => {
    renderModal();

    expect(screen.getByTestId("AbstractEditModal-abstract")).toHaveValue(
      "An existing abstract.",
    );
  });

  test("pre-fills an empty textarea when the entry has no abstract", () => {
    renderModal({
      entry: { ...ENTRY, keyValuePairs: {} },
    });

    expect(screen.getByTestId("AbstractEditModal-abstract")).toHaveValue("");
  });

  test("clicking Cancel closes the modal without saving", () => {
    const toggleShowModal = vi.fn();
    renderModal({ toggleShowModal });

    fireEvent.click(screen.getByTestId("AbstractEditModal-cancel"));

    expect(toggleShowModal).toHaveBeenCalledWith(false);
    expect(axiosMock.history.patch.length).toBe(0);
  });

  test("editing and clicking Save PATCHes the new abstract text and closes the modal", async () => {
    axiosMock
      .onPatch("/api/bibtexentries/abstract")
      .reply(200, { ...ENTRY, keyValuePairs: { abstract: "Updated text." } });
    const toggleShowModal = vi.fn();
    renderModal({ toggleShowModal });

    fireEvent.change(screen.getByTestId("AbstractEditModal-abstract"), {
      target: { value: "Updated text." },
    });
    fireEvent.click(screen.getByTestId("AbstractEditModal-submit"));

    await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
    expect(axiosMock.history.patch[0].params).toEqual({
      id: ENTRY.id,
      projectId: 1,
    });
    expect(axiosMock.history.patch[0].data).toBe("Updated text.");

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Abstract updated successfully"),
    );
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });
});
