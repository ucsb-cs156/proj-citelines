import { useEffect, useState } from "react";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { Link, useNavigate, useParams } from "react-router";

import Modal from "react-bootstrap/Modal";
import {
  Button,
  Card,
  Collapse,
  Form,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import { toast } from "react-toastify";
import CitationTable from "main/components/Citations/CitationTable";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import BibTexEntryComments from "main/components/Citations/BibTexEntryComments";
import BibTexEntryLink from "main/components/Citations/BibTexEntryLink";
import {
  RELEVANCE_OPTIONS,
  extractCitelinesFields,
  injectCitelinesFields,
} from "main/utils/citelinesFields";

// The four independently-collapsible cards on this page (issue #38). Unlike a react-bootstrap
// Accordion, any number of these may be open at once. `field` is the (lowercased, unprefixed)
// preserved CITELINES_ field name used to persist each card's state onto the entry itself, e.g.
// "card_bibtex" <-> CITELINES_card_bibtex = {Open|Closed}.
const CARD_DEFS = [
  { key: "bibtex", field: "card_bibtex", defaultOpen: true },
  { key: "comments", field: "card_comments", defaultOpen: false },
  { key: "references", field: "card_references", defaultOpen: false },
  { key: "citations", field: "card_citations", defaultOpen: false },
];

/** A card whose body can be independently expanded/collapsed, unlike react-bootstrap's Accordion
 * (where by default only one item can be open at a time). `header` is rendered next to the
 * open/close toggle so callers can put dynamic content (e.g. a count) there. */
function CollapsibleCard({ testId, header, isOpen, onToggle, children }) {
  return (
    <Card className="mb-3" data-testid={testId}>
      <Card.Header
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        data-testid={`${testId}-header`}
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
      >
        <div className="flex-grow-1">{header}</div>
        <span data-testid={`${testId}-toggle-icon`}>{isOpen ? "▲" : "▼"}</span>
      </Card.Header>
      <Collapse in={isOpen}>
        <div data-testid={`${testId}-body`}>
          <Card.Body>{children}</Card.Body>
        </div>
      </Collapse>
    </Card>
  );
}

export default function BibTexEntryShowPage({
  testId = "BibTexEntryShowPage",
}) {
  const { id: projectId, entryId } = useParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showAddReferenceModal, setShowAddReferenceModal] = useState(false);
  const [showAddCitationModal, setShowAddCitationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const entryQueryKey = `/api/bibtexentries/entry?projectId=${projectId}&id=${entryId}`;
  const { data: entry, failureCount: entryBackendFailureCount } = useBackend(
    [entryQueryKey],
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

  const [cardOpenState, setCardOpenState] = useState(() =>
    Object.fromEntries(CARD_DEFS.map((c) => [c.key, c.defaultOpen])),
  );

  // Once the raw bibtex (and hence preservedFields) has loaded, derive each card's open/closed
  // state from its persisted CITELINES_card_* field, defaulting per CARD_DEFS if the field isn't
  // present (e.g. this entry has never had a card toggled before).
  useEffect(() => {
    if (!rawBibtex) return;
    setCardOpenState(
      Object.fromEntries(
        CARD_DEFS.map((c) => [
          c.key,
          (preservedFields[`citelines_${c.field}`] ??
            (c.defaultOpen ? "Open" : "Closed")) === "Open",
        ]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawBibtex]);

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

  const updateCardStateMutation = useBackendMutation(
    (newPreservedFields) => ({
      url: "/api/bibtexentries",
      method: "PUT",
      params: { id: entry?.id, projectId },
      data: injectCitelinesFields(rawBibtex, relevance, newPreservedFields),
      headers: { "Content-Type": "text/plain" },
    }),
    {},
    [exportQueryKey],
  );

  function toggleCard(cardKey, fieldName) {
    setCardOpenState((prev) => {
      const newIsOpen = !prev[cardKey];
      // rawBibtex may not have loaded yet; injecting into an empty string would wipe the entry,
      // so only persist once we actually have the entry's bibtex to merge the new state into.
      if (rawBibtex) {
        updateCardStateMutation.mutate({
          ...preservedFields,
          [`citelines_${fieldName}`]: newIsOpen ? "Open" : "Closed",
        });
      }
      return { ...prev, [cardKey]: newIsOpen };
    });
  }

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
          <BibTexEntryModal
            showModal={showEditModal}
            toggleShowModal={setShowEditModal}
            projectId={projectId}
            entryToEdit={entry}
            mutationQueryKeys={[exportQueryKey, entryQueryKey]}
          />
          <h1 data-testid={`${testId}-title`} className="h3 mb-3 fw-semibold">
            {entry.citeKey}
          </h1>

          <BibTexEntryLink
            keyValuePairs={entry.keyValuePairs}
            testId={testId}
          />

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

          <Row className="mb-3">
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowEditModal(true)}
                data-testid={`${testId}-edit-button`}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                data-testid={`${testId}-delete-button-sm`}
              >
                Delete
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

          <CollapsibleCard
            testId={`${testId}-BibtexCard`}
            header="BibTex Entry"
            isOpen={cardOpenState.bibtex}
            onToggle={() => toggleCard("bibtex", "card_bibtex")}
          >
            <pre
              data-testid={`${testId}-bibtex`}
              className="border rounded-3 p-3"
            >
              {strippedBibtex}
            </pre>
          </CollapsibleCard>

          <CollapsibleCard
            testId={`${testId}-CommentsCard`}
            header="Comments"
            isOpen={cardOpenState.comments}
            onToggle={() => toggleCard("comments", "card_comments")}
          >
            <BibTexEntryComments
              entry={entry}
              projectId={projectId}
              testId={`${testId}-BibTexEntryComments`}
            />
          </CollapsibleCard>

          <CollapsibleCard
            testId={`${testId}-ReferencesCard`}
            header={
              <span data-testid={`${testId}-references-heading`}>
                References ({references.length})
                {unresolvedReferencesCount > 0 && (
                  <span
                    className="text-warning ms-2"
                    data-testid={`${testId}-references-unresolved-badge`}
                  >
                    — {unresolvedReferencesCount} unresolved
                  </span>
                )}
              </span>
            }
            isOpen={cardOpenState.references}
            onToggle={() => toggleCard("references", "card_references")}
          >
            <CitationTable
              readOnly
              citations={references}
              projectId={projectId}
              testId={`${testId}-ReferencesTable`}
            />
          </CollapsibleCard>

          <CollapsibleCard
            testId={`${testId}-CitationsCard`}
            header={
              <span data-testid={`${testId}-citations-heading`}>
                Citations ({citations.length})
                {unresolvedCitationsCount > 0 && (
                  <span
                    className="text-warning ms-2"
                    data-testid={`${testId}-citations-unresolved-badge`}
                  >
                    — {unresolvedCitationsCount} unresolved
                  </span>
                )}
              </span>
            }
            isOpen={cardOpenState.citations}
            onToggle={() => toggleCard("citations", "card_citations")}
          >
            <CitationTable
              readOnly
              citations={citations}
              projectId={projectId}
              testId={`${testId}-CitationsTable`}
            />
          </CollapsibleCard>
        </div>
      )}
    </BasicLayout>
  );
}
