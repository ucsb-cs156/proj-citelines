import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import ProjectTable from "main/components/Projects/ProjectTable";
import projectsFixtures from "fixtures/projectsFixtures";
import { currentUserFixtures } from "fixtures/currentUserFixtures";

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
        <ProjectTable {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectTable tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
    window.localStorage.clear();
  });

  test("renders without crashing for empty table", () => {
    renderTable({ projects: [], currentUser: currentUserFixtures.userOnly });
  });

  test("renders expected columns and links, and hides edit/delete for non-owners", async () => {
    renderTable({
      projects: projectsFixtures.threeProjects,
      currentUser: currentUserFixtures.userOnly,
    });

    const headers = [
      "id",
      "Project Name",
      "Description",
      "Date Created",
      "Owner",
      "Settings",
      "Edit",
      "Delete",
    ];
    headers.forEach((h) => expect(screen.getByText(h)).toBeInTheDocument());

    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-name-link"),
    ).toHaveAttribute("href", "/project/1");
    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-settings-link"),
    ).toHaveAttribute("href", "/project/1/settings");
    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-edit-no-permission"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-delete-no-permission"),
    ).toBeInTheDocument();
  });

  test("shows edit/delete buttons for the owning researcher", async () => {
    const owner = {
      loggedIn: true,
      root: {
        user: { email: "phtcon@ucsb.edu" },
        roles: [],
        rolesList: ["ROLE_USER", "ROLE_RESEARCHER"],
      },
    };
    renderTable({
      projects: projectsFixtures.threeProjects,
      currentUser: owner,
    });

    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-edit-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-delete-button"),
    ).toBeInTheDocument();
    // row 2's owner is diba@ucsb.edu, not this user
    expect(
      screen.getByTestId("ProjectTable-cell-row-2-col-edit-no-permission"),
    ).toBeInTheDocument();
  });

  test("shows edit/delete buttons for admins on any project", async () => {
    renderTable({
      projects: projectsFixtures.threeProjects,
      currentUser: currentUserFixtures.adminUser,
    });

    expect(
      screen.getByTestId("ProjectTable-cell-row-0-col-edit-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("ProjectTable-cell-row-2-col-edit-button"),
    ).toBeInTheDocument();
  });

  test("owner can edit a project via the modal", async () => {
    const owner = {
      loggedIn: true,
      root: {
        user: { email: "phtcon@ucsb.edu" },
        roles: [],
        rolesList: ["ROLE_USER", "ROLE_RESEARCHER"],
      },
    };
    axiosMock.onPut("/api/projects").reply(200, {
      ...projectsFixtures.oneProject,
      name: "New Name",
      description: "New Description",
    });

    renderTable({
      projects: projectsFixtures.threeProjects,
      currentUser: owner,
    });

    fireEvent.click(
      screen.getByTestId("ProjectTable-cell-row-0-col-edit-button"),
    );

    await screen.findByTestId("ProjectModal-name");
    fireEvent.change(screen.getByTestId("ProjectModal-name"), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByTestId("ProjectModal-description"), {
      target: { value: "New Description" },
    });
    fireEvent.click(screen.getByTestId("ProjectModal-submit"));

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    expect(axiosMock.history.put[0].params).toEqual({
      projectId: 1,
      name: "New Name",
      description: "New Description",
      citationFormat: "ACM",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Project updated successfully"),
    );
  });

  test("owner can delete a project after confirming", async () => {
    const owner = {
      loggedIn: true,
      root: {
        user: { email: "phtcon@ucsb.edu" },
        roles: [],
        rolesList: ["ROLE_USER", "ROLE_RESEARCHER"],
      },
    };
    axiosMock.onDelete("/api/projects").reply(200, {
      message: "Project with id 1 deleted",
    });

    renderTable({
      projects: projectsFixtures.threeProjects,
      currentUser: owner,
    });

    fireEvent.click(
      screen.getByTestId("ProjectTable-cell-row-0-col-delete-button"),
    );

    await screen.findByText(/Please confirm/);
    fireEvent.click(
      screen.getByTestId("ProjectTable-delete-modal-confirm-button"),
    );

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].params).toEqual({ projectId: 1 });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Project deleted successfully"),
    );
  });
});
