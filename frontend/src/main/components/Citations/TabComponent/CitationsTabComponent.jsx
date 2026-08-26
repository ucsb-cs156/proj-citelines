import { useBackend } from "main/utils/useBackend";
import { useState } from "react";
import { Button, Row } from "react-bootstrap";
import CitationTable from "main/components/Citations/CitationTable";
import CitationFilter from "main/components/Citations/CitationFilter";
import CitationSort from "main/components/Citations/CitationSort";
import BibTexEntryModal from "main/components/Citations/BibTexEntryModal";
import DoiEntryModal from "main/components/Citations/DoiEntryModal";
import { useFilteredSortedCitations } from "main/utils/useFilteredSortedCitations";

export default function CitationsTabComponent({
  projectId,
  testIdPrefix = "CitationsTabComponent",
}) {
  const [postModal, showPostModal] = useState(false);
  const [doiModal, showDoiModal] = useState(false);

  const queryKey = `/api/bibtexentries/project?projectId=${projectId}`;

  const { data: citations } = useBackend(
    [queryKey],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: queryKey },
    [],
    true,
  );

  const tagsQueryKey = `/api/tags/project?projectId=${projectId}`;
  const { data: allTags } = useBackend(
    [tagsQueryKey],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: tagsQueryKey },
    [],
    true,
  );

  // Filtering (issue #106) and sorting (issue #107) both happen entirely client-side, over the
  // project's full entry list already fetched above — see docs/design/sort-filter-design.md for
  // why no backend change is needed. CitationTable itself is left knowing nothing about either;
  // it just renders whatever (already filtered/sorted) array it's handed, with its own
  // column-header click-to-sort disabled below whenever sortCriteria isn't empty, so it can't
  // silently desync the table from what CitationSort's own ordering shows.
  const {
    filter,
    setFilter,
    sortCriteria,
    setSortCriteria,
    expanded,
    setExpanded,
    sortExpanded,
    setSortExpanded,
    visibleCitations,
    enableColumnSort,
  } = useFilteredSortedCitations(citations, { projectId, scope: "PROJECT" });

  return (
    <div
      data-testid={`${testIdPrefix}-CitationsTabComponent`}
      className="tabComponent"
    >
      <BibTexEntryModal
        showModal={postModal}
        toggleShowModal={showPostModal}
        projectId={projectId}
        mutationQueryKeys={[queryKey]}
      />
      <DoiEntryModal
        showModal={doiModal}
        toggleShowModal={showDoiModal}
        projectId={projectId}
        mutationQueryKeys={[queryKey]}
      />
      <Row className="p-2">
        <div className="d-flex gap-2">
          <Button
            onClick={() => showPostModal(true)}
            data-testid={`${testIdPrefix}-post-button`}
          >
            Add Citation via BibTex
          </Button>
          <Button
            onClick={() => showDoiModal(true)}
            data-testid={`${testIdPrefix}-doi-button`}
          >
            Add Citation via DOI
          </Button>
        </div>
      </Row>
      <Row>
        <CitationFilter
          filter={filter}
          onChange={setFilter}
          expanded={expanded}
          onExpandedChange={setExpanded}
          allTags={allTags}
          testId={`${testIdPrefix}-CitationFilter`}
        />
      </Row>
      <Row>
        <CitationSort
          sortCriteria={sortCriteria}
          onChange={setSortCriteria}
          expanded={sortExpanded}
          onExpandedChange={setSortExpanded}
          testId={`${testIdPrefix}-CitationSort`}
        />
      </Row>
      <Row>
        <CitationTable
          citations={visibleCitations}
          projectId={projectId}
          testId={`${testIdPrefix}-CitationTable`}
          allTags={allTags}
          mutationQueryKeys={[queryKey]}
          enableColumnSort={enableColumnSort}
        />
      </Row>
    </div>
  );
}
