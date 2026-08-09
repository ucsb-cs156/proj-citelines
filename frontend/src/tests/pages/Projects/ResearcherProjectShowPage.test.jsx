import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import ResearcherProjectShowPage from "main/pages/Projects/ResearcherProjectShowPage";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import projectsFixtures from "fixtures/projectsFixtures";
import { projectCollaboratorsFixtures } from "fixtures/projectCollaboratorsFixtures";

function renderAtProject1(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/project/1"]}>
        <Routes>
          <Route path="/project/:id" element={<ResearcherProjectShowPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ResearcherProjectShowPage tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  });

  test("shows loading, then title/description, and the Collaborators tab, for the owner", async () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.researcherUser);
    axiosMock.onGet("/api/projects/1").reply(200, {
      ...projectsFixtures.oneProject,
      owner: apiCurrentUserFixtures.researcherUser.user.email,
    });
    axiosMock
      .onGet("/api/projectcollaborators/project?projectId=1")
      .reply(200, projectCollaboratorsFixtures.threeCollaborators);

    renderAtProject1();

    expect(
      screen.getByTestId("ResearcherProjectShowPage-loading"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId("ResearcherProjectShowPage-title"),
      ).toHaveTextContent("Citation Graphs");
    });
    expect(
      screen.getByTestId("ResearcherProjectShowPage-description"),
    ).toHaveTextContent("A project studying citation graphs in CS education");
    expect(screen.getByText("Collaborators")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByTestId(
          "ResearcherProjectShowPage-ProjectCollaboratorTable-cell-row-0-col-id",
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("ResearcherProjectShowPage-post-button"),
    ).toBeInTheDocument();
  });

  test("a collaborator (non-owner) does not see the Add Collaborator button", async () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock.onGet("/api/projects/1").reply(200, projectsFixtures.oneProject);
    axiosMock
      .onGet("/api/projectcollaborators/project?projectId=1")
      .reply(200, projectCollaboratorsFixtures.threeCollaborators);

    renderAtProject1();

    await waitFor(() => {
      expect(
        screen.getByTestId("ResearcherProjectShowPage-title"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("ResearcherProjectShowPage-post-button"),
    ).not.toBeInTheDocument();
  });

  test("shows an error modal and returns home when the project cannot be fetched", async () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.researcherUser);
    axiosMock.onGet("/api/projects/1").reply(404, { message: "not found" });

    renderAtProject1();

    await waitFor(() => {
      expect(screen.getByText("Project Not Found")).toBeInTheDocument();
    });
  });
});
