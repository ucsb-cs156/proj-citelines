import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";
import ColorChooser from "main/components/Common/ColorChooser";

export default function TagModal({
  onSubmitAction,
  showModal,
  toggleShowModal,
  initialContents,
  buttonText = "Create",
  modalTitle = "Create Tag",
  testId = "TagModal",
}) {
  const {
    register,
    control,
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
      data-testid={`${testId}-base`}
    >
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid={`${testId}-closeButton`}
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="tag">Tag</Form.Label>
            <Form.Control
              data-testid={`${testId}-tag`}
              id="tag"
              type="text"
              isInvalid={Boolean(errors.tag)}
              {...register("tag", {
                required: "Tag is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.tag?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="explanation">
              Explanation (optional)
            </Form.Label>
            <Form.Control
              data-testid={`${testId}-explanation`}
              id="explanation"
              as="textarea"
              rows={3}
              {...register("explanation")}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Color</Form.Label>
            <Controller
              name="color"
              control={control}
              defaultValue=""
              render={({ field: { value, onChange } }) => (
                <ColorChooser
                  value={value}
                  onChange={onChange}
                  testId={`${testId}-ColorChooser`}
                />
              )}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid={`${testId}-submit`}
          >
            {buttonText}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
