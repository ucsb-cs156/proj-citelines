import React, { useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import EdgeTable from "main/components/Concept/EdgeTable";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

const suppressFetchToasts = true;

export default function EdgeConceptTabComponent({ courseId, testIdPrefix }) {
  const [sourceConceptId, setSourceConceptId] = useState("");
  const [targetConceptId, setTargetConceptId] = useState("");
  const [createEdgeError, setCreateEdgeError] = useState(null);

  const conceptsPath = `/api/concepts/course?courseId=${courseId}`;
  const { data: concepts } = useBackend(
    [conceptsPath],
    { method: "GET", url: conceptsPath },
    [],
    suppressFetchToasts,
  );

  const edgesPath = `/api/concepts/edges?courseId=${courseId}`;
  const { data: edges } = useBackend(
    [edgesPath],
    { method: "GET", url: edgesPath },
    [],
    suppressFetchToasts,
  );

  const labelById = new Map(
    concepts.map((concept) => [concept.id, concept.label]),
  );

  const edgesWithLabels = edges.map((edge) => ({
    ...edge,
    sourceLabel: labelById.get(edge.sourceId) ?? `id ${edge.sourceId}`,
    targetLabel: labelById.get(edge.targetId) ?? `id ${edge.targetId}`,
  }));

  const createEdgeObjectToAxiosParams = ({
    sourceConceptId,
    targetConceptId,
  }) => ({
    url: "/api/concepts/edges/post",
    method: "POST",
    params: { sourceConceptId, targetConceptId },
  });

  const createEdgeMutation = useBackendMutation(
    createEdgeObjectToAxiosParams,
    {
      onSuccess: () => {
        toast("Edge created");
        setSourceConceptId("");
        setTargetConceptId("");
      },
      onError: (error) => {
        const message =
          error.response?.data?.message ??
          "Error creating edge; please try again";
        setCreateEdgeError(message);
        toast(message);
      },
    },
    [edgesPath],
  );

  const deleteEdgeObjectToAxiosParams = (cell) => ({
    url: "/api/concepts/edges/delete",
    method: "DELETE",
    params: { id: cell.row.original.id },
  });

  const deleteEdgeMutation = useBackendMutation(
    deleteEdgeObjectToAxiosParams,
    {
      onSuccess: () => {
        toast("Edge deleted");
      },
    },
    [edgesPath],
  );

  const handleCreateEdge = (event) => {
    event.preventDefault();
    setCreateEdgeError(null);
    createEdgeMutation.mutate({ sourceConceptId, targetConceptId });
  };

  const createDisabled =
    sourceConceptId === "" ||
    targetConceptId === "" ||
    sourceConceptId === targetConceptId;

  return (
    <div
      className="tabComponent"
      data-testid={`${testIdPrefix}-edgeConceptTab`}
    >
      <h2>Edges</h2>
      <p>
        Edges represent prerequisite relationships between top-level concepts.
        Select a &quot;from&quot; concept (the prerequisite) and a
        &quot;to&quot; concept (the concept that depends on it), then click
        Create Edge.
      </p>
      <Form onSubmit={handleCreateEdge} className="mb-3">
        <Form.Group className="mb-2">
          <Form.Label htmlFor="sourceConceptId">From (source)</Form.Label>
          <Form.Select
            id="sourceConceptId"
            data-testid={`${testIdPrefix}-source-select`}
            value={sourceConceptId}
            onChange={(event) => setSourceConceptId(event.target.value)}
          >
            <option value="">Select a concept</option>
            {concepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label htmlFor="targetConceptId">To (target)</Form.Label>
          <Form.Select
            id="targetConceptId"
            data-testid={`${testIdPrefix}-target-select`}
            value={targetConceptId}
            onChange={(event) => setTargetConceptId(event.target.value)}
          >
            <option value="">Select a concept</option>
            {concepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        {createEdgeError && (
          <Alert
            variant="danger"
            data-testid={`${testIdPrefix}-create-edge-error`}
          >
            {createEdgeError}
          </Alert>
        )}
        <Button
          type="submit"
          disabled={createDisabled}
          data-testid={`${testIdPrefix}-create-edge-button`}
        >
          Create Edge
        </Button>
      </Form>
      <EdgeTable
        edges={edgesWithLabels}
        deleteCallback={(cell) => {
          setCreateEdgeError(null);
          deleteEdgeMutation.mutate(cell);
        }}
        testId={`${testIdPrefix}-EdgeTable`}
      />
    </div>
  );
}
