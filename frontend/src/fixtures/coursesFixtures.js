import { schoolFixtures } from "./schoolFixtures";
const coursesFixtures = {
  severalCourses: [
    {
      id: 1,
      courseName: "CMPSC 8",
      term: "S26",
      school: schoolFixtures.ucsb,
      instructorEmail: "diba@ucsb.edu",
      numStudents: 25,
      numStaff: 3,
    },
    {
      id: 2,
      courseName: "CMPSC 5A",
      term: "F26",
      school: schoolFixtures.other,
      instructorEmail: "ykk@ucsb.edu",
      numStudents: 18,
      numStaff: 2,
    },
    {
      id: 3,
      courseName: "CMPSC 5B",
      term: "F26",
      school: schoolFixtures.other,
      instructorEmail: "phtcon@ucsb.edu",
      numStudents: 0,
      numStaff: 0,
    },
  ],
};

export default coursesFixtures;
