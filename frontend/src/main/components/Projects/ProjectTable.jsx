import OurTable from "main/components/Common/OurTable";
import { hasRole } from "main/utils/currentUser";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import Modal from "react-bootstrap/Modal";
import ProjectModal from "main/components/Projects/ProjectModal";
import { Link } from "react-router";
import { GraphIcon, UserListIcon } from "main/components/Common/Icons";
import { formatTime } from "main/utils/dateUtils";

export default function ProjectTable({
  projects,
  currentUser,
  testId = "ProjectTable",
  mutationQueryKeys = [
    "/api/projects/list/owner",
    "/api/projects/list/collaborator",
  ],
}) {
  const canEdit = (project) => {
    if (hasRole(currentUser, "ROLE_ADMIN")) {
      return true;
    }
    return (
      hasRole(currentUser, "ROLE_RESEARCHER") &&
      currentUser?.root?.user?.email === project.owner
    );
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const cellToAxiosParamsEdit = (formData) => ({
    url: "/api/projects",
    method: "PUT",
    params: {
      projectId: formData.projectId,
      name: formData.name,
      description: formData.description,
    },
  });

  const cellToAxiosParamsDelete = (project) => ({
    url: "/api/projects",
    method: "DELETE",
    params: {
      projectId: project.id,
    },
  });

  const onEditSuccess = () => {
    setShowEditModal(false);
    setSelectedProjectForEdit(null);
    toast("Project updated successfully");
  };

  const onEditError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not update project:\n${error.response.data.message}`);
    else toast(`Could not update project:\n${error.message}`);
  };

  const onDeleteSuccess = () => {
    toast("Project deleted successfully");
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  const onDeleteError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not delete project:\n${error.response.data.message}`);
    else toast(`Could not delete project:\n${error.message}`);
  };

  const editMutation = useBackendMutation(
    cellToAxiosParamsEdit,
    { onSuccess: onEditSuccess, onError: onEditError },
    mutationQueryKeys,
  );

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    { onSuccess: onDeleteSuccess, onError: onDeleteError },
    mutationQueryKeys,
  );

  const handleShowEditModal = (project) => {
    setSelectedProjectForEdit(project);
    setShowEditModal(true);
  };

  const handleUpdateProject = (formData) => {
    formData.projectId = selectedProjectForEdit.id;
    editMutation.mutate(formData);
  };

  const columns = [
    {
      header: "id",
      accessorKey: "id",
    },
    {
      header: "Project Name",
      id: "name",
      cell: ({ cell }) => {
        const project = cell.row.original;
        return (
          <Link
            to={`/project/${project.id}`}
            data-testid={`${testId}-cell-row-${cell.row.index}-col-name-link`}
          >
            <GraphIcon className="me-2" width={20} height={20} />
            {project.name}
          </Link>
        );
      },
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Date Created",
      id: "dateCreated",
      accessorFn: (row) => formatTime(row.dateCreated),
    },
    {
      header: "Owner",
      accessorKey: "owner",
    },
    {
      header: "Settings",
      id: "settings",
      cell: ({ cell }) => {
        const project = cell.row.original;
        return (
          <Link
            to={`/project/${project.id}/settings`}
            data-testid={`${testId}-cell-row-${cell.row.index}-col-settings-link`}
          >
            <UserListIcon width={20} height={20} />
          </Link>
        );
      },
    },
    {
      header: "Edit",
      id: "edit",
      cell: ({ cell }) => {
        const project = cell.row.original;
        if (canEdit(project)) {
          return (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleShowEditModal(project)}
              data-testid={`${testId}-cell-row-${cell.row.index}-col-edit-button`}
            >
              Edit
            </Button>
          );
        }
        return (
          <span
            data-testid={`${testId}-cell-row-${cell.row.index}-col-edit-no-permission`}
          ></span>
        );
      },
    },
    {
      header: "Delete",
      id: "delete",
      cell: ({ cell }) => {
        const project = cell.row.original;
        if (canEdit(project)) {
          return (
            <Button
              variant="danger"
              size="sm"
              data-testid={`${testId}-cell-row-${cell.row.index}-col-delete-button`}
              onClick={() => {
                setProjectToDelete(project);
                setShowDeleteModal(true);
              }}
            >
              Delete
            </Button>
          );
        }
        return (
          <span
            data-testid={`${testId}-cell-row-${cell.row.index}-col-delete-no-permission`}
          ></span>
        );
      },
    },
  ];

  return (
    <>
      <ProjectModal
        showModal={showEditModal}
        toggleShowModal={setShowEditModal}
        onSubmitAction={handleUpdateProject}
        initialContents={selectedProjectForEdit}
        buttonText="Update"
        modalTitle="Edit Project"
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
          {projectToDelete && (
            <p>
              Please confirm that you really want to delete project{" "}
              <strong>{projectToDelete.name}</strong>. This action cannot be
              undone.
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
            onClick={() => deleteMutation.mutate(projectToDelete)}
          >
            Yes, Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <OurTable data={projects} columns={columns} testid={testId} />
    </>
  );
}
