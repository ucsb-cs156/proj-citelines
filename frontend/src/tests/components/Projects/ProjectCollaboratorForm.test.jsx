import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import ProjectCollaboratorForm from "main/components/Projects/ProjectCollaboratorForm";

describe("ProjectCollaboratorForm tests", () => {
  test("validates required fields and email pattern", async () => {
    const submitAction = vi.fn();

    render(
      <MemoryRouter>
        <ProjectCollaboratorForm submitAction={submitAction} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("ProjectCollaboratorForm-submit"));

    await waitFor(() => {
      expect(screen.getByText("First Name is required.")).toBeInTheDocument();
    });
    expect(screen.getByText("Last Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByTestId("ProjectCollaboratorForm-submit"));

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address."),
      ).toBeInTheDocument();
    });
    expect(submitAction).not.toHaveBeenCalled();
  });

  test("submits with entered values", async () => {
    const submitAction = vi.fn();

    render(
      <MemoryRouter>
        <ProjectCollaboratorForm submitAction={submitAction} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-firstName"), {
      target: { value: "Chris" },
    });
    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-lastName"), {
      target: { value: "Gaucho" },
    });
    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-email"), {
      target: { value: "cgaucho@ucsb.edu" },
    });
    fireEvent.click(screen.getByTestId("ProjectCollaboratorForm-submit"));

    await waitFor(() => expect(submitAction).toHaveBeenCalled());
    expect(submitAction.mock.calls[0][0]).toEqual({
      firstName: "Chris",
      lastName: "Gaucho",
      email: "cgaucho@ucsb.edu",
    });
  });
});
