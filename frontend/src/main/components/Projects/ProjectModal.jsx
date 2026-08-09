import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

export default function ProjectModal({
  onSubmitAction,
  showModal,
  toggleShowModal,
  initialContents,
  buttonText = "Create",
  modalTitle = "Create Project",
}) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({});

  // Reset form when initialContents changes (e.g., when editing)
  useEffect(() => {
    reset(initialContents);
  }, [initialContents, reset]);

  const closeModal = () => {
    toggleShowModal(false);
  };

  return (
    <Modal
      show={showModal}
      onHide={closeModal}
      centered={true}
      data-testid={"ProjectModal-base"}
    >
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid={"ProjectModal-closeButton"}
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="name">Project Name</Form.Label>
            <Form.Control
              data-testid={"ProjectModal-name"}
              id="name"
              type="text"
              isInvalid={Boolean(errors.name)}
              {...register("name", {
                required: "Project Name is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="description">Description</Form.Label>
            <Form.Control
              data-testid={"ProjectModal-description"}
              id="description"
              as="textarea"
              rows={3}
              isInvalid={Boolean(errors.description)}
              {...register("description", {
                required: "Description is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="ProjectModal-submit"
          >
            {buttonText}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
