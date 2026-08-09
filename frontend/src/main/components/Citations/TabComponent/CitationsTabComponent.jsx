import { useBackend } from "main/utils/useBackend";
import { useState } from "react";
import { Button, Row } from "react-bootstrap";
import CitationTable from "main/components/Citations/CitationTable";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";

export default function CitationsTabComponent({
  projectId,
  testIdPrefix = "CitationsTabComponent",
}) {
  const [postModal, showPostModal] = useState(false);

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
      <Row className="p-2">
        <Button
          onClick={() => showPostModal(true)}
          data-testid={`${testIdPrefix}-post-button`}
        >
          Add Citation
        </Button>
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
