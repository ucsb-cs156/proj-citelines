import { schoolFixtures } from "./schoolFixtures";

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

const courseMenuFixtures = {
  // No courses at all
  empty: [] as CourseAccess[],

  // Only student access courses
  studentOnly: [
    {
      id: 1,
      courseName: "CMPSC 8",
      term: "S26",
      school: schoolFixtures.ucsb,
      instructorEmail: "diba@ucsb.edu",
      studentAccess: true,
      staffAccess: false,
      instructorAccess: false,
      adminAccess: false,
    },
  ] as CourseAccess[],

  // A mix of instructor, staff, and student courses, including a course
  // with student and staff access (should only appear under Staff), and
  // a course with instructor, staff and student access (should only
  // appear under Instructor).
  mixed: [
    {
      id: 1,
      courseName: "CMPSC 8",
      term: "S26",
      school: schoolFixtures.ucsb,
      instructorEmail: "diba@ucsb.edu",
      studentAccess: true,
      staffAccess: true,
      instructorAccess: true,
      adminAccess: false,
    },
    {
      id: 2,
      courseName: "CMPSC 5A",
      term: "F26",
      school: schoolFixtures.other,
      instructorEmail: "ykk@ucsb.edu",
      studentAccess: true,
      staffAccess: true,
      instructorAccess: false,
      adminAccess: false,
    },
    {
      id: 3,
      courseName: "CMPSC 5B",
      term: "F26",
      school: schoolFixtures.other,
      instructorEmail: "phtcon@ucsb.edu",
      studentAccess: true,
      staffAccess: false,
      instructorAccess: false,
      adminAccess: false,
    },
  ] as CourseAccess[],
};

export default courseMenuFixtures;
