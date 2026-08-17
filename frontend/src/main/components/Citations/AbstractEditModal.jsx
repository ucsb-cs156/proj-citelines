import { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { Button, Form } from "react-bootstrap";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";

export default function AbstractEditModal({
  showModal,
  toggleShowModal,
  projectId,
  entry,
  mutationQueryKeys = [],
  testId = "AbstractEditModal",
}) {
  const [abstractText, setAbstractText] = useState("");

  useEffect(() => {
    if (showModal) {
      setAbstractText(entry?.keyValuePairs?.abstract ?? "");
    }
  }, [showModal, entry]);

  const closeModal = () => toggleShowModal(false);

  const updateAbstractMutation = useBackendMutation(
    () => ({
      url: "/api/bibtexentries/abstract",
      method: "PATCH",
      params: { id: entry?.id, projectId },
      data: abstractText,
      headers: { "Content-Type": "text/plain" },
    }),
    {
      onSuccess: () => {
        toast("Abstract updated successfully");
        closeModal();
      },
    },
    mutationQueryKeys,
  );

  return (
    <Modal show={showModal} onHide={closeModal} data-testid={`${testId}-base`}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Abstract</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label htmlFor={`${testId}-abstract`}>Abstract</Form.Label>
          <Form.Control
            id={`${testId}-abstract`}
            data-testid={`${testId}-abstract`}
            as="textarea"
            rows={10}
            style={{ width: "100%", resize: "vertical" }}
            value={abstractText}
            onChange={(e) => setAbstractText(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={closeModal}
          data-testid={`${testId}-cancel`}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => updateAbstractMutation.mutate({})}
          data-testid={`${testId}-submit`}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
