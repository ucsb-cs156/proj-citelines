import Modal from "react-bootstrap/Modal";
import { useForm } from "react-hook-form";
import { Form } from "react-bootstrap";

export default function RosterStudentDeleteModal({
  onSubmitAction,
  showModal,
  toggleShowModal,
}) {
  const hideModal = () => {
    toggleShowModal(false);
  };

  const { register, handleSubmit } = useForm();

  return (
    <Modal
      show={showModal}
      onHide={hideModal}
      centered={true}
      data-testid="RosterStudentDeleteModal"
    >
      <Modal.Header closeButton>Delete Roster Student</Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Text>
            Are you sure you want to delete this roster student?
          </Form.Text>
        </Modal.Body>
        <Modal.Footer>
          <button type="submit" className="btn btn-primary">
            Delete Student
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
