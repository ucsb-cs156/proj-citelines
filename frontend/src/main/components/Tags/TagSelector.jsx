import { Badge, Dropdown, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getContrastTextColor } from "main/utils/colorUtils";

const DEFAULT_TAG_COLOR = "#6c757d";

function TagPill({ tag, testId }) {
  const color = tag.color || DEFAULT_TAG_COLOR;
  return (
    <Badge
      pill
      bg={null}
      style={{
        backgroundColor: color,
        color: getContrastTextColor(color),
      }}
      data-testid={testId}
    >
      {tag.tag}
    </Badge>
  );
}

export default function TagSelector({
  allTags = [],
  assignedTags = [],
  onAddTag = () => {},
  onRemoveTag = () => {},
  projectId,
  canEdit = true,
  testId = "TagSelector",
}) {
  const assignedIds = new Set(assignedTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !assignedIds.has(tag.id));

  const withExplanationTooltip = (tag, tooltipId, children) => (
    <OverlayTrigger
      key={tag.id}
      placement="top"
      overlay={<Tooltip id={tooltipId}>{tag.explanation}</Tooltip>}
    >
      {children}
    </OverlayTrigger>
  );

  return (
    <div data-testid={testId}>
      <div
        className="d-flex flex-wrap align-items-center gap-2"
        data-testid={`${testId}-assigned-tags`}
      >
        {assignedTags.length === 0 && (
          <span data-testid={`${testId}-no-tags`} className="text-muted">
            No tags assigned
          </span>
        )}
        {assignedTags.map((tag) =>
          withExplanationTooltip(
            tag,
            `${testId}-assigned-tag-${tag.id}-tooltip`,
            <span
              className="d-inline-flex align-items-center"
              data-testid={`${testId}-assigned-tag-${tag.id}`}
            >
              <TagPill
                tag={tag}
                testId={`${testId}-assigned-tag-${tag.id}-badge`}
              />
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1 text-decoration-none"
                  aria-label={`Remove tag ${tag.tag}`}
                  data-testid={`${testId}-remove-tag-${tag.id}`}
                  onClick={() => onRemoveTag(tag)}
                >
                  &times;
                </button>
              )}
            </span>,
          ),
        )}
      </div>
      <div className="d-flex align-items-center gap-3 mt-2">
        {canEdit && (
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
              {availableTags.map((tag) =>
                withExplanationTooltip(
                  tag,
                  `${testId}-available-tag-${tag.id}-tooltip`,
                  <Dropdown.Item
                    as="button"
                    type="button"
                    data-testid={`${testId}-available-tag-${tag.id}`}
                    onClick={() => onAddTag(tag)}
                  >
                    <TagPill
                      tag={tag}
                      testId={`${testId}-available-tag-${tag.id}-badge`}
                    />
                    <span className="ms-2 small text-muted">
                      {tag.explanation}
                    </span>
                  </Dropdown.Item>,
                ),
              )}
            </Dropdown.Menu>
          </Dropdown>
        )}
        <a
          href={`/project/${projectId}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-manage-tags-link`}
        >
          Manage Tags
        </a>
      </div>
    </div>
  );
}
