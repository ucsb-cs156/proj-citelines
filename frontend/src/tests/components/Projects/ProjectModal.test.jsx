import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ProjectModal from "main/components/Projects/ProjectModal";
import {
  LAST_CITATION_FORMAT_STORAGE_KEY,
  DEFAULT_CITATION_FORMAT,
} from "main/utils/citationFormats";

describe("ProjectModal tests", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  test("defaults citation format to ACM", async () => {
    render(
      <ProjectModal
        showModal={true}
        toggleShowModal={vi.fn()}
        onSubmitAction={vi.fn()}
      />,
    );

    expect(screen.getByTestId("ProjectModal-citationFormat")).toHaveValue(
      DEFAULT_CITATION_FORMAT,
    );
  });

  test("defaults citation format to the last one chosen, from local storage", async () => {
    window.localStorage.setItem(LAST_CITATION_FORMAT_STORAGE_KEY, "IEEE");

    render(
      <ProjectModal
        showModal={true}
        toggleShowModal={vi.fn()}
        onSubmitAction={vi.fn()}
      />,
    );

    expect(screen.getByTestId("ProjectModal-citationFormat")).toHaveValue(
      "IEEE",
    );
  });

  test("submits with entered values, including citation format, and remembers the choice", async () => {
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
    fireEvent.change(screen.getByTestId("ProjectModal-citationFormat"), {
      target: { value: "IEEE" },
    });
    fireEvent.click(screen.getByTestId("ProjectModal-submit"));

    await waitFor(() => expect(onSubmitAction).toHaveBeenCalled());
    expect(onSubmitAction.mock.calls[0][0]).toEqual({
      name: "Citation Graphs",
      description: "A project about citation graphs",
      citationFormat: "IEEE",
    });
    expect(
      window.localStorage.getItem(LAST_CITATION_FORMAT_STORAGE_KEY),
    ).toEqual("IEEE");
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
        initialContents={{
          name: "Existing",
          description: "Existing desc",
          citationFormat: "MLA",
        }}
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
    expect(screen.getByTestId("ProjectModal-citationFormat")).toHaveValue(
      "MLA",
    );
  });
});
