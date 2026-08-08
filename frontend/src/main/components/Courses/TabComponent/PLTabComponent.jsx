import { useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

// 403 messages the backend sends for problems the user can fix themselves;
// these are shown on the page rather than in a toast.
const EXPECTED_REPO_ERRORS = [
  "must set up Github PAT first",
  "No access to repo via Github PAT token",
  "Read/write access to repo via Github PAT is required",
];

const EXPECTED_INSTANCE_ERRORS = [
  "must set up Github PAT first",
  "must set up PrairieLearn PAT first",
  "must associate course with PlRepo first",
  "course instance id not found",
];

// Shows expected 403 messages on the page (via setError); everything else in a toast.
function makeOnError(expectedMessages, setError, genericMessage) {
  return (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    if (status === 403 && expectedMessages.includes(message)) {
      setError(message);
    } else {
      setError(null);
      toast.error(message ?? genericMessage);
    }
  };
}

export default function PLTabComponent({ courseId, testIdPrefix }) {
  const [repoError, setRepoError] = useState(null);

  // Current course, including the PL association details (plRepoName,
  // plInstanceShortName, plInstanceNumericId). Both mutations below invalidate
  // this key, so the green checks refresh right after a successful update.
  const { data: course } = useBackend(
    [`/api/courses/${courseId}`],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: `/api/courses/${courseId}` },
    null,
    true,
  );
  const [instanceError, setInstanceError] = useState(null);

  const {
    register: registerRepo,
    handleSubmit: handleSubmitRepo,
    formState: { errors: repoFormErrors },
  } = useForm();

  const {
    register: registerInstance,
    handleSubmit: handleSubmitInstance,
    formState: { errors: instanceFormErrors },
  } = useForm();

  const repoMutation = useBackendMutation(
    (data) => ({
      url: "/api/courses/updateGithubRepo",
      method: "PUT",
      params: { courseId, repoName: data.repoName },
    }),
    {
      onSuccess: () => {
        setRepoError(null);
        toast("GitHub repo associated with course");
      },
      onError: makeOnError(
        EXPECTED_REPO_ERRORS,
        setRepoError,
        "Error associating GitHub repo",
      ),
    },
    [`/api/courses/${courseId}`],
  );

  const instanceMutation = useBackendMutation(
    (data) => ({
      url: "/api/courses/updatePLInstance",
      method: "PUT",
      params: { courseId, instanceId: data.instanceId },
    }),
    {
      onSuccess: () => {
        setInstanceError(null);
        toast("PrairieLearn course instance associated with course");
      },
      onError: makeOnError(
        EXPECTED_INSTANCE_ERRORS,
        setInstanceError,
        "Error associating PrairieLearn course instance",
      ),
    },
    [`/api/courses/${courseId}`],
  );

  const syncJobMutation = useBackendMutation(
    () => ({
      url: "/api/jobs/launch/syncCourseWithPlRepo",
      method: "POST",
      params: { courseId },
    }),
    {
      onSuccess: (data) => {
        toast(`Sync job launched, job number ${data.id}`);
      },
      onError: (error) => {
        const message = error?.response?.data?.message;
        toast.error(message ?? "Unable to launch sync job");
      },
    },
    ["/api/jobs/all"],
  );

  const launchSyncJob = () => syncJobMutation.mutate();

  return (
    <div className="tabComponent" data-testid={`${testIdPrefix}-plTab`}>
      <h2>PrairieLearn</h2>

      <p>To configure your course for PrairieLearn:</p>
      <ol>
        <li>Create a Github PAT and enter it on the profile page.</li>
        <li>Create a PrairieLearn PAT and enter it on the profile page.</li>
        <li>
          Enter the name of the Github Repo associated with this course (the
          part after <code>https://github.com/</code>, e.g.{" "}
          <code>ucsb-cs156/pl-cs156</code>):
          {repoError && (
            <Alert
              variant="danger"
              className="mt-2"
              data-testid={`${testIdPrefix}-plTab-repo-error`}
            >
              {repoError}
            </Alert>
          )}
          <Form
            className="my-2"
            onSubmit={handleSubmitRepo((data) => repoMutation.mutate(data))}
          >
            <Form.Group className="mb-2" style={{ maxWidth: "400px" }}>
              <Form.Label htmlFor={`${testIdPrefix}-plTab-repoName`}>
                Repo name
              </Form.Label>
              {course?.plRepoId && (
                <span
                  className="text-success ms-2"
                  data-testid={`${testIdPrefix}-plTab-repo-check`}
                >
                  ✓ {course.plRepoName ?? `repo id ${course.plRepoId}`}
                </span>
              )}
              <Form.Control
                data-testid={`${testIdPrefix}-plTab-repoName`}
                id={`${testIdPrefix}-plTab-repoName`}
                type="text"
                placeholder="owner/repo"
                isInvalid={Boolean(repoFormErrors.repoName)}
                {...registerRepo("repoName", { required: true })}
              />
              <Form.Control.Feedback type="invalid">
                {repoFormErrors.repoName && "A repo name is required."}
              </Form.Control.Feedback>
            </Form.Group>
            <Button
              type="submit"
              data-testid={`${testIdPrefix}-plTab-repo-submit`}
            >
              Update Repo
            </Button>
          </Form>
        </li>
        <li>
          Enter the numeric course instance id of the course instance for this
          course:
          {instanceError && (
            <Alert
              variant="danger"
              className="mt-2"
              data-testid={`${testIdPrefix}-plTab-instance-error`}
            >
              {instanceError}
            </Alert>
          )}
          <Form
            className="my-2"
            onSubmit={handleSubmitInstance((data) =>
              instanceMutation.mutate(data),
            )}
          >
            <Form.Group className="mb-2" style={{ maxWidth: "400px" }}>
              <Form.Label htmlFor={`${testIdPrefix}-plTab-instanceId`}>
                Course instance id
              </Form.Label>
              {course?.plInstanceId && (
                <span
                  className="text-success ms-2"
                  data-testid={`${testIdPrefix}-plTab-instance-check`}
                >
                  ✓{" "}
                  {course.plInstanceShortName
                    ? `${course.plInstanceShortName} (PrairieLearn id ${course.plInstanceNumericId})`
                    : `instance id ${course.plInstanceId}`}
                </span>
              )}
              {/* text + numeric inputMode: an id field, so no spinner widget */}
              <Form.Control
                data-testid={`${testIdPrefix}-plTab-instanceId`}
                id={`${testIdPrefix}-plTab-instanceId`}
                type="text"
                inputMode="numeric"
                placeholder="e.g. 213133"
                isInvalid={Boolean(instanceFormErrors.instanceId)}
                {...registerInstance("instanceId", { required: true })}
              />
              <Form.Control.Feedback type="invalid">
                {instanceFormErrors.instanceId &&
                  "A course instance id is required."}
              </Form.Control.Feedback>
            </Form.Group>
            <Button
              type="submit"
              data-testid={`${testIdPrefix}-plTab-instance-submit`}
            >
              Update Course Instance
            </Button>
          </Form>
        </li>
      </ol>

      <Button
        onClick={launchSyncJob}
        disabled={syncJobMutation.isPending}
        data-testid={`${testIdPrefix}-plTab-sync-submit`}
      >
        Sync Course with PrairieLearn Repo
      </Button>
    </div>
  );
}
