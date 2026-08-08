import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import mockConsole from "tests/testutils/mockConsole";
import coursesFixtures from "fixtures/coursesFixtures";

import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, vi } from "vitest";
import * as useBackendModule from "main/utils/useBackend";
import { schoolList } from "fixtures/schoolFixtures";

import AdminCoursesIndexPage from "main/pages/Admin/AdminCoursesIndexPage";

let axiosMock;

const useBackendSpy = vi.spyOn(useBackendModule, "useBackend");
const useBackendMutationSpy = vi.spyOn(useBackendModule, "useBackendMutation");

describe("AdminCoursesIndexPage tests", () => {
  const testId = "AdminCoursesTable";

  beforeEach(() => {
    axiosMock = new AxiosMockAdapter(axios);
    axiosMock.reset();
    axiosMock.resetHistory();
    queryClient.clear();
    axiosMock.onGet("/api/courses/list/admins").reply(200, []);
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  });

  afterEach(() => {
    useBackendSpy.mockClear();
    useBackendMutationSpy.mockClear();
  });

  const setupAdminUser = () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.adminUser);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  const queryClient = new QueryClient();

  test("Renders empty table for admin user correctly", async () => {
    setupAdminUser();
    axiosMock.onGet("/api/courses/list/admins").reply(200, []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Courses/)).toBeInTheDocument();
    });
  });

  test("Renders course data correctly for admin user", async () => {
    setupAdminUser();
    axiosMock
      .onGet("/api/courses/list/admins")
      .reply(200, coursesFixtures.severalCourses);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-id`),
      ).toHaveTextContent("1");
    });
    expect(screen.getByTestId(`${testId}-cell-row-1-col-id`)).toHaveTextContent(
      "2",
    );
    expect(screen.getByTestId(`${testId}-cell-row-2-col-id`)).toHaveTextContent(
      "3",
    );

    const instructorEmail = screen.getByTestId(
      `${testId}-cell-row-0-col-instructorEmail`,
    );
    expect(instructorEmail).toBeInTheDocument();
    expect(instructorEmail).toHaveTextContent("diba@ucsb.edu");
  });

  test("renders empty table when backend unavailable, admin only", async () => {
    setupAdminUser();

    axiosMock.onGet("/api/courses/list/admins").timeout();

    const restoreConsole = mockConsole();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(axiosMock.history.get.length).toBeGreaterThanOrEqual(1);
    });

    const errorMessage = console.error.mock.calls[0][0];
    expect(errorMessage).toMatch(
      "Error communicating with backend via GET on /api/courses/list/admins",
    );
    restoreConsole();
  });

  test("Can submit new course", async () => {
    setupAdminUser();
    axiosMock
      .onPost("/api/courses/post")
      .reply(200, coursesFixtures.severalCourses[0]);
    axiosMock
      .onGet("/api/courses/list/admins")
      .reply(200, coursesFixtures.severalCourses);
    axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const createCourse = screen.getByText("Create Course");
    expect(createCourse).toHaveClass("btn btn-primary");
    expect(createCourse).toHaveStyle("float: right; margin-bottom: 10px;");
    fireEvent.click(createCourse);

    await screen.findByLabelText("Course Name");
    const courseName = screen.getByLabelText("Course Name");
    const courseTerm = screen.getByLabelText("Term");
    const school = screen.getByTestId("CourseModal-school");
    fireEvent.change(courseName, { target: { value: "CMPSC 156" } });
    fireEvent.change(courseTerm, { target: { value: "Spring 2025" } });
    fireEvent.change(school, { target: { value: "UCSB" } });
    fireEvent.click(
      await within(screen.getByTestId("CourseModal-base")).findByText("UCSB"),
    );
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe("/api/courses/post");
    expect(axiosMock.history.post[0].params).toEqual({
      courseName: "CMPSC 156",
      term: "Spring 2025",
      school: "UCSB",
    });
    expect(
      queryClient.getQueryState(["/api/courses/list/admins"]),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByTestId("CourseModal-base")).not.toBeInTheDocument(),
    );
  });

  test("Delete column does appear when deleteCourseButton is true", async () => {
    setupAdminUser();

    axiosMock
      .onGet("/api/courses/list/admins")
      .reply(200, coursesFixtures.severalCourses);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Row must be present first
    await waitFor(() =>
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-id`),
      ).toBeInTheDocument(),
    );

    // The Delete column SHOULD appear
    const deleteHeader = screen.getByTestId(
      `${testId}-header-delete-sort-header`,
    );
    expect(deleteHeader).toBeInTheDocument();
  });

  test("useBackend and useBackendMutation are called with correct cache query key", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(useBackendSpy).toHaveBeenCalledWith(
      [`/api/courses/list/admins`],
      { method: "GET", url: `/api/courses/list/admins` },
      [],
    );

    expect(useBackendMutationSpy).toHaveBeenCalledWith(
      expect.any(Function),
      { onSuccess: expect.any(Function) },
      [`/api/courses/list/admins`],
    );
  });
});
