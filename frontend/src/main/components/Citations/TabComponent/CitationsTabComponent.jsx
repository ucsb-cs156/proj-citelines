import { useBackend } from "main/utils/useBackend";
import { useState } from "react";
import { Button, Row } from "react-bootstrap";
import CitationTable from "main/components/Citations/CitationTable";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import DoiEntryModal from "main/components/Citations/DoiEntryModal";

export default function CitationsTabComponent({
  projectId,
  testIdPrefix = "CitationsTabComponent",
}) {
  const [postModal, showPostModal] = useState(false);
  const [doiModal, showDoiModal] = useState(false);

  const queryKey = `/api/bibtexentries/project?projectId=${projectId}`;

  const { data: citations } = useBackend(
    [queryKey],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: queryKey },
    [],
    true,
  );

  return (
    <div
      data-testid={`${testIdPrefix}-CitationsTabComponent`}
      className="tabComponent"
    >
      <BibTexEntryModal
        showModal={postModal}
        toggleShowModal={showPostModal}
        projectId={projectId}
        mutationQueryKeys={[queryKey]}
      />
      <DoiEntryModal
        showModal={doiModal}
        toggleShowModal={showDoiModal}
        projectId={projectId}
        mutationQueryKeys={[queryKey]}
      />
      <Row className="p-2">
        <div className="d-flex gap-2">
          <Button
            onClick={() => showPostModal(true)}
            data-testid={`${testIdPrefix}-post-button`}
          >
            Add Citation via BibTex
          </Button>
          <Button
            onClick={() => showDoiModal(true)}
            data-testid={`${testIdPrefix}-doi-button`}
          >
            Add Citation via DOI
          </Button>
        </div>
      </Row>
      <Row>
        <CitationTable
          citations={citations}
          projectId={projectId}
          testId={`${testIdPrefix}-CitationTable`}
          mutationQueryKeys={[queryKey]}
        />
      </Row>
    </div>
  );
}
