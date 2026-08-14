import Modal from "react-bootstrap/Modal";
import { Button, Col, Row } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * A read-only modal comparing the currently-published comments (CITELINES_comments) against
 * the in-progress draft, shown when a BibTexEntryComments editor has both. "Return to Editor"
 * just dismisses the modal; "Restore this Version" is left to the caller (typically discarding
 * the draft, via `DELETE /api/bibtexentries/comments/draft`, so the published comments take
 * precedence again) — this component has no backend knowledge of its own.
 */
export default function PreviousVersionModal({
  show,
  onHide,
  publishedMarkdown,
  onRestore,
  isRestoring = false,
  testId = "PreviousVersionModal",
}) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      data-testid={`${testId}-base`}
    >
      <Modal.Header>
        <Modal.Title>Previous Version</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h6>Markdown source</h6>
            <pre
              className="border rounded-3 p-3"
              style={{ whiteSpace: "pre-wrap" }}
              data-testid={`${testId}-source`}
            >
              {publishedMarkdown}
            </pre>
          </Col>
          <Col md={6}>
            <h6>Rendered</h6>
            <div
              className="border rounded-3 p-3"
              data-testid={`${testId}-rendered`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {publishedMarkdown}
              </ReactMarkdown>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
          data-testid={`${testId}-return-button`}
        >
          Return to Editor
        </Button>
        <Button
          variant="danger"
          onClick={onRestore}
          disabled={isRestoring}
          data-testid={`${testId}-restore-button`}
        >
          Restore this Version
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
