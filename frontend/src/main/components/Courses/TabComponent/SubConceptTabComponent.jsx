import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { useBackend } from "main/utils/useBackend";
import ConceptDeleteModal from "main/components/Concept/ConceptDeleteModal";
import SubConceptTable from "main/components/Concept/SubConceptTable";
import SubConceptModal from "main/components/Concept/SubConceptModal";
import ConceptSelector from "main/components/Concept/ConceptSelector";
import { useBackendMutation } from "main/utils/useBackend";

export default function SubConceptTabComponent({ courseId, testIdPrefix }) {
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSubConcept, setEditingSubConcept] = useState(null);
  const [deletingSubConceptId, setDeletingSubConceptId] = useState(null);
  const subConceptQueryKey = ["/api/concepts/subconcepts", courseId];
  const invalidationQueries = ["/api/concepts/subconcepts"];

  const { data: subConcepts = [] } = useBackend(
    subConceptQueryKey,
    {
      method: "GET",
      url: "/api/concepts/subconcepts",
      params: { courseId },
    },
    [],
  );

  const createSubconceptAxiosParams = (data) => ({
    url: "/api/concept/subconcept",
    method: "POST",
    data: {
      courseId: Number(courseId),
      parentConceptId: Number(data.parentId),
      label: data.label,
      description: data.description,
      example: data.example,
    },
  });

  const createSubconceptMutation = useBackendMutation(
    createSubconceptAxiosParams,
    {
      onSuccess: (subConcept) => {
        toast(`SubConcept ${subConcept.label} created`);
        setShowCreateModal(false);
      },
    },
    invalidationQueries,
  );

  const updateSubconceptMutation = useBackendMutation(
    (data) => ({
      url: `/api/concept/subconcept/put?conceptId=${editingSubConcept.id}`,
      method: "PUT",
      data: {
        label: data.label,
        description: data.description,
        example: data.example,
      },
    }),
    {
      onSuccess: (subConcept) => {
        toast(`SubConcept ${subConcept.label} updated`);
        setShowEditModal(false);
        setEditingSubConcept(null);
      },
    },
    invalidationQueries,
  );

  const deleteSubconceptMutation = useBackendMutation(
    () => ({
      url: `/api/concept/delete?conceptId=${deletingSubConceptId}`,
      method: "DELETE",
    }),
    {
      onSuccess: () => {
        toast("SubConcept deleted");
        setShowDeleteModal(false);
        setDeletingSubConceptId(null);
      },
    },
    invalidationQueries,
  );

  const editCallback = (cell) => {
    setEditingSubConcept(cell.row.original);
    setShowEditModal(true);
  };

  const deleteCallback = (cell) => {
    setDeletingSubConceptId(cell.row.original.id);
    setShowDeleteModal(true);
  };

  return (
    <div className="tabComponent" data-testid={`${testIdPrefix}-subConceptTab`}>
      <h2>SubConcepts</h2>
      <ConceptSelector
        courseId={courseId}
        onSelect={setSelectedConcept}
        testId={`${testIdPrefix}-conceptSelector`}
      />
      <Button
        onClick={() => setShowCreateModal(true)}
        disabled={!selectedConcept}
        data-testid={`${testIdPrefix}-createSubConceptButton`}
        className="mt-2"
      >
        Create SubConcept
      </Button>
      <SubConceptTable
        subConcepts={subConcepts}
        editCallback={editCallback}
        deleteCallback={deleteCallback}
      />
      <SubConceptModal
        showModal={showCreateModal}
        toggleShowModal={setShowCreateModal}
        initialContents={{
          parentId: selectedConcept?.id,
          parentLabel: selectedConcept?.label,
        }}
        onSubmitAction={createSubconceptMutation.mutate}
      />
      <SubConceptModal
        showModal={showEditModal}
        toggleShowModal={setShowEditModal}
        initialContents={editingSubConcept}
        onSubmitAction={updateSubconceptMutation.mutate}
        buttonText="Update"
        modalTitle="Edit SubConcept"
      />
      <ConceptDeleteModal
        showModal={showDeleteModal}
        toggleShowModal={setShowDeleteModal}
        onSubmitAction={() => deleteSubconceptMutation.mutate({})}
        modalTitle="Delete SubConcept"
        buttonText="Delete SubConcept"
        message="Are you sure you want to delete this subconcept?"
        testId="SubConceptDeleteModal"
      />
    </div>
  );
}
