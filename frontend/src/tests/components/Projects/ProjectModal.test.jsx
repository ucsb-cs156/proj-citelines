import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ProjectModal from "main/components/Projects/ProjectModal";

describe("ProjectModal tests", () => {
  test("renders create form by default and validates required fields", async () => {
    const onSubmitAction = vi.fn();
    const toggleShowModal = vi.fn();

    render(
      <ProjectModal
        showModal={true}
        toggleShowModal={toggleShowModal}
        onSubmitAction={onSubmitAction}
      />,
    );

    expect(screen.getByText("Create Project")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ProjectModal-submit"));

    await waitFor(() => {
      expect(screen.getByText("Project Name is required.")).toBeInTheDocument();
    });
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(onSubmitAction).not.toHaveBeenCalled();
  });

  test("submits with entered values", async () => {
    const onSubmitAction = vi.fn();
    const toggleShowModal = vi.fn();

    render(
      <ProjectModal
        showModal={true}
        toggleShowModal={toggleShowModal}
        onSubmitAction={onSubmitAction}
      />,
    );

    fireEvent.change(screen.getByTestId("ProjectModal-name"), {
      target: { value: "Citation Graphs" },
    });
    fireEvent.change(screen.getByTestId("ProjectModal-description"), {
      target: { value: "A project about citation graphs" },
    });
    fireEvent.click(screen.getByTestId("ProjectModal-submit"));

    await waitFor(() => expect(onSubmitAction).toHaveBeenCalled());
    expect(onSubmitAction.mock.calls[0][0]).toEqual({
      name: "Citation Graphs",
      description: "A project about citation graphs",
    });
  });

  test("close button toggles the modal closed", () => {
    const toggleShowModal = vi.fn();

    render(
      <ProjectModal
        showModal={true}
        toggleShowModal={toggleShowModal}
        onSubmitAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("ProjectModal-closeButton"));
    expect(toggleShowModal).toHaveBeenCalledWith(false);
  });

  test("shows edit title/button text and prefills from initialContents", () => {
    render(
      <ProjectModal
        showModal={true}
        toggleShowModal={vi.fn()}
        onSubmitAction={vi.fn()}
        initialContents={{ name: "Existing", description: "Existing desc" }}
        buttonText="Update"
        modalTitle="Edit Project"
      />,
    );

    expect(screen.getByText("Edit Project")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
    expect(screen.getByTestId("ProjectModal-name")).toHaveValue("Existing");
    expect(screen.getByTestId("ProjectModal-description")).toHaveValue(
      "Existing desc",
    );
  });
});
