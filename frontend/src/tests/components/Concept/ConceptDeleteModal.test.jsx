import { vi } from "vitest";
import ConceptDeleteModal from "main/components/Concept/ConceptDeleteModal";
import { fireEvent, render, waitFor, screen } from "@testing-library/react";

const mockSubmit = vi.fn();
const showModal = vi.fn();
const toggleShowModal = vi.fn();

describe("ConceptDeleteModal tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ConceptDeleteModal renders correctly and submits", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptDeleteModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
        />
      </div>,
    );

    expect(screen.getByTestId("ConceptDeleteModal")).toHaveClass(
      "modal-dialog-centered",
    );
    expect(
      screen.getByText(
        "Are you sure you want to delete this concept? Deleting a top-level concept also deletes all of its subconcepts.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete Concept",
      }),
    );
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  });

  test("can click close", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptDeleteModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
        />
      </div>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(toggleShowModal).toHaveBeenCalledWith(false));
  });
});
