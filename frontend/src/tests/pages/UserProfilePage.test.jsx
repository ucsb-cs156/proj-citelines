import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import UserProfilePage from "main/pages/UserProfilePage";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

const axiosMock = new AxiosMockAdapter(axios);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("UserProfilePage tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  });

  test("renders name, email, and roles for a regular user, without PAT sections", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { email: "cgaucho@ucsb.edu", fullName: "Chris Gaucho" },
      roles: [{ authority: "ROLE_USER" }],
    });

    renderPage();

    expect(
      await screen.findByTestId("UserProfilePage-title"),
    ).toHaveTextContent("User Profile");
    expect(screen.getByTestId("UserProfilePage-name")).toHaveTextContent(
      "Chris Gaucho",
    );
    expect(screen.getByTestId("UserProfilePage-email")).toHaveTextContent(
      "cgaucho@ucsb.edu",
    );
    expect(screen.getByTestId("UserProfilePage-roles")).toHaveTextContent(
      "user",
    );
    expect(
      screen.queryByTestId("UserProfilePage-githubPat-section"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("UserProfilePage-plPat-section"),
    ).not.toBeInTheDocument();
  });

  test("shows 'Not specified' when the user has no fullName", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { email: "cgaucho@ucsb.edu" },
      roles: [{ authority: "ROLE_USER" }],
    });

    renderPage();

    expect(await screen.findByTestId("UserProfilePage-name")).toHaveTextContent(
      "Not specified",
    );
  });

  test("shows both PAT sections, wired to their endpoints, for admin/instructor users", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { email: "admin@ucsb.edu", fullName: "Admin User" },
      roles: [
        { authority: "ROLE_USER" },
        { authority: "ROLE_ADMIN" },
        { authority: "ROLE_INSTRUCTOR" },
      ],
    });
    axiosMock.onGet("/api/pat/github").reply(200, {
      id: 7,
      userId: 1,
      platform: "GITHUB",
      lastFour: "3f2a",
      expiresAt: "2026-12-31",
    });
    axiosMock.onGet("/api/pat/pl").reply(404, {
      type: "EntityNotFoundException",
      message: "PatCredential with id 1 not found",
    });

    renderPage();

    expect(
      await screen.findByTestId("UserProfilePage-roles"),
    ).toHaveTextContent("user, admin, instructor");

    const githubSection = screen.getByTestId(
      "UserProfilePage-githubPat-section",
    );
    expect(githubSection).toBeInTheDocument();
    expect(githubSection).toHaveTextContent("GitHub PAT");
    expect(
      await screen.findByTestId("UserProfilePage-githubPat-status"),
    ).toHaveTextContent("PAT: ******3f2a, expires: 2026-12-31");

    const plSection = screen.getByTestId("UserProfilePage-plPat-section");
    expect(plSection).toBeInTheDocument();
    expect(plSection).toHaveTextContent("PrairieLearn PAT");
    expect(
      await screen.findByTestId("UserProfilePage-plPat-status"),
    ).toHaveTextContent("No PAT set");
  });
});
