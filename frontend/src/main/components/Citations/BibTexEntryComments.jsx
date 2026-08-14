import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Col, Row } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SimpleMdeReact from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import { useBackendMutation } from "main/utils/useBackend";
import PreviousVersionModal from "main/components/Citations/PreviousVersionModal";

/**
 * How often the draft editor autosaves while dirty. May eventually become user-configurable
 * (e.g. in a user profile) — for now this is the single source of truth for the interval.
 */
export const CITELINES_AUTOSAVE_INTERVAL_MS = 1000;

// EasyMDE's own preview/side-by-side/fullscreen toggle buttons are deliberately omitted: this
// component builds its own permanent two-pane layout, so leaving them in would offer the user
// two conflicting preview mechanisms.
const EASYMDE_TOOLBAR = [
  "bold",
  "italic",
  "strikethrough",
  "heading",
  "|",
  "code",
  "quote",
  "unordered-list",
  "ordered-list",
  "|",
  "link",
  "image",
  "table",
  "|",
  "undo",
  "redo",
];

function commentsOf(entry) {
  return entry?.keyValuePairs?.CITELINES_comments ?? "";
}

function draftOf(entry) {
  return entry?.keyValuePairs?.CITELINES_comments_draft ?? "";
}

/**
 * Displays and edits a BibTexEntry's comments (CITELINES_comments), stored as Markdown, with a
 * draft/autosave/restore workflow (CITELINES_comments_draft). See issue #36 for the full state
 * model. Not yet wired into any page — `entry`/`projectId` are passed in directly by the caller,
 * and this component keeps its own local copy of the entry, updated from each mutation's
 * response, so it can be exercised standalone (e.g. in Storybook) without a parent page owning
 * its state.
 */
export default function BibTexEntryComments({
  entry,
  projectId,
  testId = "BibTexEntryComments",
  autosaveIntervalMs = CITELINES_AUTOSAVE_INTERVAL_MS,
}) {
  const [localEntry, setLocalEntry] = useState(entry);
  const hasComments = Boolean(commentsOf(localEntry));
  const hasDraft = Boolean(draftOf(localEntry));

  // Overrides the data-derived mode into "edit" when the user clicks "Edit" from a
  // comments-only, no-draft view — reset back to false once a draft exists (the data-derived
  // mode then takes over) or after Save/Restore return the entry to a no-draft state.
  const [forceEdit, setForceEdit] = useState(false);
  const mode = hasDraft || !hasComments || forceEdit ? "edit" : "view";

  const [draftText, setDraftText] = useState(
    draftOf(entry) || commentsOf(entry),
  );
  const [showPreviousVersionModal, setShowPreviousVersionModal] =
    useState(false);

  // Kept in sync with draftText (in the same handler, not via a separate effect) so the
  // autosave interval callback below never closes over a stale value.
  const dirtyRef = useRef(false);
  const draftTextRef = useRef(draftText);

  const editorOptions = useMemo(
    () => ({ spellChecker: false, status: false, toolbar: EASYMDE_TOOLBAR }),
    [],
  );

  const autosaveMutation = useBackendMutation(
    (text) => ({
      url: "/api/bibtexentries/comments/draft",
      method: "PUT",
      params: { id: localEntry.id, projectId },
      data: text,
      headers: { "Content-Type": "text/plain" },
    }),
    {},
  );

  const saveMutation = useBackendMutation(
    () => ({
      url: "/api/bibtexentries/comments/save",
      method: "POST",
      params: { id: localEntry.id, projectId },
    }),
    {},
  );

  const restoreMutation = useBackendMutation(
    () => ({
      url: "/api/bibtexentries/comments/draft",
      method: "DELETE",
      params: { id: localEntry.id, projectId },
    }),
    {},
  );

  // A heartbeat, not a debounce: fires every autosaveIntervalMs regardless of typing cadence,
  // saving only if the draft has actually changed since the last tick. Created once and cleaned
  // up on unmount, not recreated per keystroke — mirroring the AC's "autosave... every n ms".
  useEffect(() => {
    const id = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        autosaveMutation.mutate(draftTextRef.current, {
          onSuccess: (updated) => setLocalEntry(updated),
        });
      }
      // Stryker disable next-line ArrayDeclaration : the interval must persist across
      // re-renders, not reset on every keystroke
    }, autosaveIntervalMs);
    return () => clearInterval(id);
  }, [autosaveIntervalMs, autosaveMutation]);

  const handleEditorChange = (value) => {
    setDraftText(value);
    draftTextRef.current = value;
    dirtyRef.current = true;
  };

  const handleEditClick = () => {
    setDraftText(commentsOf(localEntry));
    draftTextRef.current = commentsOf(localEntry);
    setForceEdit(true);
  };

  const handleCancelClick = () => {
    setForceEdit(false);
  };

  const handleSaveClick = () => {
    const onSaved = { onSuccess: (updated) => finishEditing(updated) };
    if (dirtyRef.current) {
      dirtyRef.current = false;
      autosaveMutation.mutate(draftTextRef.current, {
        onSuccess: () => saveMutation.mutate(undefined, onSaved),
      });
    } else {
      saveMutation.mutate(undefined, onSaved);
    }
  };

  const handleRestoreClick = () => {
    restoreMutation.mutate(undefined, {
      onSuccess: (updated) => {
        finishEditing(updated);
        setShowPreviousVersionModal(false);
      },
    });
  };

  function finishEditing(updated) {
    setLocalEntry(updated);
    setForceEdit(false);
  }

  const canCancel = mode === "edit" && !hasDraft && hasComments;
  const canSeePreviousVersion = mode === "edit" && hasComments && hasDraft;

  if (mode === "view") {
    return (
      <div data-testid={`${testId}-base`}>
        <div className="d-flex justify-content-end mb-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleEditClick}
            data-testid={`${testId}-edit-button`}
          >
            Edit
          </Button>
        </div>
        <div data-testid={`${testId}-rendered`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {commentsOf(localEntry)}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`${testId}-base`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        {hasDraft ? (
          <Badge bg="warning" text="dark" data-testid={`${testId}-draft-badge`}>
            Draft
          </Badge>
        ) : (
          <span />
        )}
        <div className="d-flex gap-2">
          {canSeePreviousVersion && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowPreviousVersionModal(true)}
              data-testid={`${testId}-see-previous-version-button`}
            >
              See previous version
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleCancelClick}
              data-testid={`${testId}-cancel-button`}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveClick}
            data-testid={`${testId}-save-button`}
          >
            Save
          </Button>
        </div>
      </div>

      <Row>
        <Col md={6} data-testid={`${testId}-editor-pane`}>
          <SimpleMdeReact
            value={draftText}
            onChange={handleEditorChange}
            options={editorOptions}
          />
        </Col>
        <Col md={6}>
          <div
            className="border rounded-3 p-3 h-100"
            data-testid={`${testId}-preview-pane`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {draftText}
            </ReactMarkdown>
          </div>
        </Col>
      </Row>

      <PreviousVersionModal
        show={showPreviousVersionModal}
        onHide={() => setShowPreviousVersionModal(false)}
        publishedMarkdown={commentsOf(localEntry)}
        onRestore={handleRestoreClick}
        isRestoring={restoreMutation.isPending}
        testId={`${testId}-PreviousVersionModal`}
      />
    </div>
  );
}
