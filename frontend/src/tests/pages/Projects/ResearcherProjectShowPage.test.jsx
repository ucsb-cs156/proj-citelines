import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import ResearcherProjectShowPage from "main/pages/Projects/ResearcherProjectShowPage";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import projectsFixtures from "fixtures/projectsFixtures";
import { projectCollaboratorsFixtures } from "fixtures/projectCollaboratorsFixtures";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";
import { jobsFixtures } from "fixtures/jobsFixtures";
import { tagsFixtures } from "fixtures/tagsFixtures";

function renderAtProject1(
  queryClient = new QueryClient(),
  initialPath = "/project/1",
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/project/:id" element={<ResearcherProjectShowPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockAllProjectTabData(axiosMock) {
  axiosMock
    .onGet("/api/currentUser")
    .reply(200, apiCurrentUserFixtures.researcherUser);
  axiosMock.onGet("/api/projects/1").reply(200, projectsFixtures.oneProject);
  axiosMock
    .onGet("/api/projectcollaborators/project?projectId=1")
    .reply(200, projectCollaboratorsFixtures.threeCollaborators);
  axiosMock
    .onGet("/api/bibtexentries/project?projectId=1")
    .reply(200, bibTexEntriesFixtures.threeEntries);
  axiosMock
    .onGet("/api/jobs/project?projectId=1")
    .reply(200, jobsFixtures.threeJobs);
  axiosMock
    .onGet("/api/tags/project?projectId=1")
    .reply(200, tagsFixtures.threeTags);
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
    axiosMock
      .onGet("/api/bibtexentries/project?projectId=1")
      .reply(200, bibTexEntriesFixtures.threeEntries);
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.threeJobs);
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);

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

    expect(screen.getByText("Citations")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByTestId(
          "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-citeKey",
        ),
      ).toHaveTextContent("smith202...");
    });
    expect(
      screen.getByTestId("ResearcherProjectShowPage-Citations-post-button"),
    ).toBeInTheDocument();

    expect(screen.getByText("Jobs")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByTestId("JobsTable-cell-row-0-col-jobName"),
      ).toHaveTextContent("MembershipAuditJob");
    });

    expect(screen.getByRole("tab", { name: "Tags" })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByTestId(
          "ResearcherProjectShowPage-Tags-TagTable-cell-row-0-col-tag",
        ),
      ).toHaveTextContent("methodology");
    });
    expect(
      screen.getByTestId("ResearcherProjectShowPage-Tags-post-button"),
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
    axiosMock
      .onGet("/api/bibtexentries/project?projectId=1")
      .reply(200, bibTexEntriesFixtures.threeEntries);
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.threeJobs);
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);

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

  test("opening the page with ?tab=Tags shows the Tags tab as active", async () => {
    mockAllProjectTabData(axiosMock);

    renderAtProject1(new QueryClient(), "/project/1?tab=Tags");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Tags" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(screen.getByRole("tab", { name: "Citations" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("opening the page with ?tab=Jobs shows the Jobs tab as active", async () => {
    mockAllProjectTabData(axiosMock);

    renderAtProject1(new QueryClient(), "/project/1?tab=Jobs");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Jobs" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(
      screen.getByTestId("ResearcherProjectShowPage-Jobs-refresh-button"),
    ).toBeInTheDocument();
  });

  test("opening the page with ?tab=Collaborators shows the Collaborators tab as active", async () => {
    mockAllProjectTabData(axiosMock);

    renderAtProject1(new QueryClient(), "/project/1?tab=Collaborators");

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "Collaborators" }),
      ).toHaveAttribute("aria-selected", "true");
    });
  });

  test("an unrecognized ?tab= value falls back to the default Citations tab", async () => {
    mockAllProjectTabData(axiosMock);

    renderAtProject1(new QueryClient(), "/project/1?tab=Bogus");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Citations" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  test("clicking a tab makes it active (and, per issue #86, updates the ?tab= query parameter)", async () => {
    mockAllProjectTabData(axiosMock);

    renderAtProject1();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Citations" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    fireEvent.click(screen.getByRole("tab", { name: "Tags" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Tags" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(screen.getByRole("tab", { name: "Citations" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});
