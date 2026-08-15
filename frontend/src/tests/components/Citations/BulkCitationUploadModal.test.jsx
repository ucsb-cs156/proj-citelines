import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BulkCitationUploadModal from "main/components/Citations/BulkCitationUploadModal";

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
        <BulkCitationUploadModal
          showModal={true}
          toggleShowModal={vi.fn()}
          projectId={1}
          citeKey="smith2020"
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BulkCitationUploadModal tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders the title, instructions, and an empty textarea", () => {
    renderModal();

    expect(
      screen.getByText("Bulk Citations from ACM DL View All"),
    ).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByTestId("BulkCitationUploadModal-rawText")).toHaveValue(
      "",
    );
  });

  test("validates that pasted text is required", async () => {
    renderModal();

    fireEvent.click(screen.getByTestId("BulkCitationUploadModal-submit"));

    await waitFor(() => {
      expect(screen.getByText("Pasted text is required.")).toBeInTheDocument();
    });
  });

  test("submits the pasted text as a POST to the launch endpoint and shows a success toast", async () => {
    const toggleShowModal = vi.fn();
    axiosMock
      .onPost("/api/jobs/launch/bulkCitationUploadFromAcmDlViewAll")
      .reply(200, { id: 99 });

    renderModal({ toggleShowModal });

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
      projectId: 1,
      citeKey: "smith2020",
    });
    expect(axiosMock.history.post[0].data).toContain(
      "https://doi.org/10.1145/3770762.3772609",
    );
    expect(axiosMock.history.post[0].headers["Content-Type"]).toBe(
      "text/plain",
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Bulk citation upload job launched — check the Jobs tab for progress.",
      ),
    );
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("close button closes the modal", () => {
    const toggleShowModal = vi.fn();
    renderModal({ toggleShowModal });

    fireEvent.click(screen.getByTestId("BulkCitationUploadModal-closeButton"));
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("resets the textarea to empty each time the modal is reopened", () => {
    const queryClient = new QueryClient();
    const tree = (showModal) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BulkCitationUploadModal
            showModal={showModal}
            toggleShowModal={vi.fn()}
            projectId={1}
            citeKey="smith2020"
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const { rerender } = render(tree(true));

    fireEvent.change(screen.getByTestId("BulkCitationUploadModal-rawText"), {
      target: { value: "some leftover text" },
    });
    expect(screen.getByTestId("BulkCitationUploadModal-rawText")).toHaveValue(
      "some leftover text",
    );

    rerender(tree(false));
    rerender(tree(true));

    expect(screen.getByTestId("BulkCitationUploadModal-rawText")).toHaveValue(
      "",
    );
  });
});
