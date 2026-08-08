import Modal from "react-bootstrap/Modal";
import { useForm } from "react-hook-form";
import { Form } from "react-bootstrap";

export default function ConceptDeleteModal({
  onSubmitAction,
  showModal,
  toggleShowModal,
  modalTitle = "Delete Concept",
  buttonText = "Delete Concept",
  message = "Are you sure you want to delete this concept? Deleting a top-level concept also deletes all of its subconcepts.",
  testId = "ConceptDeleteModal",
}) {
  const hideModal = () => {
    toggleShowModal(false);
  };

  const { handleSubmit } = useForm();

  return (
    <Modal
      show={showModal}
      onHide={hideModal}
      centered={true}
      data-testid={testId}
    >
      <Modal.Header closeButton>{modalTitle}</Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Text>{message}</Form.Text>
        </Modal.Body>
        <Modal.Footer>
          <button type="submit" className="btn btn-primary">
            {buttonText}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
