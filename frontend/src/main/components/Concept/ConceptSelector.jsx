import { Form } from "react-bootstrap";
import { useBackend } from "main/utils/useBackend";

export default function ConceptSelector({
  courseId,
  onSelect,
  testId = "ConceptSelector",
}) {
  const { data: concepts = [] } = useBackend(
    ["/api/concepts/top-level", courseId],
    {
      method: "GET",
      url: "/api/concepts/top-level",
      params: { courseId },
    },
    [],
  );

  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (selectedId === "") {
      onSelect(null);
    } else {
      const concept = concepts.find((c) => String(c.id) === selectedId);
      onSelect(concept || null);
    }
  };

  return (
    <Form.Select data-testid={testId} onChange={handleChange} defaultValue="">
      <option value="">-- Select a Concept --</option>
      {concepts.map((concept) => (
        <option
          key={concept.id}
          value={concept.id}
          data-testid={`${testId}-option-${concept.id}`}
        >
          {concept.label}
        </option>
      ))}
    </Form.Select>
  );
}
