import { fireEvent, render, waitFor, screen } from "@testing-library/react";
import { courseStaffFixtures } from "fixtures/courseStaffFixtures";
import CourseStaffTable from "main/components/CourseStaff/CourseStaffTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, vi } from "vitest";
import * as useBackendModule from "main/utils/useBackend";

const queryClient = new QueryClient();
const mockToast = vi.fn();

const useBackendMutationSpy = vi.spyOn(useBackendModule, "useBackendMutation");

vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

const axiosMock = new AxiosMockAdapter(axios);
describe("CourseStaffTable tests", () => {
  const expectedHeaders = ["id", "First Name", "Last Name", "Email"];
  const expectedFields = ["id", "firstName", "lastName", "email"];
  const testId = "CourseStaffTable";

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    queryClient.clear();
    mockToast.mockClear();
  });

  afterEach(() => {
    useBackendMutationSpy.mockClear();
  });

  test("renders empty table correctly", () => {
    // arrange
    const currentUser = currentUserFixtures.adminUser;

    // act
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CourseStaffTable staff={[]} currentUser={currentUser} courseId="7" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // assert

    const courseIdHiddenElement = screen.getByTestId(`${testId}-courseId`);
    expect(courseIdHiddenElement).toBeInTheDocument();
    expect(courseIdHiddenElement).toHaveAttribute("data-course-id", "7");
    // Expect it to have style display:none
    expect(courseIdHiddenElement).toHaveStyle("display: none");

    expectedHeaders.forEach((headerText) => {
      const header = screen.getByText(headerText);
      expect(header).toBeInTheDocument();
    });

    expectedFields.forEach((field) => {
      const fieldElement = screen.queryByTestId(
        `${testId}-cell-row-0-col-${field}`,
      );
      expect(fieldElement).not.toBeInTheDocument();
    });
  });
  test("Has the expected column headers, content and buttons for admin user", () => {
    // arrange
    const currentUser = currentUserFixtures.adminUser;

    // act
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CourseStaffTable
            staff={courseStaffFixtures.sixStaff}
            currentUser={currentUser}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // assert
    expectedHeaders.forEach((headerText) => {
      const header = screen.getByText(headerText);
      expect(header).toBeInTheDocument();
    });

    expect(
      screen.getByTestId("CourseStaffTable-cell-row-0-col-Edit-button"),
    ).toBeInTheDocument();

    expectedFields.forEach((field) => {
      const header = screen.getByTestId(`${testId}-cell-row-0-col-${field}`);
      expect(header).toBeInTheDocument();
    });

    expect(screen.getByTestId(`${testId}-cell-row-0-col-id`)).toHaveTextContent(
      "1",
    );

    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-firstName`),
    ).toHaveTextContent("Dr. John");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-lastName`),
    ).toHaveTextContent("Professor");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-email`),
    ).toHaveTextContent("johnprof@ucsb.edu");

    const editButton = screen.getByTestId(
      `${testId}-cell-row-0-col-Edit-button`,
    );
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveClass("btn-primary");

    const deleteButton = screen.getByTestId(
      `${testId}-cell-row-0-col-Delete-button`,
    );
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveClass("btn-danger");
  });

  test("Has the expected column headers, content for ordinary user", () => {
    // arrange
    const currentUser = currentUserFixtures.userOnly;

    // act
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CourseStaffTable
            staff={courseStaffFixtures.threeStaff}
            currentUser={currentUser}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // assert
    expectedHeaders.forEach((headerText) => {
      const header = screen.getByText(headerText);
      expect(header).toBeInTheDocument();
    });

    expectedFields.forEach((field) => {
      const header = screen.getByTestId(`${testId}-cell-row-0-col-${field}`);
      expect(header).toBeInTheDocument();
    });

    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-firstName`),
    ).toHaveTextContent("Dr. John");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-lastName`),
    ).toHaveTextContent("Professor");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-email`),
    ).toHaveTextContent("johnprof@ucsb.edu");

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  test("Edit button navigates to the edit modal", async () => {
    const currentUser = currentUserFixtures.adminUser;
    const queryClientSpecific = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });
    queryClientSpecific.setQueryData(
      ["/api/coursestaff/course?courseId=7"],
      courseStaffFixtures.threeStaff,
    );
    queryClientSpecific.setQueryData(["mock queryData"], null);
    axiosMock.onPut(/\/api\/coursestaff?courseId=7.*/).reply(200);
    render(
      <QueryClientProvider client={queryClientSpecific}>
        <MemoryRouter>
          <CourseStaffTable
            staff={courseStaffFixtures.threeStaff}
            currentUser={currentUser}
            courseId={7}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const editButton = screen.getByTestId(
      "CourseStaffTable-cell-row-0-col-Edit-button",
    );
    fireEvent.click(editButton);
    await screen.findByText("Edit Staff Member");
    expect(screen.getByTestId("CourseStaffTable-modal-body")).toHaveClass(
      "pb-3",
    );
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Update"));
    await waitFor(() => axiosMock.history.put.length === 1);
  });

  test("Delete button calls delete callback", async () => {
    const currentUser = currentUserFixtures.adminUser;
    const queryClientSpecific = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });
    queryClientSpecific.setQueryData(
      ["/api/coursestaff/course/7"],
      courseStaffFixtures.threeStaff,
    );
    queryClientSpecific.setQueryData(["mock queryData"], null);
    axiosMock.onDelete("/api/coursestaff/delete").reply(200);
    render(
      <QueryClientProvider client={queryClientSpecific}>
        <MemoryRouter>
          <CourseStaffTable
            staff={courseStaffFixtures.threeStaff}
            currentUser={currentUser}
            courseId={7}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const deleteButton = screen.getByTestId(
      "CourseStaffTable-cell-row-0-col-Delete-button",
    );
    fireEvent.click(deleteButton);
    await screen.findByTestId("CourseStaffDeleteModal");
    fireEvent.click(screen.getByText("Delete Staff Member"));
    await waitFor(() => axiosMock.history.delete.length === 1);
    expect(axiosMock.history.delete[0].params).toEqual({
      id: 1,
      courseId: 7,
    });
    await waitFor(() =>
      expect(screen.queryByText("Delete Staff Member")).not.toBeInTheDocument(),
    );
    expect(mockToast).toBeCalledWith("Staff member deleted successfully.");
  });

  test("onEditSuccess calls toast and hideModal", async () => {
    axiosMock.onPut("/api/coursestaff").reply(200, []);
    // Arrange
    const currentUser = currentUserFixtures.adminUser;
    // Render the component
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CourseStaffTable
            staff={courseStaffFixtures.threeStaff}
            currentUser={currentUser}
            courseId={7}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Access the component instance via screen (simulate edit success)
    // Find and click the Edit button to open modal
    const editButton = screen.getByTestId(
      "CourseStaffTable-cell-row-0-col-Edit-button",
    );
    fireEvent.click(editButton);

    // The modal should be open
    expect(screen.getByText("Edit Staff Member")).toBeInTheDocument();

    // Simulate successful edit by clicking Update
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(
      "Staff member updated successfully.",
    );

    // Modal should be closed after success
    await waitFor(() => {
      expect(screen.queryByText("Edit Staff Member")).not.toBeInTheDocument();
    });
  });

  test("useBackendMutation is called with correct cache query key", async () => {
    const currentUser = currentUserFixtures.adminUser;
    const courseId = 7;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CourseStaffTable
            staff={courseStaffFixtures.sixStaff}
            currentUser={currentUser}
            courseId={courseId}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(useBackendMutationSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      { onSuccess: expect.any(Function) },
      [`/api/coursestaff/course?courseId=${courseId}`],
    );

    expect(useBackendMutationSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      { onSuccess: expect.any(Function) },
      [`/api/coursestaff/course?courseId=${courseId}`],
    );
  });
});
