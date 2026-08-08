import { useEffect, useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { Controller, useForm } from "react-hook-form";
import SimpleMdeReact from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

const normalizeInitialContents = (initialContents) => ({
  ...initialContents,
  parentId: initialContents?.parentId ?? initialContents?.parent?.id ?? "",
  parentLabel:
    initialContents?.parentLabel ?? initialContents?.parent?.label ?? "",
});

export default function SubConceptModal({
  onSubmitAction,
  showModal,
  toggleShowModal,
  initialContents,
  buttonText = "Create",
  modalTitle = "Create SubConcept",
}) {
  const {
    control,
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: normalizeInitialContents(initialContents),
  });

  useEffect(() => {
    reset(normalizeInitialContents(initialContents));
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
      data-testid={"SubConceptModal-base"}
    >
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid={"SubConceptModal-closeButton"}
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmitAction)}>
        <Modal.Body>
          <Form.Group>
            <Form.Label htmlFor="parentId">Parent Id</Form.Label>
            <Form.Control
              data-testid={"SubConceptModal-parentId"}
              id="parentId"
              type="number"
              readOnly
              {...register("parentId")}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label htmlFor="parentLabel">Parent Label</Form.Label>
            <Form.Control
              data-testid={"SubConceptModal-parentLabel"}
              id="parentLabel"
              type="text"
              size={40}
              readOnly
              {...register("parentLabel")}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label htmlFor="label">Label</Form.Label>
            <div data-testid={"SubConceptModal-label"}>
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
            <div data-testid={"SubConceptModal-description"}>
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
            <div data-testid={"SubConceptModal-example"}>
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
            data-testid="SubConceptModal-submit"
          >
            {buttonText}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
