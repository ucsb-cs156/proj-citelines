import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import ConceptDeleteModal from "main/components/Concept/ConceptDeleteModal";
import ConceptModal from "main/components/Concept/ConceptModal";
import ConceptTable from "main/components/Concept/ConceptTable";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

// Suppress error toasts when the concept list fetch fails (e.g. network error);
// background fetches should not interrupt the user with toast messages.
const suppressFetchToasts = true;
const DEFAULT_NEW_CONCEPT_POSITION = { x: 0, y: 0 };

export default function ConceptTabComponent({ courseId, testIdPrefix }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingConcept, setEditingConcept] = useState(null);
  const [deletingConceptId, setDeletingConceptId] = useState(null);
  const conceptsPath = `/api/concepts/course?courseId=${courseId}`;
  const conceptRelatedQueries = [
    conceptsPath,
    "/api/concepts/top-level",
    "/api/concepts/subconcepts",
  ];
  const { data: concepts } = useBackend(
    [conceptsPath],
    { method: "GET", url: conceptsPath },
    [],
    suppressFetchToasts,
  );

  const objectToAxiosParams = (concept) => ({
    url: "/api/concept",
    method: "POST",
    data: {
      courseId,
      label: concept.label,
      description: concept.description,
      example: concept.example,
      ...DEFAULT_NEW_CONCEPT_POSITION,
    },
  });

  const createConceptMutation = useBackendMutation(
    objectToAxiosParams,
    {
      onSuccess: (concept) => {
        toast(`Concept ${concept.label} created`);
        setShowCreateModal(false);
      },
    },
    conceptRelatedQueries,
  );

  const updateConceptMutation = useBackendMutation(
    (concept) => ({
      url: `/api/concept/put?conceptId=${editingConcept.id}`,
      method: "PUT",
      data: {
        label: concept.label,
        description: concept.description,
        example: concept.example,
      },
    }),
    {
      onSuccess: (concept) => {
        toast(`Concept ${concept.label} updated`);
        setShowEditModal(false);
        setEditingConcept(null);
      },
    },
    conceptRelatedQueries,
  );

  const deleteConceptMutation = useBackendMutation(
    () => ({
      url: `/api/concept/delete?conceptId=${deletingConceptId}`,
      method: "DELETE",
    }),
    {
      onSuccess: () => {
        toast("Concept deleted");
        setShowDeleteModal(false);
        setDeletingConceptId(null);
      },
    },
    conceptRelatedQueries,
  );

  const editCallback = (cell) => {
    setEditingConcept(cell.row.original);
    setShowEditModal(true);
  };

  const deleteCallback = (cell) => {
    setDeletingConceptId(cell.row.original.id);
    setShowDeleteModal(true);
  };

  return (
    <div className="tabComponent" data-testid={`${testIdPrefix}-conceptTab`}>
      <h2>Concepts</h2>
      <Button
        onClick={() => setShowCreateModal(true)}
        data-testid={`${testIdPrefix}-post-button`}
        className="mb-3"
      >
        Create Concept
      </Button>
      <ConceptModal
        showModal={showCreateModal}
        toggleShowModal={setShowCreateModal}
        onSubmitAction={(concept) => createConceptMutation.mutate(concept)}
      />
      <ConceptModal
        showModal={showEditModal}
        toggleShowModal={setShowEditModal}
        initialContents={editingConcept}
        onSubmitAction={(concept) => updateConceptMutation.mutate(concept)}
        buttonText="Update"
        modalTitle="Edit Concept"
      />
      <ConceptDeleteModal
        showModal={showDeleteModal}
        toggleShowModal={setShowDeleteModal}
        onSubmitAction={() => deleteConceptMutation.mutate({})}
      />
      <ConceptTable
        concepts={concepts}
        showButtons={true}
        editCallback={editCallback}
        deleteCallback={deleteCallback}
        testId={`${testIdPrefix}-ConceptTable`}
      />
    </div>
  );
}
