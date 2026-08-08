import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import ScaffoldTopBar from "main/components/Scaffold/ScaffoldTopBar";
import { StaffToolsProvider } from "main/utils/staffTools";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import type { Assessment, Course, Question } from "main/types/conceptGraph";
import type { CourseAccess } from "main/components/Courses/CourseMenu";
import mockConsole from "tests/testutils/mockConsole";

import axios from "axios";
import axiosMockAdapter from "axios-mock-adapter";

const axiosMock = new axiosMockAdapter(axios);

const assessments: Assessment[] = [
  { id: "1", pl_assessment_id: "pl1", name: "HW1" },
  { id: "2", pl_assessment_id: "pl2", name: "HW2" },
];

const questions: Question[] = [
  { id: "q1", assessment_id: "1", pl_question_uuid: "u1", title: "Loops 101" },
];

const course: Course = { id: 7, courseName: "CMPSC 156" };

const courseInfo: CourseAccess = {
  id: 3,
  courseName: "CMPSC 5B",
  term: "S26",
  school: { key: "UCSB", displayName: "UCSB" },
  instructorEmail: "phtcon@ucsb.edu",
  studentAccess: false,
  staffAccess: false,
  instructorAccess: true,
  adminAccess: false,
};

const defaultProps = {
  course,
  courseInfo,
  courseId: 7,
  assessments,
  selectedAssessmentId: "",
  onSelectAssessment: () => {},
  questions: [] as Question[],
  selectedQuestionId: "",
  onSelectQuestion: () => {},
  numStarredConcepts: 2,
  numTotalConcepts: 10,
};

function renderTopBar(
  props: Partial<typeof defaultProps> = {},
  currentUser: unknown = currentUserFixtures.userOnly,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["current user"], currentUser);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StaffToolsProvider>
          <ScaffoldTopBar {...defaultProps} {...props} />
        </StaffToolsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ScaffoldTopBar", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = mockConsole();
    sessionStorage.clear();
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock.onGet("/api/assessments/all").reply(200, []);
  });

  afterEach(() => {
    restoreConsole();
    sessionStorage.clear();
  });

  test("renders the bar with its className and testid", () => {
    renderTopBar();
    const bar = screen.getByTestId("ScaffoldTopBar");
    expect(bar).toHaveClass("scaffold-top-bar");
  });

  test("shows the course-identifying banner above the bar", () => {
    renderTopBar();
    expect(screen.getByTestId("ScaffoldTopBar-courseInfo")).toHaveTextContent(
      "CMPSC 5B, S26, UCSB, phtcon@ucsb.edu (3)",
    );
  });

  test("omits the course-identifying banner while courseInfo is still loading", () => {
    renderTopBar({ courseInfo: undefined });
    expect(
      screen.queryByTestId("ScaffoldTopBar-courseInfo"),
    ).not.toBeInTheDocument();
  });

  test("shows the star status and a disabled question search when no assessment is selected", () => {
    renderTopBar();
    expect(screen.getByText("2 / 10")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Select assessment to pick question"),
    ).toBeDisabled();
  });

  test("links to the course settings page", () => {
    renderTopBar();
    expect(screen.getByTestId("ScaffoldTopBar-linkToSettings")).toHaveAttribute(
      "href",
      "/course/7/settings",
    );
  });

  test("omits the settings link while the course is still loading", () => {
    renderTopBar({ course: undefined });
    expect(
      screen.queryByTestId("ScaffoldTopBar-linkToSettings"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("2 / 10")).toBeInTheDocument();
  });

  test("selecting an assessment calls onSelectAssessment", () => {
    const onSelectAssessment = vi.fn();
    renderTopBar({ onSelectAssessment });
    fireEvent.click(screen.getByText("Select assessment…"));
    fireEvent.mouseDown(screen.getByText("HW2"));
    expect(onSelectAssessment).toHaveBeenCalledWith("2");
  });

  test("enables the question search once an assessment is selected and questions load", () => {
    const onSelectQuestion = vi.fn();
    renderTopBar({
      selectedAssessmentId: "1",
      questions,
      onSelectQuestion,
    });
    const input = screen.getByPlaceholderText("Search questions…");
    expect(input).toBeEnabled();
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText("Loops 101"));
    expect(onSelectQuestion).toHaveBeenCalledWith("q1");
  });

  test("keeps the question search disabled when the selected assessment has no questions", () => {
    renderTopBar({ selectedAssessmentId: "1" });
    expect(
      screen.getByPlaceholderText("Select assessment to pick question"),
    ).toBeDisabled();
  });

  test("does not show the Unlock Assessments button for a non-staff user, even in editing mode", () => {
    sessionStorage.setItem(
      "staffTools",
      JSON.stringify({ enableEditing: true }),
    );
    renderTopBar({}, currentUserFixtures.userOnly);
    expect(
      screen.queryByTestId("ScaffoldTopBar-unlockAssessments"),
    ).not.toBeInTheDocument();
  });

  test("does not show the Unlock Assessments button for an admin outside editing mode", () => {
    renderTopBar({}, currentUserFixtures.adminUser);
    expect(
      screen.queryByTestId("ScaffoldTopBar-unlockAssessments"),
    ).not.toBeInTheDocument();
  });

  test("shows the Unlock Assessments button for an admin in editing mode and opens the modal", async () => {
    sessionStorage.setItem(
      "staffTools",
      JSON.stringify({ enableEditing: true }),
    );
    renderTopBar({}, currentUserFixtures.adminUser);
    const button = screen.getByTestId("ScaffoldTopBar-unlockAssessments");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(
      await screen.findByTestId("UnlockAssessmentsModal"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        axiosMock.history.get.filter((r) => r.url === "/api/assessments/all"),
      ).toHaveLength(1),
    );
  });
});
