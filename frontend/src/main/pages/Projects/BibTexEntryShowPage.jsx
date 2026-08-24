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
import CitationFilter from "main/components/Citations/CitationFilter";
import CitationSort from "main/components/Citations/CitationSort";
import AbstractEditModal from "main/components/Citations/AbstractEditModal";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import BulkCitationUploadModal from "main/components/Citations/BulkCitationUploadModal";
import BulkReferenceUploadModal from "main/components/Citations/BulkReferenceUploadModal";
import BibTexEntryComments from "main/components/Citations/BibTexEntryComments";
import BibTexEntryLink from "main/components/Citations/BibTexEntryLink";
import TagSelector from "main/components/Tags/TagSelector";
import {
  RELEVANCE_OPTIONS,
  extractCitelinesFields,
  injectCitelinesFields,
} from "main/utils/citelinesFields";
import {
  formatDuplicateReason,
  hasPossibleDuplicateFlag,
} from "main/utils/duplicateFlags";
import { relevanceClassName } from "main/utils/relevance";
import { useFilteredSortedCitations } from "main/utils/useFilteredSortedCitations";

const POSSIBLE_DUPLICATE_HEADER_COLOR = "#f8d7da";

const UNRESOLVED_COUNT_TOOLTIP =
  `Whenever "Get References"/"Get Citations" learns a related paper exists ` +
  `but can't fully identify it, that gap is recorded rather than silently ` +
  `dropped, so this count doesn't quietly hide references we know about but ` +
  `couldn't add. This can happen when: a resolver names a related work but ` +
  `it doesn't actually resolve to anything when fetched; a related work ` +
  `resolves but no title could be found for it from any provider; or a ` +
  `related work was added successfully but has no DOI, so it can't itself ` +
  `be used to keep expanding the citation graph further.`;

// The independently-collapsible cards on this page (issue #38, extended by issue #79). Unlike a
// react-bootstrap Accordion, any number of these may be open at once. `field` is the (lowercased,
// unprefixed)
// preserved CITELINES_ field name used to persist each card's state onto the entry itself, e.g.
// "card_bibtex" <-> CITELINES_card_bibtex = {Open|Closed}.
const CARD_DEFS = [
  { key: "abstract", field: "card_abstract", defaultOpen: false },
  { key: "bibtex", field: "card_bibtex", defaultOpen: true },
  { key: "comments", field: "card_comments", defaultOpen: false },
  { key: "references", field: "card_references", defaultOpen: false },
  { key: "citations", field: "card_citations", defaultOpen: false },
];

/** A card whose body can be independently expanded/collapsed, unlike react-bootstrap's Accordion
 * (where by default only one item can be open at a time). `header` is rendered next to the
 * open/close toggle so callers can put dynamic content (e.g. a count) there. */
