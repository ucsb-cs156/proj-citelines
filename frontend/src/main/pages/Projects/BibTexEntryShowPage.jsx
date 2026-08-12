import { useEffect, useState } from "react";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { Link, useNavigate, useParams } from "react-router";

import Modal from "react-bootstrap/Modal";
import { Button, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { toast } from "react-toastify";
import CitationTable from "main/components/Citations/CitationTable";
import { extractCitelinesFields } from "main/utils/citelinesFields";

export default function BibTexEntryShowPage({
  testId = "BibTexEntryShowPage",
}) {
  const { id: projectId, entryId } = useParams();
  const [showErrorModal, setShowErrorModal] = useState(false);

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

  const { data: rawBibtex } = useBackend(
    [`/api/bibtexentries/export?projectId=${projectId}&id=${entry?.id}`],
    {
      method: "GET",
      url: "/api/bibtexentries/export",
      params: { projectId, id: entry?.id },
    },
    "",
    true,
    { enabled: !!entry },
  );

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
          <h1 data-testid={`${testId}-title`} className="h3 mb-3 fw-semibold">
            {entry.citeKey}
          </h1>

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
            </div>
          </Row>

          <pre
            data-testid={`${testId}-bibtex`}
            className="border rounded-3 p-3"
          >
            {extractCitelinesFields(rawBibtex).strippedBibtex}
          </pre>

          <h4 className="mt-4" data-testid={`${testId}-references-heading`}>
            References ({references.length})
          </h4>
          <CitationTable
            readOnly
            citations={references}
            projectId={projectId}
            testId={`${testId}-ReferencesTable`}
          />

          <h4 className="mt-4" data-testid={`${testId}-citations-heading`}>
            Citations ({citations.length})
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
