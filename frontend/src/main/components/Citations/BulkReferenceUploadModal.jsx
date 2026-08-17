import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import BibTexEntryLink from "main/components/Citations/BibTexEntryLink";
import { extractBibliographySection } from "main/utils/bulkReferenceHtml";

export default function BulkReferenceUploadModal({
  showModal,
  toggleShowModal,
  projectId,
  citeKey,
  keyValuePairs,
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
      reset({ rawHtml: "" });
    }
  }, [showModal, reset]);

  const closeModal = () => toggleShowModal(false);

  const objectToAxiosParams = (formData) => ({
    url: "/api/jobs/launch/bulkReferenceUploadFromAcmDl",
    method: "POST",
    params: { projectId, citeKey },
    data: extractBibliographySection(formData.rawHtml),
    headers: { "Content-Type": "text/plain" },
  });

  const onSuccess = () => {
    toast(
      "Bulk reference upload job launched — check the Jobs tab for progress.",
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
      dialogClassName="bulk-reference-upload-modal"
      data-testid="BulkReferenceUploadModal-base"
    >
      <Modal.Header>
        <Modal.Title>Bulk References from ACM DL</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-testid="BulkReferenceUploadModal-closeButton"
          onClick={closeModal}
        ></button>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <p>
            Open the link below on the ACM DL. Find the list of references, and
            then click the &quot;Show All References&quot; button.
          </p>
          <p>
            When they have all loaded, use the Developer Tools of your browser
            to load the HTML for the page (note that View Source typically
            doesn&apos;t work; you need the entire DOM tree). Copy the HTML
            (typically with a tool such as &quot;Copy Inner HTML&quot;).
          </p>
          <p>
            Then paste it into the window below. It will be parsed for
            references, and the references will be added.
          </p>
          <BibTexEntryLink
            keyValuePairs={keyValuePairs}
            testId="BulkReferenceUploadModal"
          />
          <Form.Group>
            <Form.Label htmlFor="rawHtml">Pasted ACM DL HTML</Form.Label>
            <Form.Control
              data-testid="BulkReferenceUploadModal-rawHtml"
              id="rawHtml"
              as="textarea"
              rows={12}
              style={{ width: "100%", resize: "vertical" }}
              isInvalid={Boolean(errors.rawHtml)}
              {...register("rawHtml", {
                required: "Pasted HTML is required.",
              })}
            />
            <Form.Control.Feedback type="invalid">
              {errors.rawHtml?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="BulkReferenceUploadModal-submit"
          >
            Upload
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
