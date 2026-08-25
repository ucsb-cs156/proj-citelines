import { useBackend, useBackendMutation } from "main/utils/useBackend";
import { Button, Row } from "react-bootstrap";
import Accordion from "react-bootstrap/Accordion";
import { toast } from "react-toastify";
import JobsTable from "main/components/Jobs/JobsTable";
import SingleButtonJobForm from "main/components/Jobs/SingleButtonJobForm";

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

  const checkLinksMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/checkLinks",
      method: "POST",
      params: { projectId },
    }),
    {
      onSuccess: () => {
        toast("Check Links job launched — check below for progress.");
        refetch();
      },
    },
  );

  const submitCheckLinks = async () => {
    checkLinksMutation.mutate({});
  };

  const improveBibTexEntriesMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/improveBibTexEntries",
      method: "POST",
      params: { projectId, scope: "PROJECT" },
    }),
    {
      onSuccess: () => {
        toast(
          "Improve BibTeX Entries job launched — check below for progress.",
        );
        refetch();
      },
    },
  );

  const submitImproveBibTexEntries = async () => {
    improveBibTexEntriesMutation.mutate({});
  };

  const detectDuplicatesMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/detectDuplicates",
      method: "POST",
      params: { projectId },
    }),
    {
      onSuccess: () => {
        toast("Detect Duplicates job launched — check below for progress.");
        refetch();
      },
    },
  );

  const submitDetectDuplicates = async () => {
    detectDuplicatesMutation.mutate({});
  };

  return (
    <div
      data-testid={`${testIdPrefix}-JobsTabComponent`}
      className="tabComponent"
    >
      <Row className="p-2">
        <Accordion>
          <Accordion.Item eventKey="checkLinks">
            <Accordion.Header>Check Links</Accordion.Header>
            <Accordion.Body>
              <SingleButtonJobForm
                callback={submitCheckLinks}
                text={"Start"}
                testid={`${testIdPrefix}-checkLinksJob`}
              />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="improveBibTexEntries">
            <Accordion.Header>Improve BibTeX Entries</Accordion.Header>
            <Accordion.Body>
              <SingleButtonJobForm
                callback={submitImproveBibTexEntries}
                text={"Start"}
                testid={`${testIdPrefix}-improveBibTexEntriesJob`}
              />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="detectDuplicates">
            <Accordion.Header>Detect Duplicates</Accordion.Header>
            <Accordion.Body>
              <SingleButtonJobForm
                callback={submitDetectDuplicates}
                text={"Start"}
                testid={`${testIdPrefix}-detectDuplicatesJob`}
              />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Row>
      <Row className="p-2">
        <Button
          onClick={() => refetch()}
          data-testid={`${testIdPrefix}-refresh-button`}
        >
          Refresh
        </Button>
      </Row>
      <Row>
        <JobsTable jobs={jobs} onCancelled={refetch} />
      </Row>
    </div>
  );
}
