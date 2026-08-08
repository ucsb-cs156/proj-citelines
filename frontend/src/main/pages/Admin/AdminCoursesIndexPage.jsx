import React from "react";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { useCurrentUser } from "main/utils/currentUser";
import CoursesTable from "main/components/Courses/CoursesTable";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import CourseModal from "main/components/Courses/CourseModal";
import InstructorAdminCoursesTable from "main/components/Courses/InstructorAdminCoursesTable";

export default function AdminCoursesIndexPage() {
  const currentUser = useCurrentUser();

  const {
    data: courses,
    error: _error,
    status: _status,
  } = useBackend(
    ["/api/courses/list/admins"],
    { method: "GET", url: "/api/courses/list/admins" },
    // Stryker disable next-line all : don't test default value of empty list
    [],
  );

  const [viewModal, setViewModal] = React.useState(false);

  const objectToAxiosParams = (course) => ({
    url: "/api/courses/post",
    method: "POST",
    params: {
      courseName: course.courseName,
      term: course.term,
      school: course.school,
    },
  });

  const onSuccess = (course) => {
    toast(`Course ${course.courseName} created`);
    setViewModal(false);
  };

  const mutation = useBackendMutation(objectToAxiosParams, { onSuccess }, [
    "/api/courses/list/admins",
  ]);

  const onSubmit = async (data) => {
    data.school = data.school.key;
    mutation.mutate(data);
  };

  const createCourse = () => setViewModal(true);

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Courses</h1>
        <Button
          onClick={createCourse}
          style={{ float: "right", marginBottom: 10 }}
          variant="primary"
        >
          Create Course
        </Button>
        <CourseModal
          showModal={viewModal}
          toggleShowModal={setViewModal}
          onSubmitAction={onSubmit}
        />
        <InstructorAdminCoursesTable
          testId="AdminCoursesTable"
          courses={courses}
          currentUser={currentUser}
          enableInstructorUpdate={true}
          deleteCourseButton={true}
        />
      </div>
    </BasicLayout>
  );
}
