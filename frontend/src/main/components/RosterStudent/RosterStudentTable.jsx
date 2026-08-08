import React from "react";
import OurTable, { ButtonColumn } from "main/components/Common/OurTable";
import { Tooltip, OverlayTrigger } from "react-bootstrap";

import { useBackendMutation } from "main/utils/useBackend";
import { cellToAxiosParamsDelete } from "main/utils/rosterStudentUtils";
import { hasRole } from "main/utils/currentUser";
import Modal from "react-bootstrap/Modal";
import RosterStudentForm from "main/components/RosterStudent/RosterStudentForm";
import { toast } from "react-toastify";
import RosterStudentDeleteModal from "main/components/RosterStudent/RosterStudentDeleteModal";

export default function RosterStudentTable({
  students,
  currentUser,
  courseId,
  testIdPrefix = "RosterStudentTable",
  canEditStudents,
}) {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editStudent, setEditStudent] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteStudent, setDeleteStudent] = React.useState(null);

  const cellToAxiosParamsEdit = (formData) => ({
    url: `/api/rosterstudents/update`,
    method: "PUT",
    params: {
      studentId: formData.studentId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      id: formData.id,
    },
  });

  const hideEditModal = () => {
    setShowEditModal(false);
  };

  const hideDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const onEditSuccess = () => {
    toast("Student updated successfully.");
    hideEditModal();
  };

  const onDeleteSuccess = () => {
    toast("Student deleted successfully.");
    hideDeleteModal();
  };

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    { onSuccess: onDeleteSuccess },
    [`/api/rosterstudents/course/${courseId}`],
  );

  const deleteCallback = async (cell) => {
    setShowDeleteModal(true);
    setDeleteStudent(cell.row.original.id);
  };

  const submitDeleteForm = (data) => {
    deleteMutation.mutate({
      id: deleteStudent,
      ...data,
    });
  };

  const editMutation = useBackendMutation(
    cellToAxiosParamsEdit,
    { onSuccess: onEditSuccess },
    [`/api/rosterstudents/course/${courseId}`],
  );

  const editCallback = (cell) => {
    setEditStudent(cell.row.original);
    setShowEditModal(true);
  };

  const submitEditForm = (data) => {
    editMutation.mutate(data);
  };

  const columns = [
    {
      header: "id",
      accessorKey: "id",
      id: "id",
    },

    {
      header: "Student Id",
      accessorKey: "studentId",
    },

    {
      header: "First Name",
      accessorKey: "firstName",
    },
    {
      header: "Last Name",
      accessorKey: "lastName",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
  ];

  const canEditRoster =
    canEditStudents ??
    (hasRole(currentUser, "ROLE_INSTRUCTOR") ||
      hasRole(currentUser, "ROLE_ADMIN"));

  if (canEditRoster) {
    columns.push(ButtonColumn("Edit", "primary", editCallback, testIdPrefix));
    columns.push(
      ButtonColumn("Delete", "danger", deleteCallback, testIdPrefix),
    );
  }

  return (
    <>
      <Modal show={showEditModal} onHide={hideEditModal}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Student</Modal.Title>
        </Modal.Header>
        <Modal.Body
          className={"pb-3"}
          data-testid={`${testIdPrefix}-modal-body`}
        >
          <RosterStudentForm
            initialContents={editStudent}
            submitAction={submitEditForm}
            buttonLabel={"Update"}
            cancelDisabled={true}
          />
        </Modal.Body>
      </Modal>
      <RosterStudentDeleteModal
        showModal={showDeleteModal}
        toggleShowModal={setShowDeleteModal}
        onSubmitAction={submitDeleteForm}
      />
      <OurTable data={students} columns={columns} testid={testIdPrefix} />
      <div
        style={{ display: "none" }}
        data-testid={`${testIdPrefix}-courseId`}
        data-course-id={`${courseId}`}
      />
    </>
  );
}
