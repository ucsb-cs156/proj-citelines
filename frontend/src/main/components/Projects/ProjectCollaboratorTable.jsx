import OurTable, { ButtonColumn } from "main/components/Common/OurTable";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import Modal from "react-bootstrap/Modal";
import { Button } from "react-bootstrap";
import { useState } from "react";

export default function ProjectCollaboratorTable({
  collaborators,
  projectId,
  isOwner = true,
  testIdPrefix = "ProjectCollaboratorTable",
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState(null);

  const cellToAxiosParamsDelete = (collaborator) => ({
    url: "/api/projectcollaborators/delete",
    method: "DELETE",
    params: {
      id: collaborator.id,
      projectId: projectId,
    },
  });

  const onDeleteSuccess = () => {
    toast("Collaborator deleted successfully.");
    setShowDeleteModal(false);
    setCollaboratorToDelete(null);
  };

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    {
      onSuccess: onDeleteSuccess,
    },
    [`/api/projectcollaborators/project?projectId=${projectId}`],
  );

  const deleteCallback = (cell) => {
    setCollaboratorToDelete(cell.row.original);
    setShowDeleteModal(true);
  };

  const columns = [
    {
      header: "id",
      accessorKey: "id",
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

  if (isOwner) {
    columns.push(
      ButtonColumn("Delete", "danger", deleteCallback, testIdPrefix),
    );
  }

  return (
    <>
      <Modal
        data-testid={`${testIdPrefix}-delete-modal`}
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {collaboratorToDelete && (
            <p>
              Please confirm that you really want to remove{" "}
              <strong>
                {collaboratorToDelete.firstName} {collaboratorToDelete.lastName}
              </strong>{" "}
              as a collaborator. This action cannot be undone.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Do not delete
          </Button>
          <Button
            variant="danger"
            data-testid={`${testIdPrefix}-delete-modal-confirm-button`}
            onClick={() => deleteMutation.mutate(collaboratorToDelete)}
          >
            Yes, Delete
          </Button>
        </Modal.Footer>
      </Modal>
      <OurTable data={collaborators} columns={columns} testid={testIdPrefix} />
    </>
  );
}
