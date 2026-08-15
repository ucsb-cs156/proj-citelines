import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import TagModal from "main/components/Tags/TagModal";

describe("TagModal tests", () => {
  test("renders create form by default and validates required fields", async () => {
    const onSubmitAction = vi.fn();
    const toggleShowModal = vi.fn();

    render(
      <TagModal
        showModal={true}
        toggleShowModal={toggleShowModal}
        onSubmitAction={onSubmitAction}
      />,
    );

    expect(screen.getByText("Create Tag")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("TagModal-submit"));

    await waitFor(() => {
      expect(screen.getByText("Tag is required.")).toBeInTheDocument();
    });
    expect(screen.getByText("Explanation is required.")).toBeInTheDocument();
    expect(onSubmitAction).not.toHaveBeenCalled();
  });

  test("submits with entered values", async () => {
    const onSubmitAction = vi.fn();
    const toggleShowModal = vi.fn();

    render(
      <TagModal
        showModal={true}
        toggleShowModal={toggleShowModal}
        onSubmitAction={onSubmitAction}
      />,
    );

    fireEvent.change(screen.getByTestId("TagModal-tag"), {
      target: { value: "methodology" },
    });
    fireEvent.change(screen.getByTestId("TagModal-explanation"), {
      target: { value: "Describes the methodology" },
    });
    fireEvent.click(screen.getByTestId("TagModal-submit"));

    await waitFor(() => expect(onSubmitAction).toHaveBeenCalled());
    expect(onSubmitAction.mock.calls[0][0]).toEqual({
      tag: "methodology",
      explanation: "Describes the methodology",
    });
  });

  test("close button toggles the modal closed", () => {
    const toggleShowModal = vi.fn();

    render(
      <TagModal
        showModal={true}
        toggleShowModal={toggleShowModal}
        onSubmitAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("TagModal-closeButton"));
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("shows edit title/button text and prefills from initialContents", () => {
    render(
      <TagModal
        showModal={true}
        toggleShowModal={vi.fn()}
        onSubmitAction={vi.fn()}
        initialContents={{ tag: "existing", explanation: "Existing desc" }}
        buttonText="Update"
        modalTitle="Edit Tag"
      />,
    );

    expect(screen.getByText("Edit Tag")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
    expect(screen.getByTestId("TagModal-tag")).toHaveValue("existing");
    expect(screen.getByTestId("TagModal-explanation")).toHaveValue(
      "Existing desc",
    );
  });

  test("respects a custom testId prefix", () => {
    render(
      <TagModal
        showModal={true}
        toggleShowModal={vi.fn()}
        onSubmitAction={vi.fn()}
        testId="CustomTagModal"
      />,
    );

    expect(screen.getByTestId("CustomTagModal-base")).toBeInTheDocument();
    expect(screen.getByTestId("CustomTagModal-tag")).toBeInTheDocument();
    expect(
      screen.getByTestId("CustomTagModal-explanation"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("CustomTagModal-submit")).toBeInTheDocument();
    expect(
      screen.getByTestId("CustomTagModal-closeButton"),
    ).toBeInTheDocument();
  });
});
