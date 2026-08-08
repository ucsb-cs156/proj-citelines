import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import coursesFixtures from "fixtures/coursesFixtures";
import InstructorAdminCoursesTable from "main/components/Courses/InstructorAdminCoursesTable";
import InstructorCoursesIndexPage from "main/pages/Courses/InstructorCoursesIndexPage";
import { MemoryRouter } from "react-router";
import mockConsole from "tests/testutils/mockConsole";

import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { schoolList } from "fixtures/schoolFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import * as useBackendModule from "main/utils/useBackend";
import { afterEach, vi } from "vitest";

const mockToast = vi.fn();

let axiosMock;
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

const useBackendSpy = vi.spyOn(useBackendModule, "useBackend");
const useBackendMutationSpy = vi.spyOn(useBackendModule, "useBackendMutation");

describe("InstructorInstructorCoursesIndexPage tests", () => {
  const testId = "InstructorAdminCoursesTable";

  beforeEach(() => {
    axiosMock = new AxiosMockAdapter(axios);
    axiosMock.reset();
    axiosMock.resetHistory();
    queryClient.clear();
    axiosMock.onGet("/api/courses/list/instructors").reply(200, []);
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

  const setupInstructorUser = () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.instructorUser);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  const queryClient = new QueryClient();

  test("Renders empty table for admin user correctly", async () => {
    setupInstructorUser();
    axiosMock.onGet("/api/courses/list/instructors").reply(200, []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Courses/)).toBeInTheDocument();
    });
  });

  test("Renders course data correctly for admin user", async () => {
    setupInstructorUser();
    axiosMock
      .onGet("/api/courses/list/instructors")
      .reply(200, coursesFixtures.severalCourses);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorCoursesIndexPage />
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
    expect(instructorEmail).toHaveTextContent("diba@ucsb.edu");
  });

  test("renders empty table when backend unavailable, admin only", async () => {
    setupInstructorUser();

    axiosMock.onGet("/api/courses/list/instructors").timeout();

    const restoreConsole = mockConsole();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(axiosMock.history.get.length).toBeGreaterThanOrEqual(1);
    });

    const errorMessage = console.error.mock.calls[0][0];
    expect(errorMessage).toMatch(
      "Error communicating with backend via GET on /api/courses/list/instructors",
    );
    restoreConsole();
  });

  test("Can submit new course", async () => {
    setupInstructorUser();
    axiosMock
      .onPost("/api/courses/post")
      .reply(200, coursesFixtures.severalCourses[0]);
    axiosMock
      .onGet("/api/courses/list/instructors")
      .reply(200, coursesFixtures.severalCourses);
    axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorCoursesIndexPage />
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
      queryClient.getQueryState(["/api/courses/list/instructors"]),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByTestId("CourseModal-base")).not.toBeInTheDocument(),
    );
  });

  test("Delete column does appear when deleteCourseButton is true", async () => {
    setupInstructorUser();

    axiosMock
      .onGet("/api/courses/list/instructors")
      .reply(200, coursesFixtures.severalCourses);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Row must be present first
    await waitFor(() =>
      expect(
        screen.getByTestId("InstructorAdminCoursesTable-cell-row-0-col-id"),
      ).toBeInTheDocument(),
    );

    // The Delete column SHOULD appear
    const deleteHeader = screen.getByTestId(
      "InstructorAdminCoursesTable-header-delete-sort-header",
    );
    expect(deleteHeader).toBeInTheDocument();
  });

  test("Delete column does not appear when deleteCourseButton is false", async () => {
    setupInstructorUser();

    axiosMock
      .onGet("/api/courses/list/instructors")
      .reply(200, coursesFixtures.severalCourses);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorAdminCoursesTable
            courses={coursesFixtures.severalCourses}
            currentUser={apiCurrentUserFixtures.instructorUser}
            enableInstructorUpdate={true}
            deleteCourseButton={false} // ← forced false
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("InstructorAdminCoursesTable-cell-row-0-col-id"),
      ).toBeInTheDocument(),
    );

    const deleteHeader = screen.queryByTestId(
      "InstructorAdminCoursesTable-header-delete-sort-header",
    );
    expect(deleteHeader).not.toBeInTheDocument();
  });
  test("useBackend and useBackendMutation are called with correct cache query key", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InstructorCoursesIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(useBackendSpy).toHaveBeenCalledWith(
      [`/api/courses/list/instructors`],
      { method: "GET", url: `/api/courses/list/instructors` },
      [],
    );

    expect(useBackendMutationSpy).toHaveBeenCalledWith(
      expect.any(Function),
      { onSuccess: expect.any(Function) },
      [`/api/courses/list/instructors`],
    );
  });
});