function CollapsibleCard({
  testId,
  header,
  headerActions,
  headerStyle,
  isOpen,
  onToggle,
  children,
}) {
  // react-bootstrap's Collapse always keeps its children mounted (just animates height), even
  // while closed — fine for cheap content, but wasteful (and, for something like the Comments
  // card's CodeMirror-based markdown editor, actively broken: initializing inside a zero-height
  // hidden container is a well-known CodeMirror gotcha) for a card that defaults to closed and
  // may never be opened. Mounting children lazily on first open — and leaving them mounted after
  // that, rather than unmounting again on re-close — avoids the eager cost while still preserving
  // in-progress state (e.g. an unsaved comment draft) across a collapse/expand.
  const [hasOpened, setHasOpened] = useState(isOpen);
  useEffect(() => {
    if (isOpen) setHasOpened(true);
  }, [isOpen]);

  return (
    <Card className="mb-3" data-testid={testId}>
      <Card.Header
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        data-testid={`${testId}-header`}
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer", ...headerStyle }}
      >
        <div className="flex-grow-1">{header}</div>
        {headerActions && (
          <div className="me-2" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
        <span data-testid={`${testId}-toggle-icon`}>{isOpen ? "▲" : "▼"}</span>
      </Card.Header>
      <Collapse in={isOpen}>
        <div data-testid={`${testId}-body`}>
          <Card.Body>{hasOpened ? children : null}</Card.Body>
        </div>
      </Collapse>
    </Card>
  );
}

/** The formatted-citation link for a single entry named as a possible duplicate — its own
 * component (rather than an inline map) since each one needs its own useBackend call. */
function PossibleDuplicateCitation({ projectId, duplicateId, testId }) {
  const queryKey = `/api/bibtexentries/formatted?projectId=${projectId}&id=${duplicateId}`;
  const { data: formattedCitation } = useBackend(
    [queryKey],
    {
      method: "GET",
      url: "/api/bibtexentries/formatted",
      params: { projectId, id: duplicateId },
    },
    "",
    true,
  );

  return (
    <Link
      to={`/project/${projectId}/bibtex/${duplicateId}`}
      data-testid={testId}
    >
      {formattedCitation || "Loading..."}
    </Link>
  );
}

export default function BibTexEntryShowPage({
  testId = "BibTexEntryShowPage",
}) {
  const { id: projectId, entryId } = useParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showAddReferenceModal, setShowAddReferenceModal] = useState(false);
  const [showAddCitationModal, setShowAddCitationModal] = useState(false);
  const [showBulkCitationUploadModal, setShowBulkCitationUploadModal] =
    useState(false);
  const [showBulkReferenceUploadModal, setShowBulkReferenceUploadModal] =
    useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAbstractEditModal, setShowAbstractEditModal] = useState(false);
  // Debug-only card (issue #77): local, unpersisted state (unlike CARD_DEFS' cards) since this
  // is a temporary aid for actively developing/verifying backend schema changes, not a permanent
  // per-entry preference worth writing into CITELINES_ fields.
  const [showRawEntry, setShowRawEntry] = useState(false);
  // Open by default whenever the entry is flagged, matching CitationTable's Flags column.
  const [showPossibleDuplicates, setShowPossibleDuplicates] = useState(true);

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

  const { data: project } = useBackend(
    [`/api/projects/${projectId}`],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: `/api/projects/${projectId}` },
    null,
    true,
  );

  const tagsQueryKey = `/api/tags/project?projectId=${projectId}`;
  const { data: allTags } = useBackend(
    [tagsQueryKey],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: tagsQueryKey },
    [],
    true,
  );
  const assignedTagIds = new Set(entry?.tagIds ?? []);
  const assignedTags = allTags.filter((tag) => assignedTagIds.has(tag.id));

  const addTagMutation = useBackendMutation(
    (tag) => ({
      url: "/api/bibtexentries/tags",
      method: "POST",
      params: { id: entry?.id, projectId, tagId: tag.id },
    }),
    {},
    [entryQueryKey],
  );

  const removeTagMutation = useBackendMutation(
    (tag) => ({
      url: "/api/bibtexentries/tags",
      method: "DELETE",
      params: { id: entry?.id, projectId, tagId: tag.id },
    }),
    {},
    [entryQueryKey],
  );

  const formattedCitationQueryKey = `/api/bibtexentries/formatted?projectId=${projectId}&id=${entry?.id}`;
  const { data: formattedCitation } = useBackend(
    [formattedCitationQueryKey],
    {
      method: "GET",
      url: "/api/bibtexentries/formatted",
      params: { projectId, id: entry?.id },
    },
    "",
    true,
    { enabled: !!entry },
  );

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

  const referencesQueryKey = `/api/citationedges/references?projectId=${projectId}&id=${entry?.id}`;
  const { data: references } = useBackend(
    [referencesQueryKey],
    {
      method: "GET",
      url: "/api/citationedges/references",
      params: { projectId, id: entry?.id },
    },
    [],
    true,
    { refetchInterval: 5000, enabled: !!entry },
  );

  const citationsQueryKey = `/api/citationedges/citations?projectId=${projectId}&id=${entry?.id}`;
  const { data: citations } = useBackend(
    [citationsQueryKey],
    {
      method: "GET",
      url: "/api/citationedges/citations",
      params: { projectId, id: entry?.id },
    },
    [],
    true,
    { refetchInterval: 5000, enabled: !!entry },
  );

  const { data: unresolved } = useBackend(
    [
      `/api/citationedges/unresolved?projectId=${projectId}&sourceEntryId=${entry?.id}`,
    ],
    {
      method: "GET",
      url: "/api/citationedges/unresolved",
      params: { projectId, sourceEntryId: entry?.id },
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

  // Each card gets its own independent filter/sort state (issue #108) — narrowing/sorting
  // References must not affect Citations, and vice versa. The heading counts above still show
  // the raw, unfiltered totals; only the table itself reflects the filter/sort.
  const referencesFilterSort = useFilteredSortedCitations(references);
  const citationsFilterSort = useFilteredSortedCitations(citations);

  const abstractText = entry?.keyValuePairs?.abstract ?? "";
  const abstractWordCount = abstractText.trim()
    ? abstractText.trim().split(/\s+/).length
    : 0;

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

  const improveEntryMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/improveBibTexEntries",
      method: "POST",
      params: { projectId, scope: "ENTRY", entryId: entry?.id },
    }),
    {
      onSuccess: () =>
        toast(
          "Improve BibTeX Entries job launched — check the Jobs tab for progress.",
        ),
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
            relatedEntryId={entry.id}
            relationship="reference"
            mutationQueryKeys={[referencesQueryKey]}
          />
          <BibTexEntryModal
            showModal={showAddCitationModal}
            toggleShowModal={setShowAddCitationModal}
            projectId={projectId}
            relatedEntryId={entry.id}
            relationship="citation"
            mutationQueryKeys={[citationsQueryKey]}
          />
          <BulkCitationUploadModal
            showModal={showBulkCitationUploadModal}
            toggleShowModal={setShowBulkCitationUploadModal}
            projectId={projectId}
            citeKey={entry.citeKey}
            keyValuePairs={entry.keyValuePairs}
            mutationQueryKeys={[citationsQueryKey]}
          />
          <BulkReferenceUploadModal
            showModal={showBulkReferenceUploadModal}
            toggleShowModal={setShowBulkReferenceUploadModal}
            projectId={projectId}
            citeKey={entry.citeKey}
            keyValuePairs={entry.keyValuePairs}
            mutationQueryKeys={[referencesQueryKey]}
          />
          <BibTexEntryModal
            showModal={showEditModal}
            toggleShowModal={setShowEditModal}
            projectId={projectId}
            entryToEdit={entry}
            mutationQueryKeys={[exportQueryKey, entryQueryKey]}
          />
          <AbstractEditModal
            showModal={showAbstractEditModal}
            toggleShowModal={setShowAbstractEditModal}
            projectId={projectId}
            entry={entry}
            mutationQueryKeys={[entryQueryKey]}
            testId={`${testId}-AbstractEditModal`}
          />
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h1 data-testid={`${testId}-title`} className="h3 fw-semibold mb-0">
              {entry.citeKey}
            </h1>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => improveEntryMutation.mutate({})}
                data-testid={`${testId}-improve-entry-button`}
              >
                Improve This Entry
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                data-testid={`${testId}-delete-button`}
              >
                Delete
              </Button>
            </div>
          </div>

          <BibTexEntryLink
            keyValuePairs={entry.keyValuePairs}
            testId={testId}
          />

          <div className="mb-3">
            <TagSelector
              allTags={allTags}
              assignedTags={assignedTags}
              onAddTag={(tag) => addTagMutation.mutate(tag)}
              onRemoveTag={(tag) => removeTagMutation.mutate(tag)}
              projectId={projectId}
              testId={`${testId}-TagSelector`}
            />
          </div>

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
                <option
                  key={option}
                  value={option}
                  className={relevanceClassName(option)}
                >
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
            </div>
          </Row>

          <Row className="mb-3">
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={() => setShowBulkReferenceUploadModal(true)}
                data-testid={`${testId}-bulk-reference-upload-button`}
              >
                Bulk References from ACM DL
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => setShowBulkCitationUploadModal(true)}
                data-testid={`${testId}-bulk-citation-upload-button`}
              >
                Bulk Citations from ACM DL
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

          {hasPossibleDuplicateFlag(entry) && (
            <CollapsibleCard
              testId={`${testId}-PossibleDuplicatesCard`}
              header="Possible Duplicates"
              headerStyle={{ backgroundColor: POSSIBLE_DUPLICATE_HEADER_COLOR }}
              isOpen={showPossibleDuplicates}
              onToggle={() => setShowPossibleDuplicates((prev) => !prev)}
            >
              {(entry.possibleDuplicateIds ?? []).map((duplicateId) => (
                <div
                  key={duplicateId}
                  className="mb-3"
                  data-testid={`${testId}-PossibleDuplicatesCard-item-${duplicateId}`}
                >
                  <div className="fw-semibold">Possible duplicate:</div>
                  <PossibleDuplicateCitation
                    projectId={projectId}
                    duplicateId={duplicateId}
                    testId={`${testId}-PossibleDuplicatesCard-citation-${duplicateId}`}
                  />
                  <div
                    data-testid={`${testId}-PossibleDuplicatesCard-reason-${duplicateId}`}
                  >
                    Reason:{" "}
                    {formatDuplicateReason(entry.possibleDuplicateReason)}
                  </div>
                </div>
              ))}
            </CollapsibleCard>
          )}

          <Card
            className="mb-3"
            data-testid={`${testId}-FormattedReferenceCard`}
          >
            <Card.Header>Formatted Reference</Card.Header>
            <Card.Body>
              <div
                className="fw-semibold mb-2"
                data-testid={`${testId}-formatted-citation-label`}
              >
                Formatted Citation ({project?.citationFormat ?? "Loading..."})
              </div>
              <div data-testid={`${testId}-formatted-citation`}>
                {formattedCitation}
              </div>
            </Card.Body>
          </Card>

          <CollapsibleCard
            testId={`${testId}-AbstractCard`}
            header={`Abstract (${abstractWordCount} words)`}
            headerActions={
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowAbstractEditModal(true)}
                data-testid={`${testId}-abstract-edit-button`}
              >
                Edit
              </Button>
            }
            isOpen={cardOpenState.abstract}
            onToggle={() => toggleCard("abstract", "card_abstract")}
          >
            <div data-testid={`${testId}-abstract-text`}>{abstractText}</div>
          </CollapsibleCard>

          <CollapsibleCard
            testId={`${testId}-BibtexCard`}
            header="BibTex Entry"
            headerActions={
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowEditModal(true)}
                data-testid={`${testId}-edit-button`}
              >
                Edit
              </Button>
            }
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
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`${testId}-references-unresolved-tooltip`}>
                        {UNRESOLVED_COUNT_TOOLTIP}
                      </Tooltip>
                    }
                  >
                    <span
                      className="text-warning ms-2"
                      data-testid={`${testId}-references-unresolved-badge`}
                    >
                      — {unresolvedReferencesCount} unresolved
                    </span>
                  </OverlayTrigger>
                )}
              </span>
            }
            isOpen={cardOpenState.references}
            onToggle={() => toggleCard("references", "card_references")}
          >
            <CitationFilter
              filter={referencesFilterSort.filter}
              onChange={referencesFilterSort.setFilter}
              allTags={allTags}
              testId={`${testId}-ReferencesFilter`}
            />
            <CitationSort
              sortCriteria={referencesFilterSort.sortCriteria}
              onChange={referencesFilterSort.setSortCriteria}
              testId={`${testId}-ReferencesSort`}
            />
            <CitationTable
              readOnly
              citations={referencesFilterSort.visibleCitations}
              projectId={projectId}
              testId={`${testId}-ReferencesTable`}
              allTags={allTags}
              enableColumnSort={referencesFilterSort.enableColumnSort}
            />
          </CollapsibleCard>

          <CollapsibleCard
            testId={`${testId}-CitationsCard`}
            header={
              <span data-testid={`${testId}-citations-heading`}>
                Citations ({citations.length})
                {unresolvedCitationsCount > 0 && (
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`${testId}-citations-unresolved-tooltip`}>
                        {UNRESOLVED_COUNT_TOOLTIP}
                      </Tooltip>
                    }
                  >
                    <span
                      className="text-warning ms-2"
                      data-testid={`${testId}-citations-unresolved-badge`}
                    >
                      — {unresolvedCitationsCount} unresolved
                    </span>
                  </OverlayTrigger>
                )}
              </span>
            }
            isOpen={cardOpenState.citations}
            onToggle={() => toggleCard("citations", "card_citations")}
          >
            <CitationFilter
              filter={citationsFilterSort.filter}
              onChange={citationsFilterSort.setFilter}
              allTags={allTags}
              testId={`${testId}-CitationsFilter`}
            />
            <CitationSort
              sortCriteria={citationsFilterSort.sortCriteria}
              onChange={citationsFilterSort.setSortCriteria}
              testId={`${testId}-CitationsSort`}
            />
            <CitationTable
              readOnly
              citations={citationsFilterSort.visibleCitations}
              projectId={projectId}
              testId={`${testId}-CitationsTable`}
              allTags={allTags}
              enableColumnSort={citationsFilterSort.enableColumnSort}
            />
          </CollapsibleCard>

          <CollapsibleCard
            testId={`${testId}-RawEntryCard`}
            header="Raw BibTeX (debug)"
            isOpen={showRawEntry}
            onToggle={() => setShowRawEntry((prev) => !prev)}
          >
            <pre
              data-testid={`${testId}-raw-entry-json`}
              className="border rounded-3 p-3"
            >
              {JSON.stringify(entry, null, 2)}
            </pre>
          </CollapsibleCard>
        </div>
      )}
    </BasicLayout>
  );
}
