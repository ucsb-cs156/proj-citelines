import { Button, Collapse, Dropdown, Form } from "react-bootstrap";
import { RELEVANCE_OPTIONS } from "main/utils/citelinesFields";
import {
  CITATION_FILTER_LINK_OPTIONS,
  CITATION_FILTER_DUPLICATE_OPTIONS,
  DEFAULT_CITATION_FILTER,
} from "main/utils/citationFilter";
import TagPill from "main/components/Tags/TagPill";

// A controlled filter-criteria panel for a list of BibTexEntry citations (issue #59), intended to
// sit above the Citations tab's table (ResearcherProjectShowPage) and the References/Citations
// tables (BibTexEntryShowPage). This component only renders the filter UI and reports the
// selected criteria via onChange — it does not filter anything itself. Whatever page renders it
// owns the `filter` value (typically starting from DEFAULT_CITATION_FILTER) and applies
// matchesCitationFilter (main/utils/citationFilter.js) to its own entry array using that value,
// the same controlled value/onChange shape used elsewhere in this codebase (e.g. ColorChooser).
//
// The open/closed state is controlled the same way (issue #122, so a page can persist it — see
// issue #121): `expanded`/`onExpandedChange`, defaulting closed when uncontrolled.
export default function CitationFilter({
  filter = DEFAULT_CITATION_FILTER,
  onChange = () => {},
  expanded = false,
  onExpandedChange = () => {},
  allTags = [],
  testId = "CitationFilter",
}) {
  const update = (patch) => onChange({ ...filter, ...patch });

  const toggleRelevance = (option) => {
    update({
      relevance: filter.relevance.includes(option)
        ? filter.relevance.filter((r) => r !== option)
        : [...filter.relevance, option],
    });
  };

  const selectedTagIds = new Set(filter.tagIds);
  const selectedTags = allTags.filter((tag) => selectedTagIds.has(tag.id));
  const availableTags = allTags.filter((tag) => !selectedTagIds.has(tag.id));

  const addTag = (tag) => {
    if (!selectedTagIds.has(tag.id)) {
      update({ tagIds: [...filter.tagIds, tag.id] });
    }
  };

  const removeTag = (tag) => {
    update({ tagIds: filter.tagIds.filter((id) => id !== tag.id) });
  };

  return (
    <div data-testid={testId}>
      <div
        role="button"
        onClick={() => onExpandedChange(!expanded)}
        data-testid={`${testId}-header`}
        className="d-flex justify-content-between align-items-center border rounded-3 p-2 mb-2"
        style={{ cursor: "pointer" }}
      >
        <strong>{expanded ? "Citation Filters" : "citation filters"}</strong>
        <span data-testid={`${testId}-toggle-icon`}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      <Collapse in={expanded}>
        <div data-testid={`${testId}-body`}>
          <div className="border rounded-3 p-3 mb-3">
            <div className="mb-3">
              <div className="fw-semibold mb-1">Relevance</div>
              {RELEVANCE_OPTIONS.map((option) => {
                const selected = filter.relevance.includes(option);
                return (
                  <Button
                    key={option}
                    size="sm"
                    variant={selected ? "primary" : "outline-primary"}
                    aria-pressed={selected}
                    className="me-1"
                    onClick={() => toggleRelevance(option)}
                    data-testid={`${testId}-relevance-${option}`}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>

            <div className="mb-3">
              <div className="fw-semibold mb-1">Links</div>
              {CITATION_FILTER_LINK_OPTIONS.map((option) => (
                <Form.Check
                  key={option}
                  inline
                  type="radio"
                  name={`${testId}-link`}
                  id={`${testId}-link-${option}`}
                  label={option}
                  checked={filter.link === option}
                  onChange={() => update({ link: option })}
                  data-testid={`${testId}-link-${option}`}
                />
              ))}
            </div>

            <div className="mb-3">
              <div className="fw-semibold mb-1">Duplicates</div>
              {CITATION_FILTER_DUPLICATE_OPTIONS.map((option) => (
                <Form.Check
                  key={option}
                  inline
                  type="radio"
                  name={`${testId}-duplicates`}
                  id={`${testId}-duplicates-${option}`}
                  label={option}
                  checked={filter.duplicates === option}
                  onChange={() => update({ duplicates: option })}
                  data-testid={`${testId}-duplicates-${option}`}
                />
              ))}
            </div>

            <div className="mb-3">
              <Form.Label htmlFor={`${testId}-search`}>
                Search (author/title)
              </Form.Label>
              <Form.Control
                id={`${testId}-search`}
                data-testid={`${testId}-search`}
                type="text"
                value={filter.search}
                onChange={(e) => update({ search: e.target.value })}
              />
            </div>

            <div>
              <div className="fw-semibold mb-1">Tags</div>
              <div className="d-flex gap-3 mb-2">
                <Form.Check
                  inline
                  type="radio"
                  name={`${testId}-tagMode`}
                  id={`${testId}-tagMode-and`}
                  label="and"
                  checked={filter.tagMode === "and"}
                  onChange={() => update({ tagMode: "and" })}
                  data-testid={`${testId}-tagMode-and`}
                />
                <Form.Check
                  inline
                  type="radio"
                  name={`${testId}-tagMode`}
                  id={`${testId}-tagMode-or`}
                  label="or"
                  checked={filter.tagMode === "or"}
                  onChange={() => update({ tagMode: "or" })}
                  data-testid={`${testId}-tagMode-or`}
                />
              </div>
              <div
                className="d-flex flex-wrap align-items-center gap-2 mb-2"
                data-testid={`${testId}-selected-tags`}
              >
                {selectedTags.length === 0 && (
                  <span
                    className="text-muted"
                    data-testid={`${testId}-no-tags`}
                  >
                    No tags selected
                  </span>
                )}
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="d-inline-flex align-items-center"
                    data-testid={`${testId}-selected-tag-${tag.id}`}
                  >
                    <TagPill
                      tag={tag}
                      testId={`${testId}-selected-tag-${tag.id}-badge`}
                    />
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 ms-1 text-decoration-none"
                      aria-label={`Remove tag ${tag.tag}`}
                      data-testid={`${testId}-remove-tag-${tag.id}`}
                      onClick={() => removeTag(tag)}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-primary"
                  size="sm"
                  data-testid={`${testId}-add-tag-dropdown`}
                >
                  Add Tag
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {availableTags.length === 0 && (
                    <Dropdown.Item
                      disabled
                      data-testid={`${testId}-no-available-tags`}
                    >
                      No more tags available
                    </Dropdown.Item>
                  )}
                  {availableTags.map((tag) => (
                    <Dropdown.Item
                      key={tag.id}
                      as="button"
                      type="button"
                      data-testid={`${testId}-available-tag-${tag.id}`}
                      onClick={() => addTag(tag)}
                    >
                      <TagPill
                        tag={tag}
                        testId={`${testId}-available-tag-${tag.id}-badge`}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>
      </Collapse>
    </div>
  );
}
