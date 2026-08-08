import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ConceptModal from "main/components/Concept/ConceptModal";
import conceptsFixtures from "fixtures/conceptsFixtures";

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

describe("ConceptModal tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("validation works correctly", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
        />
      </div>,
    );

    expect(screen.getByText("Create Concept")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ConceptModal-submit"));

    expect(mockSubmit).toHaveBeenCalledTimes(0);
    await screen.findByText("Label is required.");
  });

  test("can see initialContents", () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={conceptsFixtures.severalConcepts[0]}
          buttonText="Update"
          modalTitle="Update Concept"
        />
      </div>,
    );

    expect(screen.getByText("Update Concept")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Variables")).toBeInTheDocument();
    expect(editorTextarea("ConceptModal-description").value).toBe(
      "Named storage locations for values.",
    );
    expect(editorTextarea("ConceptModal-example").value).toBe("int x = 3;");
    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  test("can submit successfully", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
        />
      </div>,
    );

    fireEvent.change(editorTextarea("ConceptModal-label"), {
      target: { value: "Recursion" },
    });
    fireEvent.change(editorTextarea("ConceptModal-description"), {
      target: { value: "Functions that call themselves." },
    });
    fireEvent.change(editorTextarea("ConceptModal-example"), {
      target: { value: "factorial(n - 1)" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  });

  test("can click close", async () => {
    render(
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId("ConceptModal-closeButton"));
    await waitFor(() => expect(toggleShowModal).toHaveBeenCalledWith(false));
  });

  test("form updates when initialContents change", async () => {
    const MockConceptModal = ({ initialContents }) => (
      <div
        className="modal show"
        style={{ display: "block", position: "initial" }}
      >
        <ConceptModal
          showModal={showModal}
          toggleShowModal={toggleShowModal}
          onSubmitAction={mockSubmit}
          initialContents={initialContents}
        />
      </div>
    );

    const { rerender } = render(<MockConceptModal initialContents={null} />);

    expect(editorTextarea("ConceptModal-label").value).toBe("");

    rerender(
      <MockConceptModal
        initialContents={conceptsFixtures.severalConcepts[1]}
      />,
    );

    await waitFor(() => {
      expect(editorTextarea("ConceptModal-label").value).toBe("Loops");
      expect(editorTextarea("ConceptModal-description").value).toBe(
        "Repeated execution of a block of code.",
      );
      expect(editorTextarea("ConceptModal-example").value).toBe(
        "for (let i = 0; i < 10; i++) {}",
      );
    });
  });
});
