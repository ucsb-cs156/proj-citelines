import OurTable from "main/components/Common/OurTable";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import Modal from "react-bootstrap/Modal";
import TagModal from "main/components/Tags/TagModal";

export default function TagTable({
  tags,
  projectId,
  canEdit = true,
  testId = "TagTable",
  mutationQueryKey,
}) {
  const queryKey =
    mutationQueryKey ?? `/api/tags/project?projectId=${projectId}`;

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTagForEdit, setSelectedTagForEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);

  const cellToAxiosParamsEdit = (formData) => ({
    url: "/api/tags",
    method: "PUT",
    params: {
      id: formData.id,
      projectId: projectId,
      tag: formData.tag,
      explanation: formData.explanation,
    },
  });

  const cellToAxiosParamsDelete = (tag) => ({
    url: "/api/tags/delete",
    method: "DELETE",
    params: {
      id: tag.id,
      projectId: projectId,
    },
  });

  const onEditSuccess = () => {
    setShowEditModal(false);
    setSelectedTagForEdit(null);
    toast("Tag updated successfully");
  };

  const onEditError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not update tag:\n${error.response.data.message}`);
    else toast(`Could not update tag:\n${error.message}`);
  };

  const onDeleteSuccess = () => {
    toast("Tag deleted successfully");
    setShowDeleteModal(false);
    setTagToDelete(null);
  };

  const onDeleteError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not delete tag:\n${error.response.data.message}`);
    else toast(`Could not delete tag:\n${error.message}`);
  };

  const editMutation = useBackendMutation(
    cellToAxiosParamsEdit,
    { onSuccess: onEditSuccess, onError: onEditError },
    [queryKey],
  );

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    { onSuccess: onDeleteSuccess, onError: onDeleteError },
    [queryKey],
  );

  const handleShowEditModal = (tag) => {
    setSelectedTagForEdit(tag);
    setShowEditModal(true);
  };

  const handleUpdateTag = (formData) => {
    formData.id = selectedTagForEdit.id;
    editMutation.mutate(formData);
  };

  const columns = [
    {
      header: "Tag",
      accessorKey: "tag",
    },
    {
      header: "Explanation",
      accessorKey: "explanation",
    },
  ];

  if (canEdit) {
    columns.push(
      {
        header: "Edit",
        id: "edit",
        cell: ({ cell }) => {
          const tag = cell.row.original;
          return (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleShowEditModal(tag)}
              data-testid={`${testId}-cell-row-${cell.row.index}-col-edit-button`}
            >
              Edit
            </Button>
          );
        },
      },
      {
        header: "Delete",
        id: "delete",
        cell: ({ cell }) => {
          const tag = cell.row.original;
          return (
            <Button
              variant="danger"
              size="sm"
              data-testid={`${testId}-cell-row-${cell.row.index}-col-delete-button`}
              onClick={() => {
                setTagToDelete(tag);
                setShowDeleteModal(true);
              }}
            >
              Delete
            </Button>
          );
        },
      },
    );
  }

  return (
    <>
      <TagModal
        showModal={showEditModal}
        toggleShowModal={setShowEditModal}
        onSubmitAction={handleUpdateTag}
        initialContents={selectedTagForEdit}
        buttonText="Update"
        modalTitle="Edit Tag"
        testId={`${testId}-TagModal`}
      />

      <Modal
        data-testid={`${testId}-delete-modal`}
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {tagToDelete && (
            <p>
              Please confirm that you really want to delete the tag{" "}
              <strong>{tagToDelete.tag}</strong>. This action cannot be undone.
            </p>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Do not delete
          </Button>

          <Button
            variant="danger"
            data-testid={`${testId}-delete-modal-confirm-button`}
            onClick={() => deleteMutation.mutate(tagToDelete)}
          >
            Yes, Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <OurTable data={tags} columns={columns} testid={testId} />
    </>
  );
}
