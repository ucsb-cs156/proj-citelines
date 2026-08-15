import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";

export default function BulkCitationUploadModal({
  showModal,
  toggleShowModal,
  projectId,
  citeKey,
  mutationQueryKeys = [],
}) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm();

  // The modal starts hidden (showModal=false), so useForm's own initial state is never visible;
  // this reset is what actually establishes an empty textarea each time the modal opens.
  useEffect(() => {
    if (showModal) {
      reset({ rawText: "" });
    }
  }, [showModal, reset]);

  const closeModal = () => toggleShowModal(false);

  const objectToAxiosParams = (formData) => ({
    url: "/api/jobs/launch/bulkCitationUploadFromAcmDlViewAll",
    method: "POST",
    params: { projectId, citeKey },
    data: formData.rawText,
    headers: { "Content-Type": "text/plain" },
  });

  const onSuccess = () => {
    toast(
      "Bulk citation upload job launched — check the Jobs tab for progress.",
    );
    closeModal();
  };

  const mutation = useBackendMutation(
    objectToAxiosParams,
    { onSuccess },
    mutationQueryKeys,
  );

  const onSubmit = (formData) => {
    mutation.mutate(formData);
  };

  return (
    <Modal
      show={showModal}
      onHide={closeModal}
      centered={true}
      dialogClassName="bulk-citation-upload-modal"
      data-testid="BulkCitationUploadModal-base"
    >
      <Modal.Header>
        <Modal.Title>Bulk Citations from ACM DL View All</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid="BulkCitationUploadModal-closeButton"
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <p>
            On ACM Digital Library, open &quot;Cited By&quot;, click{" "}
            <strong>View All</strong>, and paste the entire contents of that
            page below. Each citing paper will be added as a new citation of
            this entry.
          </p>
          <Form.Group>
            <Form.Label htmlFor="rawText">
              Pasted ACM DL &quot;Cited By&quot; Text
            </Form.Label>
            <Form.Control
              data-testid="BulkCitationUploadModal-rawText"
              id="rawText"
              as="textarea"
              rows={12}
              style={{ width: "100%", resize: "vertical" }}
              isInvalid={Boolean(errors.rawText)}
              {...register("rawText", {
                required: "Pasted text is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.rawText?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="BulkCitationUploadModal-submit"
          >
            Upload
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
