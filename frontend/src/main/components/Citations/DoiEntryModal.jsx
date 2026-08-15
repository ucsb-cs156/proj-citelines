import Modal from "react-bootstrap/Modal";
import { Form, Alert } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import {
  RELEVANCE_OPTIONS,
  DEFAULT_RELEVANCE,
} from "main/utils/citelinesFields";

export default function DoiEntryModal({
  showModal,
  toggleShowModal,
  projectId,
  mutationQueryKeys = [],
  relatedCiteKey = null,
  relationship = null,
}) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({ defaultValues: { doi: "", relevance: DEFAULT_RELEVANCE } });

  const [postError, setPostError] = useState(null);

  const modalTitle =
    relationship === "reference"
      ? "Add Reference via DOI"
      : "Add Citation via DOI";

  useEffect(() => {
    if (!showModal) {
      return;
    }
    setPostError(null);
    reset({ doi: "", relevance: DEFAULT_RELEVANCE });
  }, [showModal, reset]);

  const objectToAxiosParams = (formData) => {
    return {
      url: "/api/bibtexentries/postByDoi",
      method: "POST",
      params:
        relatedCiteKey && relationship
          ? {
              projectId: projectId,
              relatedCiteKey,
              relationship,
              relevance: formData.relevance,
            }
          : { projectId: projectId, relevance: formData.relevance },
      data: formData.doi,
      headers: { "Content-Type": "text/plain" },
    };
  };

  const closeModal = () => {
    setPostError(null);
    toggleShowModal(false);
  };

  const onSuccess = () => {
    toast(
      relationship === "reference"
        ? "Reference added successfully"
        : "Citation added successfully",
    );
    closeModal();
  };

  const onError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    const message = error.response?.data?.message ?? error.message;
    setPostError(message);
  };

  const mutation = useBackendMutation(
    objectToAxiosParams,
    { onSuccess, onError },
    mutationQueryKeys,
  );

  const onSubmit = (formData) => {
    setPostError(null);
    mutation.mutate(formData);
  };

  return (
    <Modal
      show={showModal}
      onHide={closeModal}
      centered={true}
      dialogClassName="doi-entry-modal"
      data-testid={"DoiEntryModal-base"}
    >
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid={"DoiEntryModal-closeButton"}
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {postError && (
            <Alert variant="danger" data-testid="DoiEntryModal-error">
              {postError}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="relevance">Relevance</Form.Label>
            <Form.Select
              data-testid={"DoiEntryModal-relevance"}
              id="relevance"
              {...register("relevance")}
            >
              {RELEVANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="doi">DOI</Form.Label>
            <Form.Control
              data-testid={"DoiEntryModal-doi"}
              id="doi"
              isInvalid={Boolean(errors.doi)}
              {...register("doi", {
                required: "DOI is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.doi?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="DoiEntryModal-submit"
          >
            Add
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
