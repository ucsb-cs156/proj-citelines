import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import coursesFixtures from "fixtures/coursesFixtures";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import InstructorAdminCoursesTable from "main/components/Courses/InstructorAdminCoursesTable";
import { BrowserRouter, MemoryRouter } from "react-router";
import AxiosMockAdapter from "axios-mock-adapter";
import axios from "axios";
import { vi } from "vitest";
import { schoolList } from "fixtures/schoolFixtures";

window.alert = vi.fn();

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

const queryClient = new QueryClient();
const testId = "InstructorAdminCoursesTable";
let axiosMock;
describe("InstructorAdminCoursesTable tests", () => {
  describe("InstructorAdminCoursesTable basic tests", () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Remove window.location and mock it
      delete window.location;
      window.location = { href: "", reload: vi.fn() }; // Add reload mock
      // Reset mocks
      window.alert.mockClear();
      axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);
    });

    afterEach(() => {
      // Restore original window.location
      window.location = originalLocation;
    });

    test("Has the expected column headers and content for instructor user", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const expectedHeaders = [
        "id",
        "Course Name",
        "Settings",
        "Term",
        "School",
        "Instructor",
        "Students",
        "Staff",
      ];
      const expectedFields = [
        "id",
        "courseName",
        "settings",
        "term",
        "school",
        "instructorEmail",
        "numStudents",
        "numStaff",
      ];

      expectedHeaders.forEach((headerText) => {
        const header = screen.getByText(headerText);
        expect(header).toBeInTheDocument();
      });
      const header = screen.getByTestId(
        "InstructorAdminCoursesTable-header-edit-sort-header",
      );
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent("Edit");

      expectedFields.forEach((field) => {
        const header = screen.getByTestId(`${testId}-cell-row-0-col-${field}`);
        expect(header).toBeInTheDocument();
      });

      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-id`),
      ).toHaveTextContent("1");
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-courseName`),
      ).toHaveTextContent("CMPSC 8");
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-term`),
      ).toHaveTextContent("S26");
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-school`),
      ).toHaveTextContent("UCSB");

      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-instructorEmail`),
      ).toHaveTextContent("diba@ucsb.edu");

      const firstCourseLink = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-0-col-courseName-link",
      );
      expect(firstCourseLink).toHaveAttribute("href", "/course/1");

      const firstCourseSettingsLink = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-0-col-settings-link",
      );
      expect(firstCourseSettingsLink).toHaveAttribute(
        "href",
        "/course/1/settings",
      );

      // Modal should not appear; this kills mutations of this line:
      //   const [showModal, setShowModal] = useState(true);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Check that Edit buttons are present for courses the instructor can edit
      const editButton0 = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      expect(editButton0).toBeInTheDocument();
      expect(editButton0).toHaveTextContent("Edit");

      // Check that instructor cannot edit course they don't own
      const noEditPermission1 = screen.getByTestId(
        `${testId}-cell-row-1-col-edit-no-permission`,
      );
      const noEditPermission2 = screen.getByTestId(
        `${testId}-cell-row-2-col-edit-no-permission`,
      );
      expect(noEditPermission1).toBeInTheDocument();
      expect(noEditPermission2).toBeInTheDocument();
    });

    test("supports permission override props", async () => {
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={[coursesFixtures.severalCourses[2]]}
              currentUser={currentUserFixtures.userOnly}
              canEditCourse={() => true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-edit-button`),
      ).toBeInTheDocument();

      unmount();

      const { unmount: unmountSecond } = render(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={[coursesFixtures.severalCourses[2]]}
              currentUser={currentUserFixtures.userOnly}
              canEditCourse={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-edit-no-permission`),
      ).toBeInTheDocument();
    });

    test("Has the expected column headers and content for admin user", async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      // Check that admin can edit all courses
      const editButton0 = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      expect(editButton0).toBeInTheDocument();
      expect(editButton0).toHaveTextContent("Edit");

      const editButton1 = screen.getByTestId(
        `${testId}-cell-row-1-col-edit-button`,
      );
      expect(editButton1).toBeInTheDocument();
      expect(editButton1).toHaveTextContent("Edit");

      const editButton2 = screen.getByTestId(
        `${testId}-cell-row-2-col-edit-button`,
      );
      expect(editButton2).toBeInTheDocument();
      expect(editButton2).toHaveTextContent("Edit");
    });

    test("expect the correct tooltip ID for the courseName tooltips", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      fireEvent.mouseOver(screen.getByText("CMPSC 5A"));

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveAttribute(
        "id",
        "InstructorAdminCoursesTable-cell-row-1-col-courseName-link-tooltip-coursename",
      );
    });

    test("the correct tooltip renders for courseName", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      fireEvent.mouseOver(screen.getByText("CMPSC 5A"));

      await waitFor(() => {
        expect(
          screen.getByText("View scaffold for CMPSC 5A"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("InstructorAdminCoursesTable update instructor modal tests", () => {
    let invalidateQueriesSpy;

    beforeEach(() => {
      axiosMock = new AxiosMockAdapter(axios);
      axiosMock.reset();
      axiosMock.resetHistory();
      mockToast.mockClear();
      invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);
    });

    afterEach(() => {
      invalidateQueriesSpy.mockRestore();
    });

    test("Tests instructor email is clickable for admin users when enableInstructorUpdate selected", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
              enableInstructorUpdate={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );
      expect(instructorEmailButton).toBeInTheDocument();
      expect(instructorEmailButton).toHaveTextContent("diba@ucsb.edu");
      expect(instructorEmailButton).toHaveClass("btn-link");
    });

    test("Tests instructor email is plain text for admin users when enableInstructorUpdate not selected", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailCell = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail`,
      );
      expect(instructorEmailCell).toBeInTheDocument();
      expect(instructorEmailCell).toHaveTextContent("diba@ucsb.edu");

      // Should not have a button for non-admin users
      expect(
        screen.queryByTestId(`${testId}-cell-row-0-col-instructorEmail-button`),
      ).not.toBeInTheDocument();
    });

    test("Tests instructor email is plain text for non-admin users", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailCell = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail`,
      );
      expect(instructorEmailCell).toBeInTheDocument();
      expect(instructorEmailCell).toHaveTextContent("diba@ucsb.edu");

      // Should not have a button for non-admin users
      expect(
        screen.queryByTestId(`${testId}-cell-row-0-col-instructorEmail-button`),
      ).not.toBeInTheDocument();
    });

    test("Opens modal when admin clicks instructor email", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const modal = screen.getByTestId(`${testId}-modal`);
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass("modal-dialog modal-dialog-centered");
    });

    test("Modal closes when close button (X) is clicked", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    test("Error message if email is empty", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId("update-instructor-email-input");
      const updateButton = screen.getByTestId(
        "update-instructor-submit-button",
      );

      expect(emailInput).toBeInTheDocument();
      expect(updateButton).toBeInTheDocument();

      // Clear the email input
      fireEvent.change(emailInput, { target: { value: "" } });

      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Instructor email is required/),
        ).toBeInTheDocument();
      });
    });

    test("Email input field updates when user types", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId("update-instructor-email-input");

      fireEvent.change(emailInput, { target: { value: "new@example.com" } });

      expect(emailInput).toHaveValue("new@example.com");
    });

    test("Makes successful API call and dismisses modal", async () => {
      axiosMock.onPut("/api/courses/updateInstructor").reply(200, {});

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId("update-instructor-email-input");
      const updateButton = screen.getByTestId(
        "update-instructor-submit-button",
      );

      fireEvent.change(emailInput, { target: { value: "new@example.com" } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
      expect(axiosMock.history.put[0].params).toEqual({
        courseId: 1,
        instructorEmail: "new@example.com",
      });
    });

    test("Shows alert when API call fails with 400 error plus message", async () => {
      axiosMock.onPut("/api/courses/updateInstructor").reply(400, {
        message: "Email must belong to either an instructor or admin",
        type: "IllegalArgumentException",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId("update-instructor-email-input");
      const updateButton = screen.getByTestId(
        "update-instructor-submit-button",
      );

      fireEvent.change(emailInput, {
        target: { value: "invalid@example.com" },
      });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Was not able to update instructor:\nEmail must belong to either an instructor or admin",
        );
      });
    });

    test("Shows alert when API call fails with 400 error without message", async () => {
      axiosMock.onPut("/api/courses/updateInstructor").reply(400, {});

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId("update-instructor-email-input");
      const updateButton = screen.getByTestId(
        "update-instructor-submit-button",
      );

      fireEvent.change(emailInput, {
        target: { value: "invalid@example.com" },
      });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Was not able to update instructor:\nRequest failed with status code 400",
        );
      });
    });

    test("Modal resets state correctly when reopened", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      // Open modal for first course
      const firstInstructorButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );
      fireEvent.click(firstInstructorButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Change email and close modal
      const emailInput = screen.getByTestId("update-instructor-email-input");
      fireEvent.change(emailInput, {
        target: { value: "changed@example.com" },
      });

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Open modal for second course
      const secondInstructorButton = screen.getByTestId(
        `${testId}-cell-row-1-col-instructorEmail-button`,
      );
      fireEvent.click(secondInstructorButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Should show the second course's original email, not the changed value
      expect(screen.getByDisplayValue("ykk@ucsb.edu")).toBeInTheDocument();
      expect(screen.getByText(/CMPSC 5A/)).toBeInTheDocument();
    });

    test("Tests styling of instructor email button for admins", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      // Test button styling
      expect(instructorEmailButton).toHaveStyle({
        padding: "0px",
        textDecoration: "underline",
      });
    });

    test("Tests modal footer button text variations", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const updateButton = screen.getByTestId(
        "update-instructor-submit-button",
      );

      // Test default button text
      expect(updateButton).toHaveTextContent("Update Instructor");
    });

    test("Edit course modal opens and closes properly", async () => {
      axiosMock
        .onPut("/api/courses")
        .reply(200, coursesFixtures.severalCourses[0]);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              testId={testId}
            />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Verify modal is not initially open
      expect(screen.queryByTestId("CourseModal-base")).not.toBeInTheDocument();

      // Click the edit button
      const editButton = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      fireEvent.click(editButton);

      // Check that modal appears with correct title
      await waitFor(() => {
        expect(screen.getByTestId("CourseModal-base")).toBeInTheDocument();
        expect(screen.getByText("Edit Course")).toBeInTheDocument();
        expect(screen.getByText("Update")).toBeInTheDocument();
      });

      // Close modal using close button
      const closeButton = screen.getByTestId("CourseModal-closeButton");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("CourseModal-base"),
        ).not.toBeInTheDocument();
      });
    });

    test("Makes successful course update API call and shows success toast", async () => {
      axiosMock.onPut("/api/courses").reply(200, {});
      axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);

      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              testId={testId}
            />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Click the edit button
      const editButton = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      fireEvent.click(editButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByTestId("CourseModal-base")).toBeInTheDocument();
      });

      // Fill out the form using testIds
      const courseNameInput = screen.getByTestId("CourseModal-courseName");
      const termInput = screen.getByTestId("CourseModal-term");
      const schoolInput = screen.getByTestId("CourseModal-school");

      fireEvent.change(courseNameInput, {
        target: { value: "Updated Course" },
      });
      fireEvent.change(termInput, { target: { value: "Fall 2025" } });
      // Click the Update button
      const updateButton = screen.getByTestId("CourseModal-submit");
      fireEvent.click(updateButton);

      // Verify API call was made with correct parameters
      await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
      expect(axiosMock.history.put[0].params).toEqual({
        courseId: 1,
        courseName: "Updated Course",
        term: "Fall 2025",
        school: "UCSB",
      });

      // Verify success toast was shown
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Course updated successfully");
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(
          screen.queryByTestId("CourseModal-base"),
        ).not.toBeInTheDocument();
      });
    });

    test("Shows error toast when course update API call fails with message", async () => {
      axiosMock.onPut("/api/courses").reply(400, {
        message: "Course name already exists",
        type: "ValidationException",
      });

      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              testId={testId}
            />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Click the edit button
      const editButton = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      fireEvent.click(editButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByTestId("CourseModal-base")).toBeInTheDocument();
      });

      // Fill out all required form fields
      const courseNameInput = screen.getByTestId("CourseModal-courseName");
      const termInput = screen.getByTestId("CourseModal-term");
      const schoolInput = screen.getByTestId("CourseModal-school");

      fireEvent.change(courseNameInput, {
        target: { value: "Invalid Course" },
      });
      fireEvent.change(termInput, { target: { value: "S26" } });
      fireEvent.change(schoolInput, { target: { value: "UCSB" } });

      // Click the Update button
      const updateButton = screen.getByTestId("CourseModal-submit");
      fireEvent.click(updateButton);

      // Verify error toast was shown with message
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Was not able to update course:\nCourse name already exists",
        );
      });
    });

    test("Shows error toast when course update API call fails without message", async () => {
      axiosMock.onPut("/api/courses").reply(400, {});

      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              testId={testId}
            />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Click the edit button
      const editButton = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      fireEvent.click(editButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByTestId("CourseModal-base")).toBeInTheDocument();
      });

      // Fill out all required form fields
      const courseNameInput = screen.getByTestId("CourseModal-courseName");
      const termInput = screen.getByTestId("CourseModal-term");
      const schoolInput = screen.getByTestId("CourseModal-school");

      fireEvent.change(courseNameInput, {
        target: { value: "Invalid Course" },
      });
      fireEvent.change(termInput, { target: { value: "S26" } });
      fireEvent.change(schoolInput, { target: { value: "UCSB" } });

      // Click the Update button
      const updateButton = screen.getByTestId("CourseModal-submit");
      fireEvent.click(updateButton);

      // Verify error toast was shown with generic message
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Was not able to update course:\nRequest failed with status code 400",
        );
      });
    });

    test("Instructor update mutation uses correct cache keys for invalidation", async () => {
      axiosMock.onPut("/api/courses/updateInstructor").reply(200, {});

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              enableInstructorUpdate={true}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const instructorEmailButton = screen.getByTestId(
        `${testId}-cell-row-0-col-instructorEmail-button`,
      );

      fireEvent.click(instructorEmailButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId("update-instructor-email-input");
      const updateButton = screen.getByTestId(
        "update-instructor-submit-button",
      );

      fireEvent.change(emailInput, { target: { value: "new@example.com" } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      await waitFor(() => expect(axiosMock.history.put.length).toBe(1));

      // Verify that invalidateQueries was called with all expected cache keys
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["/api/courses/list/admins"],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["/api/courses/list/instructors"],
      });
    });

    test("Course update mutation uses correct cache keys for invalidation", async () => {
      axiosMock.onPut("/api/courses").reply(200, {});

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.instructorUser}
              testId={testId}
            />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const editButton = screen.getByTestId(
        `${testId}-cell-row-0-col-edit-button`,
      );
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId("CourseModal-base")).toBeInTheDocument();
      });

      const courseNameInput = screen.getByTestId("CourseModal-courseName");
      const termInput = screen.getByTestId("CourseModal-term");
      const schoolInput = screen.getByTestId("CourseModal-school");

      fireEvent.change(courseNameInput, {
        target: { value: "Updated Course" },
      });
      fireEvent.change(termInput, { target: { value: "Fall 2025" } });

      const updateButton = screen.getByTestId("CourseModal-submit");
      fireEvent.click(updateButton);

      await waitFor(() => expect(axiosMock.history.put.length).toBe(1));

      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["/api/courses/list/admins"],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["/api/courses/list/instructors"],
      });
    });
  });

  describe("InstructorCourseTable delete course tests", () => {
    beforeEach(() => {
      axiosMock = new AxiosMockAdapter(axios);
      axiosMock.reset();
      axiosMock.resetHistory();
      axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);
    });

    test("Delete column appears only when deleteCourseButton=true", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
              deleteCourseButton={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      expect(
        screen.queryByTestId(
          "InstructorAdminCoursesTable-header-delete-sort-header",
        ),
      ).not.toBeInTheDocument();

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteHeader = screen.queryByTestId(
        "InstructorAdminCoursesTable-header-delete-sort-header",
      );
      expect(deleteHeader).toBeInTheDocument();
      expect(deleteHeader).toHaveTextContent("Delete");
    });

    test("No Delete column or buttons are shown when default deleteCourseButton=false", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      expect(
        screen.queryByTestId(
          "InstructorAdminCoursesTable-header-delete-sort-header",
        ),
      ).not.toBeInTheDocument();

      const deleteButtons = screen.queryAllByRole("button", { name: "Delete" });
      expect(deleteButtons.length).toBe(0);

      expect(
        screen.queryByTestId(/col-delete-button/i),
      ).not.toBeInTheDocument();
    });

    test("Delete button is enabled only when course has no students or staff", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const disabledButtons = screen
        .getAllByRole("button", { name: "Delete" })
        .filter((btn) => btn.hasAttribute("disabled"));

      expect(disabledButtons.length).toBe(2);

      disabledButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });

      const enabledDeleteButton = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
      );

      expect(enabledDeleteButton).toBeEnabled();
      expect(enabledDeleteButton).toHaveTextContent("Delete");
    });

    test("Delete button is disabled when only one of numStudents or numStaff is zero", async () => {
      const mixedCourses = [
        {
          id: 10,
          courseName: "Test Course A",
          term: "Spring 2026",
          school: coursesFixtures.severalCourses[0].school,
          instructorEmail: "test@ucsb.edu",
          numStudents: 0,
          numStaff: 2,
        },
        {
          id: 11,
          courseName: "Test Course B",
          term: "Spring 2026",
          school: coursesFixtures.severalCourses[0].school,
          instructorEmail: "test@ucsb.edu",
          numStudents: 5,
          numStaff: 0,
        },
      ];

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={mixedCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={true}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      deleteButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe("InstructorAdminCoursesTable delete course API call tests", () => {
    beforeEach(() => {
      axiosMock = new AxiosMockAdapter(axios);
      axiosMock.reset();
      axiosMock.resetHistory();
      axiosMock.onGet("/api/systemInfo/schools").reply(200, schoolList);
    });

    test("Clicking the enabled delete button calls the correct axios DELETE request", async () => {
      axiosMock.onDelete("/api/courses").reply(200);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={false}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteButton = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
      );
      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, Delete",
      });
      fireEvent.click(confirmButton);

      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      const request = axiosMock.history.delete[0];

      expect(request.url).toBe("/api/courses");
      expect(request.params).toEqual({ courseId: 3 });
    });

    test("Successful delete shows toast and closes modal", async () => {
      axiosMock = new AxiosMockAdapter(axios);
      axiosMock.reset();
      axiosMock.resetHistory();
      mockToast.mockClear();
      axiosMock.onDelete("/api/courses").reply(200);

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={false}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      fireEvent.click(
        screen.getByTestId(
          "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
        ),
      );

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, Delete",
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Course deleted successfully");
      });

      await waitFor(() => {
        expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
      });
    });

    test("Delete mutation uses correct cache keys for invalidation", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      axiosMock.onDelete("/api/courses").reply(200, {});

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              deleteCourseButton={true}
              storybook={false}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      // Open the delete modal
      fireEvent.click(
        screen.getByTestId(
          "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
        ),
      );

      // Confirm delete
      const yesButton = await screen.findByRole("button", {
        name: "Yes, Delete",
      });
      fireEvent.click(yesButton);

      // Wait for request
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      // EXPECT BOTH CACHE INVALIDATIONS TO FIRE
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["/api/courses/list/admins"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["/api/courses/list/instructors"],
      });

      invalidateSpy.mockRestore();
    });

    test("Shows error toast when delete course API call fails with message", async () => {
      axiosMock.onDelete("/api/courses").reply(400, {
        message: "Cannot delete: course has active instructors",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={false}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteButton = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
      );
      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, Delete",
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Could not delete course:\nCannot delete: course has active instructors",
        );
      });
    });

    test("Shows fallback error toast when delete course API call fails without message", async () => {
      axiosMock.onDelete("/api/courses").reply(400, {});

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={false}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteButton = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
      );
      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, Delete",
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Could not delete course:\nRequest failed with status code 400",
        );
      });
    });

    test("Delete modal opens when delete is clicked and closes when 'Do not delete' is clicked", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={false}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteButton = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
      );
      fireEvent.click(deleteButton);

      expect(await screen.findByText("Confirm Delete")).toBeInTheDocument();

      expect(
        screen.getByText(
          (content, element) =>
            element.tagName === "P" &&
            element.textContent.includes("delete course CMPSC 5B"),
        ),
      ).toBeInTheDocument();

      const cancelButton = screen.getByRole("button", {
        name: "Do not delete",
      });
      fireEvent.click(cancelButton);

      await waitFor(() =>
        expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument(),
      );
    });

    test("Delete modal closes when clicking the onHide handler", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              storybook={false}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const deleteButton = screen.getByTestId(
        "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
      );
      fireEvent.click(deleteButton);

      expect(await screen.findByText("Confirm Delete")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() =>
        expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument(),
      );
    });

    test("Delete modal hides text when courseToDelete becomes null", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InstructorAdminCoursesTable
              courses={coursesFixtures.severalCourses}
              currentUser={currentUserFixtures.adminUser}
              deleteCourseButton={true}
            />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      // Open modal
      fireEvent.click(
        screen.getByTestId(
          "InstructorAdminCoursesTable-cell-row-2-col-delete-button",
        ),
      );

      // Text should appear
      expect(await screen.findByText(/Please confirm/)).toBeInTheDocument();

      // Close modal -> triggers setShowDeleteModal(false) AND courseToDelete(null)
      fireEvent.click(screen.getByRole("button", { name: "Do not delete" }));

      await waitFor(() =>
        expect(screen.queryByText(/Please confirm/)).not.toBeInTheDocument(),
      );
    });
  });
});
