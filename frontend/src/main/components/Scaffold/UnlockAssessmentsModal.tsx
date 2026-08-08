import Modal from "react-bootstrap/Modal";
import { Form } from "react-bootstrap";
import { toast } from "react-toastify";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import type { AssessmentManagementDTO } from "main/types/conceptGraph";

interface UnlockAssessmentsModalProps {
  show: boolean;
  onHide: () => void;
  courseId: number;
}

// Lets an instructor see every assessment for the course (locked and unlocked) and toggle
// which ones are visible to students in the AssessmentSelect dropdown. Self-contained: owns
// its own fetch (only while open) and its own mutation, since the trigger button and this
// modal are siblings in ScaffoldTopBar rather than needing state lifted to ConceptGraphPage.
export default function UnlockAssessmentsModal({
  show,
  onHide,
  courseId,
}: UnlockAssessmentsModalProps) {
  const { data: assessments = [] } = useBackend<AssessmentManagementDTO[]>(
    ["/api/assessments/all", courseId],
    { method: "GET", url: "/api/assessments/all", params: { courseId } },
    [],
    false,
    { enabled: show },
  );

  const setLockedMutation = useBackendMutation<
    { assessmentId: string; locked: boolean },
    AssessmentManagementDTO
  >(
    ({ assessmentId, locked }) => ({
      method: "PUT",
      url: "/api/assessments/lock",
      params: { courseId, assessmentId, locked },
    }),
    {
      onError: (_error, { locked }) => {
        toast(`Failed to ${locked ? "lock" : "unlock"} assessment`);
      },
    },
    ["/api/assessments/all", "/api/assessments"],
  );

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered={true}
      data-testid="UnlockAssessmentsModal"
    >
      <Modal.Header closeButton>Unlock Assessments</Modal.Header>
      <Modal.Body>
        {assessments.length === 0 ? (
          <Form.Text data-testid="UnlockAssessmentsModal-empty">
            No assessments are available for this course yet.
          </Form.Text>
        ) : (
          assessments.map((assessment) => (
            <Form.Check
              key={assessment.id}
              type="switch"
              id={`unlock-assessment-${assessment.id}`}
              className="mb-2"
            >
              <Form.Check.Input
                type="checkbox"
                data-testid={`UnlockAssessmentsModal-switch-${assessment.id}`}
                checked={!assessment.locked}
                onChange={(e) =>
                  setLockedMutation.mutate({
                    assessmentId: assessment.id,
                    locked: !e.target.checked,
                  })
                }
              />
              <Form.Check.Label
                data-testid={`UnlockAssessmentsModal-label-${assessment.id}`}
              >
                {assessment.name}
              </Form.Check.Label>
            </Form.Check>
          ))
        )}
      </Modal.Body>
    </Modal>
  );
}
