import { Link } from "react-router";
import { NavDropdown } from "react-bootstrap";
import { useBackend } from "main/utils/useBackend";
import { type CurrentUser } from "main/utils/currentUser";
import { GraphIcon } from "main/components/Common/Icons";

export interface CourseAccess {
  id: number;
  courseName: string;
  term: string;
  school: { displayName: string; key: string };
  instructorEmail: string;
  studentAccess: boolean;
  staffAccess: boolean;
  instructorAccess: boolean;
  adminAccess: boolean;
}

function CourseMenuItem({ course }: { course: CourseAccess }) {
  return (
    <NavDropdown.Item as={Link} to={`/course/${course.id}`}>
      <GraphIcon className="me-2" width="16" height="16" />
      {`${course.courseName} ${course.term}, ${course.school.displayName}, ${course.instructorEmail}, ${course.id}`}
    </NavDropdown.Item>
  );
}

function CourseMenuSection({
  heading,
  courses,
}: {
  heading: string;
  courses: CourseAccess[];
}) {
  if (courses.length === 0) {
    return null;
  }
  return (
    <>
      <NavDropdown.Header>{heading}</NavDropdown.Header>
      {courses.map((course) => (
        <CourseMenuItem key={course.id} course={course} />
      ))}
    </>
  );
}

export default function CourseMenu({
  currentUser,
}: {
  currentUser: CurrentUser;
}): React.JSX.Element | null {
  const { data: courses } = useBackend<CourseAccess[]>(
    ["/api/courses/list"],
    { method: "GET", url: "/api/courses/list" },
    // Stryker disable next-line all : don't test default value of empty list
    [],
    true,
    { enabled: currentUser.loggedIn },
  );

  const courseList = courses ?? [];

  if (!currentUser.loggedIn || courseList.length === 0) {
    return null;
  }

  const instructorCourses = courseList.filter((c) => c.instructorAccess);
  const staffCourses = courseList.filter(
    (c) => c.staffAccess && !c.instructorAccess,
  );
  const studentCourses = courseList.filter(
    (c) => c.studentAccess && !c.instructorAccess && !c.staffAccess,
  );

  if (
    instructorCourses.length === 0 &&
    staffCourses.length === 0 &&
    studentCourses.length === 0
  ) {
    return null;
  }

  return (
    <NavDropdown
      title="Courses"
      id="appnavbar-courses-dropdown"
      data-testid="appnavbar-courses-dropdown"
    >
      <CourseMenuSection heading="Instructor" courses={instructorCourses} />
      <CourseMenuSection heading="Staff" courses={staffCourses} />
      <CourseMenuSection heading="Student" courses={studentCourses} />
    </NavDropdown>
  );
}
