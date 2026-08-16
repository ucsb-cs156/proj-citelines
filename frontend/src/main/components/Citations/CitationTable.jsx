import OurTable from "main/components/Common/OurTable";
import { Button } from "react-bootstrap";
import { Link } from "react-router";
import { useState } from "react";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import Modal from "react-bootstrap/Modal";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import { truncate } from "main/utils/truncate";

const CITEKEY_MAX_LENGTH = 8;
const AUTHOR_MAX_LENGTH = 15;
const TITLE_MAX_LENGTH = 20;
const WARNING_EMOJI = "\u26A0\uFE0F";

export default function CitationTable({
  citations,
  projectId,
  testId = "CitationTable",
  readOnly = false,
  mutationQueryKeys = [`/api/bibtexentries/project?projectId=${projectId}`],
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  const cellToAxiosParamsDelete = (entry) => ({
    url: "/api/bibtexentries/delete",
    method: "DELETE",
    params: {
      id: entry.id,
      projectId: projectId,
    },
  });

  const onDeleteSuccess = () => {
    toast("Citation deleted successfully");
    setShowDeleteModal(false);
    setEntryToDelete(null);
  };

  const onDeleteError = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not delete citation:\n${error.response.data.message}`);
    else toast(`Could not delete citation:\n${error.message}`);
  };

  const deleteMutation = useBackendMutation(
    cellToAxiosParamsDelete,
    { onSuccess: onDeleteSuccess, onError: onDeleteError },
    mutationQueryKeys,
  );

  const handleShowEditModal = (entry) => {
    setSelectedEntryForEdit(entry);
    setShowEditModal(true);
  };

  const columns = [
    {
      header: "Cite Key",
      id: "citeKey",
      cell: ({ cell }) => (
        <Link
          to={`/project/${projectId}/bibtex/${cell.row.original.id}`}
          data-testid={`${testId}-cell-row-${cell.row.index}-col-citeKey-link`}
        >
          {truncate(cell.row.original.citeKey, CITEKEY_MAX_LENGTH)}
        </Link>
      ),
    },
    {
      header: "Link",
      id: "link",
      cell: ({ cell }) => {
        const doi = cell.row.original.keyValuePairs?.doi;
        if (doi) {
          const invalidDoi =
            cell.row.original.keyValuePairs?.CITELINES_invalid_doi === "True";
          return (
            <a
              href={`https://doi.org/${doi}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${testId}-cell-row-${cell.row.index}-col-doi-link`}
            >
              doi{invalidDoi ? ` ${WARNING_EMOJI}` : ""}
            </a>
          );
        }
        const url = cell.row.original.keyValuePairs?.url;
        if (url) {
          const invalidUrl =
            cell.row.original.keyValuePairs?.CITELINES_invalid_url === "True";
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${testId}-cell-row-${cell.row.index}-col-url-link`}
            >
              url{invalidUrl ? ` ${WARNING_EMOJI}` : ""}
            </a>
          );
        }
        return null;
      },
    },
    {
      header: "Year",
      id: "year",
      accessorFn: (row) => row.keyValuePairs?.year ?? "",
    },
    {
      header: "Author",
      id: "author",
      accessorFn: (row) =>
        truncate(row.keyValuePairs?.author, AUTHOR_MAX_LENGTH),
    },
    {
      header: "Title",
      id: "title",
      accessorFn: (row) => truncate(row.keyValuePairs?.title, TITLE_MAX_LENGTH),
    },
    {
      // Debug/iteration aid (issue #68): flags entries the "Detect Duplicates" job has marked as
      // possibly duplicating another entry, via possibleDuplicateIds/possibleDuplicateReason. Not
      // yet a finished UX — see issue #75 for the eventual manual-review workflow.
      header: "Flags",
      id: "flags",
      accessorFn: (row) =>
        row.possibleDuplicateIds != null || row.possibleDuplicateReason != null
          ? "dup?"
          : "",
    },
  ];

  if (!readOnly) {
    columns.push(
      {
        header: "Edit",
        id: "edit",
        cell: ({ cell }) => (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleShowEditModal(cell.row.original)}
            data-testid={`${testId}-cell-row-${cell.row.index}-col-edit-button`}
          >
            Edit
          </Button>
        ),
      },
      {
        header: "Delete",
        id: "delete",
        cell: ({ cell }) => (
          <Button
            variant="danger"
            size="sm"
            data-testid={`${testId}-cell-row-${cell.row.index}-col-delete-button`}
            onClick={() => {
              setEntryToDelete(cell.row.original);
              setShowDeleteModal(true);
            }}
          >
            Delete
          </Button>
        ),
      },
    );
  }

  return (
    <>
      {!readOnly && (
        <>
          <BibTexEntryModal
            showModal={showEditModal}
            toggleShowModal={setShowEditModal}
            projectId={projectId}
            entryToEdit={selectedEntryForEdit}
            mutationQueryKeys={mutationQueryKeys}
          />

          <Modal
            data-testid={`${testId}-delete-modal`}
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              {entryToDelete && (
                <p>
                  Please confirm that you really want to delete the citation{" "}
                  <strong>{entryToDelete.citeKey}</strong>. This action cannot
                  be undone.
                </p>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Do not delete
              </Button>

              <Button
                variant="danger"
                data-testid={`${testId}-delete-modal-confirm-button`}
                onClick={() => deleteMutation.mutate(entryToDelete)}
              >
                Yes, Delete
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}

      <OurTable data={citations} columns={columns} testid={testId} />
    </>
  );
}
