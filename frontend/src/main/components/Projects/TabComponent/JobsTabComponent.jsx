import { useBackend } from "main/utils/useBackend";
import { Button, Row } from "react-bootstrap";
import JobsTable from "main/components/Jobs/JobsTable";

export default function JobsTabComponent({
  projectId,
  testIdPrefix = "JobsTabComponent",
}) {
  const queryKey = `/api/jobs/project?projectId=${projectId}`;

  const { data: jobs, refetch } = useBackend(
    [queryKey],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: queryKey },
    [],
    true,
  );

  return (
    <div
      data-testid={`${testIdPrefix}-JobsTabComponent`}
      className="tabComponent"
    >
      <Row className="p-2">
        <Button
          onClick={() => refetch()}
          data-testid={`${testIdPrefix}-refresh-button`}
        >
          Refresh
        </Button>
      </Row>
      <Row>
        <JobsTable jobs={jobs} />
      </Row>
    </div>
  );
}
