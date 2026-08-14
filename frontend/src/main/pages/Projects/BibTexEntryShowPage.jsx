import { useEffect, useState } from "react";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { Link, useNavigate, useParams } from "react-router";

import Modal from "react-bootstrap/Modal";
import { Button, Form, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { toast } from "react-toastify";
import CitationTable from "main/components/Citations/CitationTable";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import {
  RELEVANCE_OPTIONS,
  extractCitelinesFields,
  injectCitelinesFields,
} from "main/utils/citelinesFields";

export default function BibTexEntryShowPage({
  testId = "BibTexEntryShowPage",
}) {
  const { id: projectId, entryId } = useParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showAddReferenceModal, setShowAddReferenceModal] = useState(false);
  const [showAddCitationModal, setShowAddCitationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: entry, failureCount: entryBackendFailureCount } = useBackend(
    [`/api/bibtexentries/entry?projectId=${projectId}&id=${entryId}`],
    {
      method: "GET",
      url: "/api/bibtexentries/entry",
      params: { projectId, id: entryId },
    },
    null,
    true,
  );

  const getEntryFailed = entryBackendFailureCount > 0;

  const navigate = useNavigate();
  useEffect(() => {
    if (getEntryFailed) {
      setShowErrorModal(true);
      const timer = setTimeout(() => {
        navigate(`/project/${projectId}`, { replace: true });
      }, 3000);
      // Stryker disable next-line BlockStatement
      return () => {
        clearTimeout(timer);
      };
    }
  }, [getEntryFailed, navigate, projectId]);

  const exportQueryKey = `/api/bibtexentries/export?projectId=${projectId}&id=${entry?.id}`;
  const { data: rawBibtex } = useBackend(
    [exportQueryKey],
    {
      method: "GET",
      url: "/api/bibtexentries/export",
      params: { projectId, id: entry?.id },
    },
    "",
    true,
    { enabled: !!entry },
  );

  const { strippedBibtex, relevance, preservedFields } =
    extractCitelinesFields(rawBibtex);

  const referencesQueryKey = `/api/citationedges/references?projectId=${projectId}&citeKey=${entry?.citeKey}`;
  const { data: references } = useBackend(
    [referencesQueryKey],
    {
      method: "GET",
      url: "/api/citationedges/references",
      params: { projectId, citeKey: entry?.citeKey },
    },
    [],
    true,
    { refetchInterval: 5000, enabled: !!entry },
  );

  const citationsQueryKey = `/api/citationedges/citations?projectId=${projectId}&citeKey=${entry?.citeKey}`;
  const { data: citations } = useBackend(
    [citationsQueryKey],
    {
      method: "GET",
      url: "/api/citationedges/citations",
      params: { projectId, citeKey: entry?.citeKey },
    },
    [],
    true,
    { refetchInterval: 5000, enabled: !!entry },
  );

  const { data: unresolved } = useBackend(
    [
      `/api/citationedges/unresolved?projectId=${projectId}&sourceCiteKey=${entry?.citeKey}`,
    ],
    {
      method: "GET",
      url: "/api/citationedges/unresolved",
      params: { projectId, sourceCiteKey: entry?.citeKey },
    },
    [],
    true,
    { refetchInterval: 5000, enabled: !!entry },
  );
  const unresolvedReferencesCount = unresolved.filter(
    (u) => u.direction === "reference",
  ).length;
  const unresolvedCitationsCount = unresolved.filter(
    (u) => u.direction === "citation",
  ).length;

  const getReferencesMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/getReferences",
      method: "POST",
      params: { projectId, citeKey: entry?.citeKey },
    }),
    {
      onSuccess: () =>
        toast("Get References job launched — check the Jobs tab for progress."),
    },
  );

  const getCitationsMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/getCitations",
      method: "POST",
      params: { projectId, citeKey: entry?.citeKey },
    }),
    {
      onSuccess: () =>
        toast("Get Citations job launched — check the Jobs tab for progress."),
    },
  );

  const updateRelevanceMutation = useBackendMutation(
    (newRelevance) => ({
      url: "/api/bibtexentries",
      method: "PUT",
      params: { id: entry?.id, projectId },
      data: injectCitelinesFields(rawBibtex, newRelevance, preservedFields),
      headers: { "Content-Type": "text/plain" },
    }),
    { onSuccess: () => toast("Relevance updated successfully") },
    [exportQueryKey],
  );

  const deleteMutation = useBackendMutation(
    () => ({
      url: "/api/bibtexentries/delete",
      method: "DELETE",
      params: { id: entry?.id, projectId },
    }),
    {
      onSuccess: () => {
        toast("Entry deleted successfully");
        navigate(`/project/${projectId}`, { replace: true });
      },
    },
  );

  return (
    <BasicLayout>
      <Modal show={showErrorModal}>
        <Modal.Header>
          <Modal.Title>Citation Not Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Citation not found. You will be returned to the project page in 3
          seconds.
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowErrorModal(false)} variant={"primary"}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      {!entry ? (
        <div data-testid={`${testId}-loading`}>Citation: Loading...</div>
      ) : (
        <div className="border rounded-3 p-4 mb-4">
          <BibTexEntryModal
            showModal={showAddReferenceModal}
            toggleShowModal={setShowAddReferenceModal}
            projectId={projectId}
            relatedCiteKey={entry.citeKey}
            relationship="reference"
            mutationQueryKeys={[referencesQueryKey]}
          />
          <BibTexEntryModal
            showModal={showAddCitationModal}
            toggleShowModal={setShowAddCitationModal}
            projectId={projectId}
            relatedCiteKey={entry.citeKey}
            relationship="citation"
            mutationQueryKeys={[citationsQueryKey]}
          />
          <h1 data-testid={`${testId}-title`} className="h3 mb-3 fw-semibold">
            {entry.citeKey}
          </h1>

          <Form.Group className="mb-3" style={{ maxWidth: "200px" }}>
            <Form.Label htmlFor={`${testId}-relevance-select`}>
              Relevance
            </Form.Label>
            <Form.Select
              id={`${testId}-relevance-select`}
              data-testid={`${testId}-relevance-select`}
              value={relevance}
              onChange={(e) => updateRelevanceMutation.mutate(e.target.value)}
            >
              {RELEVANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row className="mb-3">
            <div className="d-flex gap-2">
              <Button
                as={Link}
                to={`/project/${projectId}`}
                variant="outline-secondary"
                data-testid={`${testId}-go-to-project-button`}
              >
                Go to Project
              </Button>
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id={`${testId}-get-references-tooltip`}>
                    Get all papers that this paper cites
                  </Tooltip>
                }
              >
                <Button
                  onClick={() => getReferencesMutation.mutate({})}
                  data-testid={`${testId}-get-references-button`}
                >
                  Get References
                </Button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id={`${testId}-get-citations-tooltip`}>
                    Get all papers that cite this paper
                  </Tooltip>
                }
              >
                <Button
                  onClick={() => getCitationsMutation.mutate({})}
                  data-testid={`${testId}-get-citations-button`}
                >
                  Get Citations
                </Button>
              </OverlayTrigger>
              <Button
                variant="outline-primary"
                onClick={() => setShowAddReferenceModal(true)}
                data-testid={`${testId}-add-reference-button`}
              >
                Add Reference
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => setShowAddCitationModal(true)}
                data-testid={`${testId}-add-citation-button`}
              >
                Add Citation
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => setShowDeleteModal(true)}
                data-testid={`${testId}-delete-button`}
              >
                Delete Entry
              </Button>
            </div>
          </Row>

          <Modal
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
            centered
            data-testid={`${testId}-delete-modal`}
          >
            <Modal.Header closeButton>
              <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>Permanently delete this entry?</Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                autoFocus
                onClick={() => setShowDeleteModal(false)}
                data-testid={`${testId}-delete-modal-cancel-button`}
              >
                No, Retain
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowDeleteModal(false);
                  deleteMutation.mutate({});
                }}
                data-testid={`${testId}-delete-modal-confirm-button`}
              >
                Yes, Delete
              </Button>
            </Modal.Footer>
          </Modal>

          <pre
            data-testid={`${testId}-bibtex`}
            className="border rounded-3 p-3"
          >
            {strippedBibtex}
          </pre>

          <h4 className="mt-4" data-testid={`${testId}-references-heading`}>
            References ({references.length})
            {unresolvedReferencesCount > 0 && (
              <span
                className="text-warning ms-2"
                data-testid={`${testId}-references-unresolved-badge`}
              >
                — {unresolvedReferencesCount} unresolved
              </span>
            )}
          </h4>
          <CitationTable
            readOnly
            citations={references}
            projectId={projectId}
            testId={`${testId}-ReferencesTable`}
          />

          <h4 className="mt-4" data-testid={`${testId}-citations-heading`}>
            Citations ({citations.length})
            {unresolvedCitationsCount > 0 && (
              <span
                className="text-warning ms-2"
                data-testid={`${testId}-citations-unresolved-badge`}
              >
                — {unresolvedCitationsCount} unresolved
              </span>
            )}
          </h4>
          <CitationTable
            readOnly
            citations={citations}
            projectId={projectId}
            testId={`${testId}-CitationsTable`}
          />
        </div>
      )}
    </BasicLayout>
  );
}
