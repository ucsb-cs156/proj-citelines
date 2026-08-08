import { useEffect, useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { Controller, useForm } from "react-hook-form";
import SimpleMdeReact from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

export default function ConceptModal({
  onSubmitAction,
  showModal,
  toggleShowModal,
  initialContents,
  buttonText = "Create",
  modalTitle = "Create Concept",
}) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: initialContents ?? {},
  });

  useEffect(() => {
    reset(initialContents ?? {});
  }, [initialContents, reset]);

  const editorOptions = useMemo(() => ({ spellChecker: false }), []);
  const labelEditorOptions = useMemo(
    () => ({ spellChecker: false, minHeight: "50px", toolbar: false }),
    [],
  );

  const closeModal = () => {
    toggleShowModal(false);
  };

  return (
    <Modal
      show={showModal}
      onHide={closeModal}
      centered={true}
      data-testid={"ConceptModal-base"}
    >
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid={"ConceptModal-closeButton"}
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Group>
            <Form.Label htmlFor="label">Label</Form.Label>
            <div data-testid={"ConceptModal-label"}>
              <Controller
                name="label"
                control={control}
                rules={{ required: "Label is required." }}
                render={({ field }) => (
                  <SimpleMdeReact
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={labelEditorOptions}
                  />
                )}
              />
            </div>
            {errors.label && (
              <div className="invalid-feedback d-block">
                {errors.label?.message}
              </div>
            )}
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label htmlFor="description">Description</Form.Label>
            <div data-testid={"ConceptModal-description"}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <SimpleMdeReact
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={editorOptions}
                  />
                )}
              />
            </div>
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label htmlFor="example">Example</Form.Label>
            <div data-testid={"ConceptModal-example"}>
              <Controller
                name="example"
                control={control}
                render={({ field }) => (
                  <SimpleMdeReact
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={editorOptions}
                  />
                )}
              />
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="ConceptModal-submit"
          >
            {buttonText}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
