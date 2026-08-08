import { useState } from "react";
import type { Assessment, Question, Course } from "main/types/conceptGraph";
import type { CourseAccess } from "main/components/Courses/CourseMenu";
import AssessmentSelect from "main/components/Scaffold/AssessmentSelect";
import QuestionSearch from "main/components/Scaffold/QuestionSearch";
import LinkToSettings from "main/components/Scaffold/LinkToSettings";
import StarStatus from "main/components/Scaffold/StarStatus";
import UnlockAssessmentsModal from "main/components/Scaffold/UnlockAssessmentsModal";
import { useStaffTools } from "main/utils/useStaffTools";

// Formats the course-identifying banner text shown above the top bar, e.g.
// "CMPSC 5B, S26, UCSB, phtcon@ucsb.edu (3)".
function formatCourseInfo(courseInfo: CourseAccess): string {
  const { courseName, term, school, instructorEmail, id } = courseInfo;
  return `${courseName}, ${term}, ${school.displayName}, ${instructorEmail} (${id})`;
}

interface ScaffoldTopBarProps {
  // Undefined while the course is still loading; the settings link is
  // omitted until it arrives.
  course?: Course;
  // Undefined while still loading; the course-identifying banner above the
  // bar is omitted until it arrives. Unlike `course` (staff-only), this is
  // available to any user with access to the course.
  courseInfo?: CourseAccess;
  courseId: number;
  assessments: Assessment[];
  selectedAssessmentId: string;
  onSelectAssessment: (id: string) => void;
  questions: Question[];
  selectedQuestionId: string;
  onSelectQuestion: (id: string) => void;
  numStarredConcepts: number;
  numTotalConcepts: number;
}

export default function ScaffoldTopBar({
  course,
  courseInfo,
  courseId,
  assessments,
  selectedAssessmentId,
  onSelectAssessment,
  questions,
  selectedQuestionId,
  onSelectQuestion,
  numStarredConcepts,
  numTotalConcepts,
}: ScaffoldTopBarProps) {
  const { enableEditing } = useStaffTools();
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  return (
    <div className="scaffold-top-bar-wrapper">
      {courseInfo && (
        <div
          className="scaffold-top-bar-course-info"
          data-testid="ScaffoldTopBar-courseInfo"
        >
          {formatCourseInfo(courseInfo)}
        </div>
      )}
      <div className="scaffold-top-bar" data-testid="ScaffoldTopBar">
        {enableEditing && (
          <button
            data-testid="ScaffoldTopBar-unlockAssessments"
            onClick={() => setShowUnlockModal(true)}
            style={{
              height: 28,
              padding: "0px 10px",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontSize: 13,
              background: "#ffffff",
              color: "#1E293B",
              border: "1px solid #000000",
              borderRadius: 6,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Unlock Assessments
          </button>
        )}
        <AssessmentSelect
          assessments={assessments}
          selectedAssessmentId={selectedAssessmentId}
          onSelect={onSelectAssessment}
        />
        <UnlockAssessmentsModal
          show={showUnlockModal}
          onHide={() => setShowUnlockModal(false)}
          courseId={courseId}
        />
        <div style={{ width: 300 }}>
          <QuestionSearch
            questions={questions}
            selectedQuestionId={selectedQuestionId}
            onSelect={onSelectQuestion}
            disabled={!selectedAssessmentId || questions.length === 0}
          />
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {course && (
            <LinkToSettings
              course={course}
              testId="ScaffoldTopBar-linkToSettings"
            />
          )}
          <StarStatus
            numStarredConcepts={numStarredConcepts}
            numTotalConcepts={numTotalConcepts}
          />
        </div>
      </div>
    </div>
  );
}
