import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BulkReferenceUploadModal from "main/components/Citations/BulkReferenceUploadModal";

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
        <BulkReferenceUploadModal
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

describe("BulkReferenceUploadModal tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders the title, instructions, and an empty textarea", () => {
    renderModal();

    expect(screen.getByText("Bulk References from ACM DL")).toBeInTheDocument();
    expect(
      screen.getByText(/Open the link above on the ACM DL\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /It will be parsed for references, and the references will be/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByTestId("BulkReferenceUploadModal-rawHtml")).toHaveValue(
      "",
    );
  });

  test("shows a link to the paper (opening in a new tab) when keyValuePairs has a doi", () => {
    renderModal({ keyValuePairs: { doi: "10.1145/3770762.3772609" } });

    const link = screen.getByTestId("BulkReferenceUploadModal-doi-link");
    expect(link).toHaveAttribute(
      "href",
      "https://doi.org/10.1145/3770762.3772609",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("shows no paper link when keyValuePairs has neither doi nor url", () => {
    renderModal({ keyValuePairs: {} });

    expect(
      screen.queryByTestId("BulkReferenceUploadModal-doi-link"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("BulkReferenceUploadModal-url-link"),
    ).not.toBeInTheDocument();
  });

  test("validates that pasted HTML is required", async () => {
    renderModal();

    fireEvent.click(screen.getByTestId("BulkReferenceUploadModal-submit"));

    await waitFor(() => {
      expect(screen.getByText("Pasted HTML is required.")).toBeInTheDocument();
    });
  });

  test("submits the pasted HTML as a POST to the launch endpoint and shows a success toast", async () => {
    const toggleShowModal = vi.fn();
    axiosMock
      .onPost("/api/jobs/launch/bulkReferenceUploadFromAcmDl")
      .reply(200, { id: 99 });

    renderModal({ toggleShowModal });

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
      projectId: 1,
      citeKey: "smith2020",
    });
    expect(axiosMock.history.post[0].data).toContain("biblioentry");
    expect(axiosMock.history.post[0].headers["Content-Type"]).toBe(
      "text/plain",
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Bulk reference upload job launched — check the Jobs tab for progress.",
      ),
    );
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("close button closes the modal", () => {
    const toggleShowModal = vi.fn();
    renderModal({ toggleShowModal });

    fireEvent.click(screen.getByTestId("BulkReferenceUploadModal-closeButton"));
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("resets the textarea to empty each time the modal is reopened", () => {
    const queryClient = new QueryClient();
    const tree = (showModal) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BulkReferenceUploadModal
            showModal={showModal}
            toggleShowModal={vi.fn()}
            projectId={1}
            citeKey="smith2020"
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const { rerender } = render(tree(true));

    fireEvent.change(screen.getByTestId("BulkReferenceUploadModal-rawHtml"), {
      target: { value: "some leftover html" },
    });
    expect(screen.getByTestId("BulkReferenceUploadModal-rawHtml")).toHaveValue(
      "some leftover html",
    );

    rerender(tree(false));
    rerender(tree(true));

    expect(screen.getByTestId("BulkReferenceUploadModal-rawHtml")).toHaveValue(
      "",
    );
  });
});
