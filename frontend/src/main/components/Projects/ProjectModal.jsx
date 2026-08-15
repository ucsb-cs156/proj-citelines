import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import {
  CITATION_FORMAT_OPTIONS,
  getLastCitationFormat,
  setLastCitationFormat,
} from "main/utils/citationFormats";

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

  // Reset form when initialContents changes (e.g., when editing). When creating a new project
  // (no initialContents), default citationFormat to the last one the user chose.
  useEffect(() => {
    reset({
      citationFormat: getLastCitationFormat(),
      ...initialContents,
    });
  }, [initialContents, reset]);

  const closeModal = () => {
    toggleShowModal(false);
  };

  const onSubmit = (data) => {
    setLastCitationFormat(data.citationFormat);
    onSubmitAction(data);
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
      <Form onSubmit={handleSubmit(onSubmit)}>
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
          <Form.Group className="mb-3">
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
          <Form.Group className="mb-3">
            <Form.Label htmlFor="citationFormat">Citation Format</Form.Label>
            <Form.Select
              data-testid={"ProjectModal-citationFormat"}
              id="citationFormat"
              {...register("citationFormat")}
            >
              {CITATION_FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
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
