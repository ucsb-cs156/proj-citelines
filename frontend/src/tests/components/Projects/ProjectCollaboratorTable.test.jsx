import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import ProjectCollaboratorTable from "main/components/Projects/ProjectCollaboratorTable";
import { projectCollaboratorsFixtures } from "fixtures/projectCollaboratorsFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTable(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectCollaboratorTable {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectCollaboratorTable tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders columns and no Delete column for non-owners", () => {
    renderTable({
      collaborators: projectCollaboratorsFixtures.threeCollaborators,
      projectId: 1,
      isOwner: false,
    });

    ["id", "First Name", "Last Name", "Email"].forEach((h) =>
      expect(screen.getByText(h)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  test("owner can delete a collaborator after confirming", async () => {
    axiosMock.onDelete("/api/projectcollaborators/delete").reply(200, {});

    renderTable({
      collaborators: projectCollaboratorsFixtures.threeCollaborators,
      projectId: 1,
      isOwner: true,
      testIdPrefix: "PCT",
    });

    expect(
      screen.getByTestId("PCT-cell-row-0-col-Delete-button"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("PCT-cell-row-0-col-Delete-button"));

    await screen.findByText(/Please confirm/);
    fireEvent.click(screen.getByTestId("PCT-delete-modal-confirm-button"));

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].params).toEqual({
      id: 1,
      projectId: 1,
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Collaborator deleted successfully.",
      ),
    );
  });

  test("Do not delete button hides the modal without deleting", async () => {
    renderTable({
      collaborators: projectCollaboratorsFixtures.threeCollaborators,
      projectId: 1,
      isOwner: true,
      testIdPrefix: "PCT",
    });

    fireEvent.click(screen.getByTestId("PCT-cell-row-0-col-Delete-button"));
    await screen.findByText(/Please confirm/);
    fireEvent.click(screen.getByText("Do not delete"));

    await waitFor(() => {
      expect(screen.queryByText(/Please confirm/)).not.toBeInTheDocument();
    });
    expect(axiosMock.history.delete.length).toBe(0);
  });
});
