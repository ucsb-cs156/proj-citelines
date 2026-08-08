import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import InstructorCourseShowPage from "main/pages/Courses/InstructorCourseShowPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import coursesFixtures from "fixtures/coursesFixtures";

import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { rosterStudentFixtures } from "fixtures/rosterStudentFixtures";
import { courseStaffFixtures } from "fixtures/courseStaffFixtures";
import { expect, vi } from "vitest";
import mockConsole from "tests/testutils/mockConsole";

import { schoolFixtures } from "fixtures/schoolFixtures";

const mockedNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockedNavigate,
}));
const axiosMock = new AxiosMockAdapter(axios);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

describe("InstructorCourseShowPage tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    queryClient.clear();
    axiosMock.onGet(/\/api\/courses\/getCanvasInfo/).reply(200, {
      courseId: "",
      canvasApiToken: "",
      canvasCourseId: "",
    });
    axiosMock.onGet("/api/jobs/course").reply(200, []);
    axiosMock.onGet("/api/course/options").reply(200, {
      ENABLE_CANVAS: false,
      TRANSLATE_SECTIONS: false,
    });
    axiosMock
      .onGet("/api/coursestaff/course?courseId=1")
      .reply(200, courseStaffFixtures.sixStaff);
    axiosMock
      .onGet("/api/coursestaff/course?courseId=7")
      .reply(200, courseStaffFixtures.sixStaff);
    axiosMock
      .onGet("/api/rosterstudents/course/1 ")
      .reply(200, rosterStudentFixtures.threeStudents);
    axiosMock
      .onGet("/api/rosterstudents/course/7")
      .reply(200, rosterStudentFixtures.threeStudents);
    axiosMock
      .onGet("/api/courses/7")
      .reply(200, coursesFixtures.severalCourses[0]);
    axiosMock.onGet("/api/concepts/course?courseId=1").reply(200, []);
    axiosMock.onGet("/api/concepts/course?courseId=7").reply(200, []);
    axiosMock.onGet("/api/concepts/edges?courseId=1").reply(200, []);
    axiosMock.onGet("/api/concepts/edges?courseId=7").reply(200, []);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock.onGet("/api/concepts/subconcepts").reply(200, []);
    axiosMock.onGet("/api/concepts/top-level").reply(200, []);
  });

  const setupInstructorUser = () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.instructorUser);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  const setupAdminUser = () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.adminUser);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  const setupUserOnly = () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  test("renders correctly for instructor user", async () => {
    const restoreConsole = mockConsole();
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["setTimeout", "clearTimeout"],
    });
    setupInstructorUser();
    const theCourse = {
      ...coursesFixtures.severalCourses[0],
      id: 1,
      createdByEmail: "phtcon@ucsb.edu",
    };
    axiosMock.onGet("/api/courses/1").reply(200, theCourse);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/1"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const testId = "InstructorCourseShowPage";

    await waitFor(() => {
      expect(screen.getByTestId(`${testId}-title`)).toHaveTextContent(
        "CMPSC 8",
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Course Not Found")).not.toBeInTheDocument();
    });

    vi.advanceTimersByTime(3000);
    await waitFor(() => expect(mockedNavigate).not.toHaveBeenCalled());
    vi.useRealTimers();
    restoreConsole();
  });

  test("Returns to course page on timeout", async () => {
    const restoreConsole = mockConsole();
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["setTimeout", "clearTimeout"],
    });
    axiosMock.onGet("/api/courses/7").timeout();
    axiosMock.onGet("/api/rosterstudents/course/7").timeout();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    //Great time to also check initial values
    expect(queryClient.getQueryData(["/api/courses/7"])).toBe(null);
    const testId = "InstructorCourseShowPage";

    await screen.findByTestId(`${testId}-loading`);

    const courseName = screen.getByTestId(`${testId}-loading`);
    expect(courseName).toHaveTextContent("Course: Loading...");

    await screen.findByText(
      "Course not found. You will be returned to the course list in 3 seconds.",
    );
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.getByText("Course Not Found")).toBeInTheDocument();
    expect(screen.getByText("Close")).toHaveClass("btn-primary");
    fireEvent.click(screen.getByText("Close"));
    await waitFor(() =>
      expect(screen.queryByText("Course Not Found")).not.toBeInTheDocument(),
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockedNavigate).toHaveBeenCalledWith("/", {
      replace: true,
    });
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    restoreConsole();
  });
  test("Cleans up correctly on unmount", async () => {
    const restoreConsole = mockConsole();
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["setTimeout", "clearTimeout"],
    });
    axiosMock.onGet("/api/courses/7").timeout();
    axiosMock.onGet("/api/rosterstudents/course/7").timeout();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText(
      "Course not found. You will be returned to the course list in 3 seconds.",
    );
    expect(
      screen.queryByTestId(`InstructorCourseShowPage-cell-row-0-col-id`),
    ).not.toBeInTheDocument();
    fireEvent.keyPress(screen.getByText("Course Not Found"), {
      key: "Escape",
      code: 27,
      charCode: 27,
    });
    fireEvent.click(
      within(screen.getByTestId("AppNavbar")).getByText("Scaffold"),
    );
    await waitFor(() =>
      expect(clearTimeoutSpy.mock.results.length).toBeGreaterThanOrEqual(10),
    );
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
    restoreConsole();
  });

  test("Tab assertions", async () => {
    setupInstructorUser();

    axiosMock.onGet("/api/courses/7").reply(200, {
      id: 7,
      courseName: "CMPSC 8",
      term: "S26",
      school: schoolFixtures.ucsb,
      instructorEmail: "diba@ucsb.edu",
      numStudents: 25,
      numStaff: 3,
    });
    axiosMock
      .onGet("/api/coursestaff/course?courseId=7")
      .reply(200, courseStaffFixtures.sixStaff);

    axiosMock
      .onGet("/api/rosterstudents/course?courseId=7")
      .reply(200, rosterStudentFixtures.threeStudents);
    axiosMock
      .onGet("/api/rosterstudents/course/7")
      .reply(200, rosterStudentFixtures.threeStudents);

    //here
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Students")).toBeInTheDocument(),
    );

    await waitFor(() => expect(screen.getByText("Staff")).toBeInTheDocument());

    expect(screen.getByText("Students")).toHaveAttribute(
      "data-rr-ui-event-key",
      "students",
    );
    expect(screen.getByRole("tab", { name: "Staff" })).toHaveAttribute(
      "data-rr-ui-event-key",
      "staff",
    );
    const studentsTab = screen.getByText("Students");
    fireEvent.click(studentsTab);

    await waitFor(() =>
      expect(studentsTab).toHaveAttribute("aria-selected", "true"),
    );

    const staffTab = screen.getByText("Staff");
    fireEvent.click(staffTab);
    await waitFor(() =>
      expect(staffTab).toHaveAttribute("aria-selected", "true"),
    );
  });

  test("Tab Components are Present", async () => {
    const queryClientSpecific = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    setupInstructorUser();
    axiosMock.onGet("/api/courses/7").reply(200, {
      id: 7,
      courseName: "CMPSC 8",
      term: "S26",
      school: schoolFixtures.ucsb,
      instructorEmail: "diba@ucsb.edu",
      numStudents: 25,
      numStaff: 3,
    });
    axiosMock
      .onGet("/api/coursestaff/course?courseId=7")
      .reply(200, courseStaffFixtures.sixStaff);

    axiosMock
      .onGet("/api/rosterstudents/course?courseId=7")
      .reply(200, rosterStudentFixtures.threeStudents);

    render(
      <QueryClientProvider client={queryClientSpecific}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByTestId(
      "InstructorCourseShowPage-EnrollmentTabComponent",
    );
    expect(
      screen.getByTestId("InstructorCourseShowPage-EnrollmentTabComponent"),
    ).toBeInTheDocument();

    await screen.findByTestId("InstructorCourseShowPage-StaffTabComponent");
    expect(
      screen.getByTestId("InstructorCourseShowPage-StaffTabComponent"),
    ).toBeInTheDocument();
  });

  test("renders the Jobs tab with the JobTabComponent", async () => {
    setupInstructorUser();
    axiosMock
      .onGet("/api/courses/7")
      .reply(200, coursesFixtures.severalCourses[0]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "Jobs" }));

    expect(
      await screen.findByTestId("InstructorCourseShowPage-jobs-tab"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("InstructorCourseShowPage-refresh-jobs"),
    ).toBeInTheDocument();
  });

  test("staff tab defaults to instructor controls", async () => {
    setupInstructorUser();
    axiosMock
      .onGet("/api/courses/7")
      .reply(200, coursesFixtures.severalCourses[0]);
    axiosMock
      .onGet("/api/coursestaff/course?courseId=7")
      .reply(200, courseStaffFixtures.sixStaff);
    axiosMock.onGet("/api/courses/warnings/7").reply(200, {
      showOrganizationAgeWarning: false,
    });
    axiosMock.onGet("/api/rosterstudents/course/7").reply(200, []);
    axiosMock.onGet("/api/teams/all?courseId=7").reply(200, []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "Staff" }));

    const postButtons = await screen.findAllByTestId(
      "InstructorCourseShowPage-post-button",
    );
    expect(
      postButtons.some((button) => button.textContent === "Add Staff Member"),
    ).toBe(true);
    expect(
      screen.getByTestId(
        "InstructorCourseShowPage-CourseStaffTable-cell-row-0-col-Edit-button",
      ),
    ).toBeInTheDocument();
  });
  test("does not show error modal on initial render", async () => {
    setupInstructorUser();

    axiosMock
      .onGet("/api/courses/7")
      .reply(200, coursesFixtures.severalCourses[0]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/instructor/courses/7"]}>
          <Routes>
            <Route
              path="/instructor/courses/:id"
              element={<InstructorCourseShowPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText("CMPSC 8");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
