import OurTable from "main/components/Common/OurTable";
import { hasRole } from "main/utils/currentUser";
import { Tooltip, OverlayTrigger, Button, Fade } from "react-bootstrap";
import { useState } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import UpdateInstructorForm from "main/components/Courses/UpdateInstructorForm";
import CourseModal from "main/components/Courses/CourseModal";
import Modal from "react-bootstrap/Modal";
import { useLocation } from "react-router";
import LinkToScaffold from "main/components/Scaffold/LinkToScaffold";
import LinkToSettings from "main/components/Scaffold/LinkToSettings";

export default function InstructorAdminCoursesTable({
  courses,
  storybook = false,
  currentUser,
  testId = "InstructorAdminCoursesTable",
  enableInstructorUpdate = false,
  deleteCourseButton = false,
  canEditCourse,
  mutationQueryKeys = [
    "/api/courses/list/admins",
    "/api/courses/list/instructors",
  ],
}) {
  const location = useLocation();

  const canEdit = (row) => {
    if (canEditCourse !== undefined) {
      return typeof canEditCourse === "function"
        ? canEditCourse(row)
        : canEditCourse;
    }
    if (hasRole(currentUser, "ROLE_ADMIN")) {
      return true;
    }
    if (
      hasRole(currentUser, "ROLE_INSTRUCTOR") &&
      row.original.instructorEmail === currentUser.root.user.email
    ) {
      return true;
    }

    return false;
  };

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const handleShowCourseEditModal = (course) => {
    setSelectedCourseForEdit(course);
    setShowCourseEditModal(true);
  };

  const handleCloseCourseEditModal = () => {
    setShowCourseEditModal(false);
    setSelectedCourseForEdit(null);
  };

  const columns = [
    {
      header: "id",
      accessorKey: "id", // accessor is the "key" in the data
    },
    {
      header: "Course Name",
      id: "courseName",
      cell: ({ cell }) => {
        const course = cell.row.original;
        return (
          <LinkToScaffold
            course={course}
            testId={`InstructorAdminCoursesTable-cell-row-${cell.row.index}-col-${cell.column.id}-link`}
          />
        );
      },
    },
    {
      header: "Settings",
      id: "settings",
      cell: ({ cell }) => {
        const course = cell.row.original;
        return (
          <LinkToSettings
            course={course}
            testId={`InstructorAdminCoursesTable-cell-row-${cell.row.index}-col-${cell.column.id}-link`}
          />
        );
      },
    },
    {
      header: "Term",
      accessorKey: "term",
    },
    {
      header: "School",
      id: "school",
      accessorKey: "school.displayName",
    },
    {
      header: "Edit",
      id: "edit",
      cell: ({ cell }) => {
        const canEditCourse = canEdit(cell.row);
        if (canEditCourse) {
          return (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleShowCourseEditModal(cell.row.original)}
              data-testid={`${testId}-cell-row-${cell.row.index}-col-edit-button`}
            >
              Edit
            </Button>
          );
        } else {
          return (
            <span
              data-testid={`${testId}-cell-row-${cell.row.index}-col-edit-no-permission`}
            ></span>
          );
        }
      },
    },
    {
      header: "Students",
      accessorKey: "numStudents",
    },
    {
      header: "Staff",
      accessorKey: "numStaff",
    },
  ];
  const cellToAxiosParamsEdit = (formData) => {
    return {
      url: `/api/courses/updateInstructor`,
      method: "PUT",
      params: {
        courseId: formData.courseId,
        instructorEmail: formData.instructorEmail,
      },
    };
  };

  const cellToAxiosParamsCourseEdit = (formData) => {
    return {
      url: `/api/courses`,
      method: "PUT",
      params: {
        courseId: formData.courseId,
        courseName: formData.courseName,
        term: formData.term,
        school: formData.school,
      },
    };
  };

  const cellToAxiosParamsDelete = (course) => ({
    url: "/api/courses",
    method: "DELETE",
    params: {
      courseId: course.id,
    },
  });

  const onInstructorUpdateSuccess = () => {
    handleCloseModal();
  };

  const onInstructorUpdateError = (error) => {
    if (error.response.data.message)
      toast(
        `Was not able to update instructor:\n${error.response.data.message}`,
      );
    else toast(`Was not able to update instructor:\n${error.message}`);
  };

  const onCourseUpdateSuccess = () => {
    handleCloseCourseEditModal();
    toast("Course updated successfully");
  };

  const onCourseUpdateError = (error) => {
    if (error.response.data.message)
      toast(`Was not able to update course:\n${error.response.data.message}`);
    else toast(`Was not able to update course:\n${error.message}`);
  };

  const onDeleteSuccess = () => {
    toast("Course deleted successfully");
    setShowDeleteModal(false);
    setCourseToDelete(null);
  };

  const onDeleteError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not delete course:\n${error.response.data.message}`);
    else toast(`Could not delete course:\n${error.message}`);
  };

  const editMutation = useBackendMutation(
    cellToAxiosParamsEdit,
    {
      onSuccess: onInstructorUpdateSuccess,
      onError: onInstructorUpdateError,
    },
    mutationQueryKeys,
  );

  const courseEditMutation = useBackendMutation(
    cellToAxiosParamsCourseEdit,
    {
      onSuccess: onCourseUpdateSuccess,
      onError: onCourseUpdateError,
    },
    mutationQueryKeys,
  );

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    {
      onSuccess: onDeleteSuccess,
      onError: onDeleteError,
    },
    mutationQueryKeys,
  );

  const handleShowModal = (course) => {
    setSelectedCourse(course);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCourse(null);
  };

  const handleUpdateInstructor = async (formData) => {
    formData.courseId = selectedCourse.id;
    editMutation.mutate(formData);
  };

  const handleUpdateCourse = async (formData) => {
    formData.courseId = selectedCourseForEdit.id;
    formData.school = formData.school.key;
    courseEditMutation.mutate(formData);
  };

  const columnsWithInstall = [
    ...columns,
    {
      header: "Instructor",
      accessorKey: "instructorEmail",
      cell: ({ cell }) => {
        const isAdmin = hasRole(currentUser, "ROLE_ADMIN");
        if (isAdmin && enableInstructorUpdate) {
          return (
            <Button
              variant="link"
              onClick={() => handleShowModal(cell.row.original)}
              data-testid={`${testId}-cell-row-${cell.row.index}-col-instructorEmail-button`}
              style={{ padding: 0, textDecoration: "underline" }}
            >
              {cell.row.original.instructorEmail}
            </Button>
          );
        } else {
          return cell.row.original.instructorEmail;
        }
      },
    },
    ...(deleteCourseButton
      ? [
          {
            header: "Delete",
            id: "delete",
            cell: ({ cell }) => {
              const canDelete =
                cell.row.original.numStudents === 0 &&
                cell.row.original.numStaff === 0;

              // Stryker disable ObjectLiteral,StringLiteral : cosmetic styling for disabled button
              const disabledButtonStyle = {
                background: "#A0A0A0",
                padding: "1px",
                borderRadius: "4px",
              };
              // Stryker restore ObjectLiteral,StringLiteral

              if (!canDelete) {
                return (
                  <OverlayTrigger
                    placement="right"
                    overlay={
                      <Tooltip>
                        Cannot delete a course with active students or staff
                      </Tooltip>
                    }
                  >
                    <span className="d-inline-block">
                      <div style={disabledButtonStyle}>
                        <Button variant="light" size="sm" disabled>
                          Delete
                        </Button>
                      </div>
                    </span>
                  </OverlayTrigger>
                );
              }

              return (
                <Button
                  variant="danger"
                  size="sm"
                  data-testid={`${testId}-cell-row-${cell.row.index}-col-delete-button`}
                  onClick={() => {
                    setCourseToDelete(cell.row.original);
                    setShowDeleteModal(true);
                  }}
                >
                  Delete
                </Button>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <Modal
        data-testid={`${testId}-modal`}
        show={showModal}
        onHide={handleCloseModal}
        centered={true}
      >
        <Modal.Header closeButton>
          <Modal.Title>Update Instructor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UpdateInstructorForm
            handleUpdateInstructor={handleUpdateInstructor}
            initialContents={selectedCourse}
          />
        </Modal.Body>
      </Modal>
      <CourseModal
        showModal={showCourseEditModal}
        toggleShowModal={setShowCourseEditModal}
        onSubmitAction={handleUpdateCourse}
        initialContents={selectedCourseForEdit}
        buttonText="Update"
        modalTitle="Edit Course"
      />

      <Modal
        data-testid="InstructorAdminCoursesTable-delete-modal"
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {courseToDelete && (
            <p>
              Please confirm that you really want to delete course{" "}
              <strong>{courseToDelete.courseName}</strong>. This action cannot
              be undone.
            </p>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Do not delete
          </Button>

          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate(courseToDelete)}
          >
            Yes, Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <OurTable data={courses} columns={columnsWithInstall} testid={testId} />
    </>
  );
}
