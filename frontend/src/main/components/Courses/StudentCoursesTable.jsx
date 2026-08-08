import { useBackend, useBackendMutation } from "main/utils/useBackend";
import CoursesTable from "main/components/Courses/CoursesTable";
import React from "react";

export function StudentCoursesTable({ testid }) {
  const { data: courses } = useBackend(
    ["/api/courses/list/students"],
    // Stryker disable next-line StringLiteral : The default value for an empty ("") method is GET. Therefore, there is no way to kill a mutation that transforms "GET" to ""
    { method: "GET", url: "/api/courses/list/students" },
    // Stryker disable next-line all : don't test default value of empty list
    [],
  );

  return (
    <>
      {courses.length > 0 ? (
        <>
          <CoursesTable
            courses={courses}
            testId={testid}
            courseNameLinkPrefix="/student/courses"
          />
        </>
      ) : (
        <p>You are not enrolled in any student courses yet.</p>
      )}
    </>
  );
}
