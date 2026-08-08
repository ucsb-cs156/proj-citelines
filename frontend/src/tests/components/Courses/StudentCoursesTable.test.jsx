import AxiosMockAdapter from "axios-mock-adapter";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, vi } from "vitest";
import coursesFixtures from "fixtures/coursesFixtures";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StudentCoursesTable } from "main/components/Courses/StudentCoursesTable";
import React from "react";
import * as useBackendModule from "main/utils/useBackend";

const axiosMock = new AxiosMockAdapter(axios);
const queryClient = new QueryClient();
const mockToast = vi.fn();

const useBackendSpy = vi.spyOn(useBackendModule, "useBackend");
const useBackendMutationSpy = vi.spyOn(useBackendModule, "useBackendMutation");

vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

describe("StudentCoursesTable tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    queryClient.clear();
    mockToast.mockReset();
  });

  afterEach(() => {
    useBackendSpy.mockClear();
    useBackendMutationSpy.mockClear();
  });

  test("renders correctly with courses", async () => {
    axiosMock
      .onGet("/api/courses/list/students")
      .reply(200, coursesFixtures.severalCourses);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentCoursesTable testid={"CoursesTable"} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`CoursesTable-cell-row-0-col-id`),
      ).toHaveTextContent("1");
    });
    expect(
      screen.getByTestId(`CoursesTable-cell-row-1-col-id`),
    ).toHaveTextContent("2");
    expect(
      screen.getByTestId(`CoursesTable-cell-row-2-col-id`),
    ).toHaveTextContent("3");
    expect(
      screen.getByTestId(`CoursesTable-cell-row-0-col-courseName`),
    ).toHaveTextContent("CMPSC 8");
    expect(
      screen.getByTestId(`CoursesTable-cell-row-0-col-courseName-link`),
    ).toHaveAttribute("href", "/course/1");
    expect(
      screen.getByTestId(`CoursesTable-cell-row-0-col-term`),
    ).toHaveTextContent("S26");
    expect(
      screen.getByTestId(`CoursesTable-cell-row-0-col-school`),
    ).toHaveTextContent("UCSB");
  });

  test("renders empty message when no courses", async () => {
    axiosMock.onGet("/api/courses/list/students").reply(200, []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentCoursesTable testid={"CoursesTable"} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("You are not enrolled in any student courses yet."),
      ).toBeInTheDocument();
    });
  });
});
