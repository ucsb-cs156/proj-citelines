import { toast } from "react-toastify";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import { useState } from "react";
import { Button, Row } from "react-bootstrap";
import ProjectCollaboratorForm from "main/components/Projects/ProjectCollaboratorForm";
import ProjectCollaboratorTable from "main/components/Projects/ProjectCollaboratorTable";
import Modal from "react-bootstrap/Modal";
import { ModalBody, ModalHeader } from "react-bootstrap";

export default function CollaboratorsTabComponent({
  projectId,
  testIdPrefix = "CollaboratorsTabComponent",
  isOwner = true,
}) {
  const [postModal, showPostModal] = useState(false);

  const { data: collaborators } = useBackend(
    [`/api/projectcollaborators/project?projectId=${projectId}`],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    {
      method: "GET",
      url: `/api/projectcollaborators/project?projectId=${projectId}`,
    },
    [],
    true,
  );

  const objectToAxiosParamsPost = (collaborator) => ({
    url: `/api/projectcollaborators/post`,
    method: "POST",
    params: {
      projectId: projectId,
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      email: collaborator.email,
    },
  });

  const onSuccessPost = () => {
    toast("Collaborator successfully added.");
    showPostModal(false);
  };

  const collaboratorPostMutation = useBackendMutation(
    objectToAxiosParamsPost,
    { onSuccess: onSuccessPost },
    [`/api/projectcollaborators/project?projectId=${projectId}`],
  );

  const handlePostSubmit = (collaborator) => {
    collaboratorPostMutation.mutate(collaborator);
  };

  return (
    <div
      data-testid={`${testIdPrefix}-CollaboratorsTabComponent`}
      className="tabComponent"
    >
      <Modal
        show={postModal}
        onHide={() => showPostModal(false)}
        centered={true}
        data-testid={`${testIdPrefix}-post-modal`}
      >
        <ModalHeader closeButton>Add Collaborator</ModalHeader>
        <ModalBody>
          <ProjectCollaboratorForm submitAction={handlePostSubmit} />
        </ModalBody>
      </Modal>
      {isOwner && (
        <Row className="p-2">
          <Button
            onClick={() => showPostModal(true)}
            data-testid={`${testIdPrefix}-post-button`}
          >
            Add Collaborator
          </Button>
        </Row>
      )}
      <Row>
        <ProjectCollaboratorTable
          collaborators={collaborators}
          projectId={projectId}
          isOwner={isOwner}
          testIdPrefix={`${testIdPrefix}-ProjectCollaboratorTable`}
        />
      </Row>
    </div>
  );
}
