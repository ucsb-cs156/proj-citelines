import { useEffect, useState } from "react";
import { useBackend } from "main/utils/useBackend";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { useCurrentUser, hasRole } from "main/utils/currentUser";
import { useNavigate, useParams, useSearchParams } from "react-router";

import Modal from "react-bootstrap/Modal";
import { Button, Tab, Tabs } from "react-bootstrap";
import CollaboratorsTabComponent from "main/components/Projects/TabComponent/CollaboratorsTabComponent";
import CitationsTabComponent from "main/components/Citations/TabComponent/CitationsTabComponent";
import JobsTabComponent from "main/components/Projects/TabComponent/JobsTabComponent";
import TagsTabComponent from "main/components/Tags/TabComponent/TagsTabComponent";
import { GraphIcon } from "main/components/Common/Icons";

// The tab names used both as react-bootstrap's Tab eventKeys and as the ?tab= query
// parameter's value, e.g. /project/4?tab=Tags (see issue #86) — using the same string for both
// means no separate name<->key mapping is needed.
const TAB_NAMES = ["Citations", "Jobs", "Collaborators", "Tags"];
const DEFAULT_TAB = "Citations";

export default function ResearcherProjectShowPage({
  testId = "ResearcherProjectShowPage",
}) {
  const currentUser = useCurrentUser();
  const projectId = useParams().id;
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TAB_NAMES.includes(requestedTab)
    ? requestedTab
    : DEFAULT_TAB;

  const {
    data: project,
    error: _errorProject,
    status: _statusProject,
    failureCount: projectBackendFailureCount,
  } = useBackend(
    [`/api/projects/${projectId}`],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: `/api/projects/${projectId}` },
    null,
    true,
  );

  const getProjectFailed = projectBackendFailureCount > 0;

  // Stryker disable OptionalChaining -- project?.owner is more readable than project && project.owner
  const isOwner =
    hasRole(currentUser, "ROLE_ADMIN") ||
    currentUser?.root?.user?.email === project?.owner;
  // Stryker enable OptionalChaining

  const navigate = useNavigate();
  useEffect(() => {
    if (getProjectFailed) {
      setShowErrorModal(true);
      const timer = setTimeout(() => {
        navigate("/", { replace: true });
      }, 3000);
      // Stryker disable next-line BlockStatement
      return () => {
        clearTimeout(timer);
      };
    }
  }, [getProjectFailed, navigate]);

  return (
    <BasicLayout>
      <Modal show={showErrorModal}>
        <Modal.Header>
          <Modal.Title>Project Not Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Project not found. You will be returned to the home page in 3 seconds.
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowErrorModal(false)} variant={"primary"}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      {!project ? (
        <div data-testid={`${testId}-loading`}>Project: Loading...</div>
      ) : (
        <div className="border rounded-3 p-4 mb-4 tabsGroup">
          <div className="border rounded-3 p-4 mb-4">
            <div className="d-flex align-items-center gap-2">
              <GraphIcon className="me-2" />
              <h1
                data-testid={`${testId}-title`}
                className="h3 mb-0 fw-semibold"
              >
                {project.name}
              </h1>
            </div>
            <p data-testid={`${testId}-description`} className="mb-0 mt-2">
              {project.description}
            </p>
          </div>

          <Tabs
            activeKey={activeTab}
            onSelect={(tab) => {
              if (tab) {
                setSearchParams({ tab }, { replace: true });
              }
            }}
          >
            <Tab eventKey={"Citations"} title={"Citations"} className="pt-2">
              <CitationsTabComponent
                projectId={projectId}
                testIdPrefix={`${testId}-Citations`}
              />
            </Tab>
            <Tab eventKey={"Jobs"} title={"Jobs"} className="pt-2">
              <JobsTabComponent
                projectId={projectId}
                testIdPrefix={`${testId}-Jobs`}
              />
            </Tab>
            <Tab
              eventKey={"Collaborators"}
              title={"Collaborators"}
              className="pt-2"
            >
              <CollaboratorsTabComponent
                projectId={projectId}
                testIdPrefix={testId}
                isOwner={isOwner}
              />
            </Tab>
            <Tab eventKey={"Tags"} title={"Tags"} className="pt-2">
              <TagsTabComponent
                projectId={projectId}
                testIdPrefix={`${testId}-Tags`}
              />
            </Tab>
          </Tabs>
        </div>
      )}
    </BasicLayout>
  );
}
