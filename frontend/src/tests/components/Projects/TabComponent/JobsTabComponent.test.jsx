import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import JobsTabComponent from "main/components/Projects/TabComponent/JobsTabComponent";
import { jobsFixtures } from "fixtures/jobsFixtures";

function renderTab(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <JobsTabComponent projectId={1} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("JobsTabComponent tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  test("renders the job list for the project", async () => {
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.threeJobs);

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("JobsTable-cell-row-0-col-jobName"),
      ).toHaveTextContent("MembershipAuditJob");
    });
  });

  test("clicking Refresh re-fetches the job list", async () => {
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.oneJob);

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("JobsTable-cell-row-0-col-jobName"),
      ).toHaveTextContent("MembershipAuditJob");
    });

    fireEvent.click(screen.getByTestId("JobsTabComponent-refresh-button"));

    await waitFor(() =>
      expect(
        axiosMock.history.get.filter(
          (r) => r.url === "/api/jobs/project?projectId=1",
        ).length,
      ).toBe(2),
    );
  });

  test("clicking the Check Links Start button launches the job and refetches the job list", async () => {
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.oneJob);
    axiosMock
      .onPost("/api/jobs/launch/checkLinks")
      .reply(200, { id: 99, jobName: "CheckLinksJob" });

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("JobsTable-cell-row-0-col-jobName"),
      ).toHaveTextContent("MembershipAuditJob");
    });

    fireEvent.click(
      screen.getByTestId("JobsTabComponent-checkLinksJob-job-submit"),
    );

    await waitFor(() =>
      expect(
        axiosMock.history.post.filter(
          (r) => r.url === "/api/jobs/launch/checkLinks",
        ).length,
      ).toBe(1),
    );

    await waitFor(() =>
      expect(
        axiosMock.history.get.filter(
          (r) => r.url === "/api/jobs/project?projectId=1",
        ).length,
      ).toBe(2),
    );
  });

  test("clicking the Upgrade BibTeX Entries Start button launches the job and refetches the job list", async () => {
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.oneJob);
    axiosMock
      .onPost("/api/jobs/launch/upgradeBibTexEntries")
      .reply(200, { id: 99, jobName: "BibTexEntryUpgradeJob" });

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("JobsTable-cell-row-0-col-jobName"),
      ).toHaveTextContent("MembershipAuditJob");
    });

    fireEvent.click(
      screen.getByTestId("JobsTabComponent-upgradeBibTexEntriesJob-job-submit"),
    );

    await waitFor(() =>
      expect(
        axiosMock.history.post.filter(
          (r) => r.url === "/api/jobs/launch/upgradeBibTexEntries",
        ).length,
      ).toBe(1),
    );

    await waitFor(() =>
      expect(
        axiosMock.history.get.filter(
          (r) => r.url === "/api/jobs/project?projectId=1",
        ).length,
      ).toBe(2),
    );
  });

  test("clicking the Detect Duplicates Start button launches the job and refetches the job list", async () => {
    axiosMock
      .onGet("/api/jobs/project?projectId=1")
      .reply(200, jobsFixtures.oneJob);
    axiosMock
      .onPost("/api/jobs/launch/detectDuplicates")
      .reply(200, { id: 99, jobName: "DuplicateDetectionJob" });

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("JobsTable-cell-row-0-col-jobName"),
      ).toHaveTextContent("MembershipAuditJob");
    });

    fireEvent.click(
      screen.getByTestId("JobsTabComponent-detectDuplicatesJob-job-submit"),
    );

    await waitFor(() =>
      expect(
        axiosMock.history.post.filter(
          (r) => r.url === "/api/jobs/launch/detectDuplicates",
        ).length,
      ).toBe(1),
    );

    await waitFor(() =>
      expect(
        axiosMock.history.get.filter(
          (r) => r.url === "/api/jobs/project?projectId=1",
        ).length,
      ).toBe(2),
    );
  });
});
