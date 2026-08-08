import React from "react";
import OurTable, { ButtonColumn } from "main/components/Common/OurTable";
import { Tooltip, OverlayTrigger } from "react-bootstrap";

import { useBackendMutation } from "main/utils/useBackend";
import { hasRole } from "main/utils/currentUser";
import Modal from "react-bootstrap/Modal";
import CourseStaffForm from "main/components/CourseStaff/CourseStaffForm";
import { toast } from "react-toastify";
import CourseStaffDeleteModal from "main/components/CourseStaff/CourseStaffDeleteModal";

export default function CourseStaffTable({
  staff,
  currentUser,
  courseId,
  testIdPrefix = "CourseStaffTable",
  isInstructor = true,
}) {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editStaff, setEditStaff] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteStaff, setDeleteStaff] = React.useState(null);

  function cellToAxiosParamsDelete(formData) {
    return {
      // Stryker disable next-line StringLiteral
      url: "/api/coursestaff/delete",
      method: "DELETE",
      params: {
        id: formData.id,
        courseId: courseId,
      },
    };
  }

  const cellToAxiosParamsEdit = (formData) => ({
    url: `/api/coursestaff`,
    method: "PUT",
    // Stryker disable next-line ObjectLiteral
    params: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      id: formData.id,
      courseId: courseId,
    },
  });

  const hideModal = () => {
    setShowEditModal(false);
  };

  const hideDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const onEditSuccess = () => {
    toast("Staff member updated successfully.");
    hideModal();
  };

  const onDeleteSuccess = () => {
    toast("Staff member deleted successfully.");
    hideDeleteModal();
  };

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    { onSuccess: onDeleteSuccess },
    [`/api/coursestaff/course?courseId=${courseId}`],
  );

  // Stryker disable next-line all
  const deleteCallback = async (cell) => {
    setShowDeleteModal(true);
    setDeleteStaff(cell.row.original.id);
  };

  const submitDeleteForm = (data) => {
    deleteMutation.mutate({
      id: deleteStaff,
      ...data,
    });
  };

  const editMutation = useBackendMutation(
    cellToAxiosParamsEdit,
    { onSuccess: onEditSuccess },
    [`/api/coursestaff/course?courseId=${courseId}`],
  );

  const editCallback = (cell) => {
    setEditStaff(cell.row.original);
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

  if (
    isInstructor &&
    (hasRole(currentUser, "ROLE_INSTRUCTOR") ||
      hasRole(currentUser, "ROLE_ADMIN"))
  ) {
    columns.push(ButtonColumn("Edit", "primary", editCallback, testIdPrefix));
    columns.push(
      ButtonColumn("Delete", "danger", deleteCallback, testIdPrefix),
    );
  }

  return (
    <>
      <Modal show={showEditModal} onHide={hideModal}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Staff Member</Modal.Title>
        </Modal.Header>
        <Modal.Body
          className={"pb-3"}
          data-testid={`${testIdPrefix}-modal-body`}
        >
          <CourseStaffForm
            initialContents={editStaff}
            submitAction={submitEditForm}
            buttonLabel={"Update"}
            cancelDisabled={true}
          />
        </Modal.Body>
      </Modal>
      <CourseStaffDeleteModal
        showModal={showDeleteModal}
        toggleShowModal={setShowDeleteModal}
        onSubmitAction={submitDeleteForm}
      />
      <OurTable data={staff} columns={columns} testid={testIdPrefix} />
      <div
        style={{ display: "none" }}
        data-testid={`${testIdPrefix}-courseId`}
        data-course-id={`${courseId}`}
      />
    </>
  );
}
