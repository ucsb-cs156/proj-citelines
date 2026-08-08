import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ResearchersIndexPage from "main/pages/Admin/ResearchersIndexPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import mockConsole from "tests/testutils/mockConsole";
import { roleEmailFixtures } from "fixtures/roleEmailFixtures";

import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { vi } from "vitest";
import * as useBackendModule from "main/utils/useBackend";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

const axiosMock = new AxiosMockAdapter(axios);

const useBackendSpy = vi.spyOn(useBackendModule, "useBackend");

describe("ResearchersIndexPage tests", () => {
  const testId = "ResearchersIndexPage";

  const setupAdminUser = () => {
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.adminUser);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  const queryClient = new QueryClient();

  afterEach(() => {
    useBackendSpy.mockClear();
  });

  test("Renders with New Researcher Button", async () => {
    setupAdminUser();
    axiosMock.onGet("/api/admin/researchers/get").reply(200, []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResearchersIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/New Researcher/)).toBeInTheDocument();
    });
    const button = screen.getByText(/New Researcher/);
    expect(button).toHaveAttribute("href", "/admin/researchers/create");
    expect(button).toHaveAttribute("style", "float: right;");
  });

  test("renders three items correctly", async () => {
    setupAdminUser();
    axiosMock
      .onGet("/api/admin/researchers/get")
      .reply(200, roleEmailFixtures.threeItems);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResearchersIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-email`),
      ).toHaveTextContent("researcher1@example.com");
    });
    expect(
      screen.getByTestId(`${testId}-cell-row-1-col-email`),
    ).toHaveTextContent("admin1@example.com");
    expect(
      screen.getByTestId(`${testId}-cell-row-2-col-email`),
    ).toHaveTextContent("researcher2@example.com");

    // delete button should be visible
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-delete-button`),
    ).toBeInTheDocument();
  });

  test("renders empty table when backend unavailable", async () => {
    setupAdminUser();

    axiosMock.onGet("/api/admin/researchers/get").timeout();

    const restoreConsole = mockConsole();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResearchersIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(axiosMock.history.get.length).toBeGreaterThanOrEqual(1);
    });

    const errorMessage = console.error.mock.calls[0][0];
    expect(errorMessage).toMatch(
      "Error communicating with backend via GET on /api/admin/researchers/get",
    );
    restoreConsole();
  });

  test("what happens when you click delete", async () => {
    setupAdminUser();

    axiosMock
      .onGet("/api/admin/researchers/get")
      .reply(200, roleEmailFixtures.threeItems);
    axiosMock
      .onDelete("/api/admin/researchers/delete")
      .reply(200, "first researcher deleted");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResearchersIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-email`),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-email`),
    ).toHaveTextContent("researcher1@example.com");

    const deleteButton = screen.getByTestId(
      `${testId}-cell-row-0-col-delete-button`,
    );
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("first researcher deleted");
    });

    await waitFor(() => {
      expect(axiosMock.history.delete.length).toBe(1);
    });
    expect(axiosMock.history.delete[0].url).toBe(
      "/api/admin/researchers/delete",
    );
    expect(axiosMock.history.delete[0].params).toEqual({
      email: "researcher1@example.com",
    });
  });
  test("useBackend is called with correct cache query key", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResearchersIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(useBackendSpy).toHaveBeenCalledWith(
      [`/api/admin/researchers/get`],
      { method: "GET", url: `/api/admin/researchers/get` },
      [],
    );
  });
});
