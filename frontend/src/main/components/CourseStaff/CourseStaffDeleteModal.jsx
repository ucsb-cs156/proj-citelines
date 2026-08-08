import Modal from "react-bootstrap/Modal";
import { useForm } from "react-hook-form";
import { Form } from "react-bootstrap";

export default function CourseStaffDeleteModal({
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
      data-testid="CourseStaffDeleteModal"
    >
      <Modal.Header closeButton>Delete Course Staff</Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Text>
            Are you sure you want to delete this course staff member?
          </Form.Text>
        </Modal.Body>
        <Modal.Footer>
          <button type="submit" className="btn btn-primary">
            Delete Staff Member
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
