import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import SubConceptModal from "main/components/Concept/SubConceptModal";
import subConceptsFixtures from "fixtures/subConceptsFixtures";

vi.mock("react-simplemde-editor", () => ({
  default: ({ value = "", onChange }) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const mockSubmit = vi.fn();
const showModal = vi.fn();
const toggleShowModal = vi.fn();
const editorTextarea = (testId) =>
  screen.getByTestId(testId).querySelector("textarea");

describe("SubConceptModal tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("validation works correctly", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <SubConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={{ parentId: 1, parentLabel: "Variables" }}
        />
      </div>,
    );

    expect(screen.getByText("Create SubConcept")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("SubConceptModal-submit"));

    expect(mockSubmit).toHaveBeenCalledTimes(0);
    await screen.findByText("Label is required.");
  });

  test("can see initialContents and read-only parent fields", () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <SubConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={subConceptsFixtures.severalSubConcepts[0]}
          buttonText="Update"
          modalTitle="Update SubConcept"
        />
      </div>,
    );

    expect(screen.getByText("Update SubConcept")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Variables")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("Declaring variables")).toBeInTheDocument();
    expect(editorTextarea("SubConceptModal-description").value).toBe(
      "Create a variable with a name and type.",
    );
    expect(editorTextarea("SubConceptModal-example").value).toBe(
      'String name = "Ada";',
    );
    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  test("can submit successfully", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <SubConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={{ parentId: 2, parentLabel: "Loops" }}
        />
      </div>,
    );

    fireEvent.change(editorTextarea("SubConceptModal-label"), {
      target: { value: "While loops" },
    });
    fireEvent.change(editorTextarea("SubConceptModal-description"), {
      target: { value: "Repeat while a condition remains true." },
    });
    fireEvent.change(editorTextarea("SubConceptModal-example"), {
      target: { value: "while (ready) { run(); }" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({
      parentId: 2,
      parentLabel: "Loops",
      label: "While loops",
      description: "Repeat while a condition remains true.",
      example: "while (ready) { run(); }",
    });
  });

  test("can click close", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <SubConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={{ parentId: 1, parentLabel: "Variables" }}
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId("SubConceptModal-closeButton"));
    await waitFor(() => expect(toggleShowModal).toHaveBeenCalledWith(false));
  });

  test("normalizes nested parent data when initialContents change", async () => {
    const MockSubConceptModal = ({ initialContents }) => (
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <SubConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={initialContents}
        />
      </div>
    );

    const { rerender } = render(<MockSubConceptModal initialContents={null} />);

    expect(screen.getByTestId("SubConceptModal-parentId").value).toBe("");
    expect(screen.getByTestId("SubConceptModal-parentLabel").value).toBe("");

    rerender(
      <MockSubConceptModal
        initialContents={subConceptsFixtures.severalSubConcepts[1]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("SubConceptModal-parentId").value).toBe("1");
      expect(screen.getByTestId("SubConceptModal-parentLabel").value).toBe(
        "Variables",
      );
      expect(editorTextarea("SubConceptModal-label").value).toBe(
        "Updating variables",
      );
    });
  });
});
