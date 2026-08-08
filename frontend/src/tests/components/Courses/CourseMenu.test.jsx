import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import CourseMenu from "main/components/Courses/CourseMenu";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import courseMenuFixtures from "fixtures/courseMenuFixtures";
import AxiosMockAdapter from "axios-mock-adapter";
import axios from "axios";

function renderCourseMenu(currentUser) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CourseMenu currentUser={currentUser} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const axiosMock = new AxiosMockAdapter(axios);

describe("CourseMenu tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  test("renders nothing when the user is not logged in", async () => {
    renderCourseMenu(currentUserFixtures.notLoggedIn);
    expect(
      screen.queryByTestId("appnavbar-courses-dropdown"),
    ).not.toBeInTheDocument();
  });

  test("renders nothing when there are no courses", async () => {
    axiosMock.onGet("/api/courses/list").reply(200, courseMenuFixtures.empty);
    renderCourseMenu(currentUserFixtures.userOnly);

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

    expect(
      screen.queryByTestId("appnavbar-courses-dropdown"),
    ).not.toBeInTheDocument();
  });

  test("renders only the Student section when the user only has student access", async () => {
    axiosMock
      .onGet("/api/courses/list")
      .reply(200, courseMenuFixtures.studentOnly);
    renderCourseMenu(currentUserFixtures.userOnly);

    await waitFor(() =>
      expect(
        screen.getByTestId("appnavbar-courses-dropdown"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Courses"));

    await waitFor(() => {
      expect(screen.getByText("Student")).toBeInTheDocument();
    });
    expect(screen.queryByText("Instructor")).not.toBeInTheDocument();
    expect(screen.queryByText("Staff")).not.toBeInTheDocument();
    expect(
      screen.getByText("CMPSC 8 S26, UCSB, diba@ucsb.edu, 1"),
    ).toBeInTheDocument();
  });

  test("renders each course only once, under its highest-priority section", async () => {
    axiosMock.onGet("/api/courses/list").reply(200, courseMenuFixtures.mixed);
    renderCourseMenu(currentUserFixtures.userOnly);

    await waitFor(() =>
      expect(
        screen.getByTestId("appnavbar-courses-dropdown"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Courses"));

    await waitFor(() => {
      expect(screen.getByText("Instructor")).toBeInTheDocument();
    });
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Student")).toBeInTheDocument();

    // CMPSC 8 has instructor, staff, and student access, so it should
    // only appear once, under Instructor.
    expect(
      screen.getAllByText("CMPSC 8 S26, UCSB, diba@ucsb.edu, 1"),
    ).toHaveLength(1);

    // CMPSC 5A has staff and student access, so it should only appear
    // once, under Staff.
    expect(
      screen.getAllByText("CMPSC 5A F26, Other, ykk@ucsb.edu, 2"),
    ).toHaveLength(1);

    // CMPSC 5B has only student access.
    expect(
      screen.getByText("CMPSC 5B F26, Other, phtcon@ucsb.edu, 3"),
    ).toBeInTheDocument();
  });

  test("the course link points to /course/{courseId}", async () => {
    axiosMock
      .onGet("/api/courses/list")
      .reply(200, courseMenuFixtures.studentOnly);
    renderCourseMenu(currentUserFixtures.userOnly);

    await waitFor(() =>
      expect(
        screen.getByTestId("appnavbar-courses-dropdown"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Courses"));

    await waitFor(() => {
      const link = screen
        .getByText("CMPSC 8 S26, UCSB, diba@ucsb.edu, 1")
        .closest("a");
      expect(link).toHaveAttribute("href", "/course/1");
    });
  });
});
