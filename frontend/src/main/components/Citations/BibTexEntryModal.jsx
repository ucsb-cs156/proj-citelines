import Modal from "react-bootstrap/Modal";
import { Form, Alert } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import {
  RELEVANCE_OPTIONS,
  DEFAULT_RELEVANCE,
  extractCitelinesFields,
  injectCitelinesFields,
} from "main/utils/citelinesFields";

export default function BibTexEntryModal({
  showModal,
  toggleShowModal,
  projectId,
  entryToEdit = null,
  mutationQueryKeys = [],
  relatedEntryId = null,
  relationship = null,
}) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({ defaultValues: { bibtex: "", relevance: DEFAULT_RELEVANCE } });

  const [parseError, setParseError] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  // CITELINES_* fields other than relevance (e.g. position/references/citations), stripped out
  // of the displayed BibTeX text on load and restored verbatim on submit. Not form state, since
  // they're never shown/edited directly — see docs on citelinesFields.js.
  const preservedFieldsRef = useRef({});

  const isEditing = Boolean(entryToEdit);
  const modalTitle = isEditing
    ? "Edit Citation"
    : relationship === "reference"
      ? "Add Reference"
      : "Add Citation";

  useEffect(() => {
    if (!showModal) {
      return;
    }
    setParseError(null);
    if (isEditing) {
      setLoadingExisting(true);
      axios
        .get("/api/bibtexentries/export", {
          params: { id: entryToEdit.id, projectId: projectId },
        })
        .then((response) => {
          const { strippedBibtex, relevance, preservedFields } =
            extractCitelinesFields(response.data);
          preservedFieldsRef.current = preservedFields;
          reset({ bibtex: strippedBibtex, relevance });
        })
        .catch(() => {
          setParseError("Could not load the existing citation for editing.");
        })
        .finally(() => setLoadingExisting(false));
    } else {
      preservedFieldsRef.current = {};
      reset({ bibtex: "", relevance: DEFAULT_RELEVANCE });
    }
    // Stryker disable next-line ArrayDeclaration : re-running this effect on every render
    // (e.g. by omitting isEditing) would refetch/reset on unrelated re-renders.
  }, [showModal, entryToEdit, projectId, isEditing, reset]);

  const objectToAxiosParams = (formData) => {
    if (isEditing) {
      return {
        url: "/api/bibtexentries",
        method: "PUT",
        params: { id: entryToEdit.id, projectId: projectId },
        data: formData.bibtex,
        headers: { "Content-Type": "text/plain" },
      };
    }
    return {
      url: "/api/bibtexentries/post",
      method: "POST",
      params:
        relatedEntryId && relationship
          ? { projectId: projectId, relatedEntryId, relationship }
          : { projectId: projectId },
      data: formData.bibtex,
      headers: { "Content-Type": "text/plain" },
    };
  };

  const closeModal = () => {
    setParseError(null);
    toggleShowModal(false);
  };

  const onSuccess = () => {
    toast(
      isEditing
        ? "Citation updated successfully"
        : relationship === "reference"
          ? "Reference added successfully"
          : "Citation added successfully",
    );
    closeModal();
  };

  const onError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    const message = error.response?.data?.message ?? error.message;
    setParseError(message);
  };

  const mutation = useBackendMutation(
    objectToAxiosParams,
    { onSuccess, onError },
    mutationQueryKeys,
  );

  const onSubmit = (formData) => {
    setParseError(null);
    const bibtex = injectCitelinesFields(
      formData.bibtex,
      formData.relevance,
      preservedFieldsRef.current,
    );
    mutation.mutate({ ...formData, bibtex });
  };

  return (
    <Modal
      show={showModal}
      onHide={closeModal}
      centered={true}
      dialogClassName="bibtex-entry-modal"
      data-testid={"BibTexEntryModal-base"}
    >
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid={"BibTexEntryModal-closeButton"}
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {parseError && (
            <Alert variant="danger" data-testid="BibTexEntryModal-error">
              {parseError}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label htmlFor="relevance">Relevance</Form.Label>
            <Form.Select
              data-testid={"BibTexEntryModal-relevance"}
              id="relevance"
              disabled={loadingExisting}
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
            <Form.Label htmlFor="bibtex">BibTeX Entry</Form.Label>
            <Form.Control
              data-testid={"BibTexEntryModal-bibtex"}
              id="bibtex"
              as="textarea"
              rows={10}
              style={{ width: "100%", resize: "vertical" }}
              isInvalid={Boolean(errors.bibtex)}
              disabled={loadingExisting}
              {...register("bibtex", {
                required: "BibTeX text is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.bibtex?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="BibTexEntryModal-submit"
          >
            {isEditing ? "Update" : "Add"}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
